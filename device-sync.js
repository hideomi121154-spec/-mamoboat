(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const TOKEN_KEY = "mamoboat_sync_token_v1";
  const LINKED_KEY = "mamoboat_sync_linked_v1";
  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/device-state-sync";

  const nativeSetItem = Storage.prototype.setItem;
  const writeLocal = (key, value) => nativeSetItem.call(localStorage, key, value);
  const token = () => localStorage.getItem(TOKEN_KEY) || "";

  let booting = !!token();
  let networkBusy = false;
  let uploadTimer = null;
  let uploadQueued = false;
  let suppressUpload = false;

  const stable = value => JSON.stringify(value || null);
  const uniq = values => [...new Set((values || []).filter(Boolean))];

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "null"); }
    catch { return null; }
  }

  function makeToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }

  function setStatus(text) {
    const el = document.getElementById("deviceSyncStatus");
    if (el) el.textContent = text;
  }

  function releaseBootGate() {
    booting = false;
    window.MAMO_RELEASE_SYNC_GATE?.();
  }

  async function request(method, body) {
    const t = token();
    if (!t) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(ENDPOINT, {
        method,
        headers: { "Content-Type": "application/json", "x-sync-token": t },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function itemScore(item) {
    if (!item || typeof item !== "object") return 0;
    return (item.settled ? 10000 : 0)
      + (item.resultEventAt ? 5000 : 0)
      + (item.resultReflectedAt ? 3000 : 0)
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

  function isFresh(state) {
    if (!state) return true;
    const records = Array.isArray(state.records) ? state.records.length : 0;
    const ledger = Array.isArray(state.ledger) ? state.ledger : [];
    const onlyInitial = ledger.length <= 1 && ledger.every(item => ["initial_grant", "opening_balance"].includes(item?.type));
    return records === 0 && Number(state.coins) === 100000 && onlyInitial;
  }

  function mergeState(local, remote) {
    if (!local) return remote;
    if (!remote) return local;

    if (isFresh(local) && !isFresh(remote)) {
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
      plan: (planRank[lp.plan] || 0) >= (planRank[rp.plan] || 0) ? (lp.plan || "free") : (rp.plan || "free"),
      morningEnabled: rp.morningEnabled === true || lp.morningEnabled === true,
      weeklyEnabled: rp.weeklyEnabled === true || lp.weeklyEnabled === true,
      monthlyEnabled: rp.monthlyEnabled === true || lp.monthlyEnabled === true,
      feedback: mergeByKey(rp.feedback, lp.feedback, item => `${item.issueKey || ""}:${item.value || ""}:${item.at || ""}`),
    };

    const localEstablished = !isFresh(local);
    const remoteEstablished = !isFresh(remote);
    if (remoteEstablished && !localEstablished) merged.coins = Number(remote.coins) || 0;
    else if (localEstablished && !remoteEstablished) merged.coins = Number(local.coins) || 0;
    else if (remoteEstablished && localEstablished) {
      const rr = Array.isArray(remote.records) ? remote.records.length : 0;
      const lr = Array.isArray(local.records) ? local.records.length : 0;
      merged.coins = rr >= lr ? Number(remote.coins) || 0 : Number(local.coins) || 0;
    } else {
      merged.coins = Math.max(Number(remote.coins) || 0, Number(local.coins) || 0);
    }

    merged.accepted = local.accepted === true || remote.accepted === true;
    return merged;
  }

  async function uploadSnapshot() {
    if (!token()) return false;
    if (networkBusy) {
      uploadQueued = true;
      return false;
    }
    const state = readState();
    if (!state) return false;
    networkBusy = true;
    try {
      await request("POST", { state });
      writeLocal(LINKED_KEY, "1");
      setStatus("同期済み");
      return true;
    } catch (error) {
      console.warn("端末同期アップロードに失敗しました", error);
      setStatus("同期できませんでした");
      return false;
    } finally {
      networkBusy = false;
      if (uploadQueued) {
        uploadQueued = false;
        scheduleUpload();
      }
    }
  }

  async function pullAndMerge() {
    if (!token()) return { ok: true, skipped: true };
    if (networkBusy) return { ok: false, busy: true };
    networkBusy = true;
    setStatus("同期中…");
    try {
      const remote = await request("GET");
      const local = readState();
      if (!remote?.state) {
        networkBusy = false;
        const uploaded = await uploadSnapshot();
        return { ok: uploaded, created: uploaded };
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
      return { ok: true, changed };
    } catch (error) {
      console.warn("端末同期に失敗しました", error);
      setStatus("同期できませんでした");
      return { ok: false, error: String(error) };
    } finally {
      networkBusy = false;
    }
  }

  function scheduleUpload() {
    if (!token() || suppressUpload || booting) return;
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(uploadSnapshot, 1500);
  }

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === STATE_KEY && booting) return;
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === STATE_KEY) scheduleUpload();
  };

  function renderPanel() {
    const host = document.querySelector("#settings .settings-panel");
    if (!host || document.getElementById("deviceSyncPanel")) return;
    const box = document.createElement("div");
    box.id = "deviceSyncPanel";
    box.style.cssText = "margin-top:18px;padding:16px;border:1px solid #d9e0e5;border-radius:14px;background:#f8fbfc";
    box.innerHTML = `<b style="display:block;margin-bottom:6px">ブラウザ・アプリ同期</b><p style="margin:0 0 10px;color:#647786;font-size:14px">起動時に1回取得し、その後の変更だけを自動保存します。画面復帰のたびに同期しないため、安定性を優先します。</p><div id="deviceSyncStatus" style="font-size:13px;margin-bottom:10px">${token() ? "自動同期 ON" : "未設定"}</div><button class="btn secondary full" type="button" id="deviceSyncButton">同期コードを確認・変更</button><button class="btn secondary full" style="margin-top:8px" type="button" id="deviceSyncNowButton">今すぐ同期</button>`;
    host.appendChild(box);

    document.getElementById("deviceSyncButton").onclick = async () => {
      const current = token();
      const value = prompt("同期コードを入力してください。最初の端末では空欄のままOKを押すと新しく作成します。", current);
      if (value === null) return;
      const entered = value.trim();
      const generated = !entered;
      const next = entered || makeToken();
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(next)) return alert("同期コードが短すぎます。");
      writeLocal(TOKEN_KEY, next);
      if (!generated) writeLocal(LINKED_KEY, "1");
      const result = generated ? await uploadSnapshot() : await pullAndMerge();
      if (result !== false && result?.ok !== false) setStatus("同期済み");
      prompt("もう一方のMAMO BOATにも同じ同期コードを入力してください。", next);
    };

    document.getElementById("deviceSyncNowButton").onclick = async function() {
      if (!token()) return alert("先に同期コードを設定してください。");
      this.disabled = true;
      this.textContent = "同期中…";
      const result = await pullAndMerge();
      if (result?.ok) {
        location.reload();
        return;
      }
      if (document.body.contains(this)) {
        this.disabled = false;
        this.textContent = "今すぐ同期";
      }
    };
  }

  function renderHomeRefreshButton() {
    const host = document.querySelector("#home .home-date");
    if (!host || document.getElementById("mamoManualRefresh")) return;
    const button = document.createElement("button");
    button.id = "mamoManualRefresh";
    button.type = "button";
    button.textContent = "↻ 更新";
    button.setAttribute("aria-label", "記録とB残高を最新状態に更新");
    button.style.cssText = "margin-top:7px;margin-left:auto;border:1px solid #c8d4dc;border-radius:999px;background:#fff;color:#05233e;padding:5px 11px;font:700 12px/1.2 -apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;box-shadow:0 1px 2px rgba(5,35,62,.06)";
    button.onclick = async () => {
      if (!token()) {
        location.reload();
        return;
      }
      button.disabled = true;
      button.textContent = "更新中…";
      const result = await pullAndMerge();
      if (result?.ok) {
        location.reload();
        return;
      }
      button.disabled = false;
      button.textContent = "↻ 更新";
      alert("更新できませんでした。通信状態を確認して、もう一度お試しください。");
    };
    host.appendChild(button);
  }

  async function initialSync() {
    if (!token()) {
      releaseBootGate();
      return { ok: true, skipped: true };
    }
    const result = await pullAndMerge();
    releaseBootGate();
    return result;
  }

  window.MAMO_DEVICE_SYNC_READY = initialSync();

  const mountUi = () => {
    renderPanel();
    renderHomeRefreshButton();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountUi, { once: true });
  else mountUi();

  // Intentionally no pageshow / visibilitychange auto-pull.
  // This prevents duplicate GET->merge->POST races on iOS Safari/PWA.
})();
