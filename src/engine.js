import seedrandom from 'seedrandom';
import {BOSSES, CARDS, COLORS, COLOR_NAMES, INVESTIGATORS, LOCATION, LOCATIONS, MONSTERS, SIDES} from './data.js';

export const VERSION = 1;
const emptyTokens = (n=0) => Object.fromEntries(COLORS.map(c=>[c,n]));
const event = (type, extra={}) => ({type,...extra});
const option = (id,label,effects,extra={}) => ({id:String(id),label,effects,...extra});
const living = s => s.players.map((p,i)=>p.health>0?i:-1).filter(i=>i>=0);
export const playerInfo = p => INVESTIGATORS.find(x=>x.id===p.id);
const name = (s,i=s.active) => playerInfo(s.players[i]).name;
export const cardAt = (s,slot) => s.slots[slot]?.card ? CARDS[s.slots[slot].card] : null;
const inPlay = s => s.slots.map(x=>x.card?CARDS[x.card]:null).filter(Boolean);
export const hasTrait = (s,trait) => inPlay(s).some(c=>c.traits.includes(trait));
export const hasPower = (s,i,power) => s.players[i].health>0 && playerInfo(s.players[i]).power===power && !hasTrait(s,'lockAll') && !s.slots.slice(i*3,i*3+3).some(x=>x.card&&CARDS[x.card].traits.includes('lockPower'));
const enabled = (s,i) => hasPower(s,i,playerInfo(s.players[i]).power);
export const boardName = slot => `${COLOR_NAMES[SIDES[Math.floor(slot/3)]]} ${slot%3+1}`;
export function lineFor(slot) {
  const side=Math.floor(slot/3), lane=slot%3;
  return side===0?[lane,lane+3,lane+6]:side===1?[lane*3+2,lane*3+1,lane*3]:side===2?[6+lane,3+lane,lane]:[lane*3,lane*3+1,lane*3+2];
}
export const facingSlots = pos => Array.from({length:12},(_,i)=>i).filter(i=>lineFor(i)[0]===pos);
export const adjacent = (a,b) => Math.max(Math.abs(a%3-b%3),Math.abs(Math.floor(a/3)-Math.floor(b/3)))<=1;
function log(s,text,details={}) { s.log.push({id:s.log.length+1,turn:s.turn,actor:s.active,phase:s.phase,text,details}); }
function random(s,n) {
  const rng=seedrandom('',{state:s.rng}); const result=Math.floor(rng()*n); s.rng=rng.state(); return result;
}
function shuffle(s,list) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=random(s,i+1);[a[i],a[j]]=[a[j],a[i]];}return a; }
const prepend = (s,...effects) => s.queue.unshift(...effects.filter(Boolean));
function ask(s,title,options,extra={}) {
  if(!options.length){log(s,'El efecto no tiene objetivos disponibles.',{title});return;}
  if(options.length===1){log(s,`${title}: ${options[0].label}.`);prepend(s,...options[0].effects);return;}
  s.pending={title,options,...extra};
}
function finish(s,status,reason) {s.status=status;s.reason=reason;s.pending=null;s.queue=[];log(s,reason);}
function checkLoss(s) {
  if(s.status!=='playing')return true;
  if(!living(s).length)finish(s,'lost','Derrota: los cuatro investigadores han caído.');
  else if(s.tiles.filter(t=>t.haunted).length>=3)finish(s,'lost','Derrota: tres localizaciones están encantadas.');
  return s.status!=='playing';
}
function hurt(s,i,cause) {
  if(s.players[i].health===0){
    ask(s,'Tablero poseído: elige quién pierde 1 de salud',living(s).map(j=>option(j,name(s,j),[event('hurt',{player:j,cause})])));return;
  }
  const p=s.players[i];p.health--;s.supply.health++;log(s,`${name(s,i)} pierde 1 de salud: ${cause}.`,{health:p.health});
  if(p.health===0){
    for(const c of COLORS){s.supply.tokens[c]+=p.tokens[c];p.tokens[c]=0;}
    s.supply.signs+=p.signs.length;p.signs=[];p.blessing=false;p.pos=s.tiles.findIndex(t=>t.id==='sanitarium');
    log(s,`${name(s,i)} cae. Devuelve sus recursos; su tablero queda poseído.`);
  }
  checkLoss(s);
}
function heal(s,i,n=1) {if(s.players[i].health===0)return;const count=Math.min(n,s.supply.health);s.supply.health-=count;s.players[i].health+=count;log(s,`${name(s,i)} recupera ${count} de salud.`,{health:s.players[i].health});}
function haunt(s,slot,tile) {
  const pos=tile??lineFor(slot).find(p=>!s.tiles[p].haunted);
  if(pos===undefined)return;
  s.tiles[pos].haunted=true;log(s,`${LOCATION[s.tiles[pos].id].name} queda encantada.`,{slot,tile:pos});
  if(s.tiles[pos].id==='chapel'&&s.chapel){s.supply.tokens[s.chapel]++;s.chapel=null;log(s,'Old Chapel pierde su pergamino.');}
  checkLoss(s);
}
function gainTokenOptions(s,i,count=1,colors=COLORS) {
  return colors.filter(c=>s.supply.tokens[c]>0).map(c=>option(c,`${COLOR_NAMES[c]} (${s.supply.tokens[c]} en reserva)`,[
    event('gainToken',{player:i,color:c}),count>1?event('gainChoice',{player:i,count:count-1}):null
  ].filter(Boolean),{color:c}));
}
const canTarget = (s,slot) => {
  const c=cardAt(s,slot); if(!c)return false;
  if(c.traits.includes('needsSign')&&!s.slots[slot].vulnerable)return false;
  if(c.traits.includes('opposite')){const other=(Math.floor(slot/3)+2)%4*3+slot%3;if(s.slots[other].card)return false;}
  return true;
};
function destroy(s,slot,reason) {
  const g=s.slots[slot];if(!g.card)return;
  log(s,`${CARDS[g.card].name} eliminado: ${reason}.`,{slot,card:g.card});s.discard.push(g.card);
  if(s.weak===g.uid)s.weak=null;
  s.slots[slot]={card:null,sign:g.sign};
}
function legalPlacements(s,c) {
  const side=c.color==='black'?s.active:SIDES.indexOf(c.color);
  const all=s.slots.map((x,i)=>!x.card?i:-1).filter(i=>i>=0);
  const matching=all.filter(i=>Math.floor(i/3)===side);return matching.length?matching:all;
}
function availableHelp(s,id) {
  if(id==='sanitarium')return s.players.some(p=>p.health===0);
  if(id==='witchhouse')return s.tiles.some(t=>t.haunted);
  if(id==='circle')return s.supply.signs>0;
  if(id==='library')return inPlay(s).some(c=>!c.boss);
  if(id==='obelisk')return inPlay(s).length>0&&s.slots.some(x=>!x.card)&&living(s).some(i=>i!==s.active);
  return true;
}
function actionAllowed(s,kind) {
  const done=s.actions;
  if(!done.length)return true;
  if(done.length>=2)return false;
  return hasPower(s,s.active,'double')?done[0]===kind:hasPower(s,s.active,'mixed')?done[0]!==kind:false;
}
function actionEnd(s){s.phase=(actionAllowed(s,'attack')||actionAllowed(s,'help'))?'action':'signs';}
function startTurn(s) {
  s.turn++;s.phase='yin';s.actions=[];s.powerUsed=false;
  log(s,`Turno ${s.turn}: ${name(s)}. Fase de los monstruos.`,{board:SIDES[s.active]});
  const ghosts=[2,1,0].map(i=>s.active*3+i).filter(i=>s.slots[i].card);
  prepend(s,...ghosts.map(slot=>event('activate',{slot,uid:s.slots[slot].uid})),event('overrun'),event('yang'));
}
function curse(s,e) {
  const i=e.player??s.active;
  if(hasPower(s,i,'extra')){log(s,`${name(s,i)} evita el dado de terror por su poder.`);return;}
  const face=['nothing','nothing','haunt','draw','loseAll','hurt'][random(s,6)];
  const labels={nothing:'Sin efecto',haunt:'Encantamiento',draw:'Llega un monstruo',loseAll:'Pierde todos los pergaminos',hurt:'Pierde 1 de salud'};
  s.lastDice={kind:'terror',values:[face]};log(s,`Terror: ${labels[face]}.`,{...e,face});
  const resolve=event('curseResult',{...e,face,type:'curseResult'});
  if(!e.rerolled&&hasPower(s,i,'reroll'))ask(s,`Terror: ${labels[face]}`, [option('keep','Conservar resultado',[resolve]),option('reroll','Repetir el dado',[event('curse',{...e,type:'curse',rerolled:true})])]);
  else prepend(s,resolve);
}
function roll(s,kind,count,extra={}) {
  const values=Array.from({length:count},()=>[...COLORS,'white'][random(s,6)]);
  s.lastDice={kind,values};log(s,`${kind==='combat'?'Ataque':'Magic Shop'}: ${values.map(c=>COLOR_NAMES[c]).join(', ')||'sin dados disponibles'}.`,{values,...extra});
  finishRoll(s,kind,values,false,extra);
}
function finishRoll(s,kind,values,rerolled,extra) {
  if(!rerolled&&hasPower(s,s.active,'reroll')&&values.length){
    const choices=[option('keep','Conservar todos los dados',[event('rolled',{kind,values,extra})])];
    for(let mask=1;mask<2**values.length;mask++){
      const indices=values.map((_,i)=>i).filter(i=>mask&(1<<i));
      choices.push(option(mask,`Repetir ${indices.map(i=>`${i+1}: ${COLOR_NAMES[values[i]]}`).join(', ')}`,[event('reroll',{kind,values,indices,extra})]));
    }
    ask(s,'Jack Walters: repetir dados',choices,{dice:values});
  }else prepend(s,event('rolled',{kind,values,extra}));
}

// Enumerate legal outcomes, retaining every meaningful choice of wild dice and scroll colors.
function demands(s,slot) {
  const c=cardAt(s,slot);const result=emptyTokens();
  if(c.traits.includes('multi1'))for(const color of COLORS)result[color]=1;
  else if(c.traits.includes('multi2'))for(const color of SIDES)result[color]=2;
  else result[c.color]=c.resistance;
  if(s.chapel&&result[s.chapel]>0)result[s.chapel]--;
  if(s.weak===s.slots[slot].uid){
    const colors=COLORS.filter(c=>result[c]>0);
    return colors.length?colors.map(color=>({...result,[color]:result[color]-1})):[result];
  }
  return [result];
}
export function combatPlans(s,targets,dice) {
  targets=targets.filter(slot=>canTarget(s,slot));
  const pool=emptyTokens();
  if(!hasTrait(s,'lockScrolls'))for(const p of s.players)if(p.health>0&&p.pos===s.players[s.active].pos)for(const c of COLORS)pool[c]+=p.tokens[c];
  const plans=[];
  for(let mask=0;mask<2**targets.length;mask++){
    const slots=targets.filter((_,i)=>mask&(1<<i));let combos=[{normal:emptyTokens(),fixed:emptyTokens()}];
    for(const slot of slots){const noDice=cardAt(s,slot).traits.includes('noDice');combos=combos.flatMap(base=>demands(s,slot).map(d=>{
      const next=structuredClone(base);for(const c of COLORS)next[noDice?'fixed':'normal'][c]+=d[c];return next;
    }));}
    for(const combo of combos){
      const need=Object.fromEntries(COLORS.map(c=>[c,Math.max(0,combo.normal[c]-dice.filter(v=>v===c).length)]));
      const whites=hasTrait(s,'noWhite')?0:dice.filter(v=>v==='white').length;
      function assign(index,left,cost){
        if(index===COLORS.length){if(COLORS.every(c=>cost[c]<=pool[c]))plans.push({slots,cost});return;}
        const c=COLORS[index];for(let used=0;used<=Math.min(left,need[c]);used++)assign(index+1,left-used,{...cost,[c]:need[c]-used+combo.fixed[c]});
      }
      assign(0,whites,{});
    }
  }
  const unique=[...new Map(plans.map(p=>[JSON.stringify(p),p])).values()];
  return unique.filter(p=>!unique.some(q=>q!==p&&p.slots.every(slot=>q.slots.includes(slot))&&COLORS.every(c=>q.cost[c]<=p.cost[c])&&(q.slots.length>p.slots.length||COLORS.some(c=>q.cost[c]<p.cost[c]))));
}
function combatChoice(s,targets,values) {
  const plans=combatPlans(s,targets,values);
  ask(s,'Resolver el ataque',plans.map((plan,i)=>{
    const cost=COLORS.filter(c=>plan.cost[c]).map(c=>`${plan.cost[c]} ${COLOR_NAMES[c].toLowerCase()}`).join(', ');
    const title=plan.slots.length?plan.slots.map(slot=>cardAt(s,slot).name).join(' + '):'No gastar pergaminos; ataque fallido';
    const spend=COLORS.flatMap(color=>Array.from({length:plan.cost[color]},()=>event('spendChoice',{color})));
    return option(i,title,[...spend,...plan.slots.map(slot=>event('defeat',{slot})),event('checkWin')],{detail:cost?`Gastar: ${cost}`:plan.slots.length?'Solo dados; sin gasto':'',slots:plan.slots,cost:plan.cost});
  }),{dice:values,kind:'combat'});
}

function help(s,id) {
  const i=s.active;
  log(s,`${name(s)} utiliza ${LOCATION[id].name}.`,{location:id});
  if(id==='hotel')prepend(s,event('gainChoice',{player:i,count:1}),event('heal',{player:i}),event('draw'));
  if(id==='circle'){s.supply.signs--;s.players[i].signs.push(s.turn);log(s,`${name(s)} recoge un Elder Sign; disponible desde su próximo turno.`);}
  if(id==='shop')roll(s,'shop',2);
  if(id==='chapel')ask(s,'Old Chapel: color del pergamino',COLORS.filter(c=>s.supply.tokens[c]>0||s.chapel===c).map(c=>option(c,COLOR_NAMES[c],[event('chapel',{color:c})],{color:c})));
  if(id==='police')ask(s,'Police Station: lado del tablero',SIDES.map((c,j)=>option(j,COLOR_NAMES[c],[event('resetHaunters',{side:j})],{color:c})));
  if(id==='witchhouse')ask(s,'Witchhouse: restaurar localización',s.tiles.flatMap((t,pos)=>t.haunted?[option(pos,LOCATION[t.id].name,[event('restore',{pos}),event('draw')],{tile:pos})]:[]));
  if(id==='library')ask(s,'Library of the Obscure: eliminar monstruo',s.slots.flatMap((g,slot)=>g.card&&!CARDS[g.card].boss?[option(slot,CARDS[g.card].name,[event('destroy',{slot,reason:'Library of the Obscure'}),event('hurt',{player:i,cause:'Library of the Obscure'})],{slot})]:[]));
  if(id==='sanitarium')ask(s,'St. Joseph Sanitarium: recuperar investigador',s.players.flatMap((p,j)=>p.health===0?[option(j,name(s,j),[event('revive',{player:j}),event('curse',{player:i,tile:s.tiles.findIndex(t=>t.id==='sanitarium')})])]:[]));
  if(id==='obelisk')ask(s,'Black Obelisk: monstruo que mover',s.slots.flatMap((g,slot)=>g.card?[option(slot,CARDS[g.card].name,[event('moveGhostChoice',{slot}),event('moveOther')],{slot})]:[]));
}

function execute(s,e) {
  const i=e.player??s.active;
  switch(e.type){
    case 'startTurn':startTurn(s);break;
    case 'activate':{
      const g=s.slots[e.slot];if(!g.card||g.uid!==e.uid)return;const c=CARDS[g.card];
      log(s,`Se activa ${c.name}.`,{slot:e.slot,traits:c.traits});
      if(c.traits.includes('haunt')){g.haunt++;log(s,`${c.name}: avance ${g.haunt}/2.`);if(g.haunt>=2){g.haunt=0;haunt(s,e.slot);}}
      if(c.traits.includes('torment'))prepend(s,event('curse',{slot:e.slot,player:s.active}));
      if(c.traits.includes('drain'))prepend(s,event('loseScrollAll'));
      break;
    }
    case 'overrun':
      if(s.slots.slice(s.active*3,s.active*3+3).every(g=>g.card))prepend(s,event('hurt',{player:s.active,cause:'tablero completo'}));
      else if(s.players[s.active].health>0)prepend(s,event('draw'));
      break;
    case 'yang':
      if(!s.players[s.active].health){s.phase='end';prepend(s,event('next'));}
      else{s.phase='pre';log(s,'Fase de los investigadores.');}break;
    case 'next':s.active=(s.active+1)%4;prepend(s,event('startTurn'));break;
    case 'draw':{
      if(s.slots.every(x=>x.card)){prepend(s,event('hurt',{player:s.active,cause:'no queda espacio para otro monstruo'}));return;}
      if(!s.deck.length){finish(s,'lost','Derrota: el mazo de monstruos se ha agotado.');return;}
      const id=s.deck.shift(),c=CARDS[id];log(s,`Llega ${c.name}.`,{card:id,remaining:s.deck.length});
      ask(s,`Colocar ${c.name}`,legalPlacements(s,c).map(slot=>option(slot,boardName(slot),[event('place',{slot,card:id})],{slot})),{card:id});break;
    }
    case 'place':{
      const c=CARDS[e.card],sign=s.slots[e.slot].sign;
      s.slots[e.slot]={card:e.card,sign:false,uid:++s.serial,haunt:c.enter.includes('fast')?1:0,captured:false,vulnerable:!!sign};
      log(s,`${c.name} en ${boardName(e.slot)}.`,{card:e.card,slot:e.slot});
      if(sign){s.supply.signs++;log(s,'El Elder Sign vuelve a Stone Circle.');if(!c.boss){destroy(s,e.slot,'Elder Sign, sin efectos ni recompensas');}}
      if(!s.deck.length){finish(s,'lost','Derrota: se ha puesto en juego la última carta del mazo.');return;}
      if(!s.slots[e.slot].card)return;
      if(c.traits.includes('capture')){s.slots[e.slot].captured=s.slots.filter(g=>g.captured).length<3;log(s,s.slots[e.slot].captured?'Un dado de ataque queda retenido.':'No quedan dados que retener.');}
      prepend(s,...c.enter.filter(x=>x!=='fast').map(type=>event(type,{slot:e.slot,player:s.active,cause:c.name})));break;
    }
    case 'hurt':hurt(s,i,e.cause||'efecto de monstruo');break;
    case 'heal':heal(s,i);break;
    case 'haunt':haunt(s,e.slot,e.tile);break;
    case 'restore':s.tiles[e.pos].haunted=false;log(s,`${LOCATION[s.tiles[e.pos].id].name} restaurada.`);break;
    case 'gainChoice':if(s.players[i].health>0)ask(s,`${name(s,i)}: elige un pergamino`,gainTokenOptions(s,i,e.count||1));break;
    case 'gainToken':s.supply.tokens[e.color]--;s.players[i].tokens[e.color]++;log(s,`${name(s,i)} recibe un pergamino ${COLOR_NAMES[e.color].toLowerCase()}.`);break;
    case 'loseScrollAll':prepend(s,...living(s).map(j=>event('loseScroll',{player:j})));break;
    case 'loseScroll':ask(s,`${name(s,i)}: descartar un pergamino`,COLORS.filter(c=>s.players[i].tokens[c]>0).map(c=>option(c,COLOR_NAMES[c],[event('spend',{player:i,color:c})],{color:c})));break;
    case 'spendChoice':ask(s,`Gastar pergamino ${COLOR_NAMES[e.color].toLowerCase()}: elige propietario`,s.players.flatMap((p,j)=>p.health>0&&p.pos===s.players[s.active].pos&&p.tokens[e.color]>0?[option(j,name(s,j),[event('spend',{player:j,color:e.color})])]:[]));break;
    case 'spend':s.players[i].tokens[e.color]--;s.supply.tokens[e.color]++;log(s,`${name(s,i)} gasta un pergamino ${COLOR_NAMES[e.color].toLowerCase()}.`);break;
    case 'curse':curse(s,e);break;
    case 'curseResult':{
      if(e.face==='nothing')break;
      if(e.face==='loseAll'){for(const c of COLORS){s.supply.tokens[c]+=s.players[i].tokens[c];s.players[i].tokens[c]=0;}log(s,`${name(s,i)} pierde todos sus pergaminos.`);}
      else prepend(s,event(e.face,{player:i,slot:e.slot,tile:e.tile,cause:'dado de terror'}));break;
    }
    case 'destroy':destroy(s,e.slot,e.reason);break;
    case 'defeat':{
      const c=cardAt(s,e.slot);if(!c)return;log(s,`Ataque exitoso contra ${c.name}.`);
      prepend(s,...c.leave.filter(x=>x==='curse').map(()=>event('curse',{player:s.active,slot:e.slot})),event('destroy',{slot:e.slot,reason:'ataque'}),...c.leave.filter(x=>x!=='curse').map(type=>event(type,{player:s.active})),...(c.boss?[event('bossReward'),event('bossDefeated')]:[]));break;
    }
    case 'scroll1':prepend(s,event('gainChoice',{player:i,count:1}));break;
    case 'scroll2':prepend(s,event('gainChoice',{player:i,count:2}));break;
    case 'healthOrBlessing':if(s.players[i].health>0)ask(s,'Recompensa: salud o Elder Blessing',[
      ...(s.supply.health>0?[option('health','Recuperar 1 de salud',[event('heal',{player:i})])]:[]),
      ...(!s.players[i].blessing?[option('blessing','Recuperar Elder Blessing',[event('regainBlessing',{player:i})])]:[])
    ]);break;
    case 'regainBlessing':if(s.players[i].health>0){s.players[i].blessing=true;log(s,`${name(s,i)} recupera su Elder Blessing.`);}break;
    case 'bossReward':prepend(s,event('teamHealth'),event('teamBlessing'));break;
    case 'teamHealth':if(s.supply.health>0)ask(s,'Mensajero derrotado: asignar 1 de salud',living(s).map(j=>option(j,name(s,j),[event('heal',{player:j})])));break;
    case 'teamBlessing':ask(s,'Mensajero derrotado: asignar Elder Blessing',living(s).filter(j=>!s.players[j].blessing).map(j=>option(j,name(s,j),[event('regainBlessing',{player:j})])));break;
    case 'bossDefeated':s.bossesDefeated++;break;
    case 'checkWin':if(s.bossesDefeated>=s.bossCount)finish(s,'won','Victoria: todos los Mensajeros de Dagon han sido derrotados.');break;
    case 'chapel':if(s.chapel)s.supply.tokens[s.chapel]++;s.chapel=e.color;s.supply.tokens[e.color]--;log(s,`Old Chapel debilita el color ${COLOR_NAMES[e.color].toLowerCase()}.`);break;
    case 'clearChapel':if(s.chapel){s.supply.tokens[s.chapel]++;s.chapel=null;log(s,'The Unnamable retira el pergamino de Old Chapel.');}break;
    case 'resetHaunters':for(let slot=e.side*3;slot<e.side*3+3;slot++)s.slots[slot].haunt=0;log(s,`Police Station restablece los avances del lado ${COLOR_NAMES[SIDES[e.side]].toLowerCase()}.`);break;
    case 'revive':{
      const n=Math.min(2,s.supply.health);s.players[i].health=n;s.supply.health-=n;s.players[i].pos=s.tiles.findIndex(t=>t.id==='sanitarium');log(s,`${name(s,i)} vuelve con ${n} de salud, sin pertenencias.`);break;
    }
    case 'moveGhostChoice':ask(s,'Black Obelisk: destino del monstruo',s.slots.flatMap((g,slot)=>!g.card?[option(slot,boardName(slot),[event('moveGhost',{from:e.slot,to:slot})],{slot})]:[]));break;
    case 'moveGhost':{
      const g=s.slots[e.from],sign=s.slots[e.to].sign;s.slots[e.to]={...g,sign:false};s.slots[e.from]={card:null,sign:false};
      log(s,`${CARDS[g.card].name}: ${boardName(e.from)} → ${boardName(e.to)}.`);
      if(sign){s.supply.signs++;if(CARDS[g.card].boss)s.slots[e.to].vulnerable=true;else destroy(s,e.to,'Elder Sign');}break;
    }
    case 'moveOther':ask(s,'Elegir otro investigador',living(s).filter(j=>j!==s.active).map(j=>option(j,name(s,j),[event('moveChoice',{player:j,other:true})])));break;
    case 'moveChoice':ask(s,`${name(s,i)}: destino`,s.tiles.flatMap((t,pos)=>((!e.other&&hasPower(s,i,'fly'))||adjacent(s.players[i].pos,pos))?[option(pos,`${LOCATION[t.id].name}${pos===s.players[i].pos?' (permanecer)':''}`,[event('move',{player:i,pos,other:e.other})],{tile:pos})]:[]));break;
    case 'move':log(s,`${name(s,i)} ${s.players[i].pos===e.pos?'permanece en':'se mueve a'} ${LOCATION[s.tiles[e.pos].id].name}.`,{from:s.players[i].pos,to:e.pos});s.players[i].pos=e.pos;if(!e.other)s.phase='action';break;
    case 'help':help(s,e.id);break;
    case 'actionEnd':actionEnd(s);break;
    case 'beginAction':s.actions.push(e.kind);break;
    case 'attack':{
      const targets=facingSlots(s.players[s.active].pos).filter(slot=>cardAt(s,slot));
      const count=Math.max(0,3-s.slots.filter(g=>g.captured).length)+(hasPower(s,s.active,'extra')?1:0);
      roll(s,'combat',count,{targets});break;
    }
    case 'reroll':{
      const values=[...e.values];for(const idx of e.indices)values[idx]=[...COLORS,'white'][random(s,6)];
      s.lastDice={kind:e.kind,values};log(s,`Repetición: ${values.map(c=>COLOR_NAMES[c]).join(', ')}.`,{indices:e.indices,values});finishRoll(s,e.kind,values,true,e.extra);break;
    }
    case 'rolled':
      if(e.kind==='combat')combatChoice(s,e.extra.targets,e.values);
      else prepend(s,...e.values.map(color=>event('shopToken',{color})));break;
    case 'shopToken':
      if(e.color==='white'){if(!hasTrait(s,'noWhite'))prepend(s,event('gainChoice',{player:i}));else log(s,'The Unnamable anula el dado blanco.');}
      else if(s.supply.tokens[e.color]>0)prepend(s,event('gainToken',{player:i,color:e.color}));else log(s,`No quedan pergaminos ${COLOR_NAMES[e.color].toLowerCase()} en la reserva.`);break;
    case 'powerUsed':s.powerUsed=true;break;
    case 'weaken':s.weak=e.uid;log(s,`Wither reduce la resistencia de ${CARDS[s.slots.find(g=>g.uid===e.uid).card].name}.`);break;
    case 'blessing':s.players[i].blessing=false;log(s,`${name(s,i)} utiliza Elder Blessing.`);break;
    case 'sign':{
      const idx=s.players[i].signs.findIndex(t=>t<s.turn);s.players[i].signs.splice(idx,1);s.slots[e.slot].sign=true;log(s,`${name(s,i)} coloca un Elder Sign en ${boardName(e.slot)}.`);break;
    }
    case 'phase':s.phase=e.phase;break;
    default:throw new Error(`Efecto desconocido: ${e.type}`);
  }
}
function pump(s) {
  let steps=0;
  while(s.status==='playing'&&!s.pending&&s.queue.length){
    if(++steps>600)throw new Error('Cadena de efectos excesiva.');
    execute(s,s.queue.shift());
    const yellow=s.players.findIndex(p=>p.color==='yellow');
    if(s.weak&&!hasPower(s,yellow,'weaken')){s.weak=null;log(s,'Wither se retira porque su propietario no tiene el poder activo.');}
    if(checkLoss(s))break;
  }
  if(s.status==='playing'&&!s.pending&&!s.queue.length&&!s.players[s.active].health){prepend(s,event('next'));pump(s);}
}
export function createGame(config={}) {
  const settings={seed:config.seed??'dagon',difficulty:config.difficulty??'initiation',first:config.first??'blue'};
  if(!['initiation','normal','nightmare','hell'].includes(settings.difficulty)||!SIDES.includes(settings.first)||typeof settings.seed!=='string'||settings.seed.length>200)throw new Error('Configuración inválida.');
  if(config.investigatorMode!==undefined){
    if(!['random','manual'].includes(config.investigatorMode))throw new Error('Modo de investigadores inválido.');
    settings.investigatorMode=config.investigatorMode;
  }
  if(settings.investigatorMode==='manual'){
    if(!config.investigators||typeof config.investigators!=='object'||Array.isArray(config.investigators)||Object.keys(config.investigators).length!==SIDES.length||SIDES.some(color=>!INVESTIGATORS.some(p=>p.color===color&&p.id===config.investigators[color])))throw new Error('Selecciona un investigador válido de cada color.');
    settings.investigators=Object.fromEntries(SIDES.map(color=>[color,config.investigators[color]]));
  }
  const rng=seedrandom(settings.seed,{state:true});
  const s={version:VERSION,config:settings,rng:rng.state(),status:'playing',active:SIDES.indexOf(settings.first),turn:0,phase:'setup',players:[],tiles:[],slots:Array.from({length:12},()=>({card:null,sign:false})),supply:{tokens:emptyTokens(4),health:20,signs:2},deck:[],discard:[],bossCount:['nightmare','hell'].includes(settings.difficulty)?4:1,bossesDefeated:0,chapel:null,weak:null,serial:0,queue:[],pending:null,log:[],history:[],actions:[],lastDice:null,powerUsed:false};
  for(const color of SIDES){
    const choices=INVESTIGATORS.filter(p=>p.color===color);
    // Keep the random stream stable for existing saves and seeded comparisons.
    const drawn=choices[random(s,choices.length)];
    const info=settings.investigatorMode==='manual'?choices.find(p=>p.id===settings.investigators[color]):drawn;
    const tokens=emptyTokens();tokens[color]=1;s.supply.tokens[color]--;if(settings.difficulty==='initiation'){tokens.black=1;s.supply.tokens.black--;}
    const health=settings.difficulty==='initiation'?4:3;s.supply.health-=health;
    s.players.push({id:info.id,color,health,tokens,blessing:settings.difficulty!=='hell',signs:[],pos:4});
  }
  s.tiles=shuffle(s,LOCATIONS).map(t=>({id:t.id,haunted:false}));
  s.deck=shuffle(s,MONSTERS.map(c=>c.id));const bosses=shuffle(s,BOSSES).slice(0,s.bossCount);
  for(let n=0;n<bosses.length;n++)s.deck.splice(s.deck.length-10*(n+1)-n,0,bosses[n].id);
  log(s,'Partida preparada: 55 monstruos, cuatro investigadores y reglamento actualizado.',{config:settings,investigators:s.players.map(p=>p.id),layout:s.tiles.map(t=>t.id)});
  if(settings.investigatorMode)log(s,`Investigadores ${settings.investigatorMode==='manual'?'elegidos':'sorteados'}: ${s.players.map(p=>playerInfo(p).name).join(', ')}.`,{mode:settings.investigatorMode,investigators:s.players.map(p=>p.id)});
  log(s,'Pendiente de revisar: Emerging Deep One / Fungus Thing, verde de resistencia 2, utiliza la imagen de Adult Deep One por acuerdo del usuario.',{card:'emerging-deep-one'});
  if(s.players.some(p=>['howard','vincent'].includes(p.id)))log(s,'Los poderes rojos siguen el reglamento vigente, que prevalece sobre el texto antiguo de las fichas.');
  prepend(s,event('startTurn'));pump(s);assertState(s);return s;
}
export function availableActions(s) {
  if(s.status!=='playing'||s.pending)return [];
  const a=[],p=s.players[s.active],phase=s.phase;
  if(phase==='pre'){
    if(!s.powerUsed&&enabled(s,s.active)){
      if(hasPower(s,s.active,'pocket')&&COLORS.some(c=>s.supply.tokens[c]>0))a.push(option('power','Obtener pergamino',[event('powerUsed'),event('gainChoice',{player:s.active})]));
      if(hasPower(s,s.active,'weaken')&&inPlay(s).length)a.push(option('power','Lanzar Wither',[]));
      if(hasPower(s,s.active,'guide')&&living(s).length>1)a.push(option('power','Mover a otro investigador',[event('powerUsed'),event('moveOther')]));
    }
    a.push(option('move','Mover investigador',[event('moveChoice',{player:s.active})]));
    a.push(option('stay','Permanecer aquí',[event('move',{player:s.active,pos:p.pos})]));
  }
  if(phase==='action'){
    const tile=s.tiles[p.pos];
    if(actionAllowed(s,'attack')&&facingSlots(p.pos).some(slot=>canTarget(s,slot)))a.push(option('attack','Atacar',[event('beginAction',{kind:'attack'}),event('attack'),event('actionEnd')]));
    if(actionAllowed(s,'help')&&!tile.haunted&&availableHelp(s,tile.id))a.push(option('help',`Usar ${LOCATION[tile.id].name}`,[event('beginAction',{kind:'help'}),event('help',{id:tile.id}),event('actionEnd')]));
    a.push(option('finish-action','Terminar acciones',[event('phase',{phase:'signs'})]));
  }
  if(phase==='signs'){
    if(p.signs.some(t=>t<s.turn))for(const slot of facingSlots(p.pos))if(!s.slots[slot].card&&!s.slots[slot].sign)a.push(option(`sign-${slot}`,`Elder Sign: ${boardName(slot)}`,[event('sign',{slot})],{slot}));
    a.push(option('end','Finalizar turno',[event('next')]));
  }
  if(p.blessing&&['pre','action','signs'].includes(phase))a.push(option('blessing','Usar Elder Blessing',[]));
  return a;
}
export function transition(state,command) {
  if(state.status!=='playing')throw new Error('La partida ha terminado.');
  const s=structuredClone(state);
  if(command.type==='choose'){
    const choice=s.pending?.options.find(o=>o.id===String(command.id));if(!choice)throw new Error('Elección no permitida.');
    log(s,`Decisión: ${choice.label}.`,{prompt:s.pending.title,choice:choice.id});s.pending=null;prepend(s,...choice.effects);
  }else if(command.type==='action'){
    const action=availableActions(s).find(a=>a.id===command.id);if(!action)throw new Error('Acción no permitida en esta fase.');
    if(action.id==='blessing'){
      ask(s,'Elder Blessing: elegir efecto',s.tiles.flatMap((t,pos)=>t.haunted?[option(`restore-${pos}`,`Restaurar ${LOCATION[t.id].name}`,[event('blessing'),event('restore',{pos})],{tile:pos})]:availableHelp(s,t.id)?[option(`help-${pos}`,`Usar ${LOCATION[t.id].name}`,[event('blessing'),event('help',{id:t.id})],{tile:pos})]:[]).concat(option('cancel','Cancelar',[])));
    }else if(action.id==='power'&&hasPower(s,s.active,'weaken')){
      ask(s,'Wither: elegir monstruo',s.slots.flatMap((g,slot)=>g.card?[option(slot,CARDS[g.card].name,[event('powerUsed'),event('weaken',{uid:g.uid})],{slot})]:[]).concat(option('cancel','Cancelar',[])));
    }else prepend(s,...action.effects);
  }else throw new Error('Comando desconocido.');
  s.history.push({type:command.type,id:String(command.id)});pump(s);assertState(s);return s;
}
export function score(s) {
  const won=s.status==='won';const health=s.players.reduce((n,p)=>n+p.health,0),dead=s.players.filter(p=>p.health===0).length;
  const bossBonus=s.bossCount>1?2*Math.min(s.bossesDefeated,3)*(Math.min(s.bossesDefeated,3)+1)/2:0;
  return (won?(s.config.difficulty==='hell'?20:10):0)+health+(won?s.deck.length:-s.deck.length)-3*dead-4*s.tiles.filter(t=>t.haunted).length+bossBonus;
}
export function assertState(s) {
  if(s.players.length!==4||s.tiles.length!==9||s.slots.length!==12)throw new Error('Estructura de partida inválida.');
  for(const color of COLORS){const n=s.supply.tokens[color]+s.players.reduce((v,p)=>v+p.tokens[color],0)+(s.chapel===color?1:0);if(n!==4||s.supply.tokens[color]<0||s.players.some(p=>p.tokens[color]<0))throw new Error(`Conservación de pergaminos: ${color}.`);}
  if(s.supply.health+s.players.reduce((n,p)=>n+p.health,0)!==20||s.supply.health<0||s.players.some(p=>p.health<0))throw new Error('Conservación de salud.');
  if(s.supply.signs+s.slots.filter(x=>x.sign).length+s.players.reduce((n,p)=>n+p.signs.length,0)!==2)throw new Error('Conservación de Elder Signs.');
  const ids=[...s.deck,...s.discard,...s.slots.filter(x=>x.card).map(x=>x.card),...(s.pending?.card?[s.pending.card]:[])];
  if(new Set(ids).size!==ids.length||ids.some(id=>!CARDS[id]))throw new Error('Carta duplicada o desconocida.');
  if(s.slots.filter(g=>g.captured).length>3)throw new Error('Demasiados dados retenidos.');
  return true;
}
export const saveGame = s => JSON.stringify({version:VERSION,config:s.config,history:s.history});
export function loadGame(text) {
  if(text.length>5_000_000)throw new Error('Archivo de partida demasiado grande.');
  const record=JSON.parse(text);
  if(record.version!==VERSION||!record.config||!Array.isArray(record.history)||record.history.length>30000)throw new Error('Formato de partida no compatible.');
  let s=createGame(record.config);for(const command of record.history)s=transition(s,command);return s;
}
