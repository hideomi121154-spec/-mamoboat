/* v4.0.1 character layout refresh.
 * Visual / editorial UI only. AIR BET, B wallet, official results and settlement logic are untouched.
 */
(() => {
  const ART = Object.freeze({
    mamoru: "assets/cast/mamoru.webp?v=20260815-2",
    miru: "assets/cast/miru.webp?v=20260815-2",
    shun: "assets/cast/shun.webp?v=20260815-2",
  });

  const PROFILES = Object.freeze({
    mamoru: Object.freeze({
      name: "加音 守",
      reading: "KANE MAMORU",
      role: "競艇担当記者・編集部デスク",
      image: ART.mamoru,
      intro: "勝敗を予想するのではなく、あなたが勝負を選んだ過程を取材する記者。",
      detail: "過去のAIR BET記録から、参加理由、納得度、現金で買いたい気持ち、予定額が増えた場面、短時間の連続参加などを振り返ります。艇・買い目・勝率は勧めず、本人が自分の行動に気づける記事を作ります。",
    }),
    miru: Object.freeze({
      name: "木月 美留",
      reading: "KIZUKI MIRU",
      role: "新人記者・読者担当",
      image: ART.miru,
      intro: "読者と同じ目線で『なぜ？』を拾う、新人記者。",
      detail: "難しい数字をそのまま並べず、記録の変化を読みやすい言葉へ置き換える役。小さな違和感や変化を見つけ、ユーザー自身が考えるための短い問いを編集部へ持ち込みます。",
    }),
    shun: Object.freeze({
      name: "一曲 瞬",
      reading: "ICHIMAGARI SHUN",
      role: "トップレーサー・守の幼なじみ",
      image: ART.shun,
      intro: "1マークを一瞬で切る、MAMO BOATのトップレーサー。",
      detail: "勝敗を保証する存在ではなく、準備と自己管理を体現する競技者。MAMO BOAT PRESSでは、結果だけでは見えない選手側の準備や判断の世界を伝える役割を持ちます。",
    }),
  });

  function injectStyles() {
    if (document.getElementById("mamoCharacterLayoutStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoCharacterLayoutStyle";
    style.textContent = `
      #home .masthead-character.mamo-character-cut {
        inset: auto -2% -13% auto !important;
        width: 59% !important;
        height: 125% !important;
        object-fit: cover !important;
        object-position: 50% 18% !important;
        transform: none !important;
        filter: none !important;
      }
      #venues .page-intro > img.mamo-character-cut,
      #records .page-intro > img.mamo-character-cut {
        position: absolute !important;
        right: -1% !important;
        bottom: -38% !important;
        width: 51% !important;
        height: 175% !important;
        object-fit: cover !important;
        object-position: 50% 18% !important;
        filter: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      #records .page-intro > img.mamo-character-cut {
        right: 1% !important;
        bottom: -47% !important;
        width: 48% !important;
        height: 185% !important;
        object-position: 50% 12% !important;
      }
      #venues .page-intro,
      #records .page-intro {
        background: linear-gradient(100deg,#fff 0 52%,#eff8fb 72%,#dff5f7 100%) !important;
        color: var(--ink) !important;
      }
      #venues .page-intro .kicker,
      #records .page-intro .kicker { color: var(--teal-dark) !important; }
      #venues .page-intro p,
      #records .page-intro p { color: var(--muted) !important; }

      #analysis .analysis-intro {
        background: linear-gradient(100deg,#fff 0 53%,#f3fbfc 75%,#e5f6f6 100%) !important;
        color: var(--ink) !important;
      }
      #analysis .analysis-intro .kicker { color: var(--teal-dark) !important; }
      #analysis .analysis-intro p { color: var(--muted) !important; }
      .analysis-character-duo {
        position: absolute; right: 0; bottom: 0; width: 49%; height: 100%; overflow: hidden;
        display: flex; align-items: flex-end; justify-content: flex-end; pointer-events: none;
      }
      .analysis-character-duo img {
        position: relative !important; inset: auto !important; flex: 0 0 58%; width: 58% !important; height: 145% !important;
        object-fit: cover !important; object-position: 50% 13% !important; filter: none !important; opacity: 1 !important;
      }
      .analysis-character-duo .duo-mamoru { margin-right: -19%; z-index: 2; transform: translateY(24%) !important; }
      .analysis-character-duo .duo-miru { z-index: 1; transform: translateY(22%) !important; }

      .newsroom-cast { grid-template-columns: 1.08fr .96fr 1fr !important; gap: 10px !important; }
      .cast-profile-card {
        appearance: none; width: 100%; min-width: 0; min-height: 116px; padding: 10px; border: 1px solid var(--soft-line);
        border-top: 4px solid var(--teal); background: white; color: var(--ink); text-align: left;
        display: grid; grid-template-columns: 82px minmax(0,1fr) 18px; align-items: center; gap: 10px;
        box-shadow: 3px 4px 0 rgba(7,27,43,.07); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease;
      }
      .cast-profile-card:hover { transform: translateY(-2px); box-shadow: 5px 7px 0 rgba(7,27,43,.10); }
      .cast-profile-card.miru { border-top-color: #d5a73b; }
      .cast-profile-card.shun { border-top-color: var(--coral); }
      .cast-profile-card img { width: 82px; height: 94px; object-fit: cover; object-position: 50% 18%; border-radius: 6px; background: #edf5f7; }
      .cast-profile-card small { display:block; color: var(--muted); font-size: 8px; font-weight: 900; line-height: 1.4; }
      .cast-profile-card h3 { margin: 4px 0 0; font-size: 17px; letter-spacing: -.04em; }
      .cast-profile-card .cast-open-hint { display:block; margin-top:7px; color:var(--teal-dark); font-size:8px; font-weight:900; }
      .cast-profile-card .cast-arrow { color: var(--teal-dark); font-size: 20px; font-weight: 1000; }

      .cast-profile-overlay[hidden] { display:none; }
      .cast-profile-overlay { position:fixed; inset:0; z-index:120; display:grid; place-items:center; padding:18px; background:rgba(2,19,33,.72); backdrop-filter:blur(5px); }
      .cast-profile-dialog { position:relative; width:min(820px,96vw); max-height:90vh; overflow:auto; display:grid; grid-template-columns:minmax(250px,.9fr) minmax(280px,1.1fr); background:white; border-top:6px solid var(--teal); box-shadow:0 24px 70px rgba(0,0,0,.35); }
      .cast-profile-visual { min-height:480px; background:#edf8fa; overflow:hidden; }
      .cast-profile-visual img { width:100%; height:100%; min-height:480px; display:block; object-fit:cover; object-position:50% 18%; }
      .cast-profile-copy { padding:34px 32px; align-self:center; }
      .cast-profile-copy .profile-kicker { color:var(--teal-dark); font-size:9px; font-weight:1000; letter-spacing:.14em; }
      .cast-profile-copy h2 { margin:8px 0 1px; font-size:34px; letter-spacing:-.06em; }
      .cast-profile-copy .profile-reading { color:var(--muted); font-size:10px; font-weight:900; letter-spacing:.08em; }
      .cast-profile-copy .profile-role { margin:18px 0 8px; color:var(--teal-dark); font-weight:1000; }
      .cast-profile-copy .profile-intro { margin:0 0 14px; font-size:15px; font-weight:900; line-height:1.7; }
      .cast-profile-copy .profile-detail { margin:0; color:var(--muted); font-size:12px; line-height:1.9; }
      .cast-profile-close { position:absolute; right:12px; top:12px; z-index:2; width:38px; height:38px; border:0; border-radius:50%; background:var(--navy); color:white; font-size:22px; line-height:1; }
      #onboard .mamo-character-cut { object-fit:cover !important; object-position:50% 16% !important; filter:none !important; }

      @media (max-width: 700px) {
        #home .masthead-character.mamo-character-cut { width:74% !important; right:-14% !important; object-position:47% 16% !important; }
        #venues .page-intro > img.mamo-character-cut { width:60% !important; right:-10% !important; }
        #records .page-intro > img.mamo-character-cut { width:58% !important; right:-8% !important; }
        .analysis-character-duo { width:58%; right:-9%; }
        .newsroom-cast { grid-template-columns:1fr !important; }
        .cast-profile-card { grid-template-columns:74px minmax(0,1fr) 18px; min-height:100px; }
        .cast-profile-card img { width:74px; height:82px; }
        .cast-profile-dialog { grid-template-columns:1fr; }
        .cast-profile-visual { min-height:320px; max-height:42vh; }
        .cast-profile-visual img { min-height:320px; max-height:42vh; object-position:50% 16%; }
        .cast-profile-copy { padding:24px 22px 28px; }
        .cast-profile-copy h2 { font-size:28px; }
      }
    `;
    document.head.appendChild(style);
  }

  function setImage(selector, src, alt, extraClass) {
    const img = document.querySelector(selector);
    if (!img) return null;
    img.src = src;
    img.alt = alt;
    img.removeAttribute("aria-hidden");
    img.classList.add("mamo-character-cut");
    if (extraClass) img.classList.add(extraClass);
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
    overlay.querySelector(".cast-profile-close").addEventListener("click", closeCastProfile);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openCastProfile(key) {
    const profile = PROFILES[key];
    if (!profile) return;
    const overlay = ensureProfileOverlay();
    const image = overlay.querySelector("#castProfileImage");
    image.src = profile.image;
    image.alt = profile.name;
    overlay.querySelector("#castProfileName").textContent = profile.name;
    overlay.querySelector("#castProfileReading").textContent = profile.reading;
    overlay.querySelector("#castProfileRole").textContent = profile.role;
    overlay.querySelector("#castProfileIntro").textContent = profile.intro;
    overlay.querySelector("#castProfileDetail").textContent = profile.detail;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    overlay.querySelector(".cast-profile-close").focus({ preventScroll: true });
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
    const heading = analysis.querySelector(".section-head h2");
    if (heading) heading.textContent = "MAMO BOAT PRESSの3人";

    const card = (key, roleShort, cls) => {
      const p = PROFILES[key];
      return `<button class="cast-profile-card ${cls}" type="button" onclick="openCastProfile('${key}')" aria-label="${p.name}のプロフィールを開く">
        <img src="${p.image}" alt="" aria-hidden="true">
        <span><small>${roleShort}</small><h3>${p.name}</h3><span class="cast-open-hint">タップでプロフィール</span></span>
        <b class="cast-arrow" aria-hidden="true">›</b>
      </button>`;
    };
    cast.innerHTML = [
      card("mamoru", "競艇担当記者・編集部デスク", "mamoru"),
      card("miru", "新人記者・読者担当", "miru"),
      card("shun", "トップレーサー・守の幼なじみ", "shun"),
    ].join("");
  }

  function renderAnalysisDuo() {
    const intro = document.querySelector("#analysis .analysis-intro");
    if (!intro) return;
    intro.querySelectorAll(":scope > img, :scope > .analysis-character-duo").forEach((node) => node.remove());
    const duo = document.createElement("div");
    duo.className = "analysis-character-duo";
    duo.setAttribute("aria-hidden", "true");
    duo.innerHTML = `<img class="duo-mamoru" src="${ART.mamoru}" alt=""><img class="duo-miru" src="${ART.miru}" alt="">`;
    intro.appendChild(duo);
  }

  function applyCharacterLayout() {
    injectStyles();
    setImage("#home .masthead-character", ART.mamoru, "加音 守", "character-home-mamoru");
    setImage("#venues .page-intro > img", ART.shun, "一曲 瞬", "character-venues-shun");
    setImage("#records .page-intro > img", ART.miru, "木月 美留", "character-records-miru");
    setImage("#onboard .onboard-panel[data-onboard='0'] img", ART.shun, "一曲 瞬", "character-onboard-shun");
    const onboardTag = document.querySelector(".onboard-racer-tag span");
    if (onboardTag) onboardTag.textContent = "一曲 瞬 / 加音 守の幼なじみ";
    renderAnalysisDuo();
    renderCastCards();
    ensureProfileOverlay();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCastProfile();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCharacterLayout, { once: true });
  } else {
    applyCharacterLayout();
  }
})();
