const MAX={hand:9,monsters:7,energy:18,field:1,facedown:3};
const CARD_NAMES_URL="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/all_card_names.txt";
const CARD_IMAGE_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/captured_cards/";
const CARD_CROPPED_BASE="https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/cropped_cards/";
const state={turnPlayer:1,selected:null,players:{}};
let cardNames=[];

function imageUrl(name,cropped=false){const base=cropped?CARD_CROPPED_BASE:CARD_IMAGE_BASE;return base+encodeURIComponent(name)+".png";}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function newCard(name,id){return{id,name,faceUp:true,tapped:false,counters:0,damage:0,recovery:0,modification:0};}
function newPlayer(name,p){
  const pool=shuffle([...cardNames]).slice(0,50);
  return{name,life:4000,hand:pool.slice(0,7).map((n,i)=>newCard(n,p+"h"+i)),monsters:[],energy:[],field:[],discard:[],facedown:[],deck:pool.slice(7).map((n,i)=>newCard(n,p+"d"+i))};
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
  (a||[]).forEach(c=>e.appendChild(cardEl(p,z,c,p===1||c.faceUp!==false)));
}
function cardEl(p,z,c,visible){
  const e=document.createElement("div");
  e.className="card zone-"+z+(c.tapped?" tapped":"")+(state.selected?.id===c.id?" selected":"");
  if(!visible||c.faceUp===false){
    e.classList.add("back");
  }else{
    const img=document.createElement("img");
    img.src=imageUrl(c.name);img.alt=c.name;img.loading="lazy";
    img.onerror=()=>{img.replaceWith(document.createTextNode(c.name));};
    e.appendChild(img);
    const a=c.modification+c.recovery-c.damage;
    if(a)e.insertAdjacentHTML("beforeend",'<span class="adjust">'+(a>0?"+":"")+a+"</span>");
    if(c.counters)e.insertAdjacentHTML("beforeend",'<span class="counter">'+c.counters+"</span>");
  }
  if(visible)e.onclick=()=>select(p,z,c.id);
  return e;
}
function find(p,z,id){return state.players[p][z].find(c=>c.id===id);}
function select(p,z,id){
  const c=find(p,z,id);if(!c||c.faceUp===false)return;
  state.selected={p,z,id};render();
}
function selection(){
  const pr=document.querySelector("#preview"),op=document.querySelector("#ops");
  if(!state.selected){pr.innerHTML="カードを選択";op.textContent="カードを選択してください";return}
  const s=state.selected,c=find(s.p,s.z,s.id);
  if(!c){state.selected=null;return render()}
  pr.innerHTML="";
  const img=document.createElement("img");img.src=imageUrl(c.name);img.alt=c.name;img.onerror=()=>{img.replaceWith(document.createTextNode(c.name));};pr.appendChild(img);
  op.innerHTML="";
  if(s.p!==1){op.textContent="相手のカードは確認のみ";return}
  add("裏向きにする",()=>{c.faceUp=false;state.selected=null;render()});
  if(s.z==="monsters"||s.z==="energy")add("タップ / アンタップ",()=>{c.tapped=!c.tapped;render()});
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
  for(const[z,label]of[["hand","手札へ"],["energy","エネルギーへ"],["monsters","モンスターへ"],["field","フィールドへ"],["facedown","裏向きエリアへ"],["discard","捨て札へ"]])
    if(z!==s.z)add(label,()=>move(z));
}
function add(t,fn){const b=document.createElement("button");b.textContent=t;b.onclick=fn;document.querySelector("#ops").appendChild(b)}
function move(dest){
  const s=state.selected,x=state.players[1],src=x[s.z],i=src.findIndex(c=>c.id===s.id);if(i<0)return;
  if(MAX[dest]!==undefined&&x[dest].length>=MAX[dest])return log(dest+" の上限のため移動をキャンセル");
  const c=src.splice(i,1)[0];if(dest==="facedown")c.faceUp=false;x[dest].push(c);state.selected=null;render();
}
function endTurn(){
  const p=state.turnPlayer,x=state.players[p];
  x.monsters.forEach(m=>{m.damage=0;m.recovery=0});
  state.turnPlayer=p===1?2:1;
  const x2=state.players[state.turnPlayer];
  x2.monsters.forEach(m=>m.tapped=false);x2.energy.forEach(e=>e.tapped=false);
  render();log(x2.name+" のターン開始");
}
function setup(){
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
