const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");
const marketplace = fs.readFileSync(path.join(devRoot, "mamo-shop-marketplace.js"), "utf8");
const benefits = fs.readFileSync(path.join(devRoot, "mamo-shop-record-benefits.js"), "utf8");
const homeBalance = fs.readFileSync(path.join(devRoot, "home-record-balance.js"), "utf8");
const compatibility = fs.readFileSync(path.join(devRoot, "decision-event-api-compat.js"), "utf8");
const edgeFunction = fs.readFileSync(path.join(devRoot, "..", "supabase", "functions", "shop-rakuten", "index.ts"), "utf8");

test("SHOP leads with public Rakuten coupon guidance", () => {
  assert.match(marketplace, /id = "mamoRakutenCoupons"/);
  assert.match(marketplace, /今日使えるクーポンを先に確認。/);
  assert.match(marketplace, /https:\/\/event\.rakuten\.co\.jp\/coupon\//);
  assert.match(marketplace, /一般公開されている楽天公式の特典だけ/);
  assert.match(marketplace, /対象者限定情報は掲載せず/);
  assert.match(marketplace, /MAMO BOAT独自の割引ではありません/);
  assert.match(marketplace, /rel="noopener noreferrer sponsored"/);
});

test("SHOP does not claim a fictional discount", () => {
  for (const source of [marketplace, benefits, homeBalance]) {
    assert.doesNotMatch(source, /MAMO500-PILOT|PILOT SHOP 10% OFF|SHOP限定クーポン/);
  }
  assert.match(benefits, /SHOP選び方ガイド/);
  assert.match(homeBalance, /SHOP選び方ガイド/);
});

test("member benefits are placed after the product grid", () => {
  assert.match(benefits, /grid\.insertAdjacentElement\("afterend", box\)/);
  assert.match(benefits, /商品案内の最後に、会員特典。/);
});

test("coupon release uses fresh client assets", () => {
  assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260828-1/);
  assert.match(compatibility, /home-record-balance\.js\?v=20260828-1/);
  assert.match(compatibility, /mamo-shop-marketplace\.js\?v=20260828-1/);
});

test("product cards are ready for Rakuten point multipliers", () => {
  assert.match(marketplace, /product\.pointRate/);
  assert.match(marketplace, /ポイント\$\{pointRate\}倍/);
  assert.match(marketplace, /送料無料/);
  assert.match(edgeFunction, /"https:\/\/mamoboat\.com"/);
  assert.match(edgeFunction, /"https:\/\/www\.mamoboat\.com"/);
  assert.match(edgeFunction, /"Referer": "https:\/\/mamoboat\.com\/"/);
  assert.match(edgeFunction, /"pointRate"/);
  assert.match(edgeFunction, /postageFlag: postageFlag\(item\.postageFlag\)/);
});
