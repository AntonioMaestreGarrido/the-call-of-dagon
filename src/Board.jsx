import React from 'react';
import {ArrowRight, Plus, Shield, Skull} from 'lucide-react';
import {boardName, playerInfo} from './engine.js';
import {CARDS, COLOR_NAMES, LOCATION, LOCATIONS, MONSTER_SHEET_ART, MONSTER_TOKEN_ART, SIDES} from './data.js';
import {CardDetails, LocationDetails, Tooltip} from './Tooltip.jsx';

const BOARD_SHEETS=[
  {side:'blue',className:'sheet-top',slots:[2,1,0],rotation:180},
  {side:'red',className:'sheet-right',slots:[5,4,3],rotation:-90},
  {side:'yellow',className:'sheet-bottom',slots:[6,7,8],rotation:0},
  {side:'green',className:'sheet-left',slots:[9,10,11],rotation:90},
];
// Card frames and track centers, measured on the original 3307 x 1949 sheets.
const SLOT_LEFT=[9.5,38,66.6];
const TRACK_CENTERS=[21.4,49.9,78.5];

function Slot({slot,lane,game,choose}) {
  const g=game?.slots[slot]??{card:null,sign:false}, c=CARDS[g.card];
  const opt=game?.pending?.options.find(option=>option.slot===slot);
  return <div className={`monster-slot sheet-slot ${c?'occupied':''} ${opt?'selectable':''}`} style={{left:`${SLOT_LEFT[lane]}%`,'--side-color':`var(--${SIDES[Math.floor(slot/3)]})`}}>
    <Tooltip enabled={!!c} content={c&&<CardDetails id={c.id} game={game}/>}><button className="slot-main" aria-label={opt?`Elegir ${boardName(slot)}`:c?`Examinar ${c.name}`:boardName(slot)} onClick={()=>opt&&choose(opt.id)} disabled={!c&&!opt}>
      {c?<><img src={c.image} alt={c.name}/><span className="resistance"><i className={`color-dot ${c.color}`}/>{c.resistance}</span>{c.review&&<span className="review-marker">Revisar</span>}{c.boss&&<span className="boss-marker"><Skull size={12}/></span>}</>:g.sign&&<span className="empty-sign"><Shield size={25}/><small>Elder Sign</small></span>}
      {opt&&<span className="placement-marker"><Plus size={17}/></span>}
    </button></Tooltip>
    {c&&<div className="monster-foot"><span>{c.name}</span><div>{g.captured&&<span aria-label="Dado retenido">−1</span>}{game.weak===g.uid&&<span className="wither" aria-label="Wither">W</span>}</div></div>}
  </div>;
}

function MonsterSheet({sheet,game,choose}) {
  return <div className={`monster-sheet ${sheet.className}`} style={{'--sheet-rotation':`${sheet.rotation}deg`}}><div className="sheet-layer">
    <img className="sheet-art" src={MONSTER_SHEET_ART[sheet.side]} alt={`Tablero ${COLOR_NAMES[sheet.side]}`}/>
    {sheet.slots.map((slot,lane)=><Slot key={slot} slot={slot} lane={lane} game={game} choose={choose}/>)}
    {sheet.slots.map((slot,lane)=>{
      const g=game?.slots[slot], c=CARDS[g?.card];
      if(!c?.traits.includes('haunt'))return null;
      return <img key={g.uid} className="monster-token" data-slot={slot} data-stage={g.haunt} src={MONSTER_TOKEN_ART[c.name]} alt={`Token de ${c.name}: ${g.haunt===1?'en la pista':'sobre la carta'}`} style={{left:`${TRACK_CENTERS[lane]}%`,top:g.haunt===1?'30%':'73%','--token-rotation':`${-sheet.rotation}deg`}}/>;
    })}
  </div></div>;
}

export function Board({game,choose}) {
  const tiles=game?.tiles??LOCATIONS.map(t=>({id:t.id,haunted:false}));
  return <div className="board-shell"><div className="table-board">
    {BOARD_SHEETS.map(sheet=><MonsterSheet key={sheet.side} sheet={sheet} game={game} choose={choose}/>)}
    <div className="city">{tiles.map((tile,pos)=>{
      const loc=LOCATION[tile.id], opt=game?.pending?.options.find(option=>option.tile===pos);
      const occupants=game?.players.filter(p=>p.pos===pos&&p.health>0)??[];
      return <div className={`location ${tile.haunted?'haunted':''} ${opt?'selectable':''}`} key={pos}>
        <Tooltip content={<LocationDetails id={tile.id} haunted={tile.haunted}/>}><button aria-label={opt?`Elegir ${loc.name}`:`Examinar ${loc.name}`} onClick={()=>opt&&choose(opt.id)}><img src={loc.image} alt={loc.name}/>{tile.haunted&&<span className="haunt-overlay"><Skull size={24}/></span>}{opt&&<span className="location-choice"><ArrowRight size={20}/></span>}</button></Tooltip>
        <div className="pawns">{occupants.map(p=><span key={p.id} className={`pawn ${p.color}`} title={playerInfo(p).name}>{playerInfo(p).name.split(' ').at(-1)[0]}</span>)}</div>
        {tile.id==='chapel'&&game?.chapel&&<span className="chapel-token"><i className={`color-dot ${game.chapel}`}/></span>}
      </div>;
    })}</div>
  </div></div>;
}
