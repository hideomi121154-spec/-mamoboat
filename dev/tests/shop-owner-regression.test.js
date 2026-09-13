const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const devRoot = path.resolve(__dirname, "..");
const shop = fs.readFileSync(path.join(devRoot, "mamo-shop.js"), "utf8");
const marketplace = fs.readFileSync(path.join(devRoot, "mamo-shop-marketplace.js"), "utf8");
const secondaryMenu = fs.readFileSync(path.join(devRoot, "mamo-secondary-menu.js"), "utf8");

assert.match(shop, /SHOP shell — marketplace is the single owner of product content/);
assert.match(shop, /商品情報を読み込んでいます/);
assert.doesNotMatch(shop, /MAMO BOAT PRESS スターターセット|レース観戦 タオル|MAMO ステンレスボトル|MAMO BOAT PRESS キャップ/);
assert.doesNotMatch(shop, /カートに追加|購入へ進む|PILOT SHOP｜現在の商品・価格はすべてサンプル/);
assert.doesNotMatch(shop, /grid\.innerHTML = products\.length \? products\.map/);
assert.doesNotMatch(shop, /bind\(\);\s*render\(\);/);

assert.match(marketplace, /楽天市場で見る →/);
assert.match(marketplace, /renderProducts\(\)/);
assert.match(marketplace, /販売・決済・配送・クーポン適用は楽天市場と各販売店が行います/);

assert.doesNotMatch(secondaryMenu, /MAMO_SHOP_PILOT\?\.render/);
assert.match(secondaryMenu, /window\.go\?\.\("shop"\)/);

console.log("SHOP marketplace ownership regression checks passed");
