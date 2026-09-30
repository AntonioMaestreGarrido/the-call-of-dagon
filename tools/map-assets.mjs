import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'));
const maps = {};
for (const source of [...new Set(manifest.map(x => x.source))]) {
  maps[source] = {};
  for (const page of [...new Set(manifest.filter(x => x.source === source).map(x => x.page))]) {
    const positions = new Map();
    for (const item of manifest.filter(x => x.source === source && x.page === page)) {
      for (const r of item.rects) positions.set(r.map(v => Math.round(v)).join(','), {x:r[0],y:r[1],file:item.file});
    }
    maps[source][page] = [...positions.values()].sort((a,b) => Math.abs(a.y-b.y)>2 ? a.y-b.y : a.x-b.x).map(x => '/assets/'+x.file);
  }
}
mkdirSync('src', {recursive:true});
writeFileSync('src/assets.json', JSON.stringify(maps, null, 2));
copyFileSync('The Call of Dagon - EN/Gameboard front.jpg', 'public/assets/gameboard.jpg');
copyFileSync('The Call of Dagon - EN/gs-rules-us-16118426030fANr.pdf', 'public/rules.pdf');
copyFileSync('The Call of Dagon - EN/Monster Sheets.pdf', 'public/monster-sheets.pdf');
console.log('Component map, original board and current rulebook prepared.');
