/* MAMO BOAT Voice Control v1 — push-to-talk, feature-detected, no always-on mic. */
(() => {
  "use strict";
  if (window.__MAMO_VOICE_V1__) return;
  window.__MAMO_VOICE_V1__ = true;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let lastTranscript = "";

  const norm = (s) => String(s || "").replace(/\s+/g, "").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0));
  const textOf = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const clickByText = (patterns, root=document) => {
    const items = [...root.querySelectorAll("button,a,[role='button']")];
    const found = items.find(el => patterns.some(re => re.test(textOf(el))));
    if (found) { found.click(); return true; }
    return false;
  };
  const activeRaceRoot = () => document.getElementById("raceView") || document;

  function parseRaceNo(t) {
    const s = norm(t).replace(/レース/g, "R");
    const m = s.match(/(?:^|[^0-9])([1-9]|1[0-2])R?/i);
    return m ? Number(m[1]) : null;
  }

  function parseAmount(t) {
    const s = norm(t).replace(/円|ビー|B/gi, "");
    const m = s.match(/(?:賭け|ベット|bet|投票|で)?([0-9]{2,6})(?:だけ)?/i);
    return m ? Number(m[1]) : null;
  }

  function executeCommand(raw) {
    const t = String(raw || "");
    const s = norm(t);
    const result = { ok:false, message:"コマンドを認識できませんでした。", transcript:t };

    if (/次(の)?レース|次R/i.test(s)) {
      const current = Number((document.querySelector(".racechip.active,.race-chip.active,[aria-current='true']")?.textContent || "").match(/\d+/)?.[0]);
      if (current && current < 12 && clickByText([new RegExp(`^${current+1}(R|レース)?$`)], activeRaceRoot())) return {ok:true,message:`${current+1}Rへ移動します。`,transcript:t};
      return {ok:false,message:"次のレースを特定できませんでした。",transcript:t};
    }
    if (/前(の)?レース|前R/i.test(s)) {
      const current = Number((document.querySelector(".racechip.active,.race-chip.active,[aria-current='true']")?.textContent || "").match(/\d+/)?.[0]);
      if (current > 1 && clickByText([new RegExp(`^${current-1}(R|レース)?$`)], activeRaceRoot())) return {ok:true,message:`${current-1}Rへ移動します。`,transcript:t};
      return {ok:false,message:"前のレースを特定できませんでした。",transcript:t};
    }

    const raceNo = parseRaceNo(t);
    if (raceNo && /レース|R|開いて|見せて/.test(t)) {
      if (clickByText([new RegExp(`^${raceNo}(R|レース)?$`)], activeRaceRoot())) return {ok:true,message:`${raceNo}Rへ移動します。`,transcript:t};
    }
    if (/オッズ/.test(s)) {
      if (clickByText([/オッズ/], activeRaceRoot())) return {ok:true,message:"オッズを開きます。",transcript:t};
    }
    if (/ライブ|LIVE|映像/i.test(s)) {
      if (clickByText([/LIVE/i,/ライブ/,/レース映像/], activeRaceRoot())) return {ok:true,message:"LIVEを開きます。",transcript:t};
    }
    if (/公式/.test(s)) {
      if (clickByText([/BOAT RACE公式/,/公式サイト/], activeRaceRoot())) return {ok:true,message:"BOAT RACE公式を開きます。",transcript:t};
    }
    if (/リアル|REAL|実投票/i.test(s)) {
      showConfirm("REAL投票サイトを開きますか？", () => clickByText([/REAL投票/], activeRaceRoot()));
      return {ok:true,message:"REAL投票への移動を確認します。",transcript:t};
    }
    if (/編集部|新聞|朝刊|週間|月刊/.test(s)) {
      if (/週間/.test(s)) clickByText([/週間/], document);
      if (/月刊/.test(s)) clickByText([/月刊/], document);
      if (/朝刊/.test(s)) clickByText([/朝刊/], document);
      if (typeof window.go === "function") { window.go("analysis"); return {ok:true,message:"編集部を開きます。",transcript:t}; }
      if (clickByText([/編集部/], document)) return {ok:true,message:"編集部を開きます。",transcript:t};
    }
    if (/記録/.test(s)) {
      if (typeof window.go === "function") { window.go("records"); return {ok:true,message:"記録を開きます。",transcript:t}; }
    }
    if (/ホーム|開催一覧/.test(s)) {
      if (typeof window.go === "function") { window.go("home"); return {ok:true,message:"ホームへ戻ります。",transcript:t}; }
    }

    const amount = parseAmount(t);
    if (amount && /AIR|エア|ベット|賭け/i.test(t)) {
      const candidates=[...document.querySelectorAll("input")].filter(i=>/number|text/.test(i.type||"text"));
      const amountInput=candidates.find(i=>/B|金額|BET|ベット|stake/i.test(`${i.placeholder||""} ${i.name||""} ${i.id||""} ${i.getAttribute("aria-label")||""}`)) || candidates.find(i=>i.type==="number");
      if (amountInput) {
        amountInput.focus(); amountInput.value=String(amount); amountInput.dispatchEvent(new Event("input",{bubbles:true})); amountInput.dispatchEvent(new Event("change",{bubbles:true}));
        return {ok:true,message:`AIR BET金額に${amount.toLocaleString("ja-JP")}Bを入力しました。買い目を確認して確定してください。`,transcript:t};
      }
      return {ok:false,message:`${amount.toLocaleString("ja-JP")}Bは認識しましたが、金額入力欄が見つかりませんでした。`,transcript:t};
    }

    if (/今日はここまで|終了|やめる/.test(s)) {
      localStorage.setItem("mamoboat_voice_last_stop", new Date().toISOString());
      return {ok:true,message:"今日はここまで、と記録しました。",transcript:t};
    }
    return result;
  }

  function showConfirm(message, onYes) {
    let modal=document.getElementById("mamoVoiceConfirm");
    if (!modal) { modal=document.createElement("div"); modal.id="mamoVoiceConfirm"; modal.className="mvc-confirm"; document.body.appendChild(modal); }
    modal.innerHTML=`<div><p>${message}</p><span><button data-no>キャンセル</button><button data-yes>開く</button></span></div>`;
    modal.classList.add("show");
    modal.querySelector("[data-no]").onclick=()=>modal.classList.remove("show");
    modal.querySelector("[data-yes]").onclick=()=>{modal.classList.remove("show");onYes?.();};
  }

  function setStatus(text, isError=false) {
    const status=document.getElementById("mamoVoiceStatus"); if(!status)return;
    status.textContent=text; status.dataset.error=isError?"1":"0";
  }

  function startVoice() {
    if (!SpeechRecognition) { setStatus("このブラウザでは音声認識を利用できません。", true); return; }
    if (listening) { try{recognition.stop()}catch(_){} return; }
    recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart=()=>{listening=true;document.getElementById("mamoVoiceBtn")?.classList.add("listening");setStatus("聞いています… 話してください");};
    recognition.onresult=(ev)=>{lastTranscript=ev.results?.[0]?.[0]?.transcript||"";setStatus(`「${lastTranscript}」`);const r=executeCommand(lastTranscript);setTimeout(()=>setStatus(r.message,!r.ok),250);};
    recognition.onerror=(ev)=>setStatus(ev.error==="not-allowed"?"マイクの利用が許可されていません。":"音声を認識できませんでした。もう一度試してください。",true);
    recognition.onend=()=>{listening=false;document.getElementById("mamoVoiceBtn")?.classList.remove("listening");};
    try { recognition.start(); } catch (_) { setStatus("音声認識を開始できませんでした。",true); }
  }

  function render() {
    if (document.getElementById("mamoVoiceDock")) return;
    const dock=document.createElement("div"); dock.id="mamoVoiceDock"; dock.className="mamo-voice-dock";
    dock.innerHTML=`<button id="mamoVoiceBtn" type="button" aria-label="音声操作">🎙<small>VOICE</small></button><div id="mamoVoiceStatus">押して話す</div><button id="mamoVoiceHelp" type="button" aria-label="音声コマンド例">?</button>`;
    document.body.appendChild(dock);
    document.getElementById("mamoVoiceBtn").onclick=startVoice;
    document.getElementById("mamoVoiceHelp").onclick=()=>showHelp();
  }

  function showHelp(){
    let h=document.getElementById("mamoVoiceHelpPanel"); if(!h){h=document.createElement("div");h.id="mamoVoiceHelpPanel";h.className="mvc-help";document.body.appendChild(h)}
    h.innerHTML=`<div><button data-close>×</button><h3>音声コマンド例</h3><p>「7レース」「次のレース」「オッズ見せて」</p><p>「ライブ開いて」「公式開いて」「REAL投票」</p><p>「AIR BET 1000B」「編集部」「週間」「今日はここまで」</p><small>AIR BETは金額入力まで。確定操作は画面で確認して行います。REAL投票は必ず確認画面を出します。</small></div>`;h.classList.add("show");h.querySelector("[data-close]").onclick=()=>h.classList.remove("show");
  }

  function styles(){if(document.getElementById("mamoVoiceStyle"))return;const s=document.createElement("style");s.id="mamoVoiceStyle";s.textContent=`.mamo-voice-dock{position:fixed;right:10px;bottom:76px;z-index:9996;display:flex;align-items:center;gap:7px;background:rgba(7,27,43,.94);padding:7px;border-radius:24px;box-shadow:0 5px 18px rgba(0,0,0,.22);max-width:calc(100vw - 20px)}#mamoVoiceBtn{width:46px;height:46px;border-radius:50%;border:0;background:#00a8a0;color:#fff;font-size:20px;font-weight:1000}#mamoVoiceBtn small{display:block;font-size:6px;letter-spacing:.08em}#mamoVoiceBtn.listening{animation:mvcPulse 1s infinite}#mamoVoiceStatus{max-width:180px;color:#fff;font-size:9px;line-height:1.35;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mamoVoiceStatus[data-error='1']{color:#ffd0c7}#mamoVoiceHelp{border:1px solid rgba(255,255,255,.45);background:transparent;color:#fff;border-radius:50%;width:28px;height:28px;font-weight:1000}.mvc-confirm,.mvc-help{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);align-items:center;justify-content:center;padding:18px}.mvc-confirm.show,.mvc-help.show{display:flex}.mvc-confirm>div,.mvc-help>div{width:min(420px,100%);background:#fff;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.25)}.mvc-confirm p{font-weight:900;font-size:15px}.mvc-confirm span{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mvc-confirm button,.mvc-help button{min-height:42px;font-weight:900}.mvc-confirm [data-yes]{background:#071b2b;color:#fff;border:0}.mvc-help>div{position:relative}.mvc-help [data-close]{position:absolute;right:8px;top:8px;width:34px;min-height:34px}.mvc-help p{padding:8px;background:#f4f8f8;font-size:11px}.mvc-help small{display:block;font-size:9px;line-height:1.6;color:#697a80}@keyframes mvcPulse{50%{transform:scale(1.12);box-shadow:0 0 0 8px rgba(0,168,160,.18)}}@media(max-width:420px){#mamoVoiceStatus{max-width:120px}}`;document.head.appendChild(s)}

  function boot(){styles();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
