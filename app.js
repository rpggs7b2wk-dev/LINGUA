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

// Speech recognition: browser support varies, especially on iPhone.
$("micBtn").onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){setStatus("このブラウザでは音声認識に対応していません。iOSの音声入力キーボードも利用できます。");return;}
 if(recognition){recognition.stop();recognition=null;$("micBtn").textContent="🎙 音声入力";return;}
 recognition=new SR();recognition.lang=direction==="ja-en"?"ja-JP":"en-US";recognition.interimResults=true;recognition.continuous=true;
 $("micBtn").textContent="■ 音声入力を停止";setStatus("マイクを使用中です。話し終えたら停止してください。");
 recognition.onresult=e=>{let final="";for(let i=e.resultIndex;i<e.results.length;i++)final+=e.results[i][0].transcript;source.value+=final;$("charCount").textContent=`${source.value.length} / 2000`;};
 recognition.onerror=()=>setStatus("音声を認識できませんでした。マイクの許可を確認してください。");
 recognition.onend=()=>{$("micBtn").textContent="🎙 音声入力";recognition=null;};
 recognition.start();
};

// Photo OCR (Tesseract.js runs in the browser via CDN).
$("photoInput").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 $("photoPreview").classList.remove("hidden");$("previewImage").src=URL.createObjectURL(file);$("ocrText").value="";$("ocrStatus").textContent="画像から文字を読み取っています...";
 try{
  const lang=direction==="ja-en"?"eng":"eng+jpn";
  const result=await Tesseract.recognize(file,lang,{logger:m=>{if(m.status==="recognizing text")$("ocrStatus").textContent=`文字を読み取り中... ${Math.round((m.progress||0)*100)}%`;}});
  $("ocrText").value=result.data.text.trim();$("ocrStatus").textContent=$("ocrText").value?"読み取り完了。必要なら文章を修正できます。":"文字を読み取れませんでした。明るく撮影し直してください。";
 }catch(err){$("ocrStatus").textContent="写真の読み取りに失敗しました。ネット接続を確認してください。";}
};
$("useOcrBtn").onclick=()=>{source.value=$("ocrText").value;$("charCount").textContent=`${source.value.length} / 2000`;$("photoPreview").classList.add("hidden");translate(source.value);};
setDirection();
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
