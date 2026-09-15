"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
const handlers = {};
const cached = new Map();
const cacheNames = [];
let networkCalls = 0;
let failInstall = false;
let skipped = 0;
const context = {
  URL, Request, Response, Headers,
  location: { origin: "https://mamoboat.test" },
  self: {
    registration: { scope: "https://mamoboat.test/dev/" },
    addEventListener: (type, handler) => { handlers[type] = handler; },
    skipWaiting: () => { skipped++; },
    clients: { claim() {} },
  },
  caches: {
    open: async name => {
      cacheNames.push(name);
      return {
        addAll: async files => {
          if (failInstall) throw new Error("partial deployment");
          files.forEach(file => cached.set(file, new Response(file === "./index.html"
            ? '<script src="app.js?v=old"></script><script src="bet-review-flow.js?v=old"></script><link href="air-bet-review-compact.css?v=old">'
            : file, { headers: { "content-type": file === "./index.html" ? "text/html" : "text/javascript" } })));
        },
        match: async key => cached.get(key)?.clone(),
      };
    },
  },
  fetch: async () => { networkCalls++; throw new Error("offline"); },
};
vm.runInNewContext(source, context);
async function install() {
  let pending;
  handlers.install({ waitUntil(promise) { pending = promise; } });
  return pending;
}
async function request(file, mode) {
  let pending;
  handlers.fetch({ request: { method: "GET", url: `https://mamoboat.test/dev/${file}`, mode }, respondWith(promise) { pending = promise; } });
  return pending;
}
(async () => {
  failInstall = true;
  await assert.rejects(install(), /partial deployment/);
  assert.equal(skipped, 0, "a partially installed release must not activate");
  failInstall = false;
  await install();
  assert.equal(skipped, 1);
  for (const asset of ["app.js", "bet-review-flow.js", "air-bet-review-compact.css"]) {
    const response = await request(`${asset}?v=old`);
    assert.equal(await response.text(), `./${asset}?v=20260914-2`, "old requests get the installed coherent BET release");
  }
  const html = await (await request("", "navigate")).text();
  assert(!html.includes("v=old"));
  for (const asset of ["app.js", "bet-review-flow.js", "air-bet-review-compact.css"]) assert(html.includes(`${asset}?v=20260914-2`));
  assert.equal(networkCalls, 0, "navigation and BET owners must not refresh independently");
  assert(cacheNames.every(name => name === "mamoboat-v520-post-bet-self-check-dev"));
  cached.delete("./app.js?v=20260914-2");
  assert.equal((await request("app.js?v=old")).type, "error", "missing release asset fails closed instead of mixing generations");
  console.log("Post-BET atomic release cache checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
