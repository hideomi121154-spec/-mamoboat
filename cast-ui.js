/* MAMO BOAT v4.0.2 — character UI v7 (mobile-first, stable home hero)
 * Visual/editorial UI only. AIR BET, B wallet, official data and settlement logic are untouched.
 */
(() => {
  "use strict";

  const ART = Object.freeze({
    mamoru: "assets/mamoru.png?v=20260815-9",
    miru: "assets/miru.png?v=20260815-9",
    shun: "assets/shun.png?v=20260815-9",
    editorial: "assets/482089DF-4357-438E-8721-A6EFC38F4891.png?v=20260815-9",
    cover: "assets/EFE288D7-4C85-4906-A6E9-1590E55E7070.png?v=20260815-10",
  });

  const PROFILES = Object.freeze({
    mamoru: Object.freeze({
      name: "加音 守",
      reading: "KANE MAMORU",
      role: "競艇担当記者・編集部デスク",
      image: ART.mamoru,
      intro: "勝敗を予想するのではなく、あなたが勝負を選んだ過程を取材する記者。",
      detail: "過去のAIR BET記録から、参加理由、納得度、現金で買いたい気持ち、予定額が増えた場面、短時間での連続参加などを振り返ります。艇・買い目・勝率を勧めるのではなく、本人が自分の行動に気づくための記事を作ります。",
    }),
    miru: Object.freeze({
      name: "木月 美留",
      reading: "KIZUKI MIRU",
      role: "新人記者・読者担当",
      image: ART.miru,
      intro: "『気づき、見る』を大切に、読者と同じ目線で記録を読む新人記者。",
      detail: "難しい数字をそのまま並べず、小さな変化や違和感を読みやすい言葉へ置き換える役。断定するのではなく、ユーザー自身が考えるための短い問いを編集部へ持ち込みます。",
    }),
    shun: Object.freeze({
      name: "一曲 瞬",
      reading: "ICHIMAGARI SHUN",
      role: "トップレーサー・守の幼なじみ",
      image: ART.shun,
      intro: "第一ターンマークを一瞬で切るような走りを見せるトップレーサー。",
      detail: "勝利を約束する存在ではなく、準備・集中・自己管理を体現する競技者。MAMO BOAT PRESSでは、結果だけでは見えない競技者側の準備や判断の世界を伝える役割を持ちます。",
    }),
  });

  function injectStyles() {
    ["mamoCharacterLayoutStyle", "mamoCharacterLayoutStyleV3", "mamoCharacterLayoutStyleV4", "mamoCharacterLayoutStyleV5", "mamoCharacterLayoutStyleV6", "mamoCharacterLayoutStyleV7"]
      .forEach((id) => document.getElementById(id)?.remove());

    const style = document.createElement("style");
    style.id = "mamoCharacterLayoutStyleV7";
    style.textContent = `
      .mamo-character-cut { image-rendering:auto !important; }

      #home .home-masthead { position:relative !important; isolation:isolate !important; background:#fffdf8 !important; }
      #home .home-masthead::before,
      #home .home-masthead::after { z-index:1 !important; pointer-events:none !important; }
      #home .masthead-brand,
      #home .masthead-wallet,
      #home .masthead-callout { position:absolute; z-index:4 !important; }
      #home .masthead-character.mamo-character-cut {
        position:absolute !important;
        inset:0 !important;
        left:0 !important; top:0 !important; right:0 !important; bottom:0 !important;
        width:100% !important; height:100% !important; max-width:none !important;
        display:block !important; pointer-events:none !important;
        object-fit:cover !important; object-position:center 8% !important;
        opacity:.82 !important; visibility:visible !important;
        filter:saturate(.88) brightness(1.04) contrast(.98) !important;
        transform:none !important;
        z-index:0 !important;
      }

      #venues .page-intro,
      #records .page-intro {
        position:relative !important; isolation:isolate !important;
        overflow:hidden !important; background:#fff !important; color:var(--ink) !important;
        min-height:190px !important;
        padding-right:39% !important;
      }
      #venues .page-intro > div,
      #records .page-intro > div { position:relative !important; z-index:3 !important; }
      #venues .page-intro .kicker,
      #records .page-intro .kicker { color:var(--teal-dark) !important; }
      #venues .page-intro p,
      #records .page-intro p { color:var(--muted) !important; }
      #venues .page-intro > img.mamo-character-cut,
      #records .page-intro > img.mamo-character-cut {
        position:absolute !important;
        left:auto !important; top:auto !important; right:1.5% !important; bottom:-2% !important;
        width:auto !important; height:112% !important; max-width:38% !important;
        display:block !important;
        object-fit:contain !important; object-position:right bottom !important;
        opacity:1 !important; visibility:visible !important;
        filter:none !important; transform:none !important;
        z-index:1 !important;
      }

      #analysis .analysis-intro {
        position:relative !important; isolation:isolate !important; overflow:hidden !important;
        height:220px !important; min-height:220px !important;
        padding:28px 47% 24px 20px !important;
        background:#fff !important; color:var(--ink) !important;
        border-bottom-color:var(--gold) !important;
      }
      #analysis .analysis-intro > div:first-child { position:relative !important; z-index:3 !important; }
      #analysis .analysis-intro .kicker { color:var(--teal-dark) !important; }
      #analysis .analysis-intro h1 { white-space:nowrap !important; font-size:38px !important; line-height:1.05 !important; }
      #analysis .analysis-intro p { color:var(--muted) !important; }
      .analysis-character-duo {
        position:absolute !important; right:1% !important; bottom:0 !important;
        width:46% !important; height:100% !important;
        display:flex !important; justify-content:flex-end !important; align-items:flex-end !important;
        gap:2px !important; overflow:hidden !important; pointer-events:none !important; z-index:1 !important;
      }
      .analysis-character-duo img {
        position:relative !important; inset:auto !important;
        width:auto !important; max-width:48% !important;
        display:block !important; object-fit:contain !important; object-position:center bottom !important;
        filter:none !important; transform:none !important; opacity:1 !important; visibility:visible !important;
      }
      .analysis-character-duo .duo-mamoru { height:105% !important; }
      .analysis-character-duo .duo-miru { height:94% !important; }
      .analysis-character-duo .editorial-scene {
        width:100% !important; max-width:100% !important; height:100% !important;
        object-fit:cover !important; object-position:center center !important;
      }

      .newsroom-cast { display:grid !important; grid-template-columns:1.08fr .96fr 1fr !important; gap:10px !important; }
      .cast-profile-card {
        appearance:none; width:100%; min-width:0; min-height:118px; padding:10px;
        border:1px solid var(--soft-line); border-top:4px solid var(--teal); background:#fff; color:var(--ink);
        display:grid; grid-template-columns:78px minmax(0,1fr) 18px; align-items:center; gap:10px;
        text-align:left; box-shadow:3px 4px 0 rgba(7,27,43,.07); cursor:pointer;
      }
      .cast-profile-card.miru { border-top-color:#d5a73b; }
      .cast-profile-card.shun { border-top-color:var(--coral); }
      .cast-profile-card .cast-thumb { width:78px; height:94px; display:grid; place-items:end center; overflow:hidden; border-radius:6px; background:#f4fbfc; }
      .cast-profile-card .cast-thumb img { width:100%; height:100%; display:block; object-fit:contain; object-position:center bottom; }
      .cast-profile-card small { display:block; color:var(--muted); font-size:8px; font-weight:900; line-height:1.35; }
      .cast-profile-card h3 { margin:4px 0 0; font-size:17px; letter-spacing:-.04em; }
      .cast-profile-card .cast-open-hint { display:block; margin-top:6px; color:var(--teal-dark); font-size:8px; font-weight:900; }
      .cast-profile-card .cast-arrow { color:var(--teal-dark); font-size:20px; font-weight:1000; }

      .cast-profile-overlay[hidden] { display:none !important; }
      .cast-profile-overlay {
        position:fixed; inset:0; z-index:120; display:grid; place-items:center; padding:18px;
        background:rgba(2,19,33,.72); backdrop-filter:blur(5px);
      }
      .cast-profile-dialog {
        position:relative; width:min(840px,96vw); max-height:90vh; overflow:auto;
        display:grid; grid-template-columns:minmax(280px,.9fr) minmax(300px,1.1fr);
        background:#fff; border-top:6px solid var(--teal); box-shadow:0 24px 70px rgba(0,0,0,.35);
      }
      .cast-profile-visual { min-height:390px; display:grid; place-items:end center; overflow:hidden; background:#f3fbfc; }
      .cast-profile-visual img { width:100%; height:390px; display:block; object-fit:contain; object-position:center bottom; }
      .cast-profile-copy { padding:34px 32px; align-self:center; }
      .cast-profile-copy .profile-kicker { color:var(--teal-dark); font-size:9px; font-weight:1000; letter-spacing:.14em; }
      .cast-profile-copy h2 { margin:8px 0 1px; font-size:34px; letter-spacing:-.06em; }
      .cast-profile-copy .profile-reading { color:var(--muted); font-size:10px; font-weight:900; letter-spacing:.08em; }
      .cast-profile-copy .profile-role { margin:18px 0 8px; color:var(--teal-dark); font-weight:1000; }
      .cast-profile-copy .profile-intro { margin:0 0 14px; font-size:15px; font-weight:900; line-height:1.7; }
      .cast-profile-copy .profile-detail { margin:0; color:var(--muted); font-size:12px; line-height:1.9; }
      .cast-profile-close { position:absolute; right:12px; top:12px; z-index:4; width:40px; height:40px; border:0; border-radius:50%; background:var(--navy); color:#fff; font-size:23px; line-height:1; }

      @media (max-width:700px) {
        #home .masthead-character.mamo-character-cut {
          inset:0 !important;
          width:100% !important; height:100% !important; max-width:none !important;
          object-fit:cover !important; object-position:center 8% !important;
          opacity:.82 !important;
        }
        #venues .page-intro,
        #records .page-intro { min-height:170px !important; padding-right:40% !important; }
        #venues .page-intro > img.mamo-character-cut,
        #records .page-intro > img.mamo-character-cut {
          right:-1% !important; bottom:0 !important; height:96% !important; max-width:39% !important;
        }
        #analysis .analysis-intro {
          height:330px !important; min-height:330px !important;
          padding:24px 18px 170px !important;
        }
        #analysis .analysis-intro h1 { white-space:nowrap !important; font-size:34px !important; letter-spacing:-.07em !important; }
        #analysis .analysis-intro p { max-width:100% !important; font-size:11px !important; }
        .analysis-character-duo {
          left:0 !important; right:0 !important; bottom:0 !important;
          width:100% !important; height:165px !important;
          justify-content:center !important; gap:4px !important;
        }
        .analysis-character-duo img { max-width:43% !important; }
        .analysis-character-duo .duo-mamoru { height:165px !important; }
        .analysis-character-duo .duo-miru { height:155px !important; }
        .newsroom-cast { grid-template-columns:1fr !important; }
        .cast-profile-card { grid-template-columns:72px minmax(0,1fr) 18px; min-height:100px; }
        .cast-profile-card .cast-thumb { width:72px; height:86px; }
        .cast-profile-dialog { grid-template-columns:1fr; width:min(94vw,520px); }
        .cast-profile-visual { min-height:260px; max-height:38vh; }
        .cast-profile-visual img { height:280px; }
        .cast-profile-copy { padding:22px 20px 26px; }
        .cast-profile-copy h2 { font-size:28px; }
      }

      @media (max-width:390px) {
        #home .masthead-character.mamo-character-cut { inset:0 !important; width:100% !important; height:100% !important; max-width:none !important; object-fit:cover !important; object-position:center 8% !important; opacity:.82 !important; }
        #venues .page-intro > img.mamo-character-cut,
        #records .page-intro > img.mamo-character-cut { right:-3% !important; height:92% !important; max-width:38% !important; }
        #analysis .analysis-intro { height:320px !important; min-height:320px !important; padding-bottom:160px !important; }
        #analysis .analysis-intro h1 { font-size:31px !important; }
        .analysis-character-duo { height:155px !important; }
        .analysis-character-duo .duo-mamoru { height:155px !important; }
        .analysis-character-duo .duo-miru { height:146px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function setImage(selector, src, alt, extraClass) {
    const img = document.querySelector(selector);
    if (!img) return null;
    img.src = src;
    img.alt = alt;
    img.loading = "eager";
    img.decoding = "async";
    img.removeAttribute("aria-hidden");
    img.classList.add("mamo-character-cut");
    if (extraClass) img.classList.add(extraClass);
    img.onerror = () => {
      console.error("MAMO character image failed:", src);
      img.style.display = "none";
    };
    img.onload = () => { img.style.display = "block"; };
    return img;
  }

  function ensureProfileOverlay() {
    let overlay = document.getElementById("castProfileOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "castProfileOverlay";
    overlay.className = "cast-profile-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="cast-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="castProfileName">
        <button class="cast-profile-close" type="button" aria-label="プロフィールを閉じる">×</button>
        <div class="cast-profile-visual"><img id="castProfileImage" alt=""></div>
        <div class="cast-profile-copy">
          <span class="profile-kicker">MAMO BOAT PRESS / PROFILE</span>
          <h2 id="castProfileName"></h2>
          <div id="castProfileReading" class="profile-reading"></div>
          <div id="castProfileRole" class="profile-role"></div>
          <p id="castProfileIntro" class="profile-intro"></p>
          <p id="castProfileDetail" class="profile-detail"></p>
        </div>
      </section>`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeCastProfile(); });
    overlay.querySelector(".cast-profile-close")?.addEventListener("click", closeCastProfile);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openCastProfile(key) {
    const p = PROFILES[key];
    if (!p) return;
    const overlay = ensureProfileOverlay();
    const image = overlay.querySelector("#castProfileImage");
    image.src = p.image;
    image.alt = p.name;
    overlay.querySelector("#castProfileName").textContent = p.name;
    overlay.querySelector("#castProfileReading").textContent = p.reading;
    overlay.querySelector("#castProfileRole").textContent = p.role;
    overlay.querySelector("#castProfileIntro").textContent = p.intro;
    overlay.querySelector("#castProfileDetail").textContent = p.detail;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCastProfile() {
    const overlay = document.getElementById("castProfileOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  window.openCastProfile = openCastProfile;
  window.closeCastProfile = closeCastProfile;

  function renderCastCards() {
    const analysis = document.getElementById("analysis");
    const cast = analysis?.querySelector(".newsroom-cast");
    if (!cast) return;
    const heading = cast.previousElementSibling?.querySelector("h2");
    if (heading) heading.textContent = "MAMO BOAT PRESSの3人";

    const card = (key, cls) => {
      const p = PROFILES[key];
      return `<button class="cast-profile-card ${cls}" type="button" data-cast-profile="${key}" aria-label="${p.name}のプロフィールを開く">
        <span class="cast-thumb"><img src="${p.image}" alt="${p.name}"></span>
        <span><small>${p.role}</small><h3>${p.name}</h3><span class="cast-open-hint">タップでプロフィール</span></span>
        <b class="cast-arrow" aria-hidden="true">›</b>
      </button>`;
    };

    cast.innerHTML = card("mamoru", "mamoru") + card("miru", "miru") + card("shun", "shun");
    cast.querySelectorAll("[data-cast-profile]").forEach((button) => {
      button.addEventListener("click", () => openCastProfile(button.dataset.castProfile));
    });
  }

  function renderAnalysisDuo() {
    const intro = document.querySelector("#analysis .analysis-intro");
    if (!intro) return;
    intro.querySelectorAll(":scope > img, :scope > .analysis-character-duo").forEach((node) => node.remove());
    const duo = document.createElement("div");
    duo.className = "analysis-character-duo";
    duo.setAttribute("aria-hidden", "true");
    duo.innerHTML = `<img class="editorial-scene" src="${ART.editorial}" alt="">`;
    intro.appendChild(duo);
  }

  function applyCharacterLayout() {
    injectStyles();
    setImage("#home .masthead-character", ART.mamoru, "加音 守", "character-home-mamoru");
    setImage("#venues .page-intro > img", ART.shun, "一曲 瞬", "character-venues-shun");
    setImage("#records .page-intro > img", ART.miru, "木月 美留", "character-records-miru");
    setImage("#onboard .onboard-panel[data-onboard='0'] img", ART.cover, "加音 守、木月 美留、一曲 瞬が表紙を飾るMAMO BOAT PRESS", "onboard-cover-art");
    renderAnalysisDuo();
    renderCastCards();
    ensureProfileOverlay();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCastProfile();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCharacterLayout, { once:true });
  } else {
    applyCharacterLayout();
  }
})();
