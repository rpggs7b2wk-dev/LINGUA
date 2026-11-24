const $=id=>document.getElementById(id);
let direction="ja-en", latestTranslation="", recognition=null, saved=[];
const source=$("sourceText");
function setDirection(){ $("sourceLang").textContent=direction==="ja-en"?"日本語":"ENGLISH"; $("targetLang").textContent=direction==="ja-en"?"ENGLISH":"日本語"; $("sourceLang").classList.add("active");}
$("swapBtn").onclick=()=>{direction=direction==="ja-en"?"en-ja":"ja-en";setDirection();};
source.addEventListener("input",()=>{$("charCount").textContent=`${source.value.length} / 2000`;});
$("clearBtn").onclick=()=>{source.value="";$("charCount").textContent="0 / 2000";$("status").textContent="";};
function setStatus(s){$("status").textContent=s;}
async function translate(text){
 if(!text.trim())return setStatus("文章を入力してください。");
 setStatus("翻訳しています...");
 try{
  const [from,to]=direction==="ja-en"?["ja","en"]:["en","ja"];
  const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,2000))}&langpair=${from}|${to}`;
  const r=await fetch(url);const data=await r.json();
  if(!data.responseData?.translatedText)throw new Error("translation");
  latestTranslation=decodeHtml(data.responseData.translatedText);
  $("translatedText").textContent=latestTranslation;
  $("resultSection").classList.remove("hidden");
  renderExplanation(text,latestTranslation);
  addHistory(text,latestTranslation);
  setStatus("翻訳が完了しました。");
 }catch(e){setStatus("翻訳に失敗しました。通信環境を確認して、もう一度お試しください。");}
}
function decodeHtml(s){const t=document.createElement("textarea");t.innerHTML=s;return t.value;}
$("translateBtn").onclick=()=>translate(source.value);
function renderExplanation(original,translated){
 const english=direction==="ja-en"?translated:original;
 const words=(english.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[]);
 const unique=[...new Set(words.map(w=>w.toLowerCase()))].slice(0,8);
 $("basicExplanation").innerHTML="";
 const add=(title,body)=>{const d=document.createElement("div");d.className="explain-item";const b=document.createElement("b");b.textContent=title;const p=document.createElement("p");p.textContent=body;d.append(b,p);$("basicExplanation").append(d);};
 add("全体の意味",`「${translated}」という意味です。前後の文脈によって自然な訳し方は変わります。`);
 add("重要語句",unique.length?unique.map(w=>`${w}：辞書的な意味や文中での役割を確認しましょう`).join(" ／ "):"英語の文章を入力すると、語句をここに表示します。");
 add("文法のポイント","主語・動詞・目的語など、文の中心になる要素を見つけると構造を理解しやすくなります。");
 $("deepExplanation").innerHTML="";
 const deep=[
 ["文の骨格","まず動詞を探し、その動詞が「何を」「どんな状態を」表すかを確認します。"],
 ["文型の考え方","Sは主語（誰が・何が）、Vは動詞（どうする・どんな状態）、Oは目的語（何を・誰に）、Cは主語や目的語の説明です。"],
 ["見分けるコツ","SVCではS=Cの関係になります。SVOではOは動作の対象で、SとOは同じものを指しません。"],
 ["注意","現在の簡易版では文型や品詞を自動で確定していません。正確な分析には文脈を含むAI解析が必要です。"]
 ];
 deep.forEach(([t,b])=>{const d=document.createElement("div");d.className="explain-item";d.innerHTML=`<b>${t}</b><p>${b}</p>`;$("deepExplanation").append(d);});
}
$("copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText(latestTranslation);$("copyBtn").textContent="コピーしました";}catch(e){$("copyBtn").textContent="コピーできません";}};
$("saveBtn").onclick=()=>{saved.push(latestTranslation);$("saveBtn").textContent="☆ 保存しました";};
$("speakBtn").onclick=()=>{if(!latestTranslation)return;const u=new SpeechSynthesisUtterance(latestTranslation);u.lang=direction==="ja-en"?"en-US":"ja-JP";speechSynthesis.speak(u);};
function addHistory(a,b){let h=JSON.parse(localStorage.getItem("linguaHistory")||"[]");h.unshift({a,b});h=h.slice(0,15);localStorage.setItem("linguaHistory",JSON.stringify(h));}
$("historyBtn").onclick=()=>{const h=JSON.parse(localStorage.getItem("linguaHistory")||"[]");$("historyList").innerHTML="";h.forEach(x=>{const d=document.createElement("div");d.className="history-item";d.textContent=x.a;const sm=document.createElement("small");sm.textContent=x.b;d.append(sm);d.onclick=()=>{source.value=x.a;$("translatedText").textContent=x.b;latestTranslation=x.b;$("resultSection").classList.remove("hidden");};$("historyList").append(d);});$("historySection").classList.remove("hidden");};
$("closeHistory").onclick=()=>$("historySection").classList.add("hidden");

// Speech recognition: permission errors can be fixed in Safari settings, then retried.
const micBtn=$("micBtn");
let isListening=false;
function resetMicButton(){isListening=false;micBtn.textContent="🎙 音声入力";}
function showMicPermissionHelp(){
 setStatus("マイクが許可されていません。iPhoneの「設定」→「Safari」→「マイク」、またはSafariのアドレスバー左側のページ設定から、このサイトのマイクを「許可」にして、LINGUAに戻ってもう一度「音声入力」を押してください。");
 micBtn.textContent="↻ もう一度試す";
}
micBtn.onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){setStatus("このブラウザでは音声認識に対応していません。iPhoneのキーボードにあるマイク（音声入力）を利用してください。");return;}
 if(isListening && recognition){try{recognition.stop();}catch(e){}resetMicButton();return;}
 try{
  recognition=new SR();
  recognition.lang=direction==="ja-en"?"ja-JP":"en-US";
  recognition.interimResults=true;
  recognition.continuous=true;
  isListening=true;
  micBtn.textContent="■ 音声入力を停止";
  setStatus("マイクを使用中です。話し終えたら停止してください。");
  recognition.onresult=e=>{
   let finalText="";
   for(let i=e.resultIndex;i<e.results.length;i++) finalText+=e.results[i][0].transcript;
   source.value+=finalText;
   $("charCount").textContent=`${source.value.length} / 2000`;
  };
  recognition.onerror=e=>{
   resetMicButton();
   if(e.error==="not-allowed"||e.error==="service-not-allowed"||e.error==="permission-denied") showMicPermissionHelp();
   else if(e.error==="no-speech") setStatus("音声が検出されませんでした。マイクに近づいて、もう一度お試しください。");
   else setStatus("音声を認識できませんでした。通信環境とマイクの設定を確認して、もう一度お試しください。");
  };
  recognition.onend=()=>{resetMicButton();recognition=null;};
  recognition.start();
 }catch(err){resetMicButton();showMicPermissionHelp();recognition=null;}
};

// Camera capture and photo-library selection are separate actions.
$("cameraBtn").onclick=()=>$("cameraInput").click();
$("albumBtn").onclick=()=>$("albumInput").click();
async function processPhoto(file){
 if(!file)return;
 $("photoPreview").classList.remove("hidden");
 $("previewImage").src=URL.createObjectURL(file);
 $("ocrText").value="";
 $("ocrStatus").textContent="画像から文字を読み取っています...";
 try{
  if(!window.Tesseract) throw new Error("OCR library unavailable");
  const lang=direction==="ja-en"?"eng":"eng+jpn";
  const result=await Tesseract.recognize(file,lang,{logger:m=>{if(m.status==="recognizing text")$("ocrStatus").textContent=`文字を読み取り中... ${Math.round((m.progress||0)*100)}%`;}});
  $("ocrText").value=result.data.text.trim();
  $("ocrStatus").textContent=$("ocrText").value?"読み取り完了。必要なら文章を修正できます。":"文字を読み取れませんでした。ピントと明るさを確認して、もう一度お試しください。";
 }catch(err){$("ocrStatus").textContent="写真の読み取りに失敗しました。通信環境を確認してください。";}
}
$("cameraInput").onchange=e=>{processPhoto(e.target.files[0]);e.target.value="";};
$("albumInput").onchange=e=>{processPhoto(e.target.files[0]);e.target.value="";};
$("useOcrBtn").onclick=()=>{source.value=$("ocrText").value;$("charCount").textContent=`${source.value.length} / 2000`;$("photoPreview").classList.add("hidden");translate(source.value);};
setDirection();
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
