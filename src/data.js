import assets from './assets.json' with { type: 'json' };

export const COLORS = ['blue', 'red', 'yellow', 'green', 'black'];
export const SIDES = ['blue', 'red', 'yellow', 'green'];
export const COLOR_NAMES = {blue:'Azul',red:'Rojo',yellow:'Amarillo',green:'Verde',black:'Negro',white:'Blanco'};
export const DIFFICULTIES = {initiation:'Iniciación',normal:'Normal',nightmare:'Pesadilla',hell:'Infierno'};
const BASE_URL = typeof import.meta.env === 'undefined' ? '/' : import.meta.env.BASE_URL;
export const assetUrl = (path,base=BASE_URL) => `${base}${path.replace(/^\//,'')}`;
export const art = (source, page, cell) => assetUrl(assets[source][page][cell - 1]);
export const MONSTER_SHEET_PAGES = Object.entries(assets['Monster Sheets.pdf']).map(([page, files]) => ({page, image:assetUrl(files[0])}));
export const MONSTER_SHEET_ART = {
  yellow:art('Monster Sheets.pdf',1,1),
  blue:art('Monster Sheets.pdf',3,1),
  red:art('Monster Sheets.pdf',5,1),
  green:art('Monster Sheets.pdf',7,1),
};
export const CARD_BACK = art('Monster Cards.pdf', 2, 1);
// Tokens.pdf page 1, row-major: the square haunters occupy its first 21 cells.
export const MONSTER_TOKEN_ART = Object.fromEntries([
  ['Restless Dead',1],['Zombie',2],['Lycanthrope',3],['Dark Young',5],
  ['Hunting Horror',6],['Byakhee Raider',7],['Emerging Deep One',9],
  ['Adult Deep One',10],['Deep Ones',11],['Ruthless Fanatic',13],
  ['Priest of Dagon',14],['Dark Cultists',15],['Brown Jenkin',17],
  ['Eldritch Abomination',18],['Thing in the Fog',19],['Ithaqua',21],
].map(([name,cell])=>[name,art('Tokens.pdf',1,cell)]));
export const INVESTIGATORS = [
  {id:'linda',name:'Dr. Linda Sharpe',color:'blue',power:'double',role:'Physician',sheet:art('Player Sheets.pdf',3,1),text:'Dos acciones del mismo tipo: dos ataques o dos usos de la localización.'},
  {id:'diana',name:'Diana Stanley',color:'blue',power:'mixed',role:'Archeologist',sheet:art('Player Sheets.pdf',4,1),text:'Un ataque y un uso de la localización, en cualquier orden.'},
  {id:'howard',name:'Howard Percy',color:'red',power:'guide',role:'Local Deputy',sheet:art('Player Sheets.pdf',3,2),text:'Antes de moverse, puede mover a otro investigador a una casilla adyacente.'},
  {id:'vincent',name:'Vincent Clarke',color:'red',power:'fly',role:'Reporter',sheet:art('Player Sheets.pdf',4,2),text:'Puede moverse a cualquier localización. Se aplica el reglamento vigente.'},
  {id:'milton',name:'Professor Milton',color:'yellow',power:'pocket',role:'Anthropologist',sheet:art('Player Sheets.pdf',1,2),text:'Antes de moverse, puede obtener un pergamino de cualquier color de la reserva.'},
  {id:'wilbur',name:'Wilbur Blake',color:'yellow',power:'weaken',role:'Arcane Scholar',sheet:art('Player Sheets.pdf',2,2),text:'Antes de moverse, puede reducir en uno la resistencia de un monstruo con Wither.'},
  {id:'jack',name:'Jack Walters',color:'green',power:'reroll',role:'Private Investigator',sheet:art('Player Sheets.pdf',1,1),text:'Puede repetir una vez los dados que elija de cada tirada, incluido el dado de terror.'},
  {id:'duncan',name:'Duncan Forbes',color:'green',power:'extra',role:'Federal Agent',sheet:art('Player Sheets.pdf',2,1),text:'Un dado adicional en ataques. Nunca tira el dado de terror.'},
];
const locations = [
  ['chapel','Old Chapel',1,'Coloca un pergamino de la reserva. Reduce en uno la resistencia de los monstruos de ese color.'],
  ['sanitarium','St. Joseph Sanitarium',2,'Devuelve un investigador caído con 2 de salud. Después tira terror.'],
  ['hotel',"Winfield's Hotel",3,'Obtén un pergamino y 1 de salud. Después llega un monstruo.'],
  ['circle','Stone Circle',4,'Recoge un Elder Sign disponible. Podrás colocarlo a partir de tu siguiente turno.'],
  ['obelisk','Black Obelisk',5,'Mueve un monstruo a un espacio libre y después mueve a otro investigador.'],
  ['witchhouse','Witchhouse',7,'Restaura una localización encantada. Después llega un monstruo.'],
  ['shop','Magic Shop',8,'Tira dos dados y recibe pergaminos de esos colores. Los blancos permiten elegir.'],
  ['library','Library of the Obscure',9,'Elimina un monstruo ordinario sin efectos ni recompensas. Pierdes 1 de salud.'],
  ['police','Police Station',10,'Devuelve a sus cartas todos los marcadores de avance de un lado del tablero.'],
];
export const LOCATIONS = locations.map(([id,name,cell,text])=>({id,name,text,image:art('Location Pads.pdf',1,cell)}));
export const LOCATION = Object.fromEntries(LOCATIONS.map(x=>[x.id,x]));

// Physical order is row-major in each supplied front sheet; duplicates are distinct cards.
const sheets = {
  1:[
    ['Dark Young','blue',1,'haunt'],['Hunting Horror','blue',2,'haunt'],['Byakhee Raider','blue',3,'haunt'],
    ['Byakhee Raider','blue',3,'haunt'],['Restless Dead','yellow',1,'haunt'],['Zombie','yellow',2,'haunt'],
    ['Lycanthrope','yellow',3,'haunt'],['Lycanthrope','yellow',3,'haunt'],['Adult Deep One','green',1,'haunt'],
  ],
  3:[
    ['Deep Ones','green',3,'haunt'],['Deep Ones','green',3,'haunt'],['Ruthless Fanatic','red',1,'haunt'],
    ['Priest of Dagon','red',2,'haunt'],['Dark Cultists','red',3,'haunt'],['Dark Cultists','red',3,'haunt'],
    ['Star-Summoned Dhole','blue',4,'','', 'scroll2'],['Bloated Tomb Herder','yellow',4,'','','scroll2'],['Leech Mother','green',4,'','','scroll2'],
  ],
  5:[
    ['Dweller in the Caverns','red',4,'','','scroll2'],['Child of the Fire Mist','yellow',1,'noDice'],['Mistress of Salem','red',1,'noDice'],
    ['Coral Infection','green',1,'noDice'],['Poisonous Fog','blue',1,'noDice'],['Coffin Breaker','yellow',1,'','draw'],
    ['Nightgaunt Sentry','blue',1,'','draw'],['Innsmouth Infiltrator','green',1,'','draw'],['Master Summoner','red',1,'','draw'],
  ],
  7:[
    ['The Alchemist','yellow',1,'lockPower','draw'],['Lurking Star Spawn','blue',1,'lockPower','draw'],['Blasphemous Hybrid','green',1,'lockPower','draw'],
    ['Blood Magician','red',1,'lockPower','draw'],['Degenerate Ghoul','yellow',2,'','','curse'],['Degenerate Ghoul','yellow',2,'','','curse'],
    ['Something in the Crate','blue',2,'','','curse'],['Something in the Crate','blue',2,'','','curse'],['Disguised Deep One','green',2,'','','curse'],
  ],
  9:[
    ['Disguised Deep One','green',2,'','','curse'],['High Priest of Dagon','red',2,'','','curse'],['High Priest of Dagon','red',2,'','','curse'],
    ['Vampire Stalker','yellow',3,'torment','','healthOrBlessing'],['Thing from Beneath','green',3,'torment','','healthOrBlessing'],['Dark Wizard','red',3,'torment','','healthOrBlessing'],
    ['Star Vampire Minion','blue',3,'torment','','healthOrBlessing'],['Brown Jenkin','black',1,'haunt','fast','scroll1'],['Keziah Mason','black',1,'noDice,capture','','scroll1'],
  ],
  11:[
    ['Screaming Whippoorwills','black',1,'capture','draw','scroll1'],['Screaming Whippoorwills','black',1,'capture','draw','scroll1'],['Eldritch Abomination','black',2,'haunt','hurt','healthOrBlessing'],
    ['Swarm of Locusts','black',2,'lockScrolls','','curse,healthOrBlessing'],['Swarm of Locusts','black',2,'lockScrolls','','curse,healthOrBlessing'],['Thing in the Fog','black',3,'haunt','fast','healthOrBlessing'],
    ['Thing in the Fog','black',3,'haunt','fast','healthOrBlessing'],['Rats in the Walls','black',4,'','haunt','healthOrBlessing'],['Cyclopean Dhole','black',4,'torment','loseScrollAll','healthOrBlessing'],
  ],
};
export const MONSTERS = Object.entries(sheets).flatMap(([page,rows])=>rows.map(([name,color,resistance,traits='',enter='',leave=''],i)=>({
  id:`m${page}-${i+1}`,name,color,resistance,traits:traits.split(',').filter(Boolean),enter:enter.split(',').filter(Boolean),leave:leave.split(',').filter(Boolean),image:art('Monster Cards.pdf',page,i+1),source:`Monster Cards.pdf, p. ${page}, ${i+1}`,
})));
MONSTERS.push({id:'emerging-deep-one',name:'Emerging Deep One',color:'green',resistance:2,traits:['haunt'],enter:[],leave:[],image:art('Monster Cards.pdf',1,9),review:true,source:'Fungus Thing; imagen provisional aprobada. Token Emerging Deep One en Tokens.pdf.'});
const bosses = [
  ['ithaqua','Ithaqua','yellow',4,'haunt','','',13,1,'Vampire Lord'],
  ['colour','The Colour out of Space','blue',3,'lockScrolls','','',13,2,'Dark Mistress'],
  ['hydra','Hydra','green',3,'capture','','',13,3,'Creeping Horror'],
  ['terror','The Terror of the Tides','black',8,'multi2','','curse',13,4,'Hope Killer'],
  ['guardian','Guardian of the Moon-Lens','black',3,'opposite','draw','',13,5,'Howling Nightmare'],
  ['shoggoth','Bestial Shoggoth','black',3,'needsSign','curse','',13,6,'Uncatchable'],
  ['dunwich','The Dunwich Horror','black',5,'torment','','curse',13,7,'Death Army'],
  ['oldman','The Terrible Old Man','black',4,'lockAll','','',13,8,'Forgotten Ones'],
  ['grandmaster','Grandmaster of the Esoteric Order of Dagon','red',4,'drain','loseScrollAll','',13,9,'Bonecracker'],
  ['unnamable','The Unnamable','black',5,'multi1,noWhite','clearChapel','',15,1,'Nameless'],
];
export const BOSSES = bosses.map(([id,name,color,resistance,traits,enter,leave,page,cell,original])=>({id,name,color,resistance,traits:traits.split(',').filter(Boolean),enter:enter.split(',').filter(Boolean),leave:leave.split(',').filter(Boolean),image:art('Monster Cards.pdf',page,cell),boss:true,original,source:`Monster Cards.pdf, p. ${page}, ${cell}; reglamento pp. 10-11`}));
export const CARDS = Object.fromEntries([...MONSTERS,...BOSSES].map(x=>[x.id,x]));
export const TRAIT_TEXT = {haunt:'Avanza cada turno de su lado; encanta una localización cada dos avances.',torment:'Tira terror cada turno de su lado.',noDice:'Inmune a dados de ataque.',lockPower:'Anula el poder del investigador de su lado.',capture:'Retiene un dado de ataque mientras permanezca en juego.',lockScrolls:'Nadie puede gastar pergaminos en ataques.',lockAll:'Anula los cuatro poderes.',opposite:'Solo se puede derrotar si el espacio opuesto está libre.',needsSign:'Necesita haber entrado en un espacio con Elder Sign para ser vulnerable.',drain:'Todos pierden un pergamino al activarse.',multi1:'Requiere un resultado de cada uno de los cinco colores.',multi2:'Requiere dos resultados de cada color excepto negro.',noWhite:'Los dados blancos dejan de ser comodines.'};
export const EFFECT_TEXT = {draw:'Llega otro monstruo',fast:'Avance inicial de encantamiento',hurt:'Pierdes 1 de salud',haunt:'Encanta la primera localización de su línea',curse:'Tira terror',scroll1:'Gana un pergamino',scroll2:'Gana dos pergaminos',healthOrBlessing:'Recupera 1 de salud o tu Elder Blessing',loseScrollAll:'Cada investigador pierde un pergamino',clearChapel:'Retira el pergamino de Old Chapel'};
