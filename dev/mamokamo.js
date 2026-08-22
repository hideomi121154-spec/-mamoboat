/* MAMO BOAT Mamokamo v2 — AI behavior-analysis mascot, no race-outcome prediction. */
(() => {
  "use strict";
  if (window.__MAMO_MAMOKAMO_V2__) return;
  window.__MAMO_MAMOKAMO_V2__ = true;

  const ASSET = "assets/mamokamo-ai-v5.png?v=20260822-5";

  function installStyle() {
    if (document.getElementById("mamokamoStyles")) return;
    const style = document.createElement("style");
    style.id = "mamokamoStyles";
    style.textContent = `
      .mamokamo-profile{display:grid;grid-template-columns:minmax(145px,180px) 1fr;gap:16px;align-items:stretch;margin:12px 0 18px;padding:0;overflow:hidden;border:1px solid #d9d1bd;border-top:4px solid #d8a12a;border-radius:18px;background:linear-gradient(120deg,#fffdf8 0%,#fff 52%,#f1fafb 100%);box-shadow:0 8px 22px rgba(8,35,61,.09)}
      .mamokamo-profile__visual{position:relative;display:grid;place-items:center;min-height:210px;overflow:hidden;background:radial-gradient(circle at 48% 38%,#fff 0,#fffaf0 55%,#eaf7f8 100%)}
      .mamokamo-profile__visual img{display:block;width:100%;height:100%;min-height:210px;box-sizing:border-box;padding:10px 7px 20px;object-fit:contain;object-position:50% 50%;filter:drop-shadow(0 7px 8px rgba(8,35,61,.16))}
      .mamokamo-profile__visual:after{content:"MAMOKAMO / AI";position:absolute;left:10px;bottom:9px;padding:3px 7px;border-radius:999px;background:rgba(8,35,61,.9);color:#f4c95f;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-profile__body{padding:17px 16px 15px 0;min-width:0}
      .mamokamo-profile__eyebrow{display:block;color:#98701d;font-size:8px;font-weight:1000;letter-spacing:.16em}
      .mamokamo-profile h3{margin:4px 0 7px;color:#08233d;font-size:25px;line-height:1.05;letter-spacing:-.055em}
      .mamokamo-profile p{margin:0;color:#344b5c;font-size:11px;font-weight:700;line-height:1.75}
      .mamokamo-role{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 8px}
      .mamokamo-role b{padding:4px 8px;border:1px solid #dacb9f;border-radius:999px;background:#fffaf0;color:#765615;font-size:8px;letter-spacing:.05em}
      .mamokamo-profile__quote{display:block;padding-top:8px;border-top:1px solid #ece6d9;color:#087d77;font-size:9px;font-weight:900;line-height:1.55}
      .cast-card.mamokamo{border-top-color:#d8a12a!important;background:linear-gradient(135deg,#fffdf7,#fff)!important}
      .cast-card.mamokamo .cast-avatar{overflow:hidden;padding:0!important;background:#fffdf8!important;border-color:#d8a12a!important}
      .cast-card.mamokamo .cast-avatar img{display:block;width:100%;height:100%;box-sizing:border-box;padding:4px;object-fit:contain;object-position:50% 50%;filter:drop-shadow(0 3px 4px rgba(8,35,61,.13))}
      .mamokamo-home{display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:center;margin:10px 0;padding:10px 12px;border:1px solid #e0d7c2;border-left:4px solid #d8a12a;border-radius:15px;background:linear-gradient(110deg,#fffdf7,#fff,#f1fafb);box-shadow:0 5px 14px rgba(8,35,61,.06)}
      .mamokamo-home img{width:84px;height:84px;box-sizing:border-box;padding:3px;object-fit:contain;object-position:50% 50%;border-radius:14px;background:radial-gradient(circle,#fff,#fff8e8);filter:drop-shadow(0 4px 5px rgba(8,35,61,.13))}
      .mamokamo-home small{display:block;color:#98701d;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-home strong{display:block;margin-top:2px;color:#08233d;font-size:14px}
      .mamokamo-home p{margin:4px 0 0;color:#566873;font-size:9px;font-weight:750;line-height:1.55}

      #analysisList.behavior-pattern-grid{display:grid;gap:11px;margin-top:8px}
      #analysisList .behavior-intro{display:grid;grid-template-columns:1fr 92px;gap:12px;align-items:center;padding:14px 16px 12px;border-radius:16px;background:linear-gradient(120deg,#f7fbfb,#fffaf1);border:1px solid #e1e7e5;box-shadow:0 5px 14px rgba(8,35,61,.05)}
      #analysisList .behavior-intro small{display:block;color:#0b8a82;font-size:9px;font-weight:1000;letter-spacing:.13em}
      #analysisList .behavior-intro strong{display:block;margin-top:3px;color:#08233d;font-size:20px;line-height:1.25;letter-spacing:-.035em}
      #analysisList .behavior-intro p{margin:4px 0 0;color:#60717b;font-size:12px;font-weight:700;line-height:1.55}
      #analysisList .behavior-intro img{width:98px;height:88px;object-fit:contain;object-position:50% 50%;justify-self:end;filter:drop-shadow(0 5px 6px rgba(8,35,61,.14))}

      #analysisList .card.behavior-card{--bc:#0aa49a;display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:88px;margin:0!important;padding:13px 14px!important;border:1px solid #e0e5e3!important;border-left:5px solid var(--bc)!important;border-radius:18px!important;background:#fff!important;box-shadow:0 5px 14px rgba(8,35,61,.055)!important}
      #analysisList .behavior-card .behavior-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:color-mix(in srgb,var(--bc) 14%,white);color:var(--bc);font-size:24px;font-weight:1000;line-height:1;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bc) 28%,white)}
      #analysisList .behavior-copy{min-width:0}
      #analysisList .behavior-copy b{display:block;color:#08233d;font-size:16px!important;line-height:1.3;letter-spacing:-.025em}
      #analysisList .behavior-copy .behavior-help{display:block;margin-top:3px;color:#657680;font-size:11px;font-weight:700;line-height:1.45}
      #analysisList .behavior-copy .behavior-detail{display:inline-block;margin:5px 0 0;padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--bc) 9%,white);color:color-mix(in srgb,var(--bc) 80%,#08233d);font-size:9px!important;font-weight:850;line-height:1.4}
      #analysisList .behavior-metric{min-width:72px;color:var(--bc);font-size:22px;font-weight:1000;line-height:1.05;text-align:right;letter-spacing:-.04em;white-space:nowrap}
      #analysisList .behavior-card[data-tone="teal"]{--bc:#0aa49a}
      #analysisList .behavior-card[data-tone="blue"]{--bc:#2878d4}
      #analysisList .behavior-card[data-tone="gold"]{--bc:#d79a13}
      #analysisList .behavior-card[data-tone="red"]{--bc:#e65353}
      #analysisList .behavior-card[data-tone="purple"]{--bc:#8c4fc1}
      #analysisList .behavior-card[data-tone="orange"]{--bc:#ef763d}
      #analysisList .behavior-card[data-tone="green"]{--bc:#2da66c}
      #analysisList .behavior-card[data-tone="navy"]{--bc:#173b5a}
      #analysisList .behavior-mamokamo{display:grid;grid-template-columns:74px 1fr;gap:10px;align-items:center;margin-top:3px;padding:10px 13px;border:1px solid #e0c98e;border-radius:15px;background:linear-gradient(110deg,#fffaf0,#fff);box-shadow:0 5px 14px rgba(8,35,61,.05)}
      #analysisList .behavior-mamokamo img{width:78px;height:70px;object-fit:contain;object-position:50% 50%;filter:drop-shadow(0 4px 5px rgba(8,35,61,.12))}
      #analysisList .behavior-mamokamo b{display:block;color:#08233d;font-size:13px;line-height:1.45}
      #analysisList .behavior-mamokamo span{display:block;margin-top:2px;color:#6e7980;font-size:10px;font-weight:700;line-height:1.45}

      @media(max-width:520px){.mamokamo-profile{grid-template-columns:140px 1fr;gap:12px}.mamokamo-profile__visual,.mamokamo-profile__visual img{min-height:206px}.mamokamo-profile__body{padding:14px 12px 13px 0}.mamokamo-profile h3{font-size:21px}.mamokamo-profile p{font-size:10px}.mamokamo-role b{font-size:7px;padding:4px 6px}#analysisList .behavior-intro{grid-template-columns:1fr 86px}#analysisList .behavior-intro img{width:86px;height:76px}#analysisList .card.behavior-card{grid-template-columns:46px minmax(0,1fr) auto;gap:10px;padding:12px 12px!important}#analysisList .behavior-card .behavior-icon{width:42px;height:42px;font-size:20px}#analysisList .behavior-copy b{font-size:15px!important}#analysisList .behavior-metric{min-width:58px;font-size:19px}}
    `;
    document.head.appendChild(style);
  }

  function installNewsroomMascot() {
    const cast = document.querySelector("#analysis .newsroom-cast");
    if (!cast) return;

    const heading = cast.previousElementSibling?.querySelector?.("h2");
    if (heading && heading.textContent.includes("編集部の3人")) heading.textContent = "編集部とAI分析担当";

    if (!cast.querySelector(".cast-card.mamokamo")) {
      const card = document.createElement("article");
      card.className = "cast-card mamokamo";
      card.innerHTML = `<span class="cast-avatar"><img src="${ASSET}" alt="マモカモ"></span><div><small>MAMO BOAT AI分析担当</small><h3>マモカモ</h3><p>AIR BETと記録から、勝敗ではなく行動のクセを見つけるマスコット。</p></div>`;
      cast.appendChild(card);
    }

    if (!document.getElementById("mamokamoProfile")) {
      const profile = document.createElement("article");
      profile.id = "mamokamoProfile";
      profile.className = "mamokamo-profile";
      profile.innerHTML = `<div class="mamokamo-profile__visual"><img src="${ASSET}" alt="MAMO BOATのAI分析担当マモカモ"></div><div class="mamokamo-profile__body"><span class="mamokamo-profile__eyebrow">MAMO BOAT / AI ANALYST</span><h3>マモカモ</h3><p>AIR BETとMAMO RECORDの記録を読み解き、参加のタイミングや金額の変化を整理するAI分析担当。レースの勝敗は予想せず、「いつもの自分」との違いを分かりやすく届けます。</p><div class="mamokamo-role"><b>記録を読む</b><b>クセを見つける</b><b>気づきを届ける</b></div><span class="mamokamo-profile__quote">「ここ、いつもと違うカモ！」　「数字から一緒に見てみるカモ！」</span></div>`;
      cast.insertAdjacentElement("afterend", profile);
    }
  }

  function installHomeMascot() {
    const note = document.querySelector("#home .tactical-note");
    if (!note || document.getElementById("mamokamoHome")) return;
    const card = document.createElement("aside");
    card.id = "mamokamoHome";
    card.className = "mamokamo-home";
    card.innerHTML = `<img src="${ASSET}" alt="AI分析担当マモカモ"><div><small>MAMOKAMO / AI ANALYST</small><strong>AI分析は、マモカモにおまかせ。</strong><p>AIR BETとMAMO RECORDを整理し、勝敗ではなくあなたの行動のクセを伝えます。</p></div>`;
    note.insertAdjacentElement("afterend", card);
  }

  const BEHAVIOR_META = {
    "B投票と結果": {icon:"B", tone:"teal", help:"B投票がどこまで結果反映されたか"},
    "結果の反映時間": {icon:"◷", tone:"blue", help:"締切からMAMO BOATへ反映される速さ"},
    "仮想投票総額": {icon:"¥", tone:"gold", help:"現金の代わりにAIR BETへ置き換えた合計"},
    "低い納得度×高い衝動": {icon:"↗", tone:"red", help:"納得より勢いが先に出た参加"},
    "取り返したい参加": {icon:"↶", tone:"purple", help:"取り返したい気持ちを申告した参加"},
    "短時間の金額増加": {icon:"◴", tone:"blue", help:"短時間で予定額を増やした参加"},
    "外れ後の追い上げ": {icon:"↑", tone:"orange", help:"不的中後すぐに予定額を上げた参加"},
    "短時間連投": {icon:"⚑", tone:"green", help:"短時間に続けて参加した区間"},
    "B的中後の『現金なら』": {icon:"!", tone:"red", help:"的中後に現金で続けたくなった場面"},
    "多い参加理由": {icon:"●", tone:"teal", help:"最近もっとも多い参加理由"},
    "置換額が多い場": {icon:"⌖", tone:"gold", help:"AIR BETへの置換額が多い会場"},
    "公式投票への移動": {icon:"→", tone:"navy", help:"公式投票サイトへ移動した回数"},
  };

  function metricFrom(label, detail) {
    const text = String(detail || "");
    if (label === "結果の反映時間") {
      const match = text.match(/中央値\s*([^（]+)/);
      return match ? match[1].trim() : "測定中";
    }
    if (label === "仮想投票総額") return text.replace(/相当$/, "").trim();
    if (label === "多い参加理由") {
      const m = text.match(/：\s*([0-9,]+件)/);
      return m ? m[1] : "—";
    }
    if (label === "置換額が多い場") {
      const m = text.match(/：\s*([0-9,]+円)/);
      return m ? m[1] : "—";
    }
    const m = text.match(/^([0-9,]+(?:\.[0-9]+)?(?:件|回|円|B|%|分)?)/);
    return m ? m[1] : "—";
  }

  function decorateBehaviorPatterns() {
    const list = document.getElementById("analysisList");
    if (!list) return;
    list.classList.add("behavior-pattern-grid");

    const cards = [...list.querySelectorAll(":scope > .card")];
    if (!cards.length) return;

    cards.forEach((card) => {
      if (card.dataset.behaviorReady === "true") return;
      const title = card.querySelector("b")?.textContent?.trim() || "";
      const detail = card.querySelector("p")?.textContent?.trim() || "";
      const meta = BEHAVIOR_META[title] || {icon:"•", tone:"navy", help:"あなた自身の行動記録"};
      const metric = metricFrom(title, detail);
      card.classList.add("behavior-card");
      card.dataset.tone = meta.tone;
      card.dataset.behaviorReady = "true";
      card.innerHTML = `<span class="behavior-icon" aria-hidden="true">${meta.icon}</span><div class="behavior-copy"><b>${title}</b><span class="behavior-help">${meta.help}</span><p class="behavior-detail">${detail}</p></div><strong class="behavior-metric">${metric}</strong>`;
    });

    if (!list.querySelector(".behavior-intro")) {
      const intro = document.createElement("div");
      intro.className = "behavior-intro";
      intro.innerHTML = `<div><small>MAMO AI / BEHAVIOR MAP</small><strong>マモカモが、あなたの行動を分析。</strong><p>AIR BETと記録から、参加の仕方や金額の動きを整理します。</p></div><img src="${ASSET}" alt="AI分析担当マモカモ">`;
      list.prepend(intro);
    }

    if (!list.querySelector(".behavior-mamokamo")) {
      const note = document.createElement("div");
      note.className = "behavior-mamokamo";
      note.innerHTML = `<img src="${ASSET}" alt="AI分析担当マモカモ"><div><b>「数字が動いたところ、マモカモが見つけたカモ！」</b><span>AIが勝敗を予想するのではなく、あなた自身の行動記録を比較・整理します。</span></div>`;
      list.appendChild(note);
    }
  }

  function boot() {
    installStyle();
    installNewsroomMascot();
    installHomeMascot();
    decorateBehaviorPatterns();
  }

  window.addEventListener("mamo:analysis-rendered", decorateBehaviorPatterns);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
