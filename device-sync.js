(() => {
  "use strict";
  const STATE_KEY = "mamoboat_v40_personal";
  const TOKEN_KEY = "mamoboat_sync_token_v1";
  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/device-state-sync";
  let busy = false;
  let saveTimer = null;

  const token = () => localStorage.getItem(TOKEN_KEY) || "";
  const makeToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  };
  const state = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "null"); } catch { return null; }
  };
  async function request(method, body) {
    const t = token();
    if (!t) return null;
    const res = await fetch(ENDPOINT, {
      method,
      headers: {"Content-Type":"application/json", "x-sync-token":t},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    return res.json();
  }
  async function upload() {
    if (busy || !token()) return;
    const s = state();
    if (!s) return;
    busy = true;
    try { await request("POST", {state:s}); setStatus("同期済み"); }
    catch { setStatus("同期できませんでした"); }
    finally { busy = false; }
  }
  async function download() {
    if (busy || !token()) return false;
    busy = true;
    try {
      const remote = await request("GET");
      if (!remote?.state) return false;
      const local = state();
      const remoteRecords = Array.isArray(remote.state.records) ? remote.state.records.length : 0;
      const localRecords = Array.isArray(local?.records) ? local.records.length : 0;
      const remoteLedger = Array.isArray(remote.state.ledger) ? remote.state.ledger.length : 0;
      const localLedger = Array.isArray(local?.ledger) ? local.ledger.length : 0;
      if (remoteRecords > localRecords || remoteLedger > localLedger) {
        localStorage.setItem(STATE_KEY, JSON.stringify(remote.state));
        sessionStorage.setItem("mamoboat_sync_reloaded", "1");
        location.reload();
        return true;
      }
      return false;
    } catch { setStatus("同期できませんでした"); return false; }
    finally { busy = false; }
  }
  function scheduleUpload() {
    if (!token()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(upload, 1200);
  }
  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === STATE_KEY) scheduleUpload();
  };

  function setStatus(text) {
    const el = document.getElementById("deviceSyncStatus");
    if (el) el.textContent = text;
  }
  function renderPanel() {
    const host = document.querySelector("#settings .settings-panel");
    if (!host || document.getElementById("deviceSyncPanel")) return;
    const box = document.createElement("div");
    box.id = "deviceSyncPanel";
    box.style.cssText = "margin-top:18px;padding:16px;border:1px solid #d9e0e5;border-radius:14px;background:#f8fbfc";
    box.innerHTML = `<b style="display:block;margin-bottom:6px">ブラウザ・アプリ同期</b><p style="margin:0 0 10px;color:#647786;font-size:14px">Safari版とホーム画面版で同じ記録・B残高・朝刊を使います。</p><div id="deviceSyncStatus" style="font-size:13px;margin-bottom:10px">${token()?"同期コード設定済み":"未設定"}</div><button class="btn secondary full" type="button" id="deviceSyncButton">同期コードを設定</button>`;
    host.appendChild(box);
    document.getElementById("deviceSyncButton").onclick = async () => {
      const current = token();
      const value = prompt("同期コードを入力してください。最初の端末では空欄のままOKを押すと新しく作成します。", current);
      if (value === null) return;
      const next = value.trim() || makeToken();
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(next)) { alert("同期コードが短すぎます。"); return; }
      localStorage.setItem(TOKEN_KEY, next);
      setStatus("同期コード設定済み");
      if (current) await download(); else await upload();
      prompt("もう一方のMAMO BOATにも同じ同期コードを入力してください。", next);
    };
  }

  async function start() {
    renderPanel();
    if (!token()) return;
    if (sessionStorage.getItem("mamoboat_sync_reloaded") === "1") {
      sessionStorage.removeItem("mamoboat_sync_reloaded");
      scheduleUpload();
      return;
    }
    const changed = await download();
    if (!changed) scheduleUpload();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
  window.addEventListener("pageshow", () => { renderPanel(); if (token()) download(); });
})();
