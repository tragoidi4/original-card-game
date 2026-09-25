const MAX={hand:9,monsters:7,energy:18,field:1,facedown:3};
const CARD_NAMES_URL="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/all_card_names.txt";
const CARD_IMAGE_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/captured_cards/";
const CROPPED_CARD_IMAGE_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/cropped_cards/";

const state={turnPlayer:1,selected:null,deckInspectId:null,discardInspectId:null,discardInspectPlayer:1,players:{},savedDeck:[],deckSaveTimer:null,deckLoadTimer:null};
let cardNames=[];

function imageUrl(name){return CARD_IMAGE_BASE+encodeURIComponent(name)+".png";}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function newCard(name,id){return{id,name,faceUp:true,revealed:false,tapped:false,counters:0,damage:0,recovery:0,modification:0};}
function newPlayer(name,p){
  const pool=shuffle([...cardNames]).slice(0,50);
  return{name,life:4000,deckCounters:0,deckList:pool.slice(),hand:pool.slice(0,7).map((n,i)=>newCard(n,p+"h"+i)),monsters:[],energy:[],field:[],discard:[],facedown:[],deck:pool.slice(7).map((n,i)=>newCard(n,p+"d"+i))};
}
function log(s){const e=document.querySelector("#log"),d=new Date().toLocaleTimeString("ja-JP"),html='<div>['+d+'] '+esc(s)+"</div>";e.insertAdjacentHTML("beforeend",html);e.scrollTop=e.scrollHeight;const v=document.querySelector("#deckViewerLog");if(v){v.insertAdjacentHTML("beforeend",html);v.scrollTop=v.scrollHeight}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function closeDiscardViewer(){const v=document.querySelector("#discardViewer");if(v)v.hidden=true;state.discardInspectId=null}
function openDiscardViewer(p=1){state.discardInspectPlayer=p;state.discardInspectId=null;renderDiscardViewer();const v=document.querySelector("#discardViewer");if(v)v.hidden=false}
function renderDiscardViewer(){
  const list=document.querySelector("#discardViewerList"),preview=document.querySelector("#discardViewerPreview"),actions=document.querySelector("#discardViewerActions");if(!list||!preview||!actions)return;
  const p=state.discardInspectPlayer||1,x=state.players[p],cards=x.discard||[];list.innerHTML="";preview.innerHTML="";actions.innerHTML="";
  if(!cards.length){list.innerHTML='<div class="deck-viewer-empty">捨て札がありません</div>';return}
  cards.forEach(c=>{const e=document.createElement("div");e.className="discard-viewer-card"+(state.selected?.id===c.id?" selected":"");const img=document.createElement("img");img.src=imageUrl(c.name);img.alt=c.name;img.loading="lazy";img.onerror=()=>{img.replaceWith(document.createTextNode(c.name))};e.appendChild(img);e.onclick=ev=>{ev.stopPropagation();state.selected={p,z:"discard",id:c.id};render()};list.appendChild(e)});
  
}
function moveInspectedDiscardCard(dest){const x=state.players[state.discardInspectPlayer||1],i=x.discard.findIndex(c=>c.id===state.discardInspectId);if(i<0)return;if(MAX[dest]!==undefined&&x[dest].length>=MAX[dest])return log(dest+" の上限のため移動をキャンセル");const c=x.discard.splice(i,1)[0];c.faceUp=dest==="facedown"?false:true;x[dest].push(c);log("捨て札から "+c.name+" を "+({"deck":"山札","hand":"手札","monsters":"モンスター","energy":"エネルギー","field":"フィールド","facedown":"罠"}[dest])+" へ移動しました");state.discardInspectId=null;render();renderDiscardViewer()}
function render(){
  for(const p of[1,2]){
    const x=state.players[p];
    document.querySelector("#p"+p+"-name").textContent=x.name;
    document.querySelector("#p"+p+"-life").textContent=x.life;
    const deckCount=document.querySelector("#p"+p+"-deck-count");if(deckCount)deckCount.textContent=x.deck.length+"枚";const deckCounter=document.querySelector("#p"+p+"-deck-counter");if(deckCounter)deckCounter.textContent=x.deckCounters||0;
    zone(p,"field",x.field);
    zone(p,"discard",x.discard.slice(-1));
    const discardZone=document.querySelector("#p"+p+"-discard");if(discardZone){discardZone.onclick=()=>openDiscardViewer(p);Array.from(discardZone.children).forEach(card=>{card.onclick=ev=>{ev.stopPropagation();openDiscardViewer(p)}})}
    zone(p,"facedown",x.facedown);
    const deck=document.querySelector("#p"+p+"-deck");
    deck.innerHTML="";
    const deckCounterBadge=document.createElement("b");
    deckCounterBadge.id="p"+p+"-deck-counter";
    deckCounterBadge.textContent=x.deckCounters||0;
    deckCounterBadge.hidden=!(x.deckCounters||0);
    deck.appendChild(deckCounterBadge);
    deck.onclick=null;
    if(x.deck.length){
      deck.onclick=()=>{state.selected={p,z:"deck",id:"deck"};render()};
    }
    deck.classList.toggle("back",!!x.deck.length);
    deck.classList.toggle("horizontal",!!x.deckHorizontal);
    zone(p,"energy",x.energy);
    zone(p,"monsters",x.monsters);
    const h=document.querySelector("#p"+p+"-hand");h.innerHTML="";
    x.hand.forEach(c=>h.appendChild(cardEl(p,"hand",c,p===1||c.revealed)));
  }
  const revealedStatus=document.querySelector("#revealedStatus");
  if(revealedStatus){
    let statusText="カードを選択してください";
    const selected=state.selected;
    if(selected&&selected.p===1&&selected.z==="hand"){
      const selectedCard=state.players[1].hand.find(v=>v.id===selected.id);
      if(selectedCard)statusText=selectedCard.revealed?"公開中":"非公開";
    }
    revealedStatus.textContent=statusText;
  }
  document.querySelector("#turnPlayer").textContent=state.players[state.turnPlayer].name;
  selection();
}
function zone(p,z,a){
  const e=document.querySelector("#p"+p+"-"+z);e.innerHTML="";
  if(z==="facedown"){e.style.display="flex";e.style.flexDirection="row";e.style.flexWrap="nowrap";e.style.gap="7px";e.style.alignItems="flex-start";e.style.justifyContent="flex-start";}
  (a||[]).forEach(c=>e.appendChild(cardEl(p,z,c,p===1||c.faceUp!==false)));
}
function cardEl(p,z,c,visible){
  const e=document.createElement("div");
  e.className="card zone-"+z+(c.tapped?" tapped":"")+(state.selected?.id===c.id?" selected":""); if(c.tapped){e.style.transformOrigin="center center";e.style.transform="rotate(-15deg)";}
  if(!visible||c.faceUp===false){
    e.classList.add("back");
  }else{
    const img=document.createElement("img");
    img.src=(z==="energy"?CROPPED_CARD_IMAGE_BASE:CARD_IMAGE_BASE)+encodeURIComponent(c.name)+".png"+(z==="energy"?"?energyv=3":"");img.alt=c.name;img.loading="lazy";
    img.onerror=()=>{img.replaceWith(document.createTextNode(c.name));};
    e.appendChild(img);
    const a=c.modification+c.recovery-c.damage;
    if(a)e.insertAdjacentHTML("beforeend",'<span class="adjust">'+(a>0?"+":"")+a+"</span>");
    if(c.counters)e.insertAdjacentHTML("beforeend",'<span class="counter">'+c.counters+"</span>");
  }
  if(c.revealed){const mark=document.createElement("span");mark.className="revealed-marker";mark.textContent="!";e.appendChild(mark)}
  e.dataset.player=String(p);e.dataset.zone=z;e.dataset.cardId=c.id;
  if(p===1)e.onclick=()=>select(p,z,c.id);
  return e;
}
function find(p,z,id){return state.players[p][z].find(c=>c.id===id);}
function select(p,z,id){
  const c=find(p,z,id);if(!c)return;
  state.selected={p,z,id};render();
}
function selection(){
  const pr=document.querySelector("#preview"),op=document.querySelector("#ops");
  if(!state.selected){pr.innerHTML="カードを選択";op.textContent="カードを選択してください";return}
  const s=state.selected;
  if(s.z==="deck"){
    pr.textContent="山札";
    op.innerHTML="";
    if(s.p!==1){op.innerHTML="";return}
    add("1枚引く",()=>drawCards(1));
    add("好きな枚数を引く",()=>{const n=Number(prompt("引く枚数を入力してください"));if(Number.isInteger(n)&&n>0)drawCards(n)});
    add("山札を確認",()=>openDeckViewer());
    const deckSpacer=document.createElement("div");deckSpacer.style.height="12px";op.appendChild(deckSpacer);
    addCounterControls(op,state.players[1],"deckCounters");
    add("山札を横向きにする",()=>{state.players[1].deckHorizontal=!state.players[1].deckHorizontal;state.selected=null;render()});
    add("山札をシャッフルする",()=>{shuffle(state.players[1].deck);state.selected=null;render();log("山札をシャッフルしました")});
    return;
  }
  const c=find(s.p,s.z,s.id);
  if(!c){state.selected=null;return render()}
  pr.innerHTML="";
  if(c.faceUp!==false || (s.p===1 && s.z==="facedown")){
    const img=document.createElement("img");
    img.src=imageUrl(c.name);img.alt=c.name;
    img.onerror=()=>{img.replaceWith(document.createTextNode(c.name));};
    pr.appendChild(img);
    if(c.faceUp===false && s.z==="facedown"){
      const name=document.createElement("div");name.textContent=c.name;name.style.marginTop="4px";pr.appendChild(name);
    }
  }else{
    pr.textContent="裏向きのカード";
  }
  op.innerHTML="";
  if(s.p!==1){op.textContent="相手のカードは確認のみ";return}
  if(s.z==="hand"){
    if(c.revealed){
      add("公開をやめる",()=>{c.revealed=false;state.selected={p:s.p,z:s.z,id:s.id};render()});
    }else{
      add("相手に公開する",()=>{c.revealed=true;c.faceUp=true;state.selected={p:s.p,z:s.z,id:s.id};render()});
    }
  }
  if(s.z==="monsters"||s.z==="energy"){add("タップ / アンタップ",()=>{c.tapped=!c.tapped;state.selected={p:s.p,z:s.z,id:s.id};render()});}
  if(s.z==="monsters"){
    add("100ダメージ",()=>{c.damage+=100;render()});
    add("100回復",()=>{c.recovery=Math.min(c.damage,c.recovery+100);render()});
    addCounterControls(op,c,"counters");
  }
  if(s.z==="field"){
    addCounterControls(op,c,"counters");
  }
  const destinations=[["deck","山札へ"],["hand","手札へ"],["monsters","モンスターへ"],["energy","エネルギーへ"],["field","フィールドへ"],["facedown","罠へ"],["discard","捨て札へ"]];
  if(s.z==="field")destinations.splice(2,4);
  if(s.z==="facedown")destinations.splice(2,3);
  if(s.z==="energy")destinations.splice(2,3);
  for(const[z,label]of destinations)if(z!==s.z&&!(s.z==="monsters"&&z==="facedown"))add(label,()=>move(z));
}
function add(t,fn){const b=document.createElement("button");b.textContent=t;b.onclick=fn;document.querySelector("#ops").appendChild(b)}
function addCounterControls(parent,target,key){const row=document.createElement("div");row.className="counter-actions";const plus=document.createElement("button");plus.textContent="カウンター +1";plus.onclick=()=>{target[key]=(target[key]||0)+1;render()};const minus=document.createElement("button");minus.textContent="カウンター -1";minus.onclick=()=>{if((target[key]||0)===0)return log("カウンター減少をキャンセル");target[key]--;render()};row.append(plus,minus);parent.appendChild(row)}
function openDeckViewer(){state.deckInspectId=null;renderDeckViewer();const v=document.querySelector("#deckViewerLog"),l=document.querySelector("#log");if(v&&l){v.innerHTML=l.innerHTML;v.scrollTop=v.scrollHeight}document.querySelector("#deckViewer").hidden=false}
function closeDeckViewer(){state.deckInspectId=null;document.querySelector("#deckViewer").hidden=true}
function renderDeckViewer(){
  const list=document.querySelector("#deckViewerList"),actions=document.querySelector("#deckViewerActions"),preview=document.querySelector("#deckViewerPreview");
  if(!list||!actions||!preview)return;
  const x=state.players[1],deck=x.deck||[];
  list.innerHTML="";actions.innerHTML="";preview.innerHTML="";
  if(!deck.length){list.innerHTML='<div class="deck-viewer-empty">山札がありません</div>';preview.textContent="カードを選択";return}
  deck.forEach(c=>{
    const e=document.createElement("div");e.className="deck-viewer-card"+(state.deckInspectId===c.id?" selected":"");
    const img=document.createElement("img");img.src=imageUrl(c.name);img.alt=c.name;img.loading="lazy";img.onerror=()=>{img.replaceWith(document.createTextNode(c.name))};e.appendChild(img);
    e.onclick=()=>{state.deckInspectId=c.id;renderDeckViewer()};list.appendChild(e);
  });
  const c=deck.find(v=>v.id===state.deckInspectId);
  if(!c){preview.textContent="カードを選択";return}
  const img=document.createElement("img");img.src=imageUrl(c.name);img.alt=c.name;img.onerror=()=>{img.replaceWith(document.createTextNode(c.name))};preview.appendChild(img);
  const name=document.createElement("div");name.className="deck-viewer-name";name.textContent=c.name;preview.appendChild(name);
  for(const[z,label]of[["hand","手札へ"],["monsters","モンスターへ"],["energy","エネルギーへ"],["field","フィールドへ"],["facedown","罠へ"],["discard","捨て札へ"]]){
    const b=document.createElement("button");b.textContent=label;b.onclick=()=>moveInspectedDeckCard(z);actions.appendChild(b);
  }
}
function moveInspectedDeckCard(dest){
  const x=state.players[1],i=x.deck.findIndex(c=>c.id===state.deckInspectId);if(i<0)return;
  if(MAX[dest]!==undefined&&x[dest].length>=MAX[dest])return log(dest+" の上限のため移動をキャンセル");
  const c=x.deck.splice(i,1)[0];c.faceUp=dest==="facedown"?false:true;x[dest].push(c);
  log("山札から "+c.name+" を "+({"hand":"手札","monsters":"モンスター","energy":"エネルギー","field":"フィールド","facedown":"罠","discard":"捨て札"}[dest])+" へ移動しました");
  state.deckInspectId=null;render();renderDeckViewer();
}
function move(dest){
  const s=state.selected,x=state.players[1],src=x[s.z],i=src.findIndex(c=>c.id===s.id);if(i<0)return;
  if(MAX[dest]!==undefined&&x[dest].length>=MAX[dest])return log(dest+" の上限のため移動をキャンセル");
  const c=src.splice(i,1)[0];
  c.faceUp = dest==="facedown" ? false : true;
  x[dest].push(c);
  state.selected=null;
  render();
}
function drawCards(n){
  const x=state.players[1];
  if(x.hand.length+n>MAX.hand)return log("手札の上限のためドローをキャンセル");
  if(x.deck.length<n)return log("山札が足りないためドローをキャンセル");
  for(let i=0;i<n;i++)x.hand.push(x.deck.shift());
  state.selected=null;render();
}
function endTurn(){
  const p=state.turnPlayer,x=state.players[p];
  x.monsters.forEach(m=>{m.damage=0;m.recovery=0});
  state.turnPlayer=p===1?2:1;
  const x2=state.players[state.turnPlayer];
  x2.monsters.forEach(m=>m.tapped=false);x2.energy.forEach(e=>e.tapped=false);
  render();log(x2.name+" のターン開始");
}
function deckEditorCard(name){const e=document.createElement("div");e.className="deck-card";const img=document.createElement("img");img.src=imageUrl(name);img.alt=name;img.loading="lazy";img.onerror=()=>{img.remove()};e.appendChild(img);const n=document.createElement("div");n.className="deck-card-name";n.textContent=name;e.appendChild(n);e.onclick=()=>{const deck=state.players[1].deckList||[];deck.push(name);deck.sort((a,b)=>cardNames.indexOf(a)-cardNames.indexOf(b));state.players[1].deckList=deck;showDeckEditorPreview(name);renderDeckEditor()};e.oncontextmenu=ev=>{ev.preventDefault();ev.stopPropagation();showDeckEditorPreview(name)};
  return e}
function showDeckEditorPreview(name){
  const preview=document.querySelector("#deckEditorPreview");if(!preview)return;
  preview.innerHTML="";
  const img=document.createElement("img");img.src=CARD_IMAGE_BASE+encodeURIComponent(name)+".png";img.alt=name;img.loading="lazy";img.onerror=()=>{img.replaceWith(document.createTextNode(name))};preview.appendChild(img);
  const label=document.createElement("div");label.textContent=name;preview.appendChild(label);
  const controls=document.createElement("div");controls.className="deck-preview-controls";
  const plus=document.createElement("button");plus.type="button";plus.textContent="+1枚";plus.onclick=()=>addDeckEditorCards(name,1);
  const minus=document.createElement("button");minus.type="button";minus.textContent="−1枚";minus.onclick=()=>addDeckEditorCards(name,-1);
  const custom=document.createElement("button");custom.type="button";custom.textContent="指定した枚数を追加";custom.onclick=()=>{
    const input=prompt("追加する枚数を入力してください", "1");if(input===null)return;
    const n=Number(input.trim());if(!Number.isInteger(n)||n<=0){alert("1以上の整数を入力してください");return}
    addDeckEditorCards(name,n)
  };
  controls.append(plus,minus,custom);preview.appendChild(controls)
}
function addDeckEditorCards(name,delta){
  const deck=state.players[1].deckList||[];
  if(delta<0){
    for(let i=0;i<Math.abs(delta);i++){const index=deck.indexOf(name);if(index<0)break;deck.splice(index,1)}
  }else{
    for(let i=0;i<delta;i++)deck.push(name)
  }
  deck.sort((a,b)=>cardNames.indexOf(a)-cardNames.indexOf(b));
  state.players[1].deckList=deck;
  renderDeckEditor()
}
function renderDeckEditor(){
  const current=document.querySelector("#deckCurrentList"),candidates=document.querySelector("#deckCandidateList");if(!current||!candidates)return;
  current.innerHTML="";candidates.innerHTML="";
  const deck=state.players[1].deckList||[];
  const count=document.querySelector("#deckCurrentCount");if(count)count.textContent=deck.length+"枚";
  if(!deck.length){current.innerHTML='<div class="deck-empty">デッキにカードがありません</div>'}else{
    const counts=new Map();
    deck.forEach(n=>counts.set(n,(counts.get(n)||0)+1));
    const orderedNames=[...counts.keys()].sort((a,b)=>cardNames.indexOf(a)-cardNames.indexOf(b));
    orderedNames.forEach(name=>{const count=counts.get(name);
      const row=document.createElement("div");
      row.className="deck-card-count";
      row.onclick=()=>showDeckEditorPreview(name);
      const nameEl=document.createElement("span");nameEl.textContent=name;const controls=document.createElement("span");controls.className="deck-count-controls";const minus=document.createElement("button");minus.type="button";minus.textContent="−";const countEl=document.createElement("span");countEl.textContent=count;countEl.className="deck-count-number"+(count>4?" over-limit":"");const plus=document.createElement("button");plus.type="button";plus.textContent="+";minus.onclick=e=>{e.stopPropagation();const i=state.players[1].deckList.indexOf(name);if(i>=0)state.players[1].deckList.splice(i,1);renderDeckEditor()};plus.onclick=e=>{e.stopPropagation();state.players[1].deckList.push(name);renderDeckEditor()};controls.append(minus,countEl,plus);row.append(nameEl,controls);
      current.appendChild(row);
    });
  }
  const q=(document.querySelector("#deckCardSearch")?.value||"").trim().toLocaleLowerCase("ja-JP");
  cardNames.filter(n=>!q||n.toLocaleLowerCase("ja-JP").includes(q)).forEach(n=>candidates.appendChild(deckEditorCard(n)));
}
function makeDeckCode(deck){
  const counts=new Map();
  (deck||[]).forEach(name=>{const i=cardNames.indexOf(name);if(i>=0)counts.set(i,(counts.get(i)||0)+1)});
  const bytes=[];
  [...counts.entries()].sort((a,b)=>a[0]-b[0]).forEach(([i,n])=>{
    bytes.push((i>>8)&3,i&255,n&255);
  });
  let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));
  return "D2-"+btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function makeLegacyDeckCode(deck){
  const counts=new Map();
  (deck||[]).forEach(name=>{const i=cardNames.indexOf(name);if(i>=0)counts.set(i,(counts.get(i)||0)+1)});
  return "D1-"+[...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([i,n])=>i.toString(36)+"."+n.toString(36)).join("-");
}
function readDeckCode(code){
  const raw=String(code||"").trim();
  const s=raw.toUpperCase();
  if(raw.toUpperCase().startsWith("D2-")){
    let b64=raw.slice(3).replace(/-/g,"+").replace(/_/g,"/");
    b64+="=".repeat((4-b64.length%4)%4);
    const bin=atob(b64),deck=[];
    if(bin.length%3!==0)throw new Error("デッキコードの形式が正しくありません");
    for(let j=0;j<bin.length;j+=3){
      const i=((bin.charCodeAt(j)&3)<<8)|bin.charCodeAt(j+1),n=bin.charCodeAt(j+2);
      if(i<0||i>=cardNames.length||n<1)throw new Error("デッキコードに不正なカードがあります");
      for(let k=0;k<n;k++)deck.push(cardNames[i]);
    }
    return deck;
  }
  if(!s.startsWith("D1-"))throw new Error("デッキコードの形式が正しくありません");
  const parts=s.slice(3).split("-").filter(Boolean),deck=[];
  for(const part of parts){
    const q=part.split(".");
    if(q.length!==2)throw new Error("デッキコードの形式が正しくありません");
    const i=parseInt(q[0],36),n=parseInt(q[1],36);
    if(!Number.isInteger(i)||!Number.isInteger(n)||i<0||i>=cardNames.length||n<1)throw new Error("デッキコードに不正なカードがあります");
    for(let k=0;k<n;k++)deck.push(cardNames[i]);
  }
  return deck;
}
function setup(){
  document.querySelector("#deckViewerClose").onclick=closeDeckViewer;
  document.addEventListener("click",e=>{const v=document.querySelector("#discardViewer");if(v&&!v.hidden&&!e.target.closest("#discardViewer .discard-viewer-panel")&&!e.target.closest(".player .other .zone:nth-child(2)"))closeDiscardViewer()});
  document.querySelector("#discardViewer").onclick=e=>{if(e.target===document.querySelector("#discardViewer"))closeDiscardViewer()};
  document.querySelector("#deckEdit").onclick=()=>{state.players[1].deckList=state.savedDeck.slice();document.querySelector("#deckEditor").hidden=false;const search=document.querySelector("#deckCardSearch");if(search)search.value="";renderDeckEditor()};
  document.querySelector("#deckCardSearch").oninput=()=>renderDeckEditor();
  document.querySelector("#deckCodeCreate").onclick=()=>{const input=document.querySelector("#deckCodeInput");input.value=makeDeckCode(state.players[1].deckList||[]);input.focus();input.select();log("デッキコードを発行しました")};
  document.querySelector("#deckCodeLoad").onclick=()=>{try{const deck=readDeckCode(document.querySelector("#deckCodeInput").value);state.players[1].deckList=deck;state.players[1].deckList.sort((a,b)=>cardNames.indexOf(a)-cardNames.indexOf(b));renderDeckEditor();
      const b=document.querySelector("#deckCodeLoad");b.textContent="複製しました";b.classList.add("loaded");clearTimeout(state.deckLoadTimer);state.deckLoadTimer=setTimeout(()=>{b.textContent="コードから複製";b.classList.remove("loaded")},1200);
      log("デッキコードからデッキを複製しました")}catch(e){alert(e.message)}};
  document.querySelector("#deckClearAll").onclick=()=>{const deck=state.players[1].deckList||[];if(!deck.length)return;if(!confirm("現在のデッキのカードをすべて除きますか？"))return;state.players[1].deckList=[];renderDeckEditor();log("デッキのカードをすべて除きました")};
  document.querySelector("#deckSave").onclick=()=>{state.savedDeck=(state.players[1].deckList||[]).slice();const b=document.querySelector("#deckSave");b.textContent="保存しました";b.classList.add("saved");clearTimeout(state.deckSaveTimer);state.deckSaveTimer=setTimeout(()=>{b.textContent="デッキを保存";b.classList.remove("saved")},1200);log("デッキを保存しました")};
  document.querySelector("#deckEditBack").onclick=()=>{const current=state.players[1].deckList||[];const saved=state.savedDeck||[];const same=current.length===saved.length&&current.every((name,i)=>name===saved[i]);if(!same&&!confirm("デッキの内容が保存されていません。保存せずに対戦画面へ戻りますか？"))return;document.querySelector("#deckEditor").hidden=true};
  document.querySelectorAll("[data-end]").forEach(b=>b.onclick=endTurn);
  document.querySelectorAll("[data-first]").forEach(b=>b.onclick=()=>{
    const q=b.dataset.first;state.turnPlayer=q==="self"?1:q==="opponent"?2:(Math.random()<.5?1:2);
    render();log("先攻: "+state.players[state.turnPlayer].name)
  });
  document.addEventListener("contextmenu",ev=>{const card=ev.target.closest(".card");if(!card)return;const p=Number(card.dataset.player),z=card.dataset.zone,id=card.dataset.cardId;if(p!==1||(z!=="monsters"&&z!=="energy")||!id)return;ev.preventDefault();ev.stopPropagation();const target=find(p,z,id);if(!target)return;target.tapped=!target.tapped;state.selected={p,z,id};render()});
  document.querySelector("#p1-life").onclick=()=>{const x=state.players[1];const input=prompt("ライフを入力してください\n例: 3000 → 3000に変更 / +500 → 500増加 / -500 → 500減少",String(x.life));if(input===null)return;const raw=input.trim();if(!raw)return;const deltaMode=/^[+-]/.test(raw);const n=Number(raw);if(!Number.isInteger(n)){log("ライフの変更をキャンセルしました");return}const next=deltaMode?x.life+n:n;if(next<0){log("ライフは0未満にできません");return}x.life=next;render();log(deltaMode?"自分のライフを "+(n>0?"+":"")+n+" して "+next+" に変更しました":"自分のライフを "+next+" に変更しました")};
  document.querySelector("#rename").onclick=()=>{
    const n=document.querySelector("#name").value.trim();if(n){state.players[1].name=n.slice(0,16);render();log("名前を変更しました")}
  };
  document.querySelector("#reset").onclick=()=>{if(confirm("自分の盤面をリセットしますか？")){const n=state.players[1].name;const deckList=(state.savedDeck||[]).slice();const p=newPlayer(n,"p1");const pool=shuffle((deckList.length?deckList:p.deckList).slice());p.deckList=pool.slice();p.hand=pool.slice(0,7).map((name,i)=>newCard(name,"p1h"+i));p.deck=pool.slice(7).map((name,i)=>newCard(name,"p1d"+i));state.players[1]=p;state.selected=null;render();log("自分の盤面をリセットし、デッキをシャッフルして7枚ドローしました")}};
}
async function start(){
  const r=await fetch(CARD_NAMES_URL);
  cardNames=(await r.text()).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  state.players={1:newPlayer("プレイヤー1","p1"),2:newPlayer("プレイヤー2","p2")};
  const defaultDeck=readDeckCode("D2-AFoTAJsBARYEAVUEAYgBAd0EAd4CAd8DAfEEAoUEApgE");
  const p1=state.players[1];p1.deckList=defaultDeck.slice();const shuffledDeck=shuffle(defaultDeck.slice());p1.hand=shuffledDeck.slice(0,7).map((n,i)=>newCard(n,"p1h"+i));p1.deck=shuffledDeck.slice(7).map((n,i)=>newCard(n,"p1d"+i));state.savedDeck=defaultDeck.slice();
  setup();render();log("カード画像を読み込みました（"+cardNames.length+"種類）");
}
start().catch(e=>{console.error(e);document.querySelector("#log").textContent="カード一覧の読み込みに失敗しました。";});
