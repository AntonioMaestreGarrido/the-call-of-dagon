import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight, BookOpen, Check, Download, FileText, Heart, History, Info, Plus, ScrollText, Shield, Skull, Sparkles, Swords, Upload, X} from 'lucide-react';
import {availableActions, createGame, hasPower, loadGame, playerInfo, saveGame, score, transition} from './engine.js';
import {assetUrl, BOSSES, CARD_BACK, CARDS, COLORS, COLOR_NAMES, DIFFICULTIES, INVESTIGATORS, MONSTERS, MONSTER_SHEET_PAGES, SIDES} from './data.js';
import {Board} from './Board.jsx';
import {CardDetails, Tooltip} from './Tooltip.jsx';
import './style.css';
import './board.css';

const STORAGE='dagon.game.v1';
const PHASES={setup:'Preparación',yin:'Monstruos',pre:'Poder y movimiento',action:'Acciones',signs:'Elder Signs',end:'Fin del turno'};
const POWER_LABELS={double:'Dos acciones del mismo tipo',mixed:'Ataque y localización',guide:'Mover a un compañero',fly:'Movimiento libre',pocket:'Un pergamino por turno',weaken:'Wither: -1 resistencia',reroll:'Repetir dados',extra:'Dado extra; sin terror'};
const iconFor=id=>id==='attack'?Swords:id==='blessing'?Sparkles:id==='move'?ArrowRight:id==='power'?Sparkles:id==='help'?BookOpen:id.startsWith('sign')?Shield:Check;
function IconButton({title,children,...props}){return <button className="icon-button" title={title} aria-label={title} {...props}>{children}</button>;}
function Dot({color}){return <i className={`color-dot ${color}`} title={COLOR_NAMES[color]}/>;}
function Portrait({info}){return <span className="portrait" style={{backgroundImage:`url('${info.sheet}')`}}/>;}
function download(filename,text,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function initialSave(){try {const text=localStorage.getItem(STORAGE);return text?{game:loadGame(text)}:{game:null};}catch(error){return {game:null,error:`No se pudo recuperar la partida: ${error.message}. La copia guardada se ha conservado.`};}}
function Modal({title,onClose,children,wide=false}){
  const ref=useRef(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className={wide?'modal wide':'modal'} onCancel={e=>{e.preventDefault();onClose?.();}}><header><h2>{title}</h2>{onClose&&<IconButton title="Cerrar" onClick={onClose}><X size={20}/></IconButton>}</header>{children}</dialog>;
}
function Setup({onStart,onClose}){
  const [difficulty,setDifficulty]=useState('initiation');const [first,setFirst]=useState('blue');
  const [investigatorMode,setInvestigatorMode]=useState('random');
  const [investigators,setInvestigators]=useState(()=>Object.fromEntries(SIDES.map(color=>[color,INVESTIGATORS.find(p=>p.color===color).id])));
  return <Modal title="Nueva partida" onClose={onClose} wide>
    <div className="setup-identity"><img src={assetUrl("/assets/gameboard.jpg")} alt="The Call of Dagon"/><div><span className="eyebrow">THE CALL OF DAGON</span><h3>La ciudad espera.</h3><p>Juego base · 4 investigadores</p></div></div>
    <label className="field">Dificultad<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{Object.entries(DIFFICULTIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div className="setup-facts"><span><Heart size={16}/>{difficulty==='initiation'?4:3} de salud</span><span><Skull size={16}/>{['nightmare','hell'].includes(difficulty)?4:1} Mensajero{['nightmare','hell'].includes(difficulty)?'s':''}</span><span><Shield size={16}/>{difficulty==='hell'?'Sin':'Con'} Elder Blessing</span></div>
    <label className="field">Primer turno<select value={first} onChange={e=>setFirst(e.target.value)}>{SIDES.map(c=><option key={c} value={c}>{COLOR_NAMES[c]}</option>)}</select></label>
    <fieldset className="investigator-mode"><legend>Investigadores</legend><div className="setup-segments">{[['random','Al azar'],['manual','Elegir']].map(([value,label])=><label key={value} className={investigatorMode===value?'selected':''}><input type="radio" name="investigator-mode" value={value} checked={investigatorMode===value} onChange={()=>setInvestigatorMode(value)}/>{label}</label>)}</div></fieldset>
    {investigatorMode==='manual'&&<div className="investigator-selection">{SIDES.map(color=><fieldset key={color} style={{'--player-color':`var(--${color})`}}><legend><Dot color={color}/>{COLOR_NAMES[color]}</legend><div className="investigator-options">{INVESTIGATORS.filter(p=>p.color===color).map(info=><label key={info.id} className={`investigator-option ${investigators[color]===info.id?'selected':''}`}>
      <input type="radio" name={`investigator-${color}`} value={info.id} aria-label={info.name} checked={investigators[color]===info.id} onChange={()=>setInvestigators(previous=>({...previous,[color]:info.id}))}/>
      <img src={info.sheet} alt={`Tablero de ${info.name}`}/><span><strong>{info.name}</strong><small>{info.role}</small><span className="selection-power">{info.text}</span></span>
    </label>)}</div></fieldset>)}</div>}
    <div className="rule-note"><Info size={16}/><span>Emerging Deep One: imagen provisional de Adult Deep One; resistencia 2. Pendiente de revisar.</span></div>
    <button className="primary full" onClick={()=>onStart({difficulty,first,seed:crypto.randomUUID(),investigatorMode,...(investigatorMode==='manual'?{investigators}:{})})}>Comenzar partida <ArrowRight size={18}/></button>
  </Modal>;
}
function Inspector({item,onClose}){
  const info=INVESTIGATORS.find(p=>p.id===item.id);
  return <Modal title={info.name} onClose={onClose} wide><img className="full-sheet" src={info.sheet} alt={info.name}/><p className="sheet-rule">Regla aplicada: {info.text}</p>{['howard','vincent'].includes(info.id)&&<p className="rule-note">El reglamento actualizado prevalece sobre el texto antiguo de esta ficha.</p>}</Modal>;
}
function Catalog({onClose,game}){
  const [tab,setTab]=useState('monsters');const data=tab==='monsters'?MONSTERS:BOSSES;
  return <Modal title="Catálogo del juego base" onClose={onClose} wide><div className="tabs"><button className={tab==='monsters'?'selected':''} onClick={()=>setTab('monsters')}>Monstruos · 55</button><button className={tab==='bosses'?'selected':''} onClick={()=>setTab('bosses')}>Mensajeros · 10</button></div><div className="catalog">{data.map(c=><Tooltip key={c.id} content={<CardDetails id={c.id} game={game}/>}><button aria-label={`Examinar ${c.name}`}><img src={c.image} alt={c.name} loading="lazy"/><span>{c.name}</span><small><Dot color={c.color}/> Resistencia {c.resistance}{c.review?' · Revisar':''}</small></button></Tooltip>)}</div></Modal>;
}
function MonsterSheets({onClose}){
  return <Modal title="Monster Sheets" onClose={onClose} wide>
    <div className="sheet-toolbar"><p>Fichas originales del componente. Se muestran dentro de la aplicación para poder revisarlas sin salir del juego.</p><a className="resource-link" href={assetUrl("/monster-sheets.pdf")} target="_blank" rel="noreferrer"><FileText size={15}/>Abrir PDF original</a></div>
    <div className="monster-sheets">{MONSTER_SHEET_PAGES.map(({page,image})=><figure key={page}><img src={image} alt={`Monster Sheets, página ${page}`}/><figcaption>Página {page}</figcaption></figure>)}</div>
  </Modal>;
}
function PlayerPanel({p,index,active,game,inspect}){
  const info=playerInfo(p);const power=hasPower(game,index,info.power);
  return <article className={`investigator ${active?'active':''} ${p.health===0?'fallen':''}`} style={{'--player-color':`var(--${p.color})`}}>
    <button className="investigator-heading" onClick={()=>inspect({kind:'player',id:p.id})}><Portrait info={info}/><span><small>{COLOR_NAMES[p.color]} {active?'· TURNO ACTUAL':''}</small><strong>{info.name}</strong><em>{info.role}</em></span></button>
    <div className="vitals"><span className={p.health<2?'danger-text':''}><Heart size={14}/> {p.health}</span><span title="Elder Blessing" className={p.blessing?'blessed':'muted'}><Sparkles size={14}/> {p.blessing?'Disponible':'Gastado'}</span>{p.signs.length>0&&<span title="Elder Signs"><Shield size={14}/>{p.signs.length}</span>}</div>
    <div className="scrolls">{COLORS.map(c=><span key={c} title={`Pergaminos ${COLOR_NAMES[c]}`} className={p.tokens[c]?'':'empty'}><Dot color={c}/>{p.tokens[c]}</span>)}</div>
    <p className={`power-text ${power?'':'disabled-power'}`} title={info.text}>{p.health===0?'Caído en St. Joseph Sanitarium':!power?'Poder anulado':POWER_LABELS[info.power]}</p>
  </article>;
}
function Dice({dice}){if(!dice)return null;const terror={nothing:'—',haunt:'Casa',draw:'+1',loseAll:'0',hurt:'−1'};return <div className="dice-tray"><span>{dice.kind==='terror'?'TERROR':dice.kind==='shop'?'MAGIC SHOP':'ATAQUE'}</span><div>{dice.values.map((v,i)=><span key={i} className={`die ${v}`} title={COLOR_NAMES[v]||v}>{COLORS.includes(v)||v==='white'?<i/>:terror[v]}</span>)}</div></div>;}
function DecisionPanel({game,dispatch}){
  if(!game)return <div className="decision-empty"><Shield size={28}/><p>Investigadores por reunir</p></div>;
  const actions=availableActions(game);
  if(game.status!=='playing')return <div className="outcome"><Skull size={32}/><h2>{game.status==='won'?'La ciudad está a salvo.':'Dagon se impone.'}</h2><p>{game.reason}</p><strong>{score(game)} puntos</strong></div>;
  return <><div className="decision-title"><span className="eyebrow">{game.pending?'DECISIÓN PENDIENTE':PHASES[game.phase]}</span><h2>{game.pending?.title??playerInfo(game.players[game.active]).name}</h2></div>
    {game.pending?.card&&<Tooltip content={<CardDetails id={game.pending.card} game={game}/>}><button className="incoming-preview" aria-label={`Examinar ${CARDS[game.pending.card].name}`}><img src={CARDS[game.pending.card].image} alt={CARDS[game.pending.card].name}/><span><Dot color={CARDS[game.pending.card].color}/>{CARDS[game.pending.card].name}<small>Resistencia {CARDS[game.pending.card].resistance}</small></span></button></Tooltip>}
    <div className="decisions">{game.pending?game.pending.options.map(o=><button className="choice" key={o.id} onClick={()=>dispatch({type:'choose',id:o.id})}>{o.color?<Dot color={o.color}/>:<ArrowRight size={15}/>}<span>{o.label}{o.detail&&<small>{o.detail}</small>}</span></button>):actions.map(a=>{const Icon=iconFor(a.id);return <button className={`action ${['attack','help','move','end'].includes(a.id)?'emphasized':''}`} key={a.id} onClick={()=>dispatch({type:'action',id:a.id})}><Icon size={17}/><span>{a.label}</span><ArrowRight size={14}/></button>;})}</div>
    <Dice dice={game.lastDice}/>
  </>;
}
function Log({game}){
  const [expanded,setExpanded]=useState(null);
  return <section className="log"><div className="section-heading"><h2><History size={15}/> Registro</h2><span>{game?.log.length??0}</span></div><div className="log-entries" aria-live="polite">{game?[...game.log].reverse().map(e=><button className={`log-entry ${e.text.startsWith('Turno')?'turn-entry':''}`} key={e.id} onClick={()=>setExpanded(expanded===e.id?null:e.id)}><span className="log-number">{String(e.id).padStart(3,'0')}</span><div><p>{e.text}</p>{expanded===e.id&&<><small>Turno {e.turn} · {PHASES[e.phase]??e.phase}</small>{Object.keys(e.details).length>0&&<pre>{JSON.stringify(e.details,null,2)}</pre>}</>}</div></button>):<p className="muted log-placeholder">La partida todavía no ha comenzado.</p>}</div></section>;
}
function App(){
  const [initial]=useState(initialSave);const [game,setGame]=useState(initial.game);const [setup,setSetup]=useState(!initial.game);const [error,setError]=useState(initial.error??null);const [inspector,setInspector]=useState(null);const [catalog,setCatalog]=useState(false);const [sheets,setSheets]=useState(false);const [saved,setSaved]=useState(!!initial.game);const fileInput=useRef(null);
  useEffect(()=>{if(!game)return;try{const current=localStorage.getItem(STORAGE);if(current)localStorage.setItem(STORAGE+'.backup',current);localStorage.setItem(STORAGE,saveGame(game));setSaved(true);}catch(e){setSaved(false);setError('No se pudo guardar en este navegador. Descarga la partida para conservarla.');}},[game]);
  // Compute the next state before React schedules it so an invalid command cannot crash rendering.
  function safeDispatch(cmd){try{const next=transition(game,cmd);setGame(next);setError(null);}catch(e){setError(e.message);}}
  function start(config){try{setGame(createGame(config));setSetup(false);setError(null);}catch(e){setError(e.message);}}
  async function importSave(e){const file=e.target.files?.[0];if(!file)return;try{const loaded=loadGame(await file.text());setGame(loaded);setSetup(false);setError(null);}catch(err){setError(`No se pudo cargar: ${err.message}`);}e.target.value='';}
  return <div className="app">
    <header className="topbar"><div className="brand"><img src={assetUrl("/assets/tokens-01-01.jpeg")} alt=""/><div><h1>The Call of Dagon</h1><span>GHOST STORIES · JUEGO BASE</span></div></div><div className="header-center">{game&&<><span className="status-dot"/>{DIFFICULTIES[game.config.difficulty]}<i/>Ronda {Math.ceil(game.turn/4)}</>}</div><div className="header-tools"><span className={`save-status ${saved?'':'unsaved'}`}>{game?(saved?'Guardado':'Sin guardar'):'Sin partida'}</span><IconButton title="Descargar partida" disabled={!game} onClick={()=>download('dagon-partida.json',saveGame(game))}><Download size={18}/></IconButton><IconButton title="Cargar partida" onClick={()=>fileInput.current.click()}><Upload size={18}/></IconButton><IconButton title="Catálogo de cartas" onClick={()=>setCatalog(true)}><BookOpen size={18}/></IconButton><button className="resource-button" onClick={()=>setSheets(true)} title="Ver Monster Sheets"><FileText size={15}/>Fichas</button><a className="icon-button" href={assetUrl("/rules.pdf")} target="_blank" rel="noreferrer" title="Reglamento oficial" aria-label="Reglamento oficial"><FileText size={18}/></a><button className="new-game" onClick={()=>setSetup(true)}><Plus size={16}/>Nueva partida</button></div><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importSave}/></header>
    {error&&<div className="error-banner" role="alert">{error}<IconButton title="Cerrar aviso" onClick={()=>setError(null)}><X size={16}/></IconButton></div>}
    <div className="workspace"><aside className="players-sidebar"><div className="section-heading"><h2>Investigadores</h2><span>04</span></div>{game?game.players.map((p,i)=><PlayerPanel key={p.id} p={p} index={i} active={i===game.active} game={game} inspect={setInspector}/>):SIDES.map(c=><div key={c} className="empty-investigator"><Dot color={c}/>{COLOR_NAMES[c]}</div>)}<div className="supply"><h3>Reserva</h3><div className="scrolls">{COLORS.map(c=><span key={c}><Dot color={c}/>{game?.supply.tokens[c]??4}</span>)}</div><div className="vitals"><span><Heart size={14}/>{game?.supply.health??20}</span><span><Shield size={14}/>{game?.supply.signs??2}</span></div></div></aside>
      <main className="table-area"><div className="table-top"><div><span className="eyebrow">LA CIUDAD</span><h2>{game?.status==='won'?'El asedio ha terminado':game?.status==='lost'?'La última noche':'El asedio de Dagon'}</h2></div><div className="haunted-count"><Skull size={17}/><b>{game?.tiles.filter(t=>t.haunted).length??0}</b><span>/ 3 encantadas</span></div></div><Board game={game} choose={id=>safeDispatch({type:'choose',id})}/><div className="table-bottom"><div className="deck-info"><img src={CARD_BACK} alt="Mazo de monstruos"/><span><strong>{game?.deck.length??'55 + 1'}</strong>En el mazo</span><span><strong>{game?.discard.length??0}</strong>Descartados</span></div><div className="turn-summary">{game&&<><Dot color={game.players[game.active].color}/><span>Turno {game.turn}<small>{PHASES[game.phase]}</small></span></>}</div><button className="text-button" disabled={!game} onClick={()=>download('dagon-registro.json',JSON.stringify({config:game.config,events:game.log},null,2))}><ScrollText size={16}/>Exportar registro</button></div></main>
      <aside className="right-sidebar"><section className="decision-panel"><DecisionPanel game={game} dispatch={safeDispatch}/></section><Log game={game}/></aside>
    </div>
    {setup&&<Setup onStart={start} onClose={game?()=>setSetup(false):undefined}/>}
    {catalog&&<Catalog onClose={()=>setCatalog(false)} game={game}/>}
    {sheets&&<MonsterSheets onClose={()=>setSheets(false)}/>}
    {inspector&&<Inspector item={inspector} game={game} onClose={()=>setInspector(null)}/>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
