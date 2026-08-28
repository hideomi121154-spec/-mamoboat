/* MAMO RECORD balance card on the home screen. */
(() => {
  "use strict";
  if (window.__MAMO_HOME_RECORD_BALANCE__) return;
  window.__MAMO_HOME_RECORD_BALANCE__ = true;

  const KEY = "mamoboat_record_v1";
  const BENEFITS = [
    { need: 100, title: "特別分析1回" },
    { need: 300, title: "GOLD分析7日体験" },
    { need: 500, title: "SHOP選び方ガイド" },
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function installStyle() {
    if (document.getElementById("mamoHomeRecordBalanceStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoHomeRecordBalanceStyle";
    style.textContent = `
      #mamoHomeRecordBalance{margin:10px 20px 14px;padding:13px 15px;border:1px solid #d3dee7;border-left:5px solid #dc2029;border-radius:14px;background:#fff;display:grid;grid-template-columns:1fr auto;gap:8px 14px;align-items:center;box-shadow:0 5px 14px rgba(8,43,74,.06)}
      #mamoHomeRecordBalance .mrh-copy small{display:block;color:#b11922;font-size:8px;font-weight:1000;letter-spacing:.15em}
      #mamoHomeRecordBalance .mrh-copy b{display:block;margin-top:3px;color:#082b4a;font-size:14px}
      #mamoHomeRecordBalance .mrh-copy span{display:block;margin-top:2px;color:#78878e;font-size:8px}
      #mamoHomeRecordBalance>strong{white-space:nowrap;color:#b11922;font-size:26px;letter-spacing:-.03em}
      .mrh-next{grid-column:1/-1;margin-top:2px;padding-top:8px;border-top:1px solid #dce4eb;display:flex;align-items:center;gap:8px}
      .mrh-next span{color:#6f7d83;font-size:9px;font-weight:800;white-space:nowrap}
      .mrh-next b{color:#082b4a;font-size:10px}
      .mrh-bar{flex:1;min-width:55px;height:6px;border-radius:999px;background:#e3eaf0;overflow:hidden}
      .mrh-bar i{display:block;height:100%;background:#dc2029;border-radius:inherit}
      @media(max-width:390px){#mamoHomeRecordBalance{margin-left:14px;margin-right:14px}#mamoHomeRecordBalance>strong{font-size:23px}.mrh-next{flex-wrap:wrap}.mrh-bar{order:3;flex-basis:100%}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    const home = document.getElementById("home");
    const masthead = home?.querySelector(".home-masthead");
    if (!home || !masthead) return;
    let element = document.getElementById("mamoHomeRecordBalance");
    if (!element) {
      element = document.createElement("div");
      element.id = "mamoHomeRecordBalance";
      masthead.insertAdjacentElement("afterend", element);
    }
    const state = read();
    const currentBalance = Math.max(0, Number(state.balance) || 0);
    const next = BENEFITS.find((item) => currentBalance < item.need) || null;
    const previous = [0, ...BENEFITS.map((item) => item.need)].filter((amount) => amount <= currentBalance).pop() || 0;
    const target = next?.need || BENEFITS.at(-1).need;
    const progress = next ? Math.max(0, Math.min(100, ((currentBalance - previous) / (target - previous)) * 100)) : 100;
    const renderKey = `${currentBalance}:${next?.need || "done"}`;
    if (element.dataset.renderKey === renderKey) return;
    element.dataset.renderKey = renderKey;
    element.innerHTML = `<div class="mrh-copy"><small>MAMO RECORD</small><b>累計RECORD</b><span>記録・振り返り・見送りで貯まります</span></div><strong>${currentBalance.toLocaleString("ja-JP")}R</strong><div class="mrh-next"><span>${next ? `あと ${next.need - currentBalance}R` : "全特典 解放済み"}</span><b>${next ? `で「${next.title}」` : "SHOPで特典を確認"}</b><div class="mrh-bar"><i style="width:${progress}%"></i></div></div>`;
  }

  function boot() {
    installStyle();
    render();
    setInterval(render, 800);
    window.addEventListener("pageshow", render);
    window.addEventListener("storage", (event) => { if (event.key === KEY) render(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
