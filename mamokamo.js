/* MAMO BOAT Mamokamo v1 — static brand mascot, no prediction logic. */
(() => {
  "use strict";
  if (window.__MAMO_MAMOKAMO_V1__) return;
  window.__MAMO_MAMOKAMO_V1__ = true;

  const ASSET = "assets/mamokamo.webp?v=20260818-1";

  function installStyle() {
    if (document.getElementById("mamokamoStyles")) return;
    const style = document.createElement("style");
    style.id = "mamokamoStyles";
    style.textContent = `
      .mamokamo-profile{display:grid;grid-template-columns:minmax(112px,150px) 1fr;gap:16px;align-items:stretch;margin:12px 0 18px;padding:0;overflow:hidden;border:1px solid #d9d1bd;border-top:4px solid #d8a12a;border-radius:16px;background:linear-gradient(120deg,#fffdf8 0%,#fff 52%,#f3f7f8 100%);box-shadow:0 7px 20px rgba(8,35,61,.08)}
      .mamokamo-profile__visual{position:relative;min-height:188px;overflow:hidden;background:linear-gradient(160deg,#0a2b47,#08233d)}
      .mamokamo-profile__visual img{display:block;width:100%;height:100%;min-height:188px;object-fit:cover;object-position:50% 22%}
      .mamokamo-profile__visual:after{content:"MAMOKAMO";position:absolute;left:10px;bottom:9px;padding:3px 7px;border-radius:999px;background:rgba(8,35,61,.86);color:#f4c95f;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-profile__body{padding:17px 16px 15px 0;min-width:0}
      .mamokamo-profile__eyebrow{display:block;color:#98701d;font-size:8px;font-weight:1000;letter-spacing:.16em}
      .mamokamo-profile h3{margin:4px 0 7px;color:#08233d;font-size:25px;line-height:1.05;letter-spacing:-.055em}
      .mamokamo-profile p{margin:0;color:#344b5c;font-size:11px;font-weight:700;line-height:1.75}
      .mamokamo-role{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 8px}
      .mamokamo-role b{padding:4px 8px;border:1px solid #dacb9f;border-radius:999px;background:#fffaf0;color:#765615;font-size:8px;letter-spacing:.05em}
      .mamokamo-profile__quote{display:block;padding-top:8px;border-top:1px solid #ece6d9;color:#087d77;font-size:9px;font-weight:900;line-height:1.55}
      .cast-card.mamokamo{border-top-color:#d8a12a!important;background:linear-gradient(135deg,#fffdf7,#fff)!important}
      .cast-card.mamokamo .cast-avatar{overflow:hidden;padding:0!important;background:#08233d!important;border-color:#d8a12a!important}
      .cast-card.mamokamo .cast-avatar img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 20%}
      .mamokamo-home{display:grid;grid-template-columns:74px 1fr;gap:12px;align-items:center;margin:10px 0;padding:10px 12px;border:1px solid #e0d7c2;border-left:4px solid #d8a12a;border-radius:13px;background:linear-gradient(110deg,#fffdf7,#fff);box-shadow:0 4px 12px rgba(8,35,61,.055)}
      .mamokamo-home img{width:74px;height:74px;object-fit:cover;object-position:50% 20%;border-radius:12px;background:#08233d}
      .mamokamo-home small{display:block;color:#98701d;font-size:7px;font-weight:1000;letter-spacing:.13em}
      .mamokamo-home strong{display:block;margin-top:2px;color:#08233d;font-size:14px}
      .mamokamo-home p{margin:4px 0 0;color:#566873;font-size:9px;font-weight:750;line-height:1.55}
      @media(max-width:520px){.mamokamo-profile{grid-template-columns:108px 1fr;gap:12px}.mamokamo-profile__visual,.mamokamo-profile__visual img{min-height:174px}.mamokamo-profile__body{padding:14px 12px 13px 0}.mamokamo-profile h3{font-size:21px}.mamokamo-profile p{font-size:10px}}
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

  function boot() {
    installStyle();
    installNewsroomMascot();
    installHomeMascot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();