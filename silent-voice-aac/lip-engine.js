const MP_VERSION = "1.0.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DEFAULT_PHRASES = ["はい","いいえ","ありがとう","助けてください","水が","欲しいです","薬を","ください","今日は","明日は","家族に","病院に","行きたいです","来てください","痛いです","苦しいです","少し","とても","大丈夫です","わかりません"];

const CALIBRATION_ITEMS = [
  { text: "赤い傘を持つ兄は、駅へ急ぎます。", reading: "あかいかさをもつあにはえきへいそぎます" },
  { text: "黄色い服の子が、雲を見て笛を吹きます。", reading: "きいろいふくのこがくもをみてふえをふきます" },
  { text: "船の上で猫と犬が、海を眺めます。", reading: "ふねのうえでねこといぬがうみをながめます" },
  { text: "朝、庭の花へ水をやり、鳥の声を聞きます。", reading: "あさにわのはなへみずをやりとりのこえをききます" },
  { text: "昼、村の店でパンと牛乳を買います。", reading: "ひるむらのみせでぱんとぎゅうにゅうをかいます" },
  { text: "帰りに本屋へ寄り、レモンを選びます。", reading: "かえりにほんやへよりれもんをえらびます" },
  { text: "山道を登ると、冷たい風が吹き抜けます。", reading: "やまみちをのぼるとつめたいかぜがふきぬけます" },
  { text: "若い記者が写真を撮り、ニュースを伝えます。", reading: "わかいきしゃがしゃしんをとりにゅうすをつたえます" },
  { text: "ジャズとピアノの曲を、ベッドで聞きます。", reading: "じゃずとぴあののきょくをべっどでききます" },
  { text: "頬を強く押さえ、ゆっくり休みます。", reading: "ほおをつよくおさえゆっくりやすみます" },
];
const CALIBRATION_PROMPTS = CALIBRATION_ITEMS.map((item) => item.text);
const CALIBRATION_READINGS = Object.fromEntries(CALIBRATION_ITEMS.map((item) => [item.text, item.reading]));
const BASIC_GOJUON = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"];

const STORAGE_KEY = "silentVoiceAAC.templates.v2";
const LEGACY_STORAGE_KEY = "silentVoiceAAC.templates.v1";
const CALIBRATION_KEY = "silentVoiceAAC.calibration.v1";

function dist(a,b){const dx=a.x-b.x;const dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function cleanPhrase(value){return String(value||"").trim().replace(/\s+/g," ").slice(0,40)}
function extractFeatures(lm){if(!lm||lm.length<309)return null;const left=lm[61],right=lm[291],innerTop=lm[13],innerBottom=lm[14],outerTop=lm[0],outerBottom=lm[17],innerLeft=lm[78],innerRight=lm[308];const width=Math.max(dist(left,right),1e-6),innerWidth=Math.max(dist(innerLeft,innerRight),1e-6);return [dist(innerTop,innerBottom)/width,dist(outerTop,outerBottom)/width,innerWidth/width,(innerTop.y+innerBottom.y)/2-(left.y+right.y)/2,(innerTop.x+innerBottom.x)/2-(left.x+right.x)/2]}
function normalizeSequence(seq,targetLength=30){if(!seq||seq.length<4)return[];const source=seq.slice(2,-2);if(source.length<2)return seq;const dims=source[0].length,out=[];for(let i=0;i<targetLength;i++){const pos=i*(source.length-1)/(targetLength-1),lo=Math.floor(pos),hi=Math.min(source.length-1,lo+1),t=pos-lo,frame=[];for(let d=0;d<dims;d++)frame.push(source[lo][d]*(1-t)+source[hi][d]*t);out.push(frame)}for(let d=0;d<dims;d++){const vals=out.map(f=>f[d]),mean=vals.reduce((a,b)=>a+b,0)/vals.length,variance=vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length,sd=Math.sqrt(variance)||1;for(const frame of out)frame[d]=(frame[d]-mean)/sd}return out}
function summarizeSequence(seq,durationMs){if(!seq?.length)return null;const dims=seq[0].length,mean=Array(dims).fill(0),min=Array(dims).fill(Infinity),max=Array(dims).fill(-Infinity),motion=Array(dims).fill(0);seq.forEach((frame,i)=>{for(let d=0;d<dims;d++){mean[d]+=frame[d];min[d]=Math.min(min[d],frame[d]);max[d]=Math.max(max[d],frame[d]);if(i>0)motion[d]+=Math.abs(frame[d]-seq[i-1][d])}});for(let d=0;d<dims;d++){mean[d]/=seq.length;motion[d]/=Math.max(1,seq.length-1)}return{frames:seq.length,durationMs:Math.round(durationMs),mean:mean.map(v=>Number(v.toFixed(6))),min:min.map(v=>Number(v.toFixed(6))),max:max.map(v=>Number(v.toFixed(6))),range:max.map((v,d)=>Number((v-min[d]).toFixed(6))),motion:motion.map(v=>Number(v.toFixed(6))),overallMotion:Number((motion.reduce((a,b)=>a+b,0)/dims).toFixed(6))}}
function frameDistance(a,b){let sum=0;for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])**2;return Math.sqrt(sum/a.length)}
function dtwDistance(a,b){const n=a.length,m=b.length;if(!n||!m)return Infinity;const prev=new Float64Array(m+1).fill(Infinity),curr=new Float64Array(m+1).fill(Infinity);prev[0]=0;for(let i=1;i<=n;i++){curr.fill(Infinity);for(let j=1;j<=m;j++){const cost=frameDistance(a[i-1],b[j-1]);curr[j]=cost+Math.min(curr[j-1],prev[j],prev[j-1])}prev.set(curr)}return prev[m]/(n+m)}
function safeParse(raw){try{const parsed=JSON.parse(raw||"{}");return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{}}catch{return{}}}
function loadTemplates(){let parsed=safeParse(localStorage.getItem(STORAGE_KEY));if(!Object.keys(parsed).length){const legacy=safeParse(localStorage.getItem(LEGACY_STORAGE_KEY));if(Object.keys(legacy).length)parsed=legacy}for(const phrase of DEFAULT_PHRASES)if(!Array.isArray(parsed[phrase]))parsed[phrase]=[];for(const [phrase,templates] of Object.entries(parsed))if(!cleanPhrase(phrase)||!Array.isArray(templates))delete parsed[phrase];return parsed}
function saveTemplates(templates){localStorage.setItem(STORAGE_KEY,JSON.stringify(templates))}
function loadCalibration(){const parsed=safeParse(localStorage.getItem(CALIBRATION_KEY));if(!parsed.samples||typeof parsed.samples!=="object"||Array.isArray(parsed.samples))parsed.samples={};parsed.version=2;return parsed}
function saveCalibration(calibration){localStorage.setItem(CALIBRATION_KEY,JSON.stringify(calibration))}

export class LipEngine{
  constructor({video,canvas,onStatus,onFrame}){this.video=video;this.canvas=canvas;this.ctx=canvas.getContext("2d");this.onStatus=onStatus||(()=>{});this.onFrame=onFrame||(()=>{});this.faceLandmarker=null;this.stream=null;this.running=false;this.lastVideoTime=-1;this.latestFeatures=null;this.rafId=null;this.templates=loadTemplates();this.calibration=loadCalibration();saveTemplates(this.templates);saveCalibration(this.calibration)}
  async init(){this.onStatus("AI読込中");try{const vision=await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`);const fileset=await vision.FilesetResolver.forVisionTasks(WASM_URL);this.faceLandmarker=await vision.FaceLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL_URL,delegate:"GPU"},runningMode:"VIDEO",numFaces:1,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false});this.onStatus("AI準備OK");return true}catch(error){console.error(error);this.onStatus("AI読込失敗");return false}}
  async startCamera(){if(!navigator.mediaDevices?.getUserMedia)throw new Error("このブラウザはカメラ入力に対応していません。");this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:960}},audio:false});this.video.srcObject=this.stream;await this.video.play();this.running=true;this.renderLoop()}
  stopCamera(){this.running=false;if(this.rafId)cancelAnimationFrame(this.rafId);this.rafId=null;if(this.stream)this.stream.getTracks().forEach(track=>track.stop());this.stream=null;this.video.srcObject=null;this.latestFeatures=null;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)}
  renderLoop(){if(!this.running)return;this.rafId=requestAnimationFrame(()=>this.renderLoop());if(!this.faceLandmarker||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;this.lastVideoTime=this.video.currentTime;const w=this.video.videoWidth||640,h=this.video.videoHeight||480;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}const result=this.faceLandmarker.detectForVideo(this.video,performance.now()),lm=result.faceLandmarks?.[0];this.latestFeatures=extractFeatures(lm);this.drawMouth(lm,w,h);this.onFrame({hasFace:Boolean(lm),features:this.latestFeatures})}
  drawMouth(lm,w,h){const ctx=this.ctx;ctx.clearRect(0,0,w,h);if(!lm)return;const ids=[61,40,37,0,267,270,291,321,314,17,84,91,61];ctx.strokeStyle="rgba(81, 224, 200, 0.95)";ctx.lineWidth=Math.max(3,w/220);ctx.beginPath();ids.forEach((id,index)=>{const p=lm[id],x=p.x*w,y=p.y*h;if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}
  async collectRaw(durationMs){if(!this.running)throw new Error("先にカメラを開始してください。");const seq=[],start=performance.now();while(performance.now()-start<durationMs){if(this.latestFeatures)seq.push([...this.latestFeatures]);await new Promise(resolve=>setTimeout(resolve,50))}if(seq.length<12)throw new Error("口元を十分に検出できませんでした。顔を正面に近づけて再試行してください。");return{seq,durationMs:performance.now()-start}}
  async capture(durationMs=2200){const raw=await this.collectRaw(durationMs),normalized=normalizeSequence(raw.seq);if(normalized.length<10)throw new Error("口元を十分に検出できませんでした。");return normalized}
  async captureCalibration(durationMs=5200){const raw=await this.collectRaw(durationMs);return{sequence:normalizeSequence(raw.seq,48),summary:summarizeSequence(raw.seq,raw.durationMs)}}
  calibrationPrompts(){return[...CALIBRATION_PROMPTS]}
  calibrationReading(prompt){return CALIBRATION_READINGS[prompt]||""}
  calibrationState(){const samples=this.calibration.samples||{},completed=CALIBRATION_PROMPTS.filter(prompt=>samples[prompt]).length;return{completed,total:CALIBRATION_PROMPTS.length,samples,done:completed===CALIBRATION_PROMPTS.length}}
  calibrationCoverage(){const samples=this.calibration.samples||{};const completedReadings=CALIBRATION_ITEMS.filter(item=>samples[item.text]).map(item=>item.reading).join("");const chars=new Set([...completedReadings]);const covered=BASIC_GOJUON.filter(kana=>chars.has(kana));const missing=BASIC_GOJUON.filter(kana=>!chars.has(kana));return{covered:covered.length,total:BASIC_GOJUON.length,percent:Math.round(covered.length/BASIC_GOJUON.length*100),missing}}
  saveCalibrationSample(prompt,sample){if(!CALIBRATION_PROMPTS.includes(prompt))throw new Error("校正文が不正です。");if(!sample?.sequence?.length||!sample?.summary)throw new Error("キャリブレーションデータが不足しています。");this.calibration.samples||={};this.calibration.samples[prompt]={prompt,reading:CALIBRATION_READINGS[prompt]||"",sequence:sample.sequence,summary:sample.summary,capturedAt:new Date().toISOString()};this.calibration.updatedAt=new Date().toISOString();this.calibration.version=2;saveCalibration(this.calibration)}
  clearCalibration(){this.calibration={version:2,samples:{}};saveCalibration(this.calibration)}
  calibrationProfile(){const records=CALIBRATION_PROMPTS.map(prompt=>this.calibration.samples?.[prompt]).filter(item=>item?.summary);if(!records.length)return null;const avg=pick=>records.reduce((sum,item)=>sum+Number(pick(item)||0),0)/records.length;const latest=records.map(r=>r.capturedAt).filter(Boolean).sort().at(-1)||null;return{sampleCount:records.length,averageInnerOpening:Number(avg(r=>r.summary.mean?.[0]).toFixed(4)),averageOpeningRange:Number(avg(r=>r.summary.range?.[0]).toFixed(4)),averageWidthRatio:Number(avg(r=>r.summary.mean?.[2]).toFixed(4)),averageMotion:Number(avg(r=>r.summary.overallMotion).toFixed(5)),averageFrames:Math.round(avg(r=>r.summary.frames)),updatedAt:latest}}
  phrases(){const custom=Object.keys(this.templates).filter(phrase=>!DEFAULT_PHRASES.includes(phrase));return[...DEFAULT_PHRASES,...custom.sort((a,b)=>a.localeCompare(b,"ja"))]}
  ensurePhrase(value){const phrase=cleanPhrase(value);if(!phrase)throw new Error("登録する言葉を入力してください。");if(!this.templates[phrase])this.templates[phrase]=[];saveTemplates(this.templates);return phrase}
  addTemplate(value,sequence){const phrase=this.ensurePhrase(value);this.templates[phrase].push(sequence);if(this.templates[phrase].length>5)this.templates[phrase]=this.templates[phrase].slice(-5);saveTemplates(this.templates)}
  clearTemplates(){for(const phrase of Object.keys(this.templates))this.templates[phrase]=[];for(const phrase of DEFAULT_PHRASES)this.templates[phrase]||=[];saveTemplates(this.templates)}
  counts(){return Object.fromEntries(this.phrases().map(phrase=>[phrase,this.templates[phrase]?.length||0]))}
  classify(sequence){const scored=[];for(const phrase of this.phrases()){const templates=this.templates[phrase]||[];if(!templates.length)continue;const distances=templates.map(t=>dtwDistance(sequence,t)).sort((a,b)=>a-b),bestTwo=distances.slice(0,Math.min(2,distances.length)),score=bestTwo.reduce((a,b)=>a+b,0)/bestTwo.length;scored.push({phrase,distance:score})}scored.sort((a,b)=>a.distance-b.distance);if(!scored.length)return[];const best=scored[0].distance;return scored.slice(0,3).map(item=>({phrase:item.phrase,distance:item.distance,confidence:Math.round(clamp(100*Math.exp(-2.8*Math.max(0,item.distance-best+0.04)),8,96))}))}
}

export{DEFAULT_PHRASES,CALIBRATION_PROMPTS,CALIBRATION_ITEMS,CALIBRATION_READINGS,BASIC_GOJUON};
