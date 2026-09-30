import React, {cloneElement, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {CARDS, COLOR_NAMES, EFFECT_TEXT, LOCATION, TRAIT_TEXT} from './data.js';
import {DOUBLE_TAP_DELAY, isSecondTap, isTabletTouch} from './touch.js';
import './tooltip.css';

export const INSPECTION_DELAY = 450;

export function Tooltip({children, content, enabled=true}) {
  const id=useId(), anchor=useRef(null), panel=useRef(null), timer=useRef(null), clickTimer=useRef(null), lastPointer=useRef(null), lastTap=useRef(null), modeRef=useRef(null);
  const [mode,setMode]=useState(null);
  const open=mode!==null;
  const cancel=()=>clearTimeout(timer.current);
  const close=()=>{cancel();modeRef.current=null;setMode(null);};
  const schedule=()=>{cancel();if(enabled)timer.current=setTimeout(()=>{if(modeRef.current!=='touch'){modeRef.current='hover';setMode('hover');}},INSPECTION_DELAY);};
  const leave=()=>{if(modeRef.current==='touch')return;cancel();timer.current=setTimeout(close,120);};
  useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(clickTimer.current);},[]);
  useEffect(()=>{if(!enabled)close();},[enabled]);
  useLayoutEffect(()=>{
    if(!open)return;
    const tooltip=panel.current;
    // The top layer escapes both rotated sheets and scrolling modal containers.
    tooltip.showPopover();
    const target=anchor.current.getBoundingClientRect(), box=tooltip.getBoundingClientRect();
    const margin=12, gap=12;
    let x=target.right+gap, y=target.top+(target.height-box.height)/2;
    if(x+box.width>innerWidth-margin)x=target.left-box.width-gap;
    if(x<margin){x=target.left+(target.width-box.width)/2;y=target.bottom+gap;if(y+box.height>innerHeight-margin)y=target.top-box.height-gap;}
    tooltip.style.left=`${Math.max(margin,Math.min(x,innerWidth-box.width-margin))}px`;
    tooltip.style.top=`${Math.max(margin,Math.min(y,innerHeight-box.height-margin))}px`;
    const dismiss=e=>{
      if(e.type==='keydown'&&e.key!=='Escape')return;
      if(e.type==='scroll'&&tooltip.contains(e.target))return;
      close();
    };
    const dismissOutside=e=>{if(mode==='touch'&&!tooltip.contains(e.target)&&!anchor.current?.contains(e.target))close();};
    window.addEventListener('keydown',dismiss);
    window.addEventListener('resize',dismiss);
    window.addEventListener('scroll',dismiss,true);
    document.addEventListener('pointerdown',dismissOutside);
    return()=>{if(tooltip.matches(':popover-open'))tooltip.hidePopover();window.removeEventListener('keydown',dismiss);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true);document.removeEventListener('pointerdown',dismissOutside);};
  },[open,mode]);
  const click=e=>{
    const pointer=lastPointer.current;
    lastPointer.current=null;
    if(enabled&&isTabletTouch(pointer,innerWidth)){
      const now=performance.now(), previous=lastTap.current;
      if(isSecondTap(previous,pointer,now)){
        clearTimeout(clickTimer.current);
        lastTap.current=null;
        cancel();modeRef.current='touch';setMode('touch');
        return;
      }
      lastTap.current={time:now,x:pointer.x,y:pointer.y};
      clickTimer.current=setTimeout(()=>{lastTap.current=null;close();children.props.onClick?.(e);},DOUBLE_TAP_DELAY);
      return;
    }
    close();
    children.props.onClick?.(e);
  };
  return <>{cloneElement(children,{
    ref:anchor,'aria-describedby':open?id:undefined,
    onPointerEnter:e=>{if(e.pointerType!=='touch')schedule();},onPointerLeave:e=>{if(e.pointerType!=='touch')leave();},
    onPointerDown:e=>{lastPointer.current={type:e.pointerType,x:e.clientX,y:e.clientY};children.props.onPointerDown?.(e);},
    onFocus:e=>{if(e.target.matches(':focus-visible'))schedule();},onBlur:()=>{if(modeRef.current!=='touch')close();},
    onClick:click,
  })}{open&&<div ref={panel} id={id} role={mode==='touch'?'dialog':'tooltip'} popover="manual" className={`inspection-tooltip${mode==='touch'?' touch-inspection':''}`} onPointerEnter={cancel} onPointerLeave={leave}>{mode==='touch'&&<button className="inspection-close" onClick={close} aria-label="Cerrar" title="Cerrar"><X size={18}/></button>}{content}</div>}</>;
}

export function CardDetails({id,game}) {
  const c=CARDS[id], g=game?.slots.find(slot=>slot.card===id);
  return <div className="card-tooltip"><img src={c.image} alt={c.name}/><div className="tooltip-copy">
    <h3>{c.name}</h3><p className="tooltip-subtitle">{COLOR_NAMES[c.color]} · Resistencia {c.resistance}{c.boss?' · Mensajero':''}</p>
    {c.review&&<p className="tooltip-warning">Imagen provisional. Resistencia válida: 2. Pendiente de revisar.</p>}
    {c.enter.length>0&&<section><h4>Al llegar</h4>{c.enter.map(effect=><p key={effect}>{EFFECT_TEXT[effect]}.</p>)}</section>}
    {c.traits.length>0&&<section><h4>Mientras esté en juego</h4>{c.traits.map(trait=><p key={trait}>{TRAIT_TEXT[trait]}</p>)}</section>}
    {c.leave.length>0&&<section><h4>Al derrotarlo</h4>{c.leave.map(effect=><p key={effect}>{EFFECT_TEXT[effect]}.</p>)}</section>}
    {c.boss&&<p>El grupo recupera 1 de salud y un Elder Blessing después de resolver las maldiciones.</p>}
    {g&&c.traits.includes('haunt')&&<p className="tooltip-status">{g.haunt===1?'Token en la pista: el próximo avance encanta una localización.':'Token sobre la carta: el próximo avance lo lleva a la pista.'}</p>}
    {g?.captured&&<p className="tooltip-status">Tiene un dado retenido.</p>}
    {g&&game.weak===g.uid&&<p className="tooltip-status">Wither: resistencia reducida en 1.</p>}
    <small>{c.source}</small>
  </div></div>;
}

export function LocationDetails({id,haunted=false}) {
  const loc=LOCATION[id];
  return <div className="location-inspection"><img src={loc.image} alt={loc.name}/><div className="tooltip-copy"><h3>{loc.name}</h3><p>{loc.text}</p>{haunted&&<p className="tooltip-warning">Localización encantada: no puede prestar ayuda.</p>}</div></div>;
}
