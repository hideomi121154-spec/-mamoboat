const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const devRoot = path.resolve(__dirname, "..");
const shop = fs.readFileSync(path.join(devRoot, "mamo-shop.js"), "utf8");
const marketplace = fs.readFileSync(path.join(devRoot, "mamo-shop-marketplace.js"), "utf8");
const secondaryMenu = fs.readFileSync(path.join(devRoot, "mamo-secondary-menu.js"), "utf8");

assert.match(shop, /function requestMarketplaceRender\(\)/);
assert.match(shop, /window\.MAMO_SHOP_MARKETPLACE\?\.load\?\.\(false\)/);
assert.match(shop, /商品情報を読み込んでいます/);
assert.doesNotMatch(shop, /grid\.innerHTML = products\.length \? products\.map/);
assert.doesNotMatch(shop, /bind\(\);\s*render\(\);/);

assert.match(marketplace, /window\.MAMO_SHOP_MARKETPLACE = Object\.freeze/);
assert.match(marketplace, /load, renderProducts, prepareShop/);

assert.match(secondaryMenu, /window\.MAMO_SHOP_MARKETPLACE\?\.load\?\.\(false\)/);
assert.doesNotMatch(secondaryMenu, /MAMO_SHOP_PILOT\?\.render/);

console.log("SHOP marketplace ownership regression checks passed");
