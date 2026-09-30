import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {availableActions, assertState, boardName, combatPlans, createGame, facingSlots, hasPower, lineFor, loadGame, saveGame, transition} from '../src/engine.js';
import {assetUrl, BOSSES, CARDS, COLORS, INVESTIGATORS, MONSTERS, MONSTER_TOKEN_ART, SIDES} from '../src/data.js';

function fixture(){
  const s=createGame({seed:'fixture',difficulty:'normal'});
  if(s.pending?.card)s.deck.unshift(s.pending.card);
  s.pending=null;s.queue=[];s.phase='action';s.actions=[];s.active=0;
  return s;
}
function add(s,id,slot,extra={}){
  s.deck=s.deck.filter(c=>c!==id);
  s.slots[slot]={card:id,uid:++s.serial,haunt:0,sign:false,...extra};return s;
}
function setTokens(s,player,color,n){const old=s.players[player].tokens[color];s.players[player].tokens[color]=n;s.supply.tokens[color]+=old-n;}
function scripted(s,effects){s.pending={title:'Test fixture',options:[{id:'run',label:'Resolve',effects}]};return transition(s,{type:'choose',id:'run'});}
function chooseFirst(s){return transition(s,{type:'choose',id:s.pending.options[0].id});}

test('55 distinct basic monsters, 11 per color, and ten base messengers',()=>{
  assert.equal(MONSTERS.length,55);assert.equal(new Set(MONSTERS.map(c=>c.id)).size,55);
  for(const c of COLORS)assert.equal(MONSTERS.filter(m=>m.color===c).length,11,c);
  assert.equal(BOSSES.length,10);assert.equal(MONSTERS.filter(c=>c.review).length,1);
});
test('every haunting monster has a matching original token asset',()=>{
  for(const card of [...MONSTERS,...BOSSES].filter(c=>c.traits.includes('haunt'))){
    const asset=MONSTER_TOKEN_ART[card.name]??'';
    assert.match(asset,/^\/assets\/tokens-01-\d+\.jpeg$/,card.name);
    assert.ok(existsSync(new URL(`../public${asset}`,import.meta.url)),card.name);
  }
});
test('component assets resolve under the GitHub Pages project path',()=>{
  assert.equal(assetUrl('/assets/example.png','/the-call-of-dagon/'),'/the-call-of-dagon/assets/example.png');
  assert.equal(assetUrl('/rules.pdf','/the-call-of-dagon/'),'/the-call-of-dagon/rules.pdf');
  assert.equal(assetUrl('/assets/example.png','/'),'/assets/example.png');
});
test('current Initiation setup gives four health, own scroll and black scroll',()=>{
  const s=createGame({seed:'setup'});
  for(const p of s.players){assert.equal(p.health,4);assert.equal(p.tokens[p.color],1);assert.equal(p.tokens.black,1);assert.ok(p.blessing);}
  assert.equal(s.supply.health,4);assert.equal(s.supply.tokens.black,0);
  assert.equal(new Set(s.tiles.map(t=>t.id)).size,9);assertState(s);
});
test('normal and hell difficulty setup',()=>{
  for(const difficulty of ['normal','hell']){const s=createGame({seed:'setup',difficulty});for(const p of s.players){assert.equal(p.health,3);assert.equal(p.tokens.black,0);assert.equal(p.blessing,difficulty!=='hell');}}
});
test('manual setup supports all sixteen teams and preserves each selected power and replay',()=>{
  for(let mask=0;mask<16;mask++){
    const selected=SIDES.map((color,i)=>INVESTIGATORS.filter(p=>p.color===color)[(mask>>i)&1]);
    const investigators=Object.fromEntries(selected.map(p=>[p.color,p.id]));
    let s=createGame({seed:'manual-teams',investigatorMode:'manual',investigators});
    assert.deepEqual(s.players.map(p=>p.id),selected.map(p=>p.id));
    selected.forEach((p,i)=>assert.ok(hasPower(s,i,p.power),p.name));
    assert.deepEqual(s.config.investigators,investigators);
    assert.notEqual(s.config.investigators,investigators);
    assert.ok(s.log.some(e=>e.text.includes('Investigadores elegidos')));
    assert.deepEqual(loadGame(saveGame(s)),s);
    s=chooseFirst(s);
    assert.deepEqual(loadGame(saveGame(s)),s);
    assertState(s);
  }
});
test('random mode ignores manual choices and keeps the existing seeded draw',()=>{
  const legacy=createGame({seed:'legacy-selection'});
  const random=createGame({seed:'legacy-selection',investigatorMode:'random',investigators:{blue:'diana',red:'vincent',yellow:'wilbur',green:'duncan'}});
  assert.deepEqual(legacy.players.map(p=>p.id),['linda','howard','milton','jack']);
  assert.deepEqual(legacy.tiles.map(t=>t.id),['police','library','chapel','sanitarium','hotel','shop','circle','obelisk','witchhouse']);
  assert.equal(legacy.pending.card,'m5-7');
  assert.deepEqual(random.players,legacy.players);
  assert.deepEqual(random.deck,legacy.deck);
  assert.deepEqual(random.rng,legacy.rng);
  assert.equal(random.config.investigators,undefined);
  assert.ok(random.log.some(e=>e.text.includes('Investigadores sorteados')));
  assert.deepEqual(loadGame(saveGame(random)),random);
  assert.deepEqual(loadGame(saveGame(legacy)),legacy);
});
test('manual investigator selection rejects missing, unknown, duplicate and wrong-color choices',()=>{
  const investigators={blue:'linda',red:'howard',yellow:'milton',green:'jack'};
  for(const invalid of [undefined,null,[],{}, {...investigators,green:undefined},{...investigators,green:'unknown'},{...investigators,green:'linda'},{...investigators,blue:'howard',red:'linda'},{...investigators,black:'jack'}]){
    assert.throws(()=>createGame({investigatorMode:'manual',investigators:invalid}),/investigador válido/);
  }
  assert.throws(()=>createGame({investigatorMode:'invalid'}),/Modo de investigadores/);
  const record=JSON.parse(saveGame(createGame({investigatorMode:'manual',investigators})));
  record.config.investigators.green='linda';
  assert.throws(()=>loadGame(JSON.stringify(record)),/investigador válido/);
});
test('messengers are separated by ten ordinary cards from the bottom',()=>{
  for(const difficulty of ['initiation','nightmare']){
    const s=createGame({seed:'deck-layout',difficulty});const deck=[...(s.pending?.card?[s.pending.card]:[]),...s.deck];
    const positions=deck.map((id,i)=>CARDS[id].boss?i:-1).filter(i=>i>=0);
    assert.deepEqual(positions,difficulty==='initiation'?[45]:[15,26,37,48]);
  }
});
test('placement respects the monster color and offers all three free lanes',()=>{
  const s=createGame({seed:'placement'});const c=CARDS[s.pending.card];
  assert.equal(s.pending.options.length,3);
  for(const o of s.pending.options){const side=Math.floor(o.slot/3);assert.equal(s.players[side].color,c.color==='black'?s.players[s.active].color:c.color);}
});
test('corner adjacency and haunting lines match all four sides',()=>{
  assert.deepEqual(facingSlots(0),[0,9]);assert.deepEqual(facingSlots(8),[5,8]);assert.deepEqual(facingSlots(4),[]);
  assert.deepEqual(lineFor(0),[0,3,6]);assert.deepEqual(lineFor(3),[2,1,0]);assert.deepEqual(lineFor(6),[6,3,0]);assert.deepEqual(lineFor(9),[0,1,2]);
});
test('ordinary movement forbids distant cells but permits diagonals',()=>{
  const s=fixture();s.phase='pre';s.players[0].pos=0;
  const n=transition(s,{type:'action',id:'move'});
  assert.deepEqual(n.pending.options.map(o=>o.tile),[0,1,3,4]);
  assert.throws(()=>transition(n,{type:'choose',id:'8'}),/Elección/);
});
test('Vincent can fly; Howard moves another investigator before himself',()=>{
  const s=fixture();s.active=1;s.phase='pre';s.players[1].id='vincent';s.players[1].pos=0;
  assert.equal(transition(s,{type:'action',id:'move'}).pending.options.length,9);
  s.players[1].id='howard';const n=transition(s,{type:'action',id:'power'});assert.equal(n.phase,'pre');
  assert.equal(n.pending.options.length,3);assert.ok(!n.pending.options.some(o=>o.id==='1'));
});
test('dice automatically exorcise both corner ghosts when sufficient',()=>{
  const s=fixture();add(s,'m1-1',0);add(s,'m1-5',9);s.players[0].pos=0;
  const plans=combatPlans(s,[0,9],['blue','yellow','red']);assert.ok(plans.length);assert.ok(plans.every(p=>p.slots.length===2));
});
test('white dice cannot be reused, and no-dice monsters require scrolls',()=>{
  const s=fixture();for(let i=0;i<4;i++)for(const c of COLORS)setTokens(s,i,c,0);
  add(s,'m1-1',0);add(s,'m1-5',9);const plans=combatPlans(s,[0,9],['white']);assert.equal(plans.length,2);assert.ok(plans.every(p=>p.slots.length===1));
  add(s,'m5-5',0);assert.deepEqual(combatPlans(s,[0],['blue','white','white']).map(p=>p.slots),[[]]);
  setTokens(s,0,'blue',1);assert.ok(combatPlans(s,[0],['blue']).some(p=>p.slots.length===1&&p.cost.blue===1));
});
test('shared scrolls are only available on the same tile',()=>{
  const s=fixture();for(let i=0;i<4;i++)for(const c of COLORS)setTokens(s,i,c,0);
  add(s,'m1-2',0);setTokens(s,1,'blue',2);s.players[0].pos=0;s.players[1].pos=1;
  assert.ok(combatPlans(s,[0],[]).every(p=>!p.slots.length));s.players[1].pos=0;
  assert.ok(combatPlans(s,[0],[]).some(p=>p.slots.length===1&&p.cost.blue===2));
});
test('global scroll lock, power lock and white lock apply dynamically',()=>{
  const s=fixture();s.players[0].id='linda';assert.ok(hasPower(s,0,'double'));
  add(s,'m7-2',1);assert.equal(hasPower(s,0,'double'),false);
  add(s,'oldman',6);assert.equal(hasPower(s,2,'pocket'),false);
  add(s,'m1-1',0);add(s,'colour',5);assert.ok(combatPlans(s,[0],[]).every(p=>!p.slots.length));
  add(s,'unnamable',8);assert.ok(combatPlans(s,[0],['white']).every(p=>!p.slots.length));
});
test('Wither and Old Chapel can reduce resistance to zero',()=>{
  const s=fixture();add(s,'m1-2',0);s.weak=s.slots[0].uid;s.chapel='blue';s.supply.tokens.blue--;
  const plans=combatPlans(s,[0],[]);assert.ok(plans.every(p=>p.slots.length===1&&p.cost.blue===0));
});
test('multicolor messengers require the correct colors and allow wild allocation choices',()=>{
  const s=fixture();for(let i=0;i<4;i++)for(const c of COLORS)setTokens(s,i,c,0);
  add(s,'terror',0);for(const color of ['blue','red','yellow','green'])setTokens(s,0,color,2);
  const plans=combatPlans(s,[0],['white']);assert.ok(plans.some(p=>p.slots.length));
  assert.ok(plans.filter(p=>p.slots.length).every(p=>Object.values(p.cost).reduce((a,b)=>a+b,0)===7));
});
test('Messenger conditions: opposite slot and Elder Sign',()=>{
  const s=fixture();add(s,'guardian',0);add(s,'m1-5',6);
  assert.ok(combatPlans(s,[0],['black','black','black']).every(p=>!p.slots.length));
  s.slots[6]={card:null,sign:false};assert.ok(combatPlans(s,[0],['black','black','black']).every(p=>p.slots.length===1));
  add(s,'shoggoth',0);assert.ok(combatPlans(s,[0],['black','black','black']).every(p=>!p.slots.length));
  s.slots[0].vulnerable=true;assert.ok(combatPlans(s,[0],['black','black','black']).every(p=>p.slots.length===1));
});
test('a third haunted tile loses even in Initiation',()=>{
  let s=fixture();s.config.difficulty='initiation';s.tiles[0].haunted=true;s.tiles[1].haunted=true;
  s=scripted(s,[{type:'haunt',tile:2}]);assert.equal(s.status,'lost');
});
test('haunters advance every second activation and skip haunted tiles',()=>{
  let s=fixture();add(s,'m1-1',0);const uid=s.slots[0].uid;
  s=scripted(s,[{type:'activate',slot:0,uid}]);assert.equal(s.slots[0].haunt,1);assert.equal(s.tiles[0].haunted,false);
  s=scripted(s,[{type:'activate',slot:0,uid}]);assert.equal(s.slots[0].haunt,0);assert.ok(s.tiles[0].haunted);
  s=scripted(s,[{type:'activate',slot:0,uid},{type:'activate',slot:0,uid}]);assert.ok(s.tiles[3].haunted);
});
test('Elder Signs destroy arriving ordinary monsters without entry effects or rewards',()=>{
  let s=fixture();s.slots[0].sign=true;s.supply.signs--;s.deck=s.deck.filter(id=>id!=='m11-1');
  s=scripted(s,[{type:'place',slot:0,card:'m11-1'}]);assert.equal(s.slots[0].card,null);assert.equal(s.supply.signs,2);assert.ok(s.discard.includes('m11-1'));assert.equal(s.pending,null);assertState(s);
});
test('last deck card loses, even if an Elder Sign destroys it',()=>{
  let s=fixture();s.deck=[];s.slots[0].sign=true;s.supply.signs--;
  s=scripted(s,[{type:'place',slot:0,card:'m1-1'}]);assert.equal(s.status,'lost');
});
test('newly acquired signs cannot be placed in the same turn',()=>{
  const s=fixture();s.phase='signs';s.players[0].pos=0;s.players[0].signs=[s.turn];s.supply.signs--;
  assert.ok(!availableActions(s).some(a=>a.id.startsWith('sign-')));s.players[0].signs=[s.turn-1];assert.equal(availableActions(s).filter(a=>a.id.startsWith('sign-')).length,2);
});
test('Hotel gain and heal are followed by drawing a monster',()=>{
  let s=fixture();const before=s.deck.length;const hp=s.players[0].health;
  s=scripted(s,[{type:'help',id:'hotel'}]);s=chooseFirst(s);
  assert.equal(s.players[0].health,hp+1);assert.equal(s.deck.length,before-1);assert.ok(s.pending.card);
});
test('death returns all possessions and leaves the ghosts on the board',()=>{
  let s=fixture();s.active=1;s.supply.health+=s.players[0].health-1;s.players[0].health=1;s.players[0].signs=[0];s.supply.signs--;add(s,'m1-1',0);
  s=scripted(s,[{type:'hurt',player:0,cause:'test'}]);assert.equal(s.players[0].health,0);assert.equal(s.players[0].blessing,false);assert.equal(s.players[0].signs.length,0);assert.ok(COLORS.every(c=>!s.players[0].tokens[c]));assert.equal(s.slots[0].card,'m1-1');assertState(s);
});
test('a possessed board lets the player choose who suffers health loss',()=>{
  let s=fixture();s.active=1;s.supply.health+=s.players[0].health;s.players[0].health=0;
  s=scripted(s,[{type:'hurt',player:0,cause:'overrun'}]);assert.equal(s.pending.options.length,3);assert.match(s.pending.title,/poseído/);
});
test('Duncan never rolls terror but still suffers a possessed board health loss',()=>{
  let s=fixture();s.active=3;s.players[3].id='duncan';const hp=s.players[3].health;
  s=scripted(s,[{type:'curse',slot:9}]);assert.equal(s.players[3].health,hp);assert.equal(s.lastDice,null);
});
test('final curse resolves before victory, and can still lose the game',()=>{
  let s=fixture();s.tiles[0].haunted=true;s.tiles[1].haunted=true;
  s=scripted(s,[{type:'haunt',tile:2},{type:'bossDefeated'},{type:'checkWin'}]);assert.equal(s.status,'lost');assert.equal(s.bossesDefeated,0);
});
test('input commands are validated and never mutate the previous state',()=>{
  const s=createGame({seed:'immutable'});const original=JSON.stringify(s);assert.throws(()=>transition(s,{type:'action',id:'attack'}));assert.equal(JSON.stringify(s),original);
  chooseFirst(s);assert.equal(JSON.stringify(s),original);
});
test('save/resume restores pending placement and deterministic random results exactly',()=>{
  let s=createGame({seed:'save'});assert.deepEqual(loadGame(saveGame(s)),s);
  s=chooseFirst(s);assert.deepEqual(loadGame(saveGame(s)),s);
  const action=availableActions(s).find(a=>a.id==='stay');if(action)s=transition(s,{type:'action',id:action.id});assert.deepEqual(loadGame(saveGame(s)),s);
});
test('malformed and incompatible saves are rejected',()=>{
  assert.throws(()=>loadGame('{}'));assert.throws(()=>loadGame('{'));assert.throws(()=>loadGame(JSON.stringify({version:1,config:{difficulty:'fake'},history:[]})));
});
test('100 deterministic full-game simulations preserve resources and replay',()=>{
  for(let run=0;run<100;run++){
    let s=createGame({seed:`simulation-${run}`,difficulty:['initiation','normal','nightmare','hell'][run%4]});let step=0;
    while(s.status==='playing'&&step++<900){
      if(s.pending){const choices=s.pending.options;const choice=choices[(run+step)%choices.length];s=transition(s,{type:'choose',id:choice.id});}
      else{const actions=availableActions(s);assert.ok(actions.length,`deadlock: ${run}, ${s.phase}`);const preferred=actions.find(a=>a.id==='attack')??actions.find(a=>a.id==='help')??actions[(run+step)%actions.length];s=transition(s,{type:'action',id:preferred.id});}
      assertState(s);
    }
    assert.notEqual(s.status,'playing',`simulation ${run} exceeded budget`);
    if(run<5)assert.deepEqual(loadGame(saveGame(s)),s);
  }
});
