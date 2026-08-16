(() => {
  "use strict";
  const STATE_KEY = "mamoboat_v40_personal";
  const TOKEN_KEY = "mamoboat_sync_token_v1";
  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/device-state-sync";
  let busy = false;
  let saveTimer = null;
  let suppressUpload = false;

  const token = () => localStorage.getItem(TOKEN_KEY) || "";
  const makeToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  };
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "null"); }
    catch { return null; }
  };
  const stable = value => JSON.stringify(value || null);
  const uniq = values => [...new Set((values || []).filter(Boolean))];

  async function request(method, body) {
    const t = token();
    if (!t) return null;
    const res = await fetch(ENDPOINT, {
      method,
      headers: { "Content-Type": "application/json", "x-sync-token": t },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    return res.json();
  }

  function itemScore(item) {
    if (!item || typeof item !== "object") return 0;
    return (item.settled ? 10000 : 0)
      + (item.resultEventAt ? 5000 : 0)
      + (item.resultReflectedAt ? 3000 : 0)
      + (Array.isArray(item.resultPayouts) ? item.resultPayouts.length * 50 : 0)
      + stable(item).length;
  }

  function mergeByKey(a, b, keyFn) {
    const map = new Map();
    for (const item of [...(a || []), ...(b || [])]) {
      if (!item) continue;
      const key = keyFn(item);
      if (!key) continue;
      const current = map.get(key);
      if (!current || itemScore(item) >= itemScore(current)) map.set(key, item);
    }
    return [...map.values()];
  }

  function mergeState(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    const merged = { ...remote, ...local };

    merged.records = mergeByKey(remote.records, local.records, item => item.id || `${item.raceDate}:${item.venueCode}:${item.raceNo}:${item.time || ""}`);
    merged.ledger = mergeByKey(remote.ledger, local.ledger, item => item.uniqueKey || item.id);
    merged.realBetExits = mergeByKey(remote.realBetExits, local.realBetExits, item => item.id || item.at);
    merged.rewardClaims = mergeByKey(remote.rewardClaims, local.rewardClaims, item => item.id);
    merged.favorites = uniq([...(remote.favorites || []), ...(local.favorites || [])]);

    const rp = remote.pressroom || {};
    const lp = local.pressroom || {};
    const planRank = { free: 0, ume: 1, take: 2, matsu: 3 };
    merged.pressroom = {
      ...rp,
      ...lp,
      plan: (planRank[lp.plan] || 0) >= (planRank[rp.plan] || 0) ? (lp.plan || "free") : rp.plan,
      morningEnabled: rp.morningEnabled === true || lp.morningEnabled === true,
      weeklyEnabled: rp.weeklyEnabled === true || lp.weeklyEnabled === true,
      monthlyEnabled: rp.monthlyEnabled === true || lp.monthlyEnabled === true,
      feedback: mergeByKey(rp.feedback, lp.feedback, item => `${item.issueKey || ""}:${item.value || ""}:${item.at || ""}`),
    };

    const remotePilot = remote.pilot || {};
    const localPilot = local.pilot || {};
    merged.pilot = {
      ...localPilot,
      participantId: remotePilot.participantId || localPilot.participantId,
      consent: remotePilot.consent === true || localPilot.consent === true,
      events: mergeByKey(remotePilot.events, localPilot.events, item => item.event_id).slice(-5000),
      sentCount: Math.max(Number(remotePilot.sentCount) || 0, Number(localPilot.sentCount) || 0),
      lastSyncAt: localPilot.lastSyncAt || remotePilot.lastSyncAt || null,
      lastError: "",
    };

    // B残高は、統合した台帳の増減を合計して一意に決める。
    if (merged.ledger.length) {
      merged.coins = Math.max(0, merged.ledger.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
    } else {
      merged.coins = Math.max(Number(local.coins) || 0, Number(remote.coins) || 0);
    }
    merged.accepted = local.accepted === true || remote.accepted === true;
    return merged;
  }

  function setStatus(text) {
    const el = document.getElementById("deviceSyncStatus");
    if (el) el.textContent = text;
  }

  async function upload(stateOverride) {
    if (busy || !token()) return false;
    const state = stateOverride || readState();
    if (!state) return false;
    busy = true;
    try {
      await request("POST", { state });
      setStatus("同期済み");
      return true;
    } catch {
      setStatus("同期できませんでした");
      return false;
    } finally {
      busy = false;
    }
  }

  async function syncNow({ reloadIfChanged = true } = {}) {
    if (busy || !token()) return false;
    busy = true;
    try {
      const remote = await request("GET");
      const local = readState();
      if (!remote?.state) {
        busy = false;
        return upload(local);
      }
      const merged = mergeState(local, remote.state);
      const changed = stable(merged) !== stable(local);
      if (changed) {
        suppressUpload = true;
        localStorage.setItem(STATE_KEY, JSON.stringify(merged));
        suppressUpload = false;
      }
      await request("POST", { state: merged });
      setStatus("同期済み");
      if (changed && reloadIfChanged) {
        sessionStorage.setItem("mamoboat_sync_reloaded", "1");
        location.reload();
        return true;
      }
      return changed;
    } catch {
      setStatus("同期できませんでした");
      return false;
    } finally {
      busy = false;
    }
  }

  function scheduleUpload() {
    if (!token() || suppressUpload) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => syncNow({ reloadIfChanged: false }), 900);
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === STATE_KEY) scheduleUpload();
  };

  function renderPanel() {
    const host = document.querySelector("#settings .settings-panel");
    if (!host || document.getElementById("deviceSyncPanel")) return;
    const box = document.createElement("div");
    box.id = "deviceSyncPanel";
    box.style.cssText = "margin-top:18px;padding:16px;border:1px solid #d9e0e5;border-radius:14px;background:#f8fbfc";
    box.innerHTML = `<b style="display:block;margin-bottom:6px">ブラウザ・アプリ同期</b><p style="margin:0 0 10px;color:#647786;font-size:14px">Safari版とホーム画面版で同じ記録・B残高・朝刊を使います。変更は自動で統合されます。</p><div id="deviceSyncStatus" style="font-size:13px;margin-bottom:10px">${token() ? "自動同期 ON" : "未設定"}</div><button class="btn secondary full" type="button" id="deviceSyncButton">同期コードを確認・変更</button>`;
    host.appendChild(box);
    document.getElementById("deviceSyncButton").onclick = async () => {
      const current = token();
      const value = prompt("同期コードを入力してください。最初の端末では空欄のままOKを押すと新しく作成します。", current);
      if (value === null) return;
      const entered = value.trim();
      const generated = !entered;
      const next = entered || makeToken();
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(next)) {
        alert("同期コードが短すぎます。");
        return;
      }
      localStorage.setItem(TOKEN_KEY, next);
      setStatus("自動同期 ON");
      if (generated) await upload();
      else await syncNow();
      prompt("もう一方のMAMO BOATにも同じ同期コードを入力してください。", next);
    };
  }

  async function start() {
    renderPanel();
    if (!token()) return;
    if (sessionStorage.getItem("mamoboat_sync_reloaded") === "1") {
      sessionStorage.removeItem("mamoboat_sync_reloaded");
      setStatus("自動同期 ON");
      return;
    }
    await syncNow();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.addEventListener("pageshow", () => {
    renderPanel();
    if (token()) syncNow();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && token()) syncNow();
  });
})();
