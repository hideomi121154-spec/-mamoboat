const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const dataset = JSON.parse(read("dev/data/today.json"));

const wait = (milliseconds = 0) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function waitFor(check, message, timeout = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const value = check();
    if (value) return value;
    await wait(10);
  }
  throw new Error(message);
}

function cloneInto(window, value) {
  return window.JSON.parse(JSON.stringify(value));
}

(async () => {
  const dom = new JSDOM(read("dev/index.html"), {
    url: "https://mamoboat.test/dev/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const alerts = [];
  window.scrollTo = () => {};
  window.alert = (message) => alerts.push(String(message));
  window.confirm = () => true;
  window.Date.now = () => Date.parse("2026-09-09T05:00:00.000Z");
  window.fetch = async (input) => {
    const url = String(input);
    if (url.includes("boatrace-odds")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          status: "available",
          odds: {
            values: {
              "1-2-3": "12.3",
              "1-5-2": "20.1",
              "1-5-3": "25.4",
            },
            updatedAt: "2026-09-09T05:00:00.000Z",
          },
        }),
      };
    }
    if (url.includes("/data/") || url.startsWith("data/")) {
      return {
        ok: true,
        status: 200,
        json: async () => cloneInto(window, dataset),
      };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  window.eval(read("dev/core.js"));
  window.eval(read("dev/air-bet-draft-core.js"));
  window.eval(read("dev/app.js"));

  const click = (selector) => {
    const node = window.document.querySelector(selector);
    assert(node, `missing control: ${selector}`);
    node.click();
    return node;
  };
  const clickId = (id) => click(`#${id}`);
  const draft = () => window.MAMO_AIR_BET_DRAFT.snapshot();
  const status = () => window.MAMO_AIR_BET_DRAFT.status();
  const chooseNormal = (first, second, third) => {
    clickId(`n-0-${first}`);
    clickId(`n-1-${second}`);
    clickId(`n-2-${third}`);
    assert.equal(window.document.querySelectorAll("#builder .pick.sel").length, 3);
  };
  const addCurrent = async (expectedCount) => {
    const button = window.document.querySelector("#builder [data-add-current]");
    assert(button && !button.hidden && !button.disabled, "completed selection must expose the add button");
    button.click();
    await waitFor(() => status().count === expectedCount, `draft did not reach ${expectedCount} lines`);
  };
  const openReview = () => {
    clickId("reviewBetButton");
    assert(window.document.getElementById("modalBg").classList.contains("show"));
    assert.equal(window.document.querySelectorAll("[data-review-stake-increment]").length, 3);
  };

  try {
    // Let the initial asynchronous dataset load settle, then force one
    // validated refresh so the test always enters an open official race.
    await wait(100);
    await window.reloadData();
    window.closeModal();
    clickId("nav-race");
    await waitFor(() => window.document.getElementById("builder"), "AIR BET builder did not render");

    // The real inline number-button handlers must remain actionable.
    chooseNormal(1, 2, 3);
    await addCurrent(1);
    assert.equal(draft()[0].combination, "1-2-3");
    assert.equal(draft()[0].amount, null, "new lines must not receive an automatic stake");
    assert.equal(draft()[0].referenceOdds, 12.3);

    openReview();
    click('[data-review-stake-increment="100"]');
    click('[data-review-stake-increment="100"]');
    click('[data-review-stake-increment="100"]');
    assert.equal(draft()[0].amount, 300, "+100B must add instead of replacing");
    click('[data-review-stake-increment="1000"]');
    assert.equal(draft()[0].amount, 1300);
    click('[data-review-stake-increment="10000"]');
    assert.equal(draft()[0].amount, 11300);
    assert.equal(window.document.querySelector(".betline-current-stake").textContent, "11,300B");
    assert.equal(window.document.getElementById("topCoins").textContent, "100,000 B", "review edits must not debit the wallet");

    // Return explicitly, then mix formation and BOX drafts without losing the
    // normal line already in the tray.
    click(".mamo-bet-modal-back");
    clickId("bt-form");
    clickId("f-0-1");
    clickId("f-1-5");
    clickId("f-2-2");
    clickId("f-2-3");
    await addCurrent(3);
    assert.deepEqual([...draft()].slice(0, 3).map((line) => line.combination), ["1-2-3", "1-5-2", "1-5-3"]);

    clickId("bt-box");
    clickId("b-1");
    clickId("b-2");
    clickId("b-3");
    await addCurrent(8);
    assert.equal(status().count, 8, "normal, formation and BOX lines must coexist");

    clickId("bt-normal");
    chooseNormal(1, 2, 3);
    click("#builder [data-add-current]");
    await waitFor(() => window.document.getElementById("addedNotice").textContent.includes("すでに追加"), "duplicate feedback did not appear");
    await waitFor(() => status().adding === false, "duplicate request did not settle");
    assert.equal(status().count, 8, "the same final combination must not be duplicated");

    click("#cart .xbtn");
    assert.equal(status().count, 7, "one tray line must be independently removable");
    openReview();
    click('[data-review-stake-increment="1000"]');
    assert(draft().every((line) => line.amount >= 1000), "bulk increment must apply to every line");

    const direct = window.document.getElementById("reviewAllStakeInput");
    direct.value = "500";
    click(".review-stake-custom button");
    assert(draft().every((line) => line.amount === 500), "direct bulk input must remain a set operation");
    const firstInput = window.document.querySelector('.betline[data-cart-index="0"] .betline-stake-input');
    firstInput.value = "700";
    firstInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(draft()[0].amount, 700);
    assert(draft().slice(1).every((line) => line.amount === 500), "individual stake input must affect only its line");

    click('[data-review-stake-increment="1000"]');
    assert.equal(draft()[0].amount, 1700);
    assert(draft().slice(1).every((line) => line.amount === 1500));
    assert.equal(window.document.getElementById("topCoins").textContent, "100,000 B");

    // Clear-all stays in the review modal and leaves an explicit disabled
    // empty state. No implicit navigation or modal close is allowed.
    click(".mamo-clear-review");
    assert.equal(status().count, 0);
    assert(window.document.getElementById("modalBg").classList.contains("show"));
    assert.equal(window.document.getElementById("reviewBetSummary").textContent.trim(), "0点 / 0B");
    assert.equal(window.document.querySelector(".air-bet-confirm-button").disabled, true);
    assert.equal(window.document.getElementById("reviewStakeTools").hidden, true);
    assert.equal(window.document.getElementById("addedNotice").textContent, "");
    click(".mamo-bet-modal-back");

    // Re-enter twice after an empty review. Each physical click adds exactly
    // once, proving no listener multiplication after clear/reselect cycles.
    for (const combo of [[1, 3, 2], [1, 4, 2]]) {
      clickId("bt-normal");
      chooseNormal(...combo);
      await addCurrent(1);
      openReview();
      click('[data-review-stake-increment="100"]');
      assert.equal(draft()[0].amount, 100);
      if (combo[1] === 3) {
        click(".betline-remove");
        assert.equal(status().count, 0, "deleting the final line must keep an empty review");
        assert(window.document.getElementById("modalBg").classList.contains("show"));
        assert.equal(window.document.querySelector(".air-bet-confirm-button").disabled, true);
        click(".mamo-bet-modal-back");
      }
    }

    // Twenty additional picker toggles must remain responsive and must not
    // mutate the tray or wallet while review is still a draft.
    click(".mamo-bet-modal-back");
    for (let iteration = 0; iteration < 20; iteration += 1) {
      clickId("n-0-6");
      clickId("n-0-6");
    }
    assert.equal(status().count, 1);
    assert.equal(window.document.getElementById("topCoins").textContent, "100,000 B");

    openReview();
    click(".air-bet-confirm-button");
    const saved = JSON.parse(window.localStorage.getItem("mamoboat_v40_personal"));
    assert.equal(saved.coins, 99900, "wallet debit must happen only on final confirmation");
    assert.equal(saved.records.length, 1, "history must be written only on final confirmation");
    assert.equal(saved.records[0].lines.length, 1);
    assert.equal(status().count, 0, "confirmed draft must be reset");

    // Bottom navigation remains clickable after the repeated AIR BET cycle.
    clickId("nav-venues");
    assert.equal(window.document.body.dataset.screen, "venues");
    clickId("nav-home");
    assert.equal(window.document.body.dataset.screen, "home");
    clickId("nav-records");
    assert.equal(window.document.body.dataset.screen, "records");
    assert.deepEqual(alerts, []);

    console.log("AIR BET picker/review DOM flow checks passed");
  } finally {
    window.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
