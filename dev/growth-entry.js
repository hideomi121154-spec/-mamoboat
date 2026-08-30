/* MAMO BOAT — X campaign entry v1 */
(() => {
  "use strict";

  const attribution = window.MAMO_ATTRIBUTION || { source: "", medium: "", campaign: "" };
  const params = new URL(String(window.location?.href || "https://mamoboat.local/")).searchParams;
  const source = attribution.source || String(params.get("from") || "").toLowerCase();
  const enabled = ["x", "twitter"].includes(source) || params.get("mamo_entry") === "x";
  const DISMISSED_KEY = "mamoboat_growth_entry_dismissed_v1";

  function wasDismissed() {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function rememberDismissal() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch (_) {}
  }

  if (!enabled || wasDismissed() || document.getElementById("mamoGrowthEntry")) return;

  const track = (destination, details = {}) => {
    try {
      window.MAMO_TRACK_EVENT?.("screen_view", {
        destination,
        ...attribution,
        ...details,
      }, { screen: "growth" });
    } catch (_) {}
  };

  function installStyle() {
    const style = document.createElement("style");
    style.id = "mamoGrowthEntryStyle";
    style.textContent = `
      #mamoGrowthEntry{position:fixed;inset:0;z-index:12500;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#f2eadf;color:#172d36;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #mamoGrowthEntry *{box-sizing:border-box}
      .mge-shell{width:min(100%,720px);min-height:100%;margin:auto;background:#fffdf8;box-shadow:0 0 50px rgba(54,40,19,.12)}
      .mge-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:calc(10px + env(safe-area-inset-top)) 18px 10px;background:rgba(255,253,248,.96);border-bottom:1px solid #e3dacd;backdrop-filter:blur(12px)}
      .mge-brand{display:flex;align-items:center;gap:9px}.mge-brand i{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;background:#d7a43a;color:#102b3a;font-style:normal;font-weight:1000}.mge-brand span{display:flex;flex-direction:column}.mge-brand b{font-size:15px;line-height:1}.mge-brand small{margin-top:3px;color:#9b741c;font-size:7px;font-weight:1000;letter-spacing:.14em}
      .mge-close{border:0;border-radius:999px;background:#eee6da;color:#172d36;min-height:38px;padding:0 14px;font-weight:900}
      .mge-hero{position:relative;padding:34px 20px 24px;overflow:hidden;background:linear-gradient(145deg,#102b3a 0%,#1b3e4b 64%,#5a3b16 100%);color:#fff}
      .mge-hero::after{content:"";position:absolute;width:230px;height:230px;right:-90px;top:-105px;border:34px solid rgba(255,255,255,.07);border-radius:50%}
      .mge-kicker{display:block;color:#e2b94f;font-size:9px;font-weight:1000;letter-spacing:.18em}.mge-hero h1{position:relative;z-index:1;margin:9px 0 13px;font-size:clamp(31px,8.2vw,52px);line-height:1.08;letter-spacing:-.06em}.mge-hero h1 em{color:#f0c45d;font-style:normal}.mge-hero p{position:relative;z-index:1;margin:0;max-width:570px;color:#d7e3e8;font-size:14px;line-height:1.85;font-weight:650}
      .mge-quote{margin:19px 0 0;padding:13px 14px;border-left:4px solid #e2b94f;background:rgba(255,255,255,.09);font-size:15px;font-weight:900;line-height:1.6}
      .mge-main{padding:22px 18px calc(30px + env(safe-area-inset-bottom))}
      .mge-story{display:grid;grid-template-columns:104px 1fr;gap:15px;align-items:center;padding:13px;border:1px solid #ded4c5;border-radius:18px;background:#fffdf8;box-shadow:0 10px 28px rgba(54,40,19,.08)}.mge-story img{display:block;width:104px;height:156px;object-fit:cover;border-radius:12px;border:1px solid #d6dcde}.mge-story small{display:block;color:#987219;font-size:8px;font-weight:1000;letter-spacing:.14em}.mge-story h2{margin:5px 0 7px;font-size:23px;line-height:1.18;letter-spacing:-.04em}.mge-story p{margin:0;color:#647681;font-size:11px;line-height:1.65}
      .mge-actions{display:grid;gap:10px;margin-top:16px}.mge-actions button{width:100%;min-height:56px;border-radius:14px;font-size:15px;font-weight:1000}.mge-story-button{border:0;background:#102b3a;color:#fff;box-shadow:0 9px 20px rgba(16,43,58,.22)}.mge-air-button{border:0;background:#d7a43a;color:#102b3a;box-shadow:0 9px 20px rgba(215,164,58,.28)}.mge-skip{border:0!important;background:transparent!important;color:#637580!important;min-height:42px!important;font-size:12px!important}
      .mge-section-title{margin:28px 0 12px}.mge-section-title small{display:block;color:#987219;font-size:8px;font-weight:1000;letter-spacing:.14em}.mge-section-title h2{margin:4px 0 0;font-size:24px;letter-spacing:-.04em}
      .mge-features{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mge-feature{min-height:130px;padding:13px 10px;border:1px solid #e3d9ca;border-top:4px solid #d7a43a;border-radius:13px;background:#faf6ed}.mge-feature:nth-child(2){border-top-color:#de6652}.mge-feature:nth-child(3){border-top-color:#102b3a}.mge-feature b{display:block;margin-bottom:7px;font-size:13px}.mge-feature p{margin:0;color:#647681;font-size:10px;line-height:1.6}
      .mge-mamokamo{display:grid;grid-template-columns:82px 1fr;gap:13px;align-items:center;margin-top:22px;padding:15px;border-radius:16px;background:#fff9e9;border:1px solid #e6d09a}.mge-mamokamo img{width:82px;height:82px;object-fit:contain}.mge-mamokamo small{display:block;color:#9a7419;font-size:8px;font-weight:1000;letter-spacing:.12em}.mge-mamokamo b{display:block;margin:4px 0;font-size:17px}.mge-mamokamo p{margin:0;color:#647681;font-size:10px;line-height:1.6}
      .mge-safety{margin:22px 0 0;padding:15px;border-radius:14px;background:#f3ecdf;color:#59686b;font-size:10px;line-height:1.75}.mge-safety b{color:#08233d}
      body.mamo-growth-open{overflow:hidden!important}
      @media(max-width:370px){.mge-features{grid-template-columns:1fr}.mge-feature{min-height:0}.mge-story{grid-template-columns:84px 1fr}.mge-story img{width:84px;height:126px}.mge-story h2{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function close() {
    document.getElementById("mamoGrowthEntry")?.remove();
    document.body.classList.remove("mamo-growth-open");
  }

  function dismiss() {
    rememberDismissal();
    close();
  }

  function openStory() {
    close();
    if (window.MAMO_STORY?.open) return window.MAMO_STORY.open();
    let script = document.querySelector('script[data-mamo-story="1"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "mamo-story.js?v=20260830-4";
      script.async = true;
      script.dataset.mamoStory = "1";
      document.head.appendChild(script);
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (window.MAMO_STORY?.open) {
        clearInterval(timer);
        window.MAMO_STORY.open();
      } else if (attempts >= 50) {
        clearInterval(timer);
        window.go?.("home");
      }
    }, 100);
  }

  function openAirBet() {
    track("air_bet_entry", { source_detail: "growth_landing" });
    rememberDismissal();
    close();
    if (typeof window.openAirBetOnboarding === "function") {
      window.openAirBetOnboarding("growth_landing");
      return;
    }
    window.go?.("home");
  }

  function render() {
    installStyle();
    const overlay = document.createElement("section");
    overlay.id = "mamoGrowthEntry";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "mamoGrowthTitle");
    overlay.innerHTML = `
      <div class="mge-shell">
        <header class="mge-top">
          <div class="mge-brand"><i>B</i><span><b>MAMO BOAT</b><small>CONTROL YOUR BET</small></span></div>
          <button class="mge-close" type="button">アプリを開く</button>
        </header>
        <div class="mge-hero">
          <span class="mge-kicker">FOR BOAT RACE FANS / 20+</span>
          <h1 id="mamoGrowthTitle">勝ち方ではなく、<br><em>勝負の選び方を。</em></h1>
          <p>「とりあえず100円」を、まずAIR BETへ。現金を使わずに試し、記録して振り返る。本当に勝負したいレースを、自分で選ぶためのツールです。</p>
          <div class="mge-quote">本当に勝負したいのは、このレース？</div>
        </div>
        <main class="mge-main">
          <article class="mge-story">
            <img src="assets/mamo-story/mamo-story-01.png?v=20260822-14" alt="MAMO STORY 第1コマ">
            <div><small>MAMO STORY / READ FIRST</small><h2>3分でわかる<br>MAMO BOAT</h2><p>「なんとなく100円」が、自分で選ぶ勝負へ変わるまで。</p></div>
          </article>
          <div class="mge-actions">
            <button class="mge-story-button" type="button">漫画を読む（全16コマ） →</button>
            <button class="mge-air-button" type="button">AIR BETを体験する</button>
          </div>
          <div class="mge-section-title"><small>HOW MAMO BOAT WORKS</small><h2>賭けたい気持ちを、記録に変える。</h2></div>
          <div class="mge-features">
            <article class="mge-feature"><b>現金を使わない</b><p>AIR BETは換金不能なBメダルだけ。入金・購入・換金はありません。</p></article>
            <article class="mge-feature"><b>勝敗を予想しない</b><p>艇・買い目・賭け金は勧めず、選んだ過程だけを記録します。</p></article>
            <article class="mge-feature"><b>あとから振り返る</b><p>金額や参加の間隔を見て、「いつもの自分」との違いを知ります。</p></article>
          </div>
          <article class="mge-mamokamo">
            <img src="assets/mamokamo-ai-v5.png?v=20260822-5" alt="AI分析担当マモカモ">
            <div><small>MAMOKAMO / AI ANALYST</small><b>AI分析は、マモカモ担当。</b><p>AIR BETとMAMO RECORDから、勝敗ではなく行動のクセを分かりやすく届けます。</p></div>
          </article>
          <div class="mge-safety"><b>競艇予想サービスではありません。</b><br>20歳以上向けの開発中サービスです。AIR BETに現金価値はなく、実際の投票・入出金・換金はできません。</div>
          <div class="mge-actions"><button class="mge-air-button" type="button">AIR BETを体験する</button><button class="mge-skip" type="button">今回はアプリだけ開く</button></div>
        </main>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("mamo-growth-open");
    overlay.querySelector(".mge-close").addEventListener("click", dismiss);
    overlay.querySelector(".mge-story-button").addEventListener("click", openStory);
    overlay.querySelectorAll(".mge-air-button").forEach(button => button.addEventListener("click", openAirBet));
    overlay.querySelector(".mge-skip").addEventListener("click", dismiss);
    track("growth_landing", { entry: "x" });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
  else render();
})();
