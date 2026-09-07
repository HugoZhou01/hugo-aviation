import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
const skip=new Set(['.git','node_modules','dist','.wrangler']);
let scanned=0;const errors=[];
const rules=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/,/AKIA[A-Z0-9]{16}/,/\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,/\/Users\/[^/]+\//,/\/media\/uploads\/\d{4}\//];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=join(dir,e.name);if(e.isDirectory()){if(e.name==='recovery')errors.push(p);else await walk(p);continue;}
 if((/^\.env|^\.dev\.vars/.test(e.name)&&!e.name.endsWith('.example'))||/\.(bundle|zip|pem|key)$/.test(e.name))errors.push(p);
 const bytes=await readFile(p);scanned++;if(bytes.includes(0))errors.push(`${p}: unexpected binary`);
 if(rules.some(r=>r.test(bytes.toString('utf8'))))errors.push(`${p}: possible sensitive content`);
}}
await walk('.');if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Privacy pattern check: ${scanned} files; no matching sensitive content`);
