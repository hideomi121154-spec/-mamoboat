/* MAMO BOAT — marketplace feed + MAMO VALUE price guide. */
(() => {
  "use strict";
  if (window.__MAMO_SHOP_MARKETPLACE_V1__) return;
  window.__MAMO_SHOP_MARKETPLACE_V1__ = true;

  const API = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/shop-rakuten";
  const APP_KEY = "mamoboat_v40_personal";
  const FAV_KEY = "mamo_shop_favs";
  const PREF_KEY = "mamoboat_shop_value_preferences_v1";
  const TASTE_KEY = "mamoboat_shop_taste_v2";
  const VALUE = window.MamoShopValueCore;
  const PERIOD_LABELS = { today: "今日", week: "7日", month: "今月" };
  const DEFAULT_TASTE = { alcohol: 3, drinks: 3, daily: 3, snacks: 2, food: 1, home: 0, beauty: 0, hobby: 0, other: 0 };
  const SEGMENT_LABELS = { alcohol: "嗜好品", drinks: "飲料", daily: "日常品", snacks: "おつまみ", food: "食品", home: "暮らし", beauty: "ケア", hobby: "趣味", other: "おすすめ" };
  const MARKET_LINKS = [
    { icon: "日", title: "生活必需品", desc: "洗剤・紙製品・消耗品", query: "日用品 消耗品" },
    { icon: "食", title: "食品・飲料", desc: "水・米・保存食品", query: "食品 飲料 日用品" },
    { icon: "休", title: "休息とケア", desc: "睡眠・入浴・セルフケア", query: "睡眠 入浴 セルフケア" },
    { icon: "欲", title: "欲しかった物", desc: "趣味・家電・身の回り品", query: "家電 趣味 生活" },
  ];
  const COUPON_LINKS = [
    {
      eyebrow: "RAKUTEN COUPON",
      title: "楽天市場の公式クーポン",
      desc: "現在配布中の一般公開クーポンをまとめて確認できます。",
      action: "クーポン一覧を見る",
      url: "https://event.rakuten.co.jp/coupon/",
      primary: true,
    },
    {
      eyebrow: "FIRST SHOP",
      title: "初めてのショップ",
      desc: "対象ショップで使えるWELCOMEクーポンを確認。",
      action: "対象条件を見る",
      url: "https://event.rakuten.co.jp/food/coupon/new/",
    },
    {
      eyebrow: "FIRST RAKUTEN",
      title: "初めてのお買い物",
      desc: "楽天市場を初めて利用する方向けの特典を確認。",
      action: "対象条件を見る",
      url: "https://event.rakuten.co.jp/campaign/newpurchaser/",
    },
  ];

  let filter = "all";
  let items = [];
  let loading = false;
  let fallbackReason = "";
  let lastQuery = "";
  let searchTimer = null;
  let requestController = null;
  let lastLearnedSearch = "";
  const preferences = readJson(PREF_KEY, { period: "month" });
  let period = PERIOD_LABELS[preferences.period] ? preferences.period : "month";
  const favorites = new Set(readJson(FAV_KEY, []));
  const taste = { ...DEFAULT_TASTE, ...readJson(TASTE_KEY, {}) };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function money(value) {
    return `¥${Math.max(0, Math.round(Number(value) || 0)).toLocaleString("ja-JP")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""), location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
    } catch (_) {
      return "#";
    }
  }

  function segmentForText(value, fallback = "other") {
    const text = String(value || "");
    if (/おつまみ|ナッツ|珍味|せんべい|スナック|チョコ|カルパス/.test(text)) return "snacks";
    if (/ビール|発泡酒|チューハイ|ハイボール|ワイン|焼酎|日本酒/.test(text)) return "alcohol";
    if (/炭酸水|緑茶|お茶|コーヒー|飲料|清涼飲料|栄養ドリンク|ミネラルウォーター|ペットボトル/.test(text)) return "drinks";
    if (/ティッシュ|トイレットペーパー|洗剤|タオル|日用品|消耗品/.test(text)) return "daily";
    if (/食品|グルメ|レトルト|米|麺|肉|魚|スイーツ|カレー|牛丼|ラーメン|冷凍/.test(text)) return "food";
    if (/美容|コスメ|化粧|シャンプー|ケア/.test(text)) return "beauty";
    if (/家電|キッチン|家具|生活用品|調理家電/.test(text)) return "home";
    if (/アウトドア|スポーツ|趣味|ゲーム|ゴルフ|カー用品|洗車|車載|工具|DIY|プロテイン|筋トレ/.test(text)) return "hobby";
    return fallback;
  }

  function audienceAffinityScore(product) {
    const text = `${product?.name || ""} ${product?.catchcopy || ""}`;
    const mixedOrMale = /メンズ|男性用|男女兼用|ユニセックス/.test(text);
    const stronglyFemale = /ナイトブラ|ブラジャー|フェイスパック|シートマスク|美容液|まつげ|ネイル|脱毛|ワンピース/.test(text)
      || (!mixedOrMale && /レディース|女性用/.test(text));
    const maleInterest = /メンズ|ビール|発泡酒|チューハイ|ハイボール|炭酸水|お茶|コーヒー|おつまみ|ナッツ|珍味|牛丼|カレー|ラーメン|冷凍食品|焼肉|カー用品|洗車|車載|工具|DIY|家電|アウトドア|キャンプ|ゴルフ|筋トレ|プロテイン|シェーバー|髭剃り|サウナ/.test(text);
    const practical = /ティッシュ|トイレットペーパー|洗剤|タオル|ペットボトル|保存食|レトルト|日用品|消耗品/.test(text);
    return (maleInterest ? 16 : 0) + (practical ? 8 : 0) - (stronglyFemale ? 48 : 0);
  }

  function productSegment(product) {
    return segmentForText(
      `${product?.name || ""} ${product?.catchcopy || ""}`,
      product?.segment || "other",
    );
  }

  function isAgeRestricted(product) {
    const name = String(product?.name || "");
    if (/ノンアル|おつまみ|珍味|カルパス|ビールのお供|酒の肴|ジョッキ|グラス|サプリ|酵母/.test(name)) return false;
    return /ビール|発泡酒|チューハイ|ハイボール|ワイン|焼酎|日本酒/.test(name);
  }

  function learnTaste(segment, amount = 1) {
    if (!(segment in DEFAULT_TASTE)) return;
    taste[segment] = Math.min(20, Math.max(0, Number(taste[segment] || 0) + amount));
    saveJson(TASTE_KEY, taste);
  }

  function personalizeProducts(products) {
    return products.map((product, index) => ({ product, index })).sort((a, b) => {
      const aSegment = productSegment(a.product);
      const bSegment = productSegment(b.product);
      const aScore = Number(a.product.recommendationScore || 0) + audienceAffinityScore(a.product) + Number(taste[aSegment] || 0) * 3 + (favorites.has(String(a.product.id || "")) ? 15 : 0);
      const bScore = Number(b.product.recommendationScore || 0) + audienceAffinityScore(b.product) + Number(taste[bSegment] || 0) * 3 + (favorites.has(String(b.product.id || "")) ? 15 : 0);
      return bScore - aScore || a.index - b.index;
    }).map((entry) => entry.product);
  }

  function dealLabel(product) {
    const signals = product?.dealSignals || {};
    const pointRate = Math.max(1, Number(product?.pointRate) || 1);
    if (signals.limitedSale) return "期間限定";
    if (signals.couponMention) return "クーポン表記あり";
    if (signals.discountMention) return "特価表記あり";
    if (pointRate > 1) return `ポイント${pointRate}倍`;
    if (signals.freeShipping && Number(product?.reviewAverage || 0) >= 4.5) return "送料無料・高評価";
    return `MAMO USER PICK・${SEGMENT_LABELS[productSegment(product)] || "おすすめ"}`;
  }

  function currentTotals() {
    const state = readJson(APP_KEY, {});
    const records = Array.isArray(state.records) ? state.records : [];
    return VALUE?.periodTotals?.(records) || { today: 0, week: 0, month: 0, all: 0 };
  }

  function guideAmount() {
    return Math.max(0, Number(currentTotals()[period]) || 0);
  }

  function comparePrice(price) {
    return VALUE?.comparePrice?.(price, guideAmount()) || { state: "none", remaining: 0, ratio: 0 };
  }

  function installStyle() {
    if (document.getElementById("mamoShopMarketplaceStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoShopMarketplaceStyle";
    style.textContent = `
      #shop{background:#f5f8fa!important}
      #shop .shop-head{padding:13px 14px 9px!important;background:#fff!important}
      #shop .shop-brand h1{font-size:25px!important}
      #shop .shop-search{height:42px!important;border-radius:22px!important}
      #shop #shopCartOpen{display:none!important}
      #shop #shopFavToggle{display:block!important;border:0!important;font-size:25px!important}
      #shop .shop-cats{padding:7px 9px!important;gap:0!important;justify-content:space-around;background:#fff!important;border-bottom:1px solid #e7ecee!important}
      #shop .shop-cats button{border:0!important;border-radius:0!important;padding:10px 14px!important;color:#8a969c!important;background:#fff!important;box-shadow:none!important}
      #shop .shop-cats button.active{color:#0b9198!important;border-bottom:3px solid #0fb1b7!important}
      #shop .shop-cats button[data-shop-cat="mamo"],#shop .shop-cats button[data-shop-cat="race"]{display:none!important}
      #shop .shop-hero{margin:10px 10px 0!important;min-height:92px!important;border:0!important;border-radius:16px 16px 5px 5px!important;padding:17px!important;background:linear-gradient(125deg,#062944,#0b5268)!important;color:#fff!important;box-shadow:0 7px 18px rgba(8,35,61,.12)!important}
      #shop .shop-hero:after{display:none!important}
      #shop .shop-hero small{color:#f1bd3f!important;letter-spacing:.15em!important}
      #shop .shop-hero h2{font-size:20px!important;margin:4px 0!important;color:#fff!important}
      #shop .shop-hero p{font-size:10px!important;line-height:1.55!important;color:#d7e8ed!important}
      #shop .shop-note{display:block!important;margin:0 10px 10px!important;padding:8px 11px!important;border-radius:0 0 9px 9px!important;background:#e8f2f3!important;color:#49656e!important;font-size:8px!important;text-align:left!important}
      #mamoRakutenCoupons{margin:12px 10px 8px;border:1px solid #d4dee7;border-top:5px solid #dc2029;border-radius:16px;background:#fff;box-shadow:0 7px 18px rgba(8,43,74,.08);overflow:hidden}
      .mrc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 15px 11px}
      .mrc-head small{display:block;color:#b11922;font-size:8px;font-weight:1000;letter-spacing:.17em}
      .mrc-head h3{margin:4px 0 3px;color:#082b4a;font-size:20px;line-height:1.3}
      .mrc-head p{margin:0;color:#667b8c;font-size:9px;line-height:1.55}
      .mrc-pr{flex:0 0 auto;border:1px solid #dc2029;border-radius:999px;padding:4px 7px;color:#b11922;font-size:8px;font-weight:1000;letter-spacing:.08em}
      .mrc-primary{display:grid;grid-template-columns:46px 1fr auto;gap:11px;align-items:center;margin:0 12px 9px;padding:13px;border-radius:13px;background:#082b4a;color:#fff!important;text-decoration:none;box-shadow:0 4px 0 #dc2029}
      .mrc-ticket{display:grid;place-items:center;width:46px;height:46px;border-radius:11px;background:#dc2029;color:#fff;font-size:17px;font-weight:1000;transform:rotate(-2deg)}
      .mrc-primary small,.mrc-quick small{display:block;font-size:8px;font-weight:1000;letter-spacing:.12em}
      .mrc-primary small{color:#ff9da3}
      .mrc-primary b{display:block;margin-top:3px;color:#fff;font-size:14px;line-height:1.35}
      .mrc-primary em{color:#fff;font-size:18px;font-style:normal;font-weight:1000}
      .mrc-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 12px 12px}
      .mrc-quick{display:flex;min-width:0;min-height:112px;flex-direction:column;padding:11px;border:1px solid #dbe3ea;border-left:4px solid #dc2029;border-radius:12px;background:#f8fafc;color:#082b4a!important;text-decoration:none}
      .mrc-quick small{color:#b11922}
      .mrc-quick b{display:block;margin-top:5px;color:#082b4a;font-size:12px;line-height:1.35}
      .mrc-quick span{display:block;margin-top:4px;color:#6b7d8b;font-size:8px;line-height:1.5}
      .mrc-quick em{display:block;margin-top:auto;padding-top:7px;color:#b11922;font-size:9px;font-style:normal;font-weight:1000}
      .mrc-note{margin:0;padding:9px 13px;background:#edf3f8;color:#536b7c;font-size:8px;line-height:1.6}
      .mrc-note b{color:#b11922}
      #mamoValueEditorialSlot{min-width:0}
      #mamoShopValue{margin:0 0 18px;border:1px solid #d8e3e6;border-top:5px solid #d4a329;border-radius:16px;background:#fff;box-shadow:0 7px 18px rgba(8,35,61,.07);overflow:hidden}
      .msv-head{padding:15px 15px 10px;background:linear-gradient(135deg,#fffdf7,#f4fbfb)}
      .msv-head small{display:block;color:#977116;font-size:9px;font-weight:1000;letter-spacing:.14em}
      .msv-head h3{margin:4px 0;color:#08233d;font-size:20px;line-height:1.35}
      .msv-head p{margin:0;color:#6d7f88;font-size:10px;line-height:1.6}
      .msv-periods{display:flex;gap:6px;padding:0 15px 10px}
      .msv-periods button{flex:1;border:1px solid #dce4e6;border-radius:999px;background:#fff;color:#687b84;padding:8px 6px;font-size:10px;font-weight:900}
      .msv-periods button.active{border-color:#0aa8ae;background:#eafafa;color:#087f84}
      .msv-amount{display:flex;justify-content:space-between;align-items:end;gap:10px;margin:0 15px;padding:12px 0;border-top:1px solid #edf1f2}
      .msv-amount span{display:block;color:#72828a;font-size:9px;font-weight:900}
      .msv-amount strong{display:block;color:#08233d;font-size:31px;line-height:1.05;letter-spacing:-.04em}
      .msv-amount em{color:#0a969b;font-size:10px;font-style:normal;font-weight:1000;text-align:right}
      .msv-explain{margin:0;padding:10px 15px;background:#08233d;color:#dce9ed;font-size:9px;line-height:1.65}
      .msv-explain b{color:#f4c04b}
      #shop .shop-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;padding:5px 9px 30px!important}
      .mp-card{position:relative;min-width:0;border:1px solid #e1e7e9;border-radius:13px;background:#fff;overflow:hidden;box-shadow:0 4px 11px rgba(8,35,61,.045)}
      .mp-recommendation{grid-column:1/-1;padding:13px 14px;border:1px solid #d7e2e9;border-left:5px solid #dc2029;border-radius:13px;background:#fff;color:#667b8a;font-size:9px;line-height:1.65}
      .mp-recommendation small{display:block;color:#b11922;font-size:8px;font-weight:1000;letter-spacing:.14em}
      .mp-recommendation b{display:block;margin:2px 0;color:#082b4a;font-size:15px;line-height:1.4}
      .mp-recommendation em{color:#a51922;font-style:normal;font-weight:1000}
      .mp-img-link{display:block;background:#fff}
      .mp-img{aspect-ratio:1/1;width:100%;display:block;object-fit:contain;background:#fff}
      .mp-fav{position:absolute;right:7px;top:7px;z-index:3;width:35px;height:35px;border:0;border-radius:50%;background:rgba(244,247,248,.94);color:#89959b;font-size:19px}
      .mp-fav.on{color:#e34843}
      .mp-body{padding:9px 9px 11px}
      .mp-shop{font-size:8px;color:#89969c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mp-pick{display:inline-flex;max-width:100%;margin-bottom:5px;padding:4px 6px;border-radius:999px;background:#fff0f1;color:#b11922;font-size:7px;font-weight:1000;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mp-name{font-size:12px;line-height:1.42;color:#25333a;height:35px;overflow:hidden;margin:3px 0 4px;font-weight:800}
      .mp-rating{font-size:9px;color:#d99e10;white-space:nowrap}
      .mp-rating span{color:#68767d;margin-left:3px}
      .mp-price{font-size:20px;color:#d9342d;font-weight:1000;line-height:1.2;margin-top:5px}
      .mp-ship{font-size:8px;color:#74828a;font-weight:800;margin-top:2px}
      .mp-perks{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
      .mp-perk{display:inline-flex;align-items:center;min-height:20px;padding:3px 6px;border:1px solid #d9e2e9;border-radius:999px;background:#f4f7fa;color:#425c70;font-size:8px;font-weight:1000}
      .mp-perk.point{border-color:#efb1b5;background:#fff1f2;color:#a51922}
      .mp-perk.alcohol{border-color:#d8b46a;background:#fff8e8;color:#795814}
      .mp-value{margin-top:7px;padding:7px 8px;border-radius:8px;background:#f1f5f6;color:#51666f;font-size:9px;font-weight:900}
      .mp-value.within{background:#e6f8ef;color:#14734c}
      .mp-value.remaining{background:#fff6df;color:#8a6310}
      .mp-value i{display:block;height:4px;margin-top:5px;border-radius:999px;background:#d9e2e5;overflow:hidden}
      .mp-value i:after{content:"";display:block;width:var(--ratio);height:100%;background:#0aabb0;border-radius:inherit}
      .mp-link{display:block;margin-top:8px;border-radius:8px;background:#08233d;color:#fff!important;padding:9px 7px;font-size:9px;font-weight:1000;text-align:center;text-decoration:none}
      .mp-status{grid-column:1/-1;padding:28px 18px;text-align:center;color:#687b84;background:#fff;border:1px solid #e1e7e9;border-radius:14px}
      .mp-status b{display:block;color:#08233d;font-size:17px;margin-bottom:7px}
      .mp-status small{display:block;line-height:1.65}
      .mp-retry{margin-top:12px;border:0;border-radius:9px;background:#08233d;color:#fff;padding:10px 16px;font-weight:900}
      .mp-market-intro{grid-column:1/-1;padding:14px;border:1px solid #e0e7e9;border-radius:13px;background:#fff;color:#61747d;font-size:9px;line-height:1.65}
      .mp-market-intro b{display:block;color:#08233d;font-size:14px;margin-bottom:3px}
      .mp-market-card{display:flex;flex-direction:column;min-height:145px;padding:13px;border:1px solid #e0e7e9;border-radius:13px;background:#fff;text-decoration:none;box-shadow:0 4px 11px rgba(8,35,61,.045)}
      .mp-market-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:50%;background:#e9f7f7;color:#087f84;font-size:14px;font-weight:1000}
      .mp-market-card b{display:block;margin-top:10px;color:#08233d;font-size:14px}
      .mp-market-card small{display:block;margin-top:3px;color:#71828a;font-size:9px;line-height:1.45}
      .mp-market-card em{display:block;margin-top:auto;padding-top:8px;color:#0a9298;font-size:9px;font-style:normal;font-weight:1000}
      .mp-provider{grid-column:1/-1;padding:4px 8px 12px;color:#8a979d;font-size:8px;text-align:right}
      @media(max-width:370px){.msv-amount strong{font-size:27px}.mp-price{font-size:18px}#shop .shop-grid{gap:7px!important;padding-left:7px!important;padding-right:7px!important}.mrc-head h3{font-size:18px}.mrc-primary{grid-template-columns:42px 1fr auto}.mrc-ticket{width:42px;height:42px}.mrc-quick-grid{gap:6px}.mrc-quick{padding:9px}}
    `;
    document.head.appendChild(style);
  }

  function prepareShop() {
    const shop = document.getElementById("shop");
    if (!shop) return false;
    installStyle();
    const hero = shop.querySelector(".shop-hero");
    if (hero) {
      hero.querySelector("small").textContent = "MAMO BOAT SHOP / RAKUTEN";
      hero.querySelector("h2").textContent = "欲しいものを狭めず、好みに近い順へ。";
      hero.querySelector("p").textContent = "ビール・飲料・食品・日用品・家電・カー用品・アウトドアを初期傾向に、幅広い楽天商品からおすすめします。";
    }
    const note = shop.querySelector(".shop-note");
    if (note) note.textContent = "PR｜楽天市場への外部リンクを含みます。販売・決済・配送・クーポン適用は楽天市場と各販売店が行います。";
    ensureCategories();
    renderCouponHub();
    renderValuePanel();
    return Boolean(document.getElementById("shopGrid"));
  }

  function renderCouponHub() {
    const shop = document.getElementById("shop");
    const note = shop?.querySelector(".shop-note");
    const grid = document.getElementById("shopGrid");
    if (!shop || !note || !grid) return;
    let panel = document.getElementById("mamoRakutenCoupons");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoRakutenCoupons";
      panel.setAttribute("aria-labelledby", "mamoRakutenCouponTitle");
    }
    if (panel.previousElementSibling !== note) note.insertAdjacentElement("afterend", panel);
    if (panel.dataset.renderVersion === "20260828-1") return;
    panel.dataset.renderVersion = "20260828-1";
    const primary = COUPON_LINKS.find((entry) => entry.primary);
    const quick = COUPON_LINKS.filter((entry) => !entry.primary);
    panel.innerHTML = `
      <div class="mrc-head">
        <div><small>PUBLIC COUPON GUIDE</small><h3 id="mamoRakutenCouponTitle">今日使えるクーポンを先に確認。</h3><p>一般公開されている楽天公式の特典だけを案内します。</p></div>
        <span class="mrc-pr">PR</span>
      </div>
      <a class="mrc-primary" href="${escapeHtml(primary.url)}" target="_blank" rel="noopener noreferrer sponsored">
        <span class="mrc-ticket">%</span><span><small>${escapeHtml(primary.eyebrow)}</small><b>${escapeHtml(primary.title)}</b></span><em aria-hidden="true">→</em>
      </a>
      <div class="mrc-quick-grid">
        ${quick.map((entry) => `<a class="mrc-quick" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer sponsored"><small>${escapeHtml(entry.eyebrow)}</small><b>${escapeHtml(entry.title)}</b><span>${escapeHtml(entry.desc)}</span><em>${escapeHtml(entry.action)} →</em></a>`).join("")}
      </div>
      <p class="mrc-note"><b>割引額・対象者・期限は楽天側で必ず確認してください。</b> 対象者限定情報は掲載せず、MAMO BOAT独自の割引ではありません。</p>
    `;
  }

  function ensureCategories() {
    const categories = document.querySelector("#shop .shop-cats");
    if (!categories) return;
    const all = categories.querySelector('[data-shop-cat="all"]');
    const life = categories.querySelector('[data-shop-cat="life"]');
    if (all) all.textContent = "おすすめ";
    if (life) {
      life.textContent = "生活用品";
      life.dataset.marketFilter = "daily";
    }
    let food = categories.querySelector('[data-market-filter="food"]');
    if (!food) {
      food = document.createElement("button");
      food.type = "button";
      food.dataset.marketFilter = "food";
      food.textContent = "食品・飲料";
      categories.insertBefore(food, life || null);
    }
    if (food) food.textContent = "食品・飲料";
    if (all) all.dataset.marketFilter = "all";
    [all, food, life].filter(Boolean).forEach((button) => {
      button.classList.toggle("active", button.dataset.marketFilter === filter);
    });
  }

  function renderValuePanel() {
    const host = document.getElementById("mamoValueEditorialSlot");
    if (!host) return;
    let panel = document.getElementById("mamoShopValue");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoShopValue";
    }
    if (panel.parentElement !== host) host.appendChild(panel);
    document.getElementById("mamoValuePanel")?.remove();
    const amount = guideAmount();
    const label = PERIOD_LABELS[period];
    const renderKey = `${period}:${amount}`;
    if (panel.dataset.renderKey === renderKey) return;
    panel.dataset.renderKey = renderKey;
    panel.innerHTML = `
      <div class="msv-head">
        <small>MAMO VALUE / CORE RECORD</small>
        <h3>現金を使わなかった選択を、最初に見る。</h3>
        <p>勝ち負けではなく、現金投票をAIR BETへ置き換えた事実を期間別に確認します。</p>
      </div>
      <div class="msv-periods" role="group" aria-label="比較する期間">
        ${Object.entries(PERIOD_LABELS).map(([key, text]) => `<button type="button" class="${key === period ? "active" : ""}" data-value-period="${key}">${text}</button>`).join("")}
      </div>
      <div class="msv-amount">
        <div><span>${label}の仮想置換額</span><strong>${money(amount)}</strong></div>
        <em>${amount ? "SHOPの商品価格にも比較表示" : "AIR BET記録後に表示します"}</em>
      </div>
      <p class="msv-explain"><b>これは値引き額ではありません。</b> 実際の損失・貯金を補填するものではなく、AIR BETへ置き換えた現金予定額と商品価格を比べる目安です。</p>
    `;
  }

  function valueMarkup(price) {
    const comparison = comparePrice(price);
    const label = PERIOD_LABELS[period];
    if (comparison.state === "within") {
      return `<div class="mp-value within">${label}の比較額の範囲内<i style="--ratio:${comparison.ratio}%"></i></div>`;
    }
    if (comparison.state === "remaining") {
      return `<div class="mp-value remaining">比較額まで あと ${money(comparison.remaining)}<i style="--ratio:${comparison.ratio}%"></i></div>`;
    }
    return `<div class="mp-value">AIR BET記録後に価格比較<i style="--ratio:0%"></i></div>`;
  }

  function renderProducts() {
    const grid = document.getElementById("shopGrid");
    if (!grid) return;
    renderValuePanel();
    if (loading) {
      grid.innerHTML = '<div class="mp-status"><b>商品を取得中…</b><small>最新の商品情報を確認しています。</small></div>';
      return;
    }
    if (fallbackReason || !items.length) {
      renderFallback(grid);
      return;
    }

    const query = String(document.getElementById("shopSearch")?.value || "").trim();
    const broadRecommendation = filter === "all" && !query;
    const displayedItems = personalizeProducts(items);
    const recommendationIntro = broadRecommendation ? `
      <div class="mp-recommendation">
        <small>MAMO PICK / PERSONAL MIX</small>
        <b>幅広い商品を残し、好みに近いものを上へ。</b>
        ビール・飲料・食品・日用品・家電・カー用品・アウトドアを初期傾向として加味。女性向けを含む他の商品も除外せず、閲覧やお気に入りから並び順が少しずつ変わります。<em>実際の割引率・クーポン適用後価格は楽天市場で確認してください。</em>
      </div>` : "";

    grid.innerHTML = recommendationIntro + displayedItems.map((product) => {
      const id = String(product.id || product.url || product.name || "");
      const url = safeUrl(product.url);
      const image = safeUrl(product.image);
      const name = escapeHtml(product.name || "商品");
      const shopName = escapeHtml(product.shopName || "楽天市場");
      const segment = productSegment(product);
      const favorite = favorites.has(id);
      const pointRate = Math.max(1, Number(product.pointRate) || 1);
      const postageIncluded = product.postageFlag === 0 || product.postageFlag === "0";
      const perks = [
        postageIncluded ? '<span class="mp-perk">送料無料</span>' : '<span class="mp-perk">送料は商品ページで確認</span>',
        pointRate > 1 ? `<span class="mp-perk point">ポイント${pointRate}倍</span>` : "",
        isAgeRestricted(product) ? '<span class="mp-perk alcohol">20歳以上</span>' : "",
      ].filter(Boolean).join("");
      return `
        <article class="mp-card" data-market-product="${escapeHtml(id)}" data-market-segment="${escapeHtml(segment)}">
          <a class="mp-img-link" data-market-outbound href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer sponsored">
            <img class="mp-img" src="${escapeHtml(image)}" alt="${name}" loading="lazy">
          </a>
          <button type="button" class="mp-fav ${favorite ? "on" : ""}" data-market-fav="${escapeHtml(id)}" aria-label="お気に入り">${favorite ? "♥" : "♡"}</button>
          <div class="mp-body">
            <div class="mp-pick">${escapeHtml(dealLabel(product))}</div>
            <div class="mp-shop">${shopName}</div>
            <div class="mp-name">${name}</div>
            <div class="mp-rating">${product.reviewAverage ? `★ ${Number(product.reviewAverage).toFixed(1)}` : "レビュー"}<span>(${Number(product.reviewCount || 0).toLocaleString("ja-JP")})</span></div>
            <div class="mp-price">${money(product.price)}</div>
            <div class="mp-perks">${perks}</div>
            ${valueMarkup(product.price)}
            <a class="mp-link" data-market-outbound href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer sponsored">楽天市場で見る →</a>
          </div>
        </article>`;
    }).join("") + `<div class="mp-provider">PR｜商品情報：楽天市場 / ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}取得</div>`;
  }

  function renderFallback(grid) {
    const reason = fallbackReason === "setup"
      ? "実商品一覧は連携設定中です。"
      : fallbackReason === "error"
        ? "商品一覧へ接続できなかったため、売場への直接リンクを表示しています。"
        : "商品を探す売場を選んでください。";
    grid.innerHTML = `
      <div class="mp-market-intro"><b>まずは、生活に回したいものから。</b>${reason} 移動先で現在価格・送料・実際の割引を確認できます。${fallbackReason === "error" ? '<br><button type="button" class="mp-retry" data-market-retry>商品一覧を再読み込み</button>' : ""}</div>
      ${MARKET_LINKS.map((entry) => {
        const url = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(entry.query)}/`;
        return `<a class="mp-market-card" href="${url}" target="_blank" rel="noopener noreferrer sponsored"><span class="mp-market-icon">${entry.icon}</span><b>${entry.title}</b><small>${entry.desc}</small><em>楽天市場で探す →</em></a>`;
      }).join("")}
      <div class="mp-provider">PR｜購入・決済・配送は移動先の販売店が行います。</div>`;
  }

  function clientHeaders() {
    const key = String(window.MAMOBOAT_PILOT?.collector?.publishableKey || window.MAMOBOAT_PILOT?.collector?.anonKey || "").trim();
    if (!/^sb_publishable_|^eyJ/.test(key)) return {};
    const headers = { apikey: key };
    if (/^eyJ/.test(key)) headers.Authorization = `Bearer ${key}`;
    return headers;
  }

  async function load(force = false) {
    if (!prepareShop()) return;
    const input = document.getElementById("shopSearch");
    const query = String(input?.value || "").trim();
    const requestKey = `${filter}|${query}`;
    if (!force && requestKey === lastQuery && (items.length || fallbackReason)) {
      renderProducts();
      return;
    }
    lastQuery = requestKey;
    fallbackReason = "";
    loading = true;
    renderProducts();
    requestController?.abort();
    requestController = new AbortController();

    try {
      const url = new URL(API);
      url.searchParams.set("mix", "20260828-5");
      url.searchParams.set("cat", filter);
      url.searchParams.set("hits", "20");
      if (query) url.searchParams.set("q", query);
      const response = await fetch(url, {
        headers: clientHeaders(),
        cache: "no-store",
        signal: requestController.signal,
      });
      const data = await response.json();
      if (data?.setup_required) {
        items = [];
        fallbackReason = "setup";
      } else if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      } else {
        items = Array.isArray(data.items) ? data.items.filter((item) => Number(item?.price) > 0 && item?.url) : [];
        if (query && query !== lastLearnedSearch) {
          learnTaste(segmentForText(query), 1);
          lastLearnedSearch = query;
        }
        if (!items.length) fallbackReason = "empty";
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      items = [];
      fallbackReason = "error";
      console.warn("MAMO SHOP product feed unavailable", error);
    } finally {
      loading = false;
      renderProducts();
    }
  }

  function handleClick(event) {
    const outbound = event.target?.closest?.("[data-market-outbound]");
    if (outbound) {
      const card = outbound.closest("[data-market-product]");
      learnTaste(card?.dataset.marketSegment || "other", 1);
      return;
    }

    const periodButton = event.target?.closest?.("[data-value-period]");
    if (periodButton) {
      event.preventDefault();
      event.stopPropagation();
      period = PERIOD_LABELS[periodButton.dataset.valuePeriod] ? periodButton.dataset.valuePeriod : "month";
      saveJson(PREF_KEY, { period });
      renderProducts();
      return;
    }

    const categoryButton = event.target?.closest?.("#shop .shop-cats [data-market-filter]");
    if (categoryButton) {
      event.preventDefault();
      event.stopPropagation();
      filter = categoryButton.dataset.marketFilter || "all";
      ensureCategories();
      load(true);
      return;
    }

    const favoriteButton = event.target?.closest?.("[data-market-fav]");
    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();
      const id = favoriteButton.dataset.marketFav;
      const wasFavorite = favorites.has(id);
      wasFavorite ? favorites.delete(id) : favorites.add(id);
      const card = favoriteButton.closest("[data-market-product]");
      learnTaste(card?.dataset.marketSegment || "other", wasFavorite ? -1 : 2);
      saveJson(FAV_KEY, [...favorites]);
      renderProducts();
      return;
    }

    if (event.target?.closest?.("[data-market-retry]")) {
      event.preventDefault();
      event.stopPropagation();
      load(true);
      return;
    }

    if (event.target?.closest?.("#nav-shop")) setTimeout(() => load(false), 80);
  }

  function handleInput(event) {
    if (event.target?.id !== "shopSearch") return;
    event.stopPropagation();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(true), 450);
  }

  function boot() {
    installStyle();
    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);
    [0, 250, 700, 1500, 3000].forEach((delay) => setTimeout(() => {
      if (prepareShop()) load(false);
    }, delay));
    window.addEventListener("pageshow", () => {
      if (prepareShop()) load(false);
    });
    window.addEventListener("storage", (event) => {
      if (event.key === APP_KEY) renderProducts();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
