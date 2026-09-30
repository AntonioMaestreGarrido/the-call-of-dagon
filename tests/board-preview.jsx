import React from 'react';
import {createRoot} from 'react-dom/client';
import {Board} from '../src/Board.jsx';
import {createGame} from '../src/engine.js';
import '../src/style.css';
import '../src/board.css';

const game=createGame({seed:'visual-haunters'});
game.pending=null;
const examples=[
  [0,'m1-1',0],[1,'m1-2',1],
  [3,'m3-3',0],[4,'m3-4',1],
  [6,'m1-5',0],[7,'m1-6',1],
  [9,'m1-9',0],[10,'m3-1',1],
];
for(const [slot,card,haunt] of examples)game.slots[slot]={card,uid:slot+1,haunt,sign:false,captured:false};
createRoot(document.getElementById('root')).render(<div className="app"><main className="table-area" style={{flex:1,width:'100%'}}><div className="table-top"><h2>Pistas de encantamiento</h2></div><Board game={game} choose={()=>{}}/><div className="table-bottom">Tokens en carta y pista de cada lado</div></main></div>);
