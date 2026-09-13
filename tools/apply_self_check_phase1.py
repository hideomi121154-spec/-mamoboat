from pathlib import Path

# Presentation owner: keep SELF CHECK UI in bet-review-flow.js, remove parallel persistence.
review = Path('dev/bet-review-flow.js')
text = review.read_text(encoding='utf-8')
text = text.replace(
    '  let detailOpen = false;\n  let pendingSelfCheck = null;\n  const APP_STATE_KEY = "mamoboat_v40_personal";\n  const SELF_CHECK_STORE_KEY = "mamoboat_self_check_v1";\n  const SELF_CHECK_EVENT = "pre_bet_self_check_recorded";\n',
    '  let detailOpen = false;\n',
    1,
)
start = text.index('  function readAppState()')
end = text.index('  function racerRows()')
helpers = r'''  function selfCheckAnswers(shell) {
    const panel = shell?.querySelector?.('[data-mamo-self-check="1"]');
    if (!panel) return null;
    return {
      confidence: Number(panel.dataset.confidence || 0),
      basis: String(panel.querySelector('[data-mamo-self-basis="1"]')?.value || ""),
      stakeFeeling: String(panel.querySelector('[data-mamo-self-stake-feeling="1"]')?.value || ""),
      realSameAmount: String(panel.dataset.realSameAmount || ""),
    };
  }

  function selfCheckComplete(value) {
    return Boolean(
      value
      && Number.isInteger(value.confidence)
      && value.confidence >= 1
      && value.confidence <= 5
      && value.basis
      && value.stakeFeeling
      && ["yes", "no"].includes(value.realSameAmount)
    );
  }

  function syncSelfCheckConfirm(shell) {
    if (!shell) return;
    const complete = selfCheckComplete(selfCheckAnswers(shell));
    const status = shell.querySelector('[data-mamo-self-status="1"]');
    if (status) {
      status.textContent = complete
        ? "SELF CHECKを記録できます。"
        : "4項目を選ぶとAIR BETを確定できます。";
    }
    const confirm = shell.querySelector('button[onclick="placeBet()"]');
    if (!confirm || reviewStep !== "final") return;
    const lines = draftLines();
    const total = lines.reduce((sum, line) => sum + lineAmount(line), 0);
    let balance = NaN;
    try {
      balance = Number(JSON.parse(localStorage.getItem("mamoboat_v40_personal") || "{}").coins);
    } catch (_) {}
    const baseBlocked = !lines.length
      || lines.some((line) => !lineAmount(line))
      || (Number.isFinite(balance) && total > balance);
    confirm.disabled = baseBlocked || !complete;
  }

  function choiceButton(label, value, datasetName, panel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter";
    button.textContent = label;
    button.dataset[datasetName] = value;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const selector = `[data-${datasetName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`;
      panel.querySelectorAll(selector).forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      if (datasetName === "mamoSelfConfidence") panel.dataset.confidence = value;
      if (datasetName === "mamoRealSame") panel.dataset.realSameAmount = value;
      syncSelfCheckConfirm(panel.closest('.air-bet-review-shell[data-air-bet-review="1"]'));
    });
    return button;
  }

  function createSelfCheckPanel() {
    const panel = document.createElement("section");
    panel.className = "mamo-self-check";
    panel.dataset.mamoSelfCheck = "1";
    panel.dataset.confidence = "";
    panel.dataset.realSameAmount = "";
    panel.setAttribute("aria-label", "AIR BET前のSELF CHECK");

    const kicker = document.createElement("span");
    kicker.className = "kicker";
    kicker.textContent = "SELF CHECK";
    const title = document.createElement("h3");
    title.textContent = "予想の前に、自分を知る。";
    const lead = document.createElement("p");
    lead.className = "muted";
    lead.textContent = "正解はありません。今の自分に一番近いものを選んでください。";

    const confidenceLabel = document.createElement("h4");
    confidenceLabel.textContent = "1. このレースへの自信は？";
    const confidence = document.createElement("div");
    confidence.className = "mamo-self-choice confidence";
    confidence.setAttribute("role", "group");
    confidence.setAttribute("aria-label", "自信度1から5");
    for (let value = 1; value <= 5; value += 1) {
      confidence.append(choiceButton(`${value}`, String(value), "mamoSelfConfidence", panel));
    }

    const basis = document.createElement("label");
    basis.className = "field";
    basis.innerHTML = '<span>2. 今回の主な根拠は？</span><select data-mamo-self-basis="1"><option value="">選んでください</option><option value="racer">選手</option><option value="motor">モーター</option><option value="exhibition">展示</option><option value="odds">オッズ</option><option value="start">スタート</option><option value="intuition">直感</option><option value="other">その他</option></select>';

    const stake = document.createElement("label");
    stake.className = "field";
    stake.innerHTML = '<span>3. このBET額をどう感じますか？</span><select data-mamo-self-stake-feeling="1"><option value="">選んでください</option><option value="very_low">かなり少ない</option><option value="low">少ない</option><option value="appropriate">適切</option><option value="high">多い</option><option value="very_high">かなり多い</option></select>';

    const realLabel = document.createElement("h4");
    realLabel.textContent = "4. REALでも同じ金額を賭けますか？";
    const real = document.createElement("div");
    real.className = "mamo-self-choice real";
    real.setAttribute("role", "group");
    real.setAttribute("aria-label", "REALでも同じ金額を賭けるか");
    real.append(
      choiceButton("YES", "yes", "mamoRealSame", panel),
      choiceButton("NO", "no", "mamoRealSame", panel)
    );

    const status = document.createElement("p");
    status.className = "tiny";
    status.dataset.mamoSelfStatus = "1";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "4項目を選ぶとAIR BETを確定できます。";

    panel.append(kicker, title, lead, confidenceLabel, confidence, basis, stake, realLabel, real, status);
    panel.querySelectorAll("select").forEach((select) => {
      select.addEventListener("change", () => syncSelfCheckConfirm(
        panel.closest('.air-bet-review-shell[data-air-bet-review="1"]')
      ));
    });
    return panel;
  }

'''
text = text[:start] + helpers + text[end:]
text = text.replace('    pendingSelfCheck = null;\n', '', 1)
text = text.replace('    if (completeCapturedSelfCheck(target)) return;\n', '', 1)
text = text.replace('    document.addEventListener("click", captureSelfCheck, true);\n', '', 1)
review.write_text(text, encoding='utf-8')

# Authoritative owner: persist SELF CHECK directly on the AIR BET record and existing event.
app = Path('dev/app.js')
js = app.read_text(encoding='utf-8')
old = '    const event = eventInfo(venueItem);\n    const rewardChallenge = false;\n'
new = '''    const selfCheckPanel = $("modal")?.querySelector?.('[data-mamo-self-check="1"]');
    const selfConfidence = Number(selfCheckPanel?.dataset?.confidence || 0);
    const selfBasis = String(selfCheckPanel?.querySelector?.('[data-mamo-self-basis="1"]')?.value || "");
    const selfStakeFeeling = String(selfCheckPanel?.querySelector?.('[data-mamo-self-stake-feeling="1"]')?.value || "");
    const selfRealSameAmount = String(selfCheckPanel?.dataset?.realSameAmount || "");
    const selfCheckComplete = Number.isInteger(selfConfidence)
      && selfConfidence >= 1
      && selfConfidence <= 5
      && selfBasis
      && selfStakeFeeling
      && ["yes", "no"].includes(selfRealSameAmount);
    if (!selfCheckComplete) return alert("SELF CHECKの4項目を選んでください。");
    const event = eventInfo(venueItem);
    const rewardChallenge = false;
'''
assert old in js, 'placeBet insertion marker not found'
js = js.replace(old, new, 1)
old = '      observationVersion: 1,\n      status: "pending",\n'
new = '''      observationVersion: 1,
      selfCheckVersion: 1,
      selfConfidence,
      selfBasis,
      selfStakeFeeling,
      selfRealSameAmount,
      status: "pending",
'''
assert old in js, 'record SELF CHECK marker not found'
js = js.replace(old, new, 1)
old = '      observation_version: record.observationVersion,\n      reward_challenge: record.rewardChallenge,\n'
new = '''      observation_version: record.observationVersion,
      self_check_version: record.selfCheckVersion,
      self_confidence: record.selfConfidence,
      self_basis: record.selfBasis,
      self_stake_feeling: record.selfStakeFeeling,
      self_real_same_amount: record.selfRealSameAmount,
      reward_challenge: record.rewardChallenge,
'''
assert old in js, 'event SELF CHECK marker not found'
js = js.replace(old, new, 1)
app.write_text(js, encoding='utf-8')

# Canonical stylesheet owns SELF CHECK presentation.
css = Path('dev/air-bet-review-compact.css')
style = css.read_text(encoding='utf-8')
marker = '/* A swipe beginning on a ticket card remains available to the parent scroll owner. */'
assert marker in style, 'SELF CHECK CSS insertion marker not found'
self_css = r'''
/* SELF CHECK is part of the existing final state; no overlay or extra scroll owner. */
.air-bet-review-shell .mamo-self-check {
  display: grid;
  gap: 7px;
  padding: 10px;
  border: 1px solid #cfe0ea;
  border-radius: 11px;
  background: #f7fbff;
}
.air-bet-review-shell .mamo-self-check .kicker {
  color: #0876c9;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .08em;
}
.air-bet-review-shell .mamo-self-check h3,
.air-bet-review-shell .mamo-self-check h4,
.air-bet-review-shell .mamo-self-check p { margin: 0; }
.air-bet-review-shell .mamo-self-check h3 { font-size: 15px; }
.air-bet-review-shell .mamo-self-check h4 { color: #173d5b; font-size: 12px; }
.air-bet-review-shell .mamo-self-check .muted { color: #687f91; font-size: 10px; line-height: 1.4; }
.air-bet-review-shell .mamo-self-choice { display: grid; gap: 5px; }
.air-bet-review-shell .mamo-self-choice.confidence { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.air-bet-review-shell .mamo-self-choice.real { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.air-bet-review-shell .mamo-self-choice .filter { min-width: 0; min-height: 36px; padding: 5px 4px; }
.air-bet-review-shell .mamo-self-check .field { margin: 0; }
.air-bet-review-shell .mamo-self-check .field > span { display: block; margin-bottom: 4px; color: #173d5b; font-size: 12px; font-weight: 800; }
.air-bet-review-shell .mamo-self-check .field select { min-height: 38px; }

'''
style = style.replace(marker, self_css + marker, 1)
css.write_text(style, encoding='utf-8')

# Cache keys only for modified assets.
index = Path('dev/index.html')
html = index.read_text(encoding='utf-8')
assert 'air-bet-review-compact.css?v=20260910-10' in html
assert 'app.js?v=20260910-4' in html
html = html.replace('air-bet-review-compact.css?v=20260910-10', 'air-bet-review-compact.css?v=20260914-1', 1)
html = html.replace('app.js?v=20260910-4', 'app.js?v=20260914-1', 1)
index.write_text(html, encoding='utf-8')
