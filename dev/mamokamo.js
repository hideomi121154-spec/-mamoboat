/* MAMO BOAT Mamokamo v1 — static brand mascot, no prediction logic. */
(() => {
  "use strict";
  if (window.__MAMO_MAMOKAMO_V1__) return;
  window.__MAMO_MAMOKAMO_V1__ = true;

  const ASSET = "assets/mamokamo-card-v4.svg?v=20260818-4";

  function installStyle() {
    if (document.getElementById("mamokamoStyles")) return;
    const style = document.createElement("style");
    style.id = "mamokamoStyles";
    style.textContent = `
      .mamokamo-profile{display:grid;grid-template-columns:minmax(112px,150px) 1fr;gap:16px;align-items:stretch;margin:12px 0 18px;padding:0;overflow:hidden;border:1px solid #d9d1bd;border-top:4px solid #d8a12a;border-radius:16px;background:linear-gradient(120deg,#fffdf8 0%,#fff 52%,#f3f7f8 100%);box-shadow:0 7px 20px rgba(8,35,61,.08)}
      .mamokamo-profile__visual{position:relative;min-height:188px;overflow:hidden;background:#fffdf8}
      .mamokamo-profile__visual img{display:block;width:100%;height:100%;min-height:188px;object-fit:cover;object-position:50% 50%}
      .mamokamo-profile__visual:after{content:"MAMOKAMO";position:absolute;left:10px;bottom:9px;padding:3px 7px;border-radius:999px;background:rgba(8,35,61,.86);color:#f4c95f;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-profile__body{padding:17px 16px 15px 0;min-width:0}
      .mamokamo-profile__eyebrow{display:block;color:#98701d;font-size:8px;font-weight:1000;letter-spacing:.16em}
      .mamokamo-profile h3{margin:4px 0 7px;color:#08233d;font-size:25px;line-height:1.05;letter-spacing:-.055em}
      .mamokamo-profile p{margin:0;color:#344b5c;font-size:11px;font-weight:700;line-height:1.75}
      .mamokamo-role{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 8px}
      .mamokamo-role b{padding:4px 8px;border:1px solid #dacb9f;border-radius:999px;background:#fffaf0;color:#765615;font-size:8px;letter-spacing:.05em}
      .mamokamo-profile__quote{display:block;padding-top:8px;border-top:1px solid #ece6d9;color:#087d77;font-size:9px;font-weight:900;line-height:1.55}
      .cast-card.mamokamo{border-top-color:#d8a12a!important;background:linear-gradient(135deg,#fffdf7,#fff)!important}
      .cast-card.mamokamo .cast-avatar{overflow:hidden;padding:0!important;background:#fffdf8!important;border-color:#d8a12a!important}
      .cast-card.mamokamo .cast-avatar img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 50%}
      .mamokamo-home{display:grid;grid-template-columns:74px 1fr;gap:12px;align-items:center;margin:10px 0;padding:10px 12px;border:1px solid #e0d7c2;border-left:4px solid #d8a12a;border-radius:13px;background:linear-gradient(110deg,#fffdf7,#fff);box-shadow:0 4px 12px rgba(8,35,61,.055)}
      .mamokamo-home img{width:74px;height:74px;object-fit:cover;object-position:50% 50%;border-radius:12px;background:#fffdf8}
      .mamokamo-home small{display:block;color:#98701d;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-home strong{display:block;margin-top:2px;color:#08233d;font-size:14px}
      .mamokamo-home p{margin:4px 0 0;color:#566873;font-size:9px;font-weight:750;line-height:1.55}

      #analysisList.behavior-pattern-grid{display:grid;gap:11px;margin-top:8px}
      #analysisList .behavior-intro{display:grid;grid-template-columns:1fr 92px;gap:12px;align-items:center;padding:14px 16px 12px;border-radius:16px;background:linear-gradient(120deg,#f7fbfb,#fffaf1);border:1px solid #e1e7e5;box-shadow:0 5px 14px rgba(8,35,61,.05)}
      #analysisList .behavior-intro small{display:block;color:#0b8a82;font-size:9px;font-weight:1000;letter-spacing:.13em}
      #analysisList .behavior-intro strong{display:block;margin-top:3px;color:#08233d;font-size:20px;line-height:1.25;letter-spacing:-.035em}
      #analysisList .behavior-intro p{margin:4px 0 0;color:#60717b;font-size:12px;font-weight:700;line-height:1.55}
      #analysisList .behavior-intro img{width:92px;height:78px;object-fit:cover;object-position:50% 42%;justify-self:end;filter:drop-shadow(0 4px 6px rgba(8,35,61,.12))}

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
      #analysisList .behavior-mamokamo img{width:74px;height:62px;object-fit:cover;object-position:50% 43%}
      #analysisList .behavior-mamokamo b{display:block;color:#08233d;font-size:13px;line-height:1.45}
      #analysisList .behavior-mamokamo span{display:block;margin-top:2px;color:#6e7980;font-size:10px;font-weight:700;line-height:1.45}

      @media(max-width:520px){.mamokamo-profile{grid-template-columns:108px 1fr;gap:12px}.mamokamo-profile__visual,.mamokamo-profile__visual img{min-height:174px}.mamokamo-profile__body{padding:14px 12px 13px 0}.mamokamo-profile h3{font-size:21px}.mamokamo-profile p{font-size:10px}#analysisList .behavior-intro{grid-template-columns:1fr 78px}#analysisList .behavior-intro img{width:78px;height:66px}#analysisList .card.behavior-card{grid-template-columns:46px minmax(0,1fr) auto;gap:10px;padding:12px 12px!important}#analysisList .behavior-card .behavior-icon{width:42px;height:42px;font-size:20px}#analysisList .behavior-copy b{font-size:15px!important}#analysisList .behavior-metric{min-width:58px;font-size:19px}}
    `;
    document.head.appendChild(style);
  }

  function installNewsroomMascot() {
    const cast = document.querySelector("#analysis .newsroom-cast");
    if (!cast) return;

    const heading = cast.previousElementSibling?.querySelector?.("h2");
    if (heading && heading.textContent.includes("編集部の3人")) heading.textContent = "編集部とマモカモ";

    if (!cast.querySelector(".cast-card.mamokamo")) {
      const card = document.createElement("article");
      card.className = "cast-card mamokamo";
      card.innerHTML = `<span class="cast-avatar"><img src="${ASSET}" alt="マモカモ"></span><div><small>MAMO BOAT マスコット</small><h3>マモカモ</h3><p>熱くなりすぎた時に、そっと「ちょっと待って」を届ける見守り役。</p></div>`;
      cast.appendChild(card);
    }

    if (!document.getElementById("mamokamoProfile")) {
      const profile = document.createElement("article");
      profile.id = "mamokamoProfile";
      profile.className = "mamokamo-profile";
      profile.innerHTML = `<div class="mamokamo-profile__visual"><img src="${ASSET}" alt="MAMO BOATのマスコット マモカモ"></div><div class="mamokamo-profile__body"><span class="mamokamo-profile__eyebrow">MAMO BOAT / WATCH PARTNER</span><h3>マモカモ</h3><p>勝負を止めるためではなく、自分で選べる状態を守るための相棒。予想はせず、熱くなった時や連続参加が続いた時に、いったん自分を見るきっかけをつくります。</p><div class="mamokamo-role"><b>守る</b><b>見張る</b><b>導く</b></div><span class="mamokamo-profile__quote">「それでいいカモ！」　「ちょっと待ってカモ！」</span></div>`;
      cast.insertAdjacentElement("afterend", profile);
    }
  }

  function installHomeMascot() {
    const note = document.querySelector("#home .tactical-note");
    if (!note || document.getElementById("mamokamoHome")) return;
    const card = document.createElement("aside");
    card.id = "mamokamoHome";
    card.className = "mamokamo-home";
    card.innerHTML = `<img src="${ASSET}" alt="マモカモ"><div><small>MAMOKAMO / WATCHING</small><strong>今日も、勝負の主導権は自分に。</strong><p>マモカモは予想をしません。熱くなりすぎた時に、自分のペースへ戻るきっかけを届けます。</p></div>`;
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
      intro.innerHTML = `<div><small>MAMO AI / BEHAVIOR MAP</small><strong>あなたの行動を、ひと目で。</strong><p>勝敗ではなく、参加の仕方や金額の動きを整理しています。</p></div><img src="${ASSET}" alt="マモカモ">`;
      list.prepend(intro);
    }

    if (!list.querySelector(".behavior-mamokamo")) {
      const note = document.createElement("div");
      note.className = "behavior-mamokamo";
      note.innerHTML = `<img src="${ASSET}" alt="マモカモ"><div><b>「数字が動いたところが、いつもの自分との違いカモ。」</b><span>この画面は勝率や次のレースを予想せず、あなた自身の行動だけを整理します。</span></div>`;
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