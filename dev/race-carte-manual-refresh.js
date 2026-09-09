/* MAMO BOAT — Race Carte manual official-data refresh v1
 * Adds a user-triggered refresh button to the open Race Carte.
 * Reuses the existing snapshot/backfill path so app/navigation/render ownership stays untouched.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_MANUAL_REFRESH_V1__) return;
  window.__MAMO_RACE_CARTE_MANUAL_REFRESH_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const VENUES = {
    "01":"桐生","02":"戸田","03":"江戸川","04":"平和島","05":"多摩川","06":"浜名湖",
    "07":"蒲郡","08":"常滑","09":"津","10":"三国","11":"びわこ","12":"住之江",
    "13":"尼崎","14":"鳴門","15":"丸亀","16":"児島","17":"宮島","18":"徳山",
    "19":"下関","20":"若松","21":"芦屋","22":"福岡","23":"唐津","24":"大村"
  };

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; }
    catch (_) { return {}; }
  }

  function orderedRecords() {
    const state = readState();
    return (Array.isArray(state.records) ? state.records : [])
      .filter(Boolean)
      .slice()
      .sort((a, b) => String(b.time || b.createdAt || b.raceDate || "")
        .localeCompare(String(a.time || a.createdAt || a.raceDate || "")));
  }

  function venueLabel(record) {
    const direct = String(record?.venue || record?.venueName || "").replace(/\s+/g, "");
    if (direct) return direct;
    const code = String(record?.venueCode || record?.jcd || "").replace(/\D/g, "").padStart(2, "0");
    return VENUES[code] || "";
  }

  function activeRecord() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return null;
    const title = String(overlay.querySelector(".mamo-carte-hero h2")?.textContent || "").replace(/\s+/g, "");
    return orderedRecords().find(record => {
      const venue = venueLabel(record);
      const race = String(record?.raceNo || record?.race || "").replace(/R$/i, "");
      return venue && race && title.includes(venue) && title.includes(`${race}R`);
    }) || null;
  }

  function technique(record) {
    const values = [
      record?.resultTechnique,
      record?.resultSnapshot?.kimarite,
      record?.resultSnapshot?.winningMethod,
      record?.kimarite,
      record?.winningMethod,
      record?.result?.kimarite,
      record?.result?.winningMethod
    ];
    return String(values.find(value => value != null && String(value).trim() && String(value).trim() !== "未保存") || "").trim();
  }

  function ensureStyle() {
    if (document.getElementById("mamoCarteManualRefreshStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoCarteManualRefreshStyle";
    style.textContent = `
      .mamo-carte-manual-refresh{margin:0 0 10px;padding:10px;border:1px solid #d8e3e8;border-radius:12px;background:#f8fbfc}
      .mamo-carte-manual-refresh button{width:100%;min-height:44px;border:1.5px solid #0a3554;border-radius:10px;background:#fff;color:#0a3554;font:900 12px/1.2 system-ui,-apple-system,sans-serif}
      .mamo-carte-manual-refresh button:disabled{opacity:.62}
      .mamo-carte-manual-refresh p{margin:7px 2px 0;color:#617783;font:700 9px/1.55 system-ui,-apple-system,sans-serif}
      .mamo-carte-manual-refresh p.ok{color:#11823b}.mamo-carte-manual-refresh p.wait{color:#9b6b00}
    `;
    document.head.appendChild(style);
  }

  function ensureButton() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    const body = document.getElementById("mamoRaceCarteBody");
    if (!overlay || overlay.hidden || !body) return;
    ensureStyle();
    if (body.querySelector(".mamo-carte-manual-refresh")) return;

    const tabs = body.querySelector(".mamo-carte-tabs");
    const box = document.createElement("div");
    box.className = "mamo-carte-manual-refresh";
    box.innerHTML = '<button type="button" data-mamo-carte-refresh>↻ 公式データを再確認</button><p data-mamo-carte-refresh-status>未保存の項目がある時に、最新の公式取得済みデータを読み直します。</p>';
    if (tabs?.parentNode) tabs.parentNode.insertBefore(box, tabs.nextSibling);
    else body.prepend(box);
  }

  async function refreshOfficial(button) {
    if (!button || button.disabled) return;
    const status = button.parentElement?.querySelector("[data-mamo-carte-refresh-status]");
    const before = activeRecord();
    button.disabled = true;
    button.textContent = "確認中…";
    if (status) {
      status.className = "";
      status.textContent = "最新データを確認しています。";
    }

    try {
      const api = window.MAMO_RACE_CARTE_SNAPSHOT;
      let changed = false;
      if (before?.id && api?.enrichRecordById) {
        changed = !!(await api.enrichRecordById(before.id)) || changed;
      }
      if (api?.backfill) {
        changed = !!(await api.backfill(100)) || changed;
      }
      window.MAMO_RACE_CARTE?.refresh?.();
      ensureButton();

      const after = activeRecord();
      const value = technique(after);
      if (status) {
        if (value) {
          status.className = "ok";
          status.textContent = `更新しました。決まり手：${value}`;
        } else {
          status.className = "wait";
          status.textContent = changed
            ? "取得できた公式データを更新しました。決まり手はまだ公式取得データにありません。"
            : "最新データを確認しました。決まり手はまだ公式取得データにありません。";
        }
      }
    } catch (_) {
      if (status) {
        status.className = "wait";
        status.textContent = "更新に失敗しました。通信状態を確認して、もう一度お試しください。";
      }
    } finally {
      button.disabled = false;
      button.textContent = "↻ 公式データを再確認";
    }
  }

  document.addEventListener("click", event => {
    const refresh = event.target?.closest?.("[data-mamo-carte-refresh]");
    if (refresh) {
      event.preventDefault();
      refreshOfficial(refresh);
      return;
    }
    if (event.target?.closest?.(".mamo-carte-btn,[data-rx-carte]")) {
      setTimeout(ensureButton, 0);
    }
  }, true);

  window.addEventListener("mamo:race-carte-snapshot", () => setTimeout(ensureButton, 0));
  window.addEventListener("pageshow", () => setTimeout(ensureButton, 0));
})();
