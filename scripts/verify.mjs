import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const photos=JSON.parse(await readFile('data/seed/photos.json','utf8')).photos;
assert.equal(photos.length,40);
assert.equal(new Set(photos.map(p=>p.id)).size,photos.length);
assert.ok(photos.every(p=>p.id.startsWith('demo-')&&p.storageKey.startsWith('uploads/demo/')));
const files=await readdir('dist/assets/generated');
for(const p of ['index','works','admin']){
 const html=await readFile(`dist/${p}.html`,'utf8');
 for(const ext of ['css','js'])assert.ok(files.some(f=>f.startsWith(p+'.')&&f.endsWith('.'+ext)&&html.includes(f)));
}
execFileSync(process.execPath,['scripts/privacy-check.mjs'],{stdio:'inherit'});
console.log('Demo data and build verified');
