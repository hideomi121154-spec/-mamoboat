/* MAMO BOAT Visual Refresh v4 — stable pressroom behavior cards only. */
(() => {
  "use strict";
  if (window.__MAMO_VISUAL_REFRESH_V4__) return;
  window.__MAMO_VISUAL_REFRESH_V4__ = true;
  window.__MAMO_VISUAL_REFRESH_V2__ = true;

  const STYLE_ID = "mamoBehaviorCardsV4";
  const META = {
    "B投票と結果": { icon: "B", desc: "B投票がどこまで結果反映されたか", tone: "teal" },
    "結果の反映時間": { icon: "◷", desc: "締切からMAMO BOATへ反映される速さ", tone: "blue" },
    "仮想投票総額": { icon: "¥", desc: "現金の代わりにAIR BETへ置き換えた合計", tone: "gold" },
    "低い自信度×高い衝動": { icon: "↗", desc: "自信より勢いが先に出た参加", tone: "coral" },
    "取り返したい参加": { icon: "↩", desc: "取り返したい気持ちを申告した参加", tone: "purple" },
    "短時間の金額増加": { icon: "◷", desc: "短時間で予定額を増やした参加", tone: "blue" },
    "外れ後の追い上げ": { icon: "↑", desc: "不的中後すぐに予定額を上げた参加", tone: "orange" },
    "短時間連投": { icon: "⇢", desc: "短時間に連続して参加した記録", tone: "teal" },
    "衝動の変化": { icon: "↓", desc: "参加前後で現金衝動がどう変わったか", tone: "blue" },
    "B的中後の『現金なら』": { icon: "¥", desc: "B的中後に現金ならと感じた記録", tone: "gold" },
    "多い参加理由": { icon: "◎", desc: "参加理由で最も多かったもの", tone: "purple" },
    "置換額が多い場": { icon: "▦", desc: "AIR BETへの置換額が多かった場", tone: "orange" },
    "公式投票への移動": { icon: "→", desc: "公式投票導線へ移動した回数", tone: "coral" }
  };

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #analysisList.analysis-list.mamo-fixed-cards{display:grid!important;gap:12px!important;}
      #analysisList .mamo-behavior-card{
        --accent:#10aaa4;--soft:#e7f8f6;
        display:grid!important;grid-template-columns:58px minmax(0,1fr) auto!important;
        gap:14px!important;align-items:center!important;min-height:116px!important;
        padding:18px 20px!important;background:#fff!important;
        border:1px solid #dce3e5!important;border-left:6px solid var(--accent)!important;
        border-radius:18px!important;box-shadow:0 5px 14px rgba(8,35,61,.065)!important;
        overflow:hidden!important;color:#0b2a42!important;
      }
      #analysisList .mamo-behavior-card[data-tone="blue"]{--accent:#2b78d6;--soft:#e8f2ff;}
      #analysisList .mamo-behavior-card[data-tone="gold"]{--accent:#e09b00;--soft:#fff5dc;}
      #analysisList .mamo-behavior-card[data-tone="coral"]{--accent:#ef5a5a;--soft:#ffeded;}
      #analysisList .mamo-behavior-card[data-tone="purple"]{--accent:#8d43c8;--soft:#f4eafd;}
      #analysisList .mamo-behavior-card[data-tone="orange"]{--accent:#f27632;--soft:#fff0e8;}
      #analysisList .mamo-behavior-icon{
        width:48px;height:48px;border-radius:50%;display:grid;place-items:center;
        background:var(--soft);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 28%,white);
        font-size:24px;font-weight:1000;line-height:1;
      }
      #analysisList .mamo-behavior-copy{min-width:0;}
      #analysisList .mamo-behavior-copy b{display:block;font-size:18px;line-height:1.25;color:#0b2a42;margin-bottom:4px;}
      #analysisList .mamo-behavior-desc{font-size:11px;line-height:1.45;color:#687b8b;font-weight:800;margin-bottom:7px;}
      #analysisList .mamo-behavior-badge{display:inline-block;max-width:100%;padding:5px 9px;border-radius:999px;background:var(--soft);color:var(--accent);font-size:10px;line-height:1.35;font-weight:900;}
      #analysisList .mamo-behavior-value{align-self:center;justify-self:end;color:var(--accent);font-size:24px;line-height:1;font-weight:1000;white-space:nowrap;text-align:right;}
      @media(max-width:520px){
        #analysisList .mamo-behavior-card{grid-template-columns:52px minmax(0,1fr) auto!important;padding:15px 14px!important;gap:10px!important;min-height:108px!important;}
        #analysisList .mamo-behavior-icon{width:44px;height:44px;font-size:22px;}
        #analysisList .mamo-behavior-copy b{font-size:16px;}
        #analysisList .mamo-behavior-desc{font-size:10px;}
        #analysisList .mamo-behavior-badge{font-size:9px;padding:4px 7px;}
        #analysisList .mamo-behavior-value{font-size:22px;}
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function mainValue(label, detail) {
    const text = String(detail || "");
    if (label === "結果の反映時間") {
      const m = text.match(/中央値\s*([^（\s]+)/);
      return m ? m[1] : "—";
    }
    if (label === "仮想投票総額") return text.replace(/相当/g, "").trim() || "0円";
    if (label === "B投票と結果") {
      const m = text.match(/^(\d+)件/);
      return m ? `${m[1]}件` : "—";
    }
    const m = text.match(/(-?[0-9][0-9,]*(?:\.[0-9]+)?(?:件|回|円|分|%|B)?)/);
    return m ? m[1] : "—";
  }

  function normalize() {
    installStyle();
    const list = document.getElementById("analysisList");
    if (!list || list.dataset.mamoNormalizing === "1") return;
    // Behavior Insights v2 owns the complete card markup. Reformatting those
    // articles as legacy metric cards would turn the header marker (↔) into
    // the title and the first number in the observation into the main value.
    if (list.dataset.insightVersion === "2" || list.classList.contains("behavior-insights-v2")) return;
    const sourceCards = [...list.children];
    if (!sourceCards.length) return;
    if (sourceCards.every(card => card.classList.contains("mamo-behavior-card"))) {
      list.classList.add("mamo-fixed-cards");
      return;
    }

    const rows = sourceCards.map((card) => {
      const label = card.querySelector("b")?.textContent?.trim() || "行動記録";
      const detail = card.querySelector("p")?.textContent?.trim() || "データ待ち";
      const meta = META[label] || { icon: "•", desc: "あなたの参加記録から確認した項目", tone: "teal" };
      return { label, detail, meta, value: mainValue(label, detail) };
    });

    list.dataset.mamoNormalizing = "1";
    list.innerHTML = rows.map(({label, detail, meta, value}) => `
      <div class="mamo-behavior-card" data-tone="${meta.tone}">
        <div class="mamo-behavior-icon" aria-hidden="true">${escapeHtml(meta.icon)}</div>
        <div class="mamo-behavior-copy">
          <b>${escapeHtml(label)}</b>
          <div class="mamo-behavior-desc">${escapeHtml(meta.desc)}</div>
          <span class="mamo-behavior-badge">${escapeHtml(detail)}</span>
        </div>
        <strong class="mamo-behavior-value">${escapeHtml(value)}</strong>
      </div>`).join("");
    list.classList.add("mamo-fixed-cards");
    delete list.dataset.mamoNormalizing;
  }

  function boot() {
    installStyle();
    normalize();
    const list = document.getElementById("analysisList");
    if (list) {
      new MutationObserver(() => queueMicrotask(normalize)).observe(list, { childList:true, subtree:false });
    }
    window.addEventListener("mamo:analysis-rendered", normalize);
    window.addEventListener("pageshow", normalize);
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#nav-analysis")) setTimeout(normalize, 0);
    }, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
