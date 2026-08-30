/* MAMO BOAT SHOP pilot — isolated commerce prototype for develop. */
(() => {
  "use strict";
  if (window.__MAMO_SHOP_PILOT__) return;
  window.__MAMO_SHOP_PILOT__ = true;

  const KEY = "mamoboat_shop_pilot_v1";
  const PRODUCTS = [
    { id:"press-set", cat:"mamo", name:"MAMO BOAT PRESS スターターセット", price:1980, old:2480, badge:"PILOT限定", icon:"📰", desc:"新聞風ステッカー・ノート・カードのセット" },
    { id:"towel", cat:"race", name:"レース観戦 タオル", price:1480, old:1980, badge:"おすすめ", icon:"🌊", desc:"観戦・遠征に使いやすいスポーツタオル" },
    { id:"bottle", cat:"life", name:"MAMO ステンレスボトル", price:2380, old:2980, badge:"会員価格", icon:"🥤", desc:"日常使いできる500mlボトル" },
    { id:"cap", cat:"mamo", name:"MAMO BOAT PRESS キャップ", price:2980, old:3480, badge:"NEW", icon:"🧢", desc:"シンプルなPRESSロゴ仕様" },
    { id:"pouch", cat:"race", name:"観戦トラベルポーチ", price:1780, old:2280, badge:"遠征向け", icon:"🎒", desc:"充電器・チケット類をまとめる小型ポーチ" },
    { id:"notebook", cat:"mamo", name:"勝負記録ノート", price:880, old:1100, badge:"編集部", icon:"📘", desc:"自分の判断を振り返るための記録ノート" },
    { id:"coffee", cat:"life", name:"MAMO MORNING コーヒー 5袋", price:980, old:1200, badge:"朝刊セット", icon:"☕", desc:"朝刊を読む時間のためのドリップバッグ" },
    { id:"stand", cat:"life", name:"スマホ観戦スタンド", price:1280, old:1580, badge:"便利", icon:"📱", desc:"レース映像や新聞閲覧向けの卓上スタンド" }
  ];

  function read() {
    try { return Object.assign({ favorites:[], cart:{} }, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (_) { return { favorites:[], cart:{} }; }
  }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
  let state = read();
  let category = "all";
  let query = "";
  let onlyFav = false;

  const money = n => `¥${Number(n||0).toLocaleString("ja-JP")}`;
  const discount = p => Math.max(0, Math.round((1 - p.price / p.old) * 100));

  function installStyle() {
    if (document.getElementById("mamoShopPilotStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoShopPilotStyle";
    s.textContent = `
      #shop{padding-bottom:110px;background:#f6f8fa;min-height:100vh;}
      #shop .shop-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #e4e8ec;padding:16px 18px 12px;}
      #shop .shop-brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
      #shop .shop-brand h1{margin:0;color:#08233d;font-size:26px;letter-spacing:-.04em;}
      #shop .shop-brand h1 span{color:#08aeb7;}
      #shop .shop-tools{display:flex;gap:8px;}
      #shop .shop-icon-btn{position:relative;border:1px solid #dde4e9;background:#fff;border-radius:12px;min-width:44px;height:44px;font-size:20px;color:#08233d;}
      #shop .shop-count{position:absolute;right:-5px;top:-6px;background:#ef5c55;color:#fff;border-radius:99px;min-width:20px;height:20px;padding:0 5px;display:grid;place-items:center;font-size:10px;font-weight:900;}
      #shop .shop-search{display:flex;gap:8px;align-items:center;background:#f3f6f8;border:1px solid #e1e7eb;border-radius:13px;padding:0 12px;height:46px;}
      #shop .shop-search input{border:0;background:transparent;outline:0;width:100%;font:inherit;color:#08233d;}
      #shop .shop-cats{display:flex;gap:8px;overflow-x:auto;padding:12px 18px;background:#fff;border-bottom:1px solid #edf0f2;scrollbar-width:none;}
      #shop .shop-cats::-webkit-scrollbar{display:none;}
      #shop .shop-cats button{white-space:nowrap;border:1px solid #dfe5e8;background:#fff;border-radius:999px;padding:9px 14px;font-weight:900;color:#687988;}
      #shop .shop-cats button.active{background:#08233d;border-color:#08233d;color:#fff;box-shadow:0 3px 0 #d9a62c;}
      #shop .shop-hero{margin:14px 18px 8px;padding:20px;border-radius:18px;background:linear-gradient(130deg,#08233d 0%,#0a5365 60%,#11b8bc 100%);color:#fff;position:relative;overflow:hidden;min-height:140px;box-shadow:0 8px 22px rgba(8,35,61,.15);}
      #shop .shop-hero:after{content:"B";position:absolute;right:-14px;bottom:-48px;font-size:150px;font-weight:1000;color:rgba(255,255,255,.08);transform:rotate(-8deg);}
      #shop .shop-hero small{display:block;color:#f0c75a;font-weight:900;letter-spacing:.08em;margin-bottom:5px;}
      #shop .shop-hero h2{margin:0 0 7px;font-size:25px;line-height:1.15;}
      #shop .shop-hero p{margin:0;max-width:78%;font-size:12px;line-height:1.65;color:#dbeaf0;}
      #shop .shop-note{margin:10px 18px;padding:12px 14px;border-radius:12px;background:#fff9e8;border:1px solid #f1dfaa;color:#74571a;font-size:11px;line-height:1.6;font-weight:800;}
      #shop .shop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:10px 18px 24px;}
      #shop .shop-card{background:#fff;border:1px solid #e1e6e9;border-radius:16px;overflow:hidden;box-shadow:0 5px 14px rgba(8,35,61,.055);position:relative;}
      #shop .shop-visual{height:128px;display:grid;place-items:center;font-size:54px;background:linear-gradient(145deg,#eef9fa,#f8fbfc 55%,#fff4d9);}
      #shop .shop-card:nth-child(3n+2) .shop-visual{background:linear-gradient(145deg,#f1f6ff,#fbfcff 55%,#eaf8ff);}
      #shop .shop-card:nth-child(3n) .shop-visual{background:linear-gradient(145deg,#fff2ee,#fffaf8 55%,#fff4d9);}
      #shop .shop-fav{position:absolute;right:9px;top:9px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(8,35,61,.12);background:rgba(255,255,255,.92);font-size:19px;color:#748492;}
      #shop .shop-fav.on{color:#ef5a5a;}
      #shop .shop-card-body{padding:12px;}
      #shop .shop-badge{display:inline-block;background:#e8f8f7;color:#078e93;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:1000;margin-bottom:7px;}
      #shop .shop-card h3{font-size:13px;line-height:1.4;margin:0 0 5px;color:#08233d;min-height:36px;}
      #shop .shop-desc{font-size:9px;line-height:1.5;color:#7a8995;min-height:28px;margin-bottom:8px;}
      #shop .shop-price{display:flex;align-items:end;justify-content:space-between;gap:6px;margin-bottom:9px;}
      #shop .shop-price strong{color:#db3d34;font-size:18px;}
      #shop .shop-price span{font-size:9px;color:#9aa5ad;text-decoration:line-through;}
      #shop .shop-off{font-size:9px;color:#d68b00;background:#fff3ce;border-radius:999px;padding:3px 6px;font-weight:900;}
      #shop .shop-add{width:100%;border:0;border-radius:10px;background:#08aeb7;color:#fff;min-height:38px;font-weight:1000;box-shadow:0 3px 0 #077f86;}
      #shop .shop-empty{grid-column:1/-1;background:#fff;border:1px dashed #ccd5db;border-radius:16px;padding:30px;text-align:center;color:#788894;}
      #shop .shop-cart-panel{position:fixed;inset:0;z-index:60;background:rgba(4,18,31,.52);display:none;align-items:flex-end;}
      #shop .shop-cart-panel.show{display:flex;}
      #shop .shop-cart-sheet{width:100%;max-height:78vh;background:#fff;border-radius:22px 22px 0 0;padding:18px;overflow:auto;box-shadow:0 -12px 30px rgba(0,0,0,.18);}
      #shop .shop-cart-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
      #shop .shop-cart-top h2{margin:0;color:#08233d;}
      #shop .shop-cart-close{border:0;background:#eef2f4;border-radius:10px;width:40px;height:40px;font-size:20px;}
      #shop .shop-cart-row{display:grid;grid-template-columns:46px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid #edf0f2;padding:10px 0;}
      #shop .shop-cart-ico{height:46px;border-radius:10px;display:grid;place-items:center;background:#f4f7f8;font-size:26px;}
      #shop .shop-cart-row b{display:block;color:#08233d;font-size:12px;line-height:1.4;}
      #shop .shop-cart-row small{color:#7f8d97;}
      #shop .shop-qty{display:flex;align-items:center;gap:7px;}
      #shop .shop-qty button{width:28px;height:28px;border:1px solid #dbe2e6;border-radius:8px;background:#fff;}
      #shop .shop-total{display:flex;justify-content:space-between;align-items:center;padding:18px 0 10px;font-weight:900;color:#08233d;}
      #shop .shop-total strong{font-size:24px;color:#db3d34;}
      #shop .shop-checkout{width:100%;border:0;border-radius:12px;background:#08233d;color:#fff;min-height:52px;font-weight:1000;font-size:15px;}
      #shop .shop-demo{margin-top:8px;text-align:center;color:#8a969e;font-size:9px;}
      .bottom-nav{
        gap:0!important;
        display:flex!important;
        grid-template-columns:none!important;
        flex-wrap:nowrap!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        -webkit-overflow-scrolling:touch;
        overscroll-behavior-x:contain;
        scrollbar-width:none;
        touch-action:pan-x;
      }
      .bottom-nav::-webkit-scrollbar{display:none;}
      .bottom-nav .nav{
        flex:0 0 68px!important;
        min-width:68px!important;
        min-height:58px!important;
        padding-left:2px!important;
        padding-right:2px!important;
      }
      .bottom-nav .nav span{font-size:8px!important;}
      .bottom-nav .nav b{font-size:19px!important;}
      @media(max-width:390px){#shop .shop-grid{gap:9px;padding-left:12px;padding-right:12px;}#shop .shop-visual{height:116px}.bottom-nav .nav{flex-basis:64px!important;min-width:64px!important}.bottom-nav .nav span{font-size:7px!important;}}
    `;
    document.head.appendChild(s);
  }

  function ensureUI() {
    if (document.getElementById("shop")) return;
    installStyle();
    const main = document.querySelector(".app-shell main");
    const settings = document.getElementById("settings");
    if (!main || !settings) return;
    const section = document.createElement("section");
    section.id = "shop";
    section.className = "screen";
    section.innerHTML = `
      <div class="shop-head">
        <div class="shop-brand"><h1>MAMO <span>SHOP</span></h1><div class="shop-tools">
          <button class="shop-icon-btn" id="shopFavToggle" aria-label="お気に入り">♡</button>
          <button class="shop-icon-btn" id="shopCartOpen" aria-label="カート">🛒<i class="shop-count" id="shopCartCount">0</i></button>
        </div></div>
        <label class="shop-search">⌕<input id="shopSearch" type="search" placeholder="商品を検索"></label>
      </div>
      <div class="shop-cats">
        <button class="active" data-shop-cat="all">おすすめ</button>
        <button data-shop-cat="mamo">MAMOグッズ</button>
        <button data-shop-cat="race">観戦・遠征</button>
        <button data-shop-cat="life">生活用品</button>
      </div>
      <div class="shop-hero"><small>MAMO MEMBER BENEFIT</small><h2>会員とSHOPを、つなぐ。</h2><p>将来は購読プラン限定価格・クーポン・限定商品と連動。今は操作感を確認するPILOTです。</p></div>
      <div class="shop-note">PILOT SHOP｜現在の商品・価格はすべてサンプルです。決済・注文・配送はまだ行われません。</div>
      <div id="shopGrid" class="shop-grid"></div>
      <div id="shopCartPanel" class="shop-cart-panel" aria-hidden="true"><div class="shop-cart-sheet">
        <div class="shop-cart-top"><h2>カート</h2><button class="shop-cart-close" id="shopCartClose">×</button></div>
        <div id="shopCartRows"></div><div class="shop-total"><span>合計</span><strong id="shopCartTotal">¥0</strong></div>
        <button class="shop-checkout" id="shopCheckout">購入へ進む</button><div class="shop-demo">PILOT版のため実際の決済は発生しません</div>
      </div></div>`;
    main.insertBefore(section, settings);

    const nav = document.querySelector(".bottom-nav");
    const settingsNav = document.getElementById("nav-settings");
    if (nav && settingsNav && !document.getElementById("nav-shop")) {
      const btn = document.createElement("button");
      btn.id = "nav-shop";
      btn.className = "nav";
      btn.innerHTML = "<b>▣</b><span>SHOP</span>";
      btn.addEventListener("click", () => { window.go?.("shop"); render(); });
      nav.insertBefore(btn, settingsNav);
    }

    bind();
    render();
  }

  function visibleProducts() {
    return PRODUCTS.filter(p => {
      if (category !== "all" && p.cat !== category) return false;
      if (onlyFav && !state.favorites.includes(p.id)) return false;
      if (query && !`${p.name} ${p.desc}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }

  function render() {
    const grid = document.getElementById("shopGrid");
    if (!grid) return;
    const products = visibleProducts();
    grid.innerHTML = products.length ? products.map(p => `
      <article class="shop-card">
        <div class="shop-visual">${p.icon}</div>
        <button class="shop-fav ${state.favorites.includes(p.id)?"on":""}" data-shop-fav="${p.id}">${state.favorites.includes(p.id)?"♥":"♡"}</button>
        <div class="shop-card-body"><span class="shop-badge">${p.badge}</span><h3>${p.name}</h3><div class="shop-desc">${p.desc}</div>
          <div class="shop-price"><div><strong>${money(p.price)}</strong><br><span>${money(p.old)}</span></div><i class="shop-off">${discount(p)}% OFF</i></div>
          <button class="shop-add" data-shop-add="${p.id}">カートに追加</button>
        </div>
      </article>`).join("") : `<div class="shop-empty">条件に合う商品がありません</div>`;
    updateCart();
    document.querySelectorAll("[data-shop-cat]").forEach(b => b.classList.toggle("active", b.dataset.shopCat === category));
    const favToggle = document.getElementById("shopFavToggle");
    if (favToggle) favToggle.textContent = onlyFav ? "♥" : "♡";
  }

  function updateCart() {
    const entries = Object.entries(state.cart).filter(([,q]) => q > 0);
    const count = entries.reduce((s,[,q]) => s + q, 0);
    const countEl = document.getElementById("shopCartCount"); if (countEl) countEl.textContent = count;
    const rows = document.getElementById("shopCartRows");
    const totalEl = document.getElementById("shopCartTotal");
    if (!rows || !totalEl) return;
    let total = 0;
    rows.innerHTML = entries.length ? entries.map(([id,q]) => {
      const p = PRODUCTS.find(x => x.id === id); if (!p) return ""; total += p.price*q;
      return `<div class="shop-cart-row"><div class="shop-cart-ico">${p.icon}</div><div><b>${p.name}</b><small>${money(p.price)}</small></div><div class="shop-qty"><button data-shop-qty="${id}" data-delta="-1">−</button><strong>${q}</strong><button data-shop-qty="${id}" data-delta="1">＋</button></div></div>`;
    }).join("") : `<div class="shop-empty">カートは空です</div>`;
    totalEl.textContent = money(total);
  }

  function bind() {
    document.getElementById("shopSearch")?.addEventListener("input", e => { query = e.target.value.trim(); render(); });
    document.querySelector(".shop-cats")?.addEventListener("click", e => { const b=e.target.closest("[data-shop-cat]"); if(!b)return; category=b.dataset.shopCat; onlyFav=false; render(); });
    document.getElementById("shopGrid")?.addEventListener("click", e => {
      const fav=e.target.closest("[data-shop-fav]"); if(fav){ const id=fav.dataset.shopFav; state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id]; save(state); render(); return; }
      const add=e.target.closest("[data-shop-add]"); if(add){ const id=add.dataset.shopAdd; state.cart[id]=(state.cart[id]||0)+1; save(state); updateCart(); add.textContent="追加しました ✓"; setTimeout(()=>{ if(document.body.contains(add)) add.textContent="カートに追加"; },700); }
    });
    document.getElementById("shopFavToggle")?.addEventListener("click",()=>{onlyFav=!onlyFav; category="all"; render();});
    const panel=document.getElementById("shopCartPanel");
    document.getElementById("shopCartOpen")?.addEventListener("click",()=>{panel?.classList.add("show"); panel?.setAttribute("aria-hidden","false"); updateCart();});
    document.getElementById("shopCartClose")?.addEventListener("click",()=>{panel?.classList.remove("show"); panel?.setAttribute("aria-hidden","true");});
    panel?.addEventListener("click",e=>{if(e.target===panel){panel.classList.remove("show");panel.setAttribute("aria-hidden","true");}});
    document.getElementById("shopCartRows")?.addEventListener("click",e=>{const b=e.target.closest("[data-shop-qty]");if(!b)return;const id=b.dataset.shopQty;state.cart[id]=Math.max(0,(state.cart[id]||0)+Number(b.dataset.delta));if(!state.cart[id])delete state.cart[id];save(state);updateCart();});
    document.getElementById("shopCheckout")?.addEventListener("click",()=>alert("PILOT SHOPのため、現在は実際の購入・決済は行いません。"));
  }

  function boot(){ ensureUI(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();