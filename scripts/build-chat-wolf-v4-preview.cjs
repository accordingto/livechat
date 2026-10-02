'use strict';
// Explicit public-asset allow-list. Never copy outputs, credentials, canonical
// rooms, node_modules, source maps, developer tools, or test-session links.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'chat-wolf-v4-preview');
const files=['chat-wolf.html','chat-wolf.css','chat-wolf-copy.js','firebase-config.js',
  'chat-wolf-content.js','chat-wolf-v3-rules.js','chat-wolf-v3-content.js',
  'chat-wolf-v4-wolf-tasks.js','chat-wolf-v4-wolf-imagine.js','chat-wolf-v4-wolf-life.js',
  'chat-wolf-v4-expansion-a.js','chat-wolf-v4-expansion-b.js','chat-wolf-v4-expansion-c.js',
  'chat-wolf-v4-village.js','chat-wolf-v6-village.js','chat-wolf-v4-taxonomy.js',
  'chat-wolf-v5-readable-a.js','chat-wolf-v5-readable-b.js','chat-wolf-v5-readable-c.js','chat-wolf-v5-readable-core.js',
  'chat-wolf-v6-directions.js','chat-wolf-v6-soft-tells.js','chat-wolf-v4-content.js',
  'chat-wolf-v3-engine.js','chat-wolf-engine.js','chat-wolf-cards.js','chat-wolf-history.js',
  'chat-wolf-sync.js','chat-wolf-v3-ui.js','chat-wolf.js','chat-wolf-preview-config.js','apple-touch-icon.png'];
for(const file of files)if(!fs.existsSync(path.join(root,file)))throw new Error('Missing public asset: '+file);
fs.mkdirSync(destination,{recursive:true});
const manifest=[];
for(const file of files){
  let data=fs.readFileSync(path.join(root,file));
  if(/\.(js|html|css)$/.test(file))data=Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n'));
  if(file==='chat-wolf.html'){
    data=Buffer.from(data.toString('utf8').replace('href="index.html?step=2"','href="../index.html?step=2"')
      .replace('<title>Chat Wolf | ICEBREAKING HUB</title>','<title>Chat Wolf — Development Preview | ICEBREAKING HUB</title>')
      .replace('  <script src="chat-wolf-copy.js','  <script src="chat-wolf-preview-config.js"></script>\n  <script src="chat-wolf-copy.js'));
  }
  fs.writeFileSync(path.join(destination,file),data);
  manifest.push({file,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
fs.writeFileSync(path.join(destination,'asset-manifest.json'),JSON.stringify({stage:'development',files:manifest},null,2)+'\n');
console.log('Built isolated development preview with '+files.length+' public assets. Original root entry is unchanged by this build.');
