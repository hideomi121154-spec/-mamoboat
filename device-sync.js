(() => {
  "use strict";
  const STATE_KEY = "mamoboat_v40_personal";
  const TOKEN_KEY = "mamoboat_sync_token_v1";
  const LINKED_KEY = "mamoboat_sync_linked_v1";
  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/device-state-sync";
  let busy = false;
  let saveTimer = null;
  let suppressUpload = false;

  const token = () => localStorage.getItem(TOKEN_KEY) || "";
  const linked = () => localStorage.getItem(LINKED_KEY) === "1";
  let bootSyncInProgress = !!token();
  const nativeSetItem = Storage.prototype.setItem;
  const writeLocal = (key, value) => nativeSetItem.call(localStorage, key, value);

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

  function releaseBootGate() {
    bootSyncInProgress = false;
    window.MAMO_RELEASE_SYNC_GATE?.();
  }

  function setStatus(text) {
    const el = document.getElementById("deviceSyncStatus");
    if (el) el.textContent = text;
  }

  async function request(method, body) {
    const t = token();
    if (!t) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(ENDPOINT, {
        method,
        headers: { "Content-Type": "application/json", "x-sync-token": t },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
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

  function isFreshInstallState(state) {
    if (!state) return true;
    const records = Array.isArray(state.records) ? state.records.length : 0;
    const ledger = Array.isArray(state.ledger) ? state.ledger : [];
    const onlyInitial = ledger.length <= 1 && ledger.every(item => ["initial_grant", "opening_balance"].includes(item?.type));
    return records === 0 && Number(state.coins) === 100000 && onlyInitial;
  }

  function mergeState(local, remote) {
    if (!local) return remote;
    if (!remote) return local;

    if (isFreshInstallState(local) && !isFreshInstallState(remote)) {
      return { ...remote, accepted: remote.accepted === true || local.accepted === true };
    }

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

    const localEstablished = !isFreshInstallState(local);
    const remoteEstablished = !isFreshInstallState(remote);
    if (remoteEstablished && !localEstablished) merged.coins = Number(remote.coins) || 0;
    else if (localEstablished && !remoteEstablished) merged.coins = Number(local.coins) || 0;
    else if (remoteEstablished && localEstablished) {
      const remoteRecords = Array.isArray(remote.records) ? remote.records.length : 0;
      const localRecords = Array.isArray(local.records) ? local.records.length : 0;
      merged.coins = remoteRecords >= localRecords ? Number(remote.coins) || 0 : Number(local.coins) || 0;
    } else merged.coins = Math.max(Number(local.coins) || 0, Number(remote.coins) || 0);

    merged.accepted = local.accepted === true || remote.accepted === true;
    return merged;
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
    } catch (error) {
      console.warn("端末同期アップロードに失敗しました", error);
      setStatus("同期できませんでした");
      return false;
    } finally { busy = false; }
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
        writeLocal(STATE_KEY, JSON.stringify(merged));
        suppressUpload = false;
      }
      await request("POST", { state: merged });
      writeLocal(LINKED_KEY, "1");
      setStatus("同期済み");
      window.dispatchEvent(new CustomEvent("mamo:state-synced", { detail: { changed } }));
      if (changed && reloadIfChanged) {
        sessionStorage.setItem("mamoboat_sync_reloaded", "1");
        location.reload();
        return true;
      }
      return changed;
    } catch (error) {
      console.warn("端末同期に失敗しました", error);
      setStatus("同期できませんでした");
      return false;
    } finally { busy = false; }
  }

  function scheduleUpload() {
    if (!token() || suppressUpload || bootSyncInProgress) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => syncNow({ reloadIfChanged: false }), 900);
  }

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === STATE_KEY && bootSyncInProgress) {
      return;
    }
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === STATE_KEY) scheduleUpload();
  };

  function renderPanel() {
    const host = document.querySelector("#settings .settings-panel");
    if (!host || document.getElementById("deviceSyncPanel")) return;
    const box = document.createElement("div");
    box.id = "deviceSyncPanel";
    box.style.cssText = "margin-top:18px;padding:16px;border:1px solid #d9e0e5;border-radius:14px;background:#f8fbfc";
    box.innerHTML = `<b style="display:block;margin-bottom:6px">ブラウザ・アプリ同期</b><p style="margin:0 0 10px;color:#647786;font-size:14px">Safari版とホーム画面版で同じ記録・B残高・朝刊を使います。同期済みの記録を初期100,000Bで上書きしません。</p><div id="deviceSyncStatus" style="font-size:13px;margin-bottom:10px">${token() ? "自動同期 ON" : "未設定"}</div><button class="btn secondary full" type="button" id="deviceSyncButton">同期コードを確認・変更</button><button class="btn secondary full" style="margin-top:8px" type="button" id="deviceSyncNowButton">今すぐ同期</button>`;
    host.appendChild(box);
    document.getElementById("deviceSyncButton").onclick = async () => {
      const current = token();
      const value = prompt("同期コードを入力してください。最初の端末では空欄のままOKを押すと新しく作成します。", current);
      if (value === null) return;
      const entered = value.trim();
      const generated = !entered;
      const next = entered || makeToken();
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(next)) { alert("同期コードが短すぎます。"); return; }
      writeLocal(TOKEN_KEY, next);
      if (!generated) writeLocal(LINKED_KEY, "1");
      setStatus("同期中…");
      if (generated) await upload(); else await syncNow();
      prompt("もう一方のMAMO BOATにも同じ同期コードを入力してください。", next);
    };
    document.getElementById("deviceSyncNowButton").onclick = async function() {
      if (!token()) return alert("先に同期コードを設定してください。");
      this.disabled = true;
      this.textContent = "同期中…";
      await syncNow();
      if (document.body.contains(this)) {
        this.disabled = false;
        this.textContent = "今すぐ同期";
      }
    };
  }

  async function initialSync() {
    const hasToken = !!token();
    if (!hasToken) {
      releaseBootGate();
      return { ok: true, skipped: true };
    }
    if (sessionStorage.getItem("mamoboat_sync_reloaded") === "1") {
      sessionStorage.removeItem("mamoboat_sync_reloaded");
      releaseBootGate();
      return { ok: true, reloaded: true };
    }
    setStatus("同期中…");
    try {
      const changed = await syncNow({ reloadIfChanged: true });
      releaseBootGate();
      return { ok: true, changed };
    } catch (error) {
      releaseBootGate();
      return { ok: false, error: String(error) };
    }
  }

  window.MAMO_DEVICE_SYNC_READY = initialSync();

  const mountPanel = () => renderPanel();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
  else mountPanel();

  window.addEventListener("pageshow", () => {
    renderPanel();
    if (token() && !bootSyncInProgress) syncNow({ reloadIfChanged: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && token() && !bootSyncInProgress) syncNow({ reloadIfChanged: true });
  });
})();
