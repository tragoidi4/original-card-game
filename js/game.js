const MAX={hand:9,monsters:7,energy:18,field:1,facedown:3};
const CARD_NAMES_URL="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/all_card_names.txt";
const CARD_IMAGE_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/captured_cards/";
const CROPPED_CARD_IMAGE_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/cropped_cards/";

const state={turnPlayer:1,selected:null,players:{}};
let cardNames=[];

function imageUrl(name){return CARD_IMAGE_BASE+encodeURIComponent(name)+".png";}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function newCard(name,id){return{id,name,faceUp:true,tapped:false,counters:0,damage:0,recovery:0,modification:0};}
function newPlayer(name,p){
  const pool=shuffle([...cardNames]).slice(0,50);
  return{name,life:4000,deckList:pool.slice(),hand:pool.slice(0,7).map((n,i)=>newCard(n,p+"h"+i)),monsters:[],energy:[],field:[],discard:[],facedown:[],deck:pool.slice(7).map((n,i)=>newCard(n,p+"d"+i))};
}
function log(s){const e=document.querySelector("#log"),d=new Date().toLocaleTimeString("ja-JP");e.insertAdjacentHTML("beforeend",'<div>['+d+'] '+esc(s)+"</div>");e.scrollTop=e.scrollHeight}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function render(){
  for(const p of[1,2]){
    const x=state.players[p];
    document.querySelector("#p"+p+"-name").textContent=x.name;
    document.querySelector("#p"+p+"-life").textContent=x.life;
    zone(p,"field",x.field);
    zone(p,"discard",x.discard.slice(-1));
    zone(p,"facedown",x.facedown);
    const deck=document.querySelector("#p"+p+"-deck");
    deck.onclick=()=>{state.selected={p,z:"deck",id:"deck"};render()};
    deck.classList.toggle("horizontal",!!x.deckHorizontal);
    zone(p,"energy",x.energy);
    zone(p,"monsters",x.monsters);
    const h=document.querySelector("#p"+p+"-hand");h.innerHTML="";
    x.hand.forEach(c=>h.appendChild(cardEl(p,"hand",c,p===1)));
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
    pr.textContent="デッキ";
    op.innerHTML="";
    if(s.p!==1){op.textContent="相手のデッキは確認のみ";return}
    add("1枚引く",()=>drawCards(1));
    add("好きな枚数を引く",()=>{const n=Number(prompt("引く枚数を入力してください"));if(Number.isInteger(n)&&n>0)drawCards(n)});
    add("デッキをシャッフル",()=>{shuffle(state.players[1].deck);render();log("デッキをシャッフルしました")});
    add("デッキを横向きにする",()=>{state.players[1].deckHorizontal=!state.players[1].deckHorizontal;state.selected=null;render()});
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
  if(c.faceUp===false){
    add("表向きにする",()=>{c.faceUp=true;render()});
  }else{
    add("裏向きにする",()=>{c.faceUp=false;state.selected=null;render()});
  }
  if(s.z==="monsters"||s.z==="energy"){add("タップ / アンタップ",()=>{c.tapped=!c.tapped;state.selected={p:s.p,z:s.z,id:s.id};render()});}
  if(s.z==="monsters"){
    add("100ダメージ",()=>{c.damage+=100;render()});
    add("100回復",()=>{c.recovery=Math.min(c.damage,c.recovery+100);render()});
    add("カウンター +1",()=>{c.counters++;render()});
    add("カウンター -1",()=>{if(c.counters===0)return log("カウンター減少をキャンセル");c.counters--;render()});
  }
  if(s.z==="field"){
    add("カウンター +1",()=>{c.counters++;render()});
    add("カウンター -1",()=>{if(c.counters===0)return log("カウンター減少をキャンセル");c.counters--;render()});
  }
  if(s.z==="hand"){
    add("手札へ",()=>move("hand"));
    add("モンスターへ",()=>move("monsters"));
    add("エネルギーへ",()=>move("energy"));
    add("フィールドへ",()=>move("field"));
    add("罠へ",()=>move("facedown"));
    add("捨て札へ",()=>move("discard"));
  }else{
    for(const[z,label]of[["hand","手札へ"],["energy","エネルギーへ"],["monsters","モンスターへ"],["field","フィールドへ"],["facedown","罠へ"],["discard","捨て札へ"]])
      if(z!==s.z)add(label,()=>move(z));
  }
}
function add(t,fn){const b=document.createElement("button");b.textContent=t;b.onclick=fn;document.querySelector("#ops").appendChild(b)}
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
  if(x.deck.length<n)return log("デッキが足りないためドローをキャンセル");
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
function deckEditorCard(name){const e=document.createElement("div");e.className="deck-card";const img=document.createElement("img");img.src=imageUrl(name);img.alt=name;img.loading="lazy";img.onerror=()=>{img.remove()};e.appendChild(img);const n=document.createElement("div");n.className="deck-card-name";n.textContent=name;e.appendChild(n);e.onclick=()=>{const deck=state.players[1].deckList||[];deck.push(name);state.players[1].deckList=deck;renderDeckEditor()};return e}
function renderDeckEditor(){
  const current=document.querySelector("#deckCurrentList"),candidates=document.querySelector("#deckCandidateList");if(!current||!candidates)return;
  current.innerHTML="";candidates.innerHTML="";
  const deck=state.players[1].deckList||[];
  if(!deck.length){current.innerHTML='<div class="deck-empty">デッキにカードがありません</div>'}else{
    const counts=new Map();
    deck.forEach(n=>counts.set(n,(counts.get(n)||0)+1));
    counts.forEach((count,name)=>{
      const row=document.createElement("div");
      row.className="deck-card-count";
      const nameEl=document.createElement("span");nameEl.textContent=name;const controls=document.createElement("span");controls.className="deck-count-controls";const minus=document.createElement("button");minus.type="button";minus.textContent="−";const countEl=document.createElement("span");countEl.textContent=count;countEl.className="deck-count-number";const plus=document.createElement("button");plus.type="button";plus.textContent="+";minus.onclick=e=>{e.stopPropagation();const i=state.players[1].deckList.indexOf(name);if(i>=0)state.players[1].deckList.splice(i,1);renderDeckEditor()};plus.onclick=e=>{e.stopPropagation();state.players[1].deckList.push(name);renderDeckEditor()};controls.append(minus,countEl,plus);row.append(nameEl,controls);
      current.appendChild(row);
    });
  }
  cardNames.forEach(n=>candidates.appendChild(deckEditorCard(n)));
}
function setup(){
  document.querySelector("#deckEdit").onclick=()=>{document.querySelector("#deckEditor").hidden=false;renderDeckEditor()};
  document.querySelector("#deckEditBack").onclick=()=>{document.querySelector("#deckEditor").hidden=true};
  document.querySelectorAll("[data-end]").forEach(b=>b.onclick=endTurn);
  document.querySelectorAll("[data-first]").forEach(b=>b.onclick=()=>{
    const q=b.dataset.first;state.turnPlayer=q==="self"?1:q==="opponent"?2:(Math.random()<.5?1:2);
    render();log("先攻: "+state.players[state.turnPlayer].name)
  });
  document.querySelector("#rename").onclick=()=>{
    const n=document.querySelector("#name").value.trim();if(n){state.players[1].name=n.slice(0,16);render();log("名前を変更しました")}
  };
  document.querySelector("#reset").onclick=()=>{
    if(confirm("自分の盤面をリセットしますか？")){const n=state.players[1].name;state.players[1]=newPlayer(n,"p1");state.selected=null;render();log("自分の盤面をリセットしました")}
  };
}
async function start(){
  const r=await fetch(CARD_NAMES_URL);
  cardNames=(await r.text()).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  state.players={1:newPlayer("プレイヤー1","p1"),2:newPlayer("プレイヤー2","p2")};
  setup();render();log("カード画像を読み込みました（"+cardNames.length+"種類）");
}
start().catch(e=>{console.error(e);document.querySelector("#log").textContent="カード一覧の読み込みに失敗しました。";});
