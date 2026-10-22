'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const D=require('../once-upon-a-time-deck.js'),M=require('../once-upon-a-time-modern-future-deck.js');
const repo=path.resolve(__dirname,'..'),assetRoot='assets/once-upon-a-time/modern-future/';
const categories=['character','thing','place','aspect','event'];
const all=[...M.storyCards,...M.endingCards];
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(path.join(repo,assetRoot,file),'utf8'));
const slugOf=card=>card.id.replace('once-mf-'+(card.category||'ending')+'-','');

test('Modern & Future is a separate 60 Story / 18 Ending world with 12 cards and three Interrupts per category',()=>{
  assert.equal(M.id,'modern-future');assert.equal(M.title,'Modern & Future');
  assert.equal(M.storyCards.length,60);assert.equal(M.endingCards.length,18);
  for(const category of categories){
    const cards=M.storyCards.filter(card=>card.category===category);
    assert.equal(cards.length,12,category);assert.equal(cards.filter(card=>card.isInterrupt).length,3,category);
  }
  assert.equal(M.storyCards.filter(card=>card.isInterrupt).length,15);
  const world=D.getWorld('modern-future');assert.equal(world,M);
  assert.equal(D.getWorld('classic').storyCards,D.storyCards);
  assert.equal(D.getWorld('classic').endingCards,D.endingCards);
  assert.ok(D.storyCards.every(card=>!card.id.startsWith('once-mf-')),'Classic is not silently mixed with expansion cards');
});

test('all 180 released Classic records retain their exact words, IDs, categories, legacy Interrupt flags and art paths',()=>{
  assert.equal(D.storyCards.length,129);assert.equal(D.endingCards.length,51);
  const rows=[...D.storyCards,...D.endingCards].map(card=>[card.id,card.title||card.text,card.category||'ending',
    D.getWorld('classic').legacyInterruptIds.includes(card.id),card.artKey,card.imagePath,card.thumbnailPath]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.equal(digest(JSON.stringify(rows)),'3a8a6846bcadb359037ef8e7b452be0f42f4b0390928a60a01be655f19e8b538');
});

test('worlds have distinct stable maps and art even where familiar words intentionally overlap',()=>{
  const combined=[...D.storyCards,...D.endingCards,...all];
  assert.equal(combined.length,258);
  for(const field of ['id','artKey','imagePath','thumbnailPath'])assert.equal(new Set(combined.map(card=>card[field])).size,258,field);
  assert.equal(Object.keys(D.storyById).length,339);assert.equal(Object.keys(D.endingById).length,89);
  for(const card of all){
    const category=card.category||'ending',slug=slugOf(card);
    assert.equal(card.world,'modern-future');
    assert.match(card.id,/^once-mf-(?:character|thing|place|aspect|event|ending)-[a-z]+(?:-[a-z]+)*$/);
    assert.equal(card.artKey,'modern-future.'+category+'.'+slug);
    assert.equal(card.imagePath,assetRoot+category+'/'+slug+'-v1.webp');
    assert.equal(card.thumbnailPath,assetRoot+category+'/'+slug+'-v1-thumb.webp');
    assert.equal((card.category?D.storyById:D.endingById)[card.id],card);
    assert.ok(Object.isFrozen(card));assert.ok(card.artBrief.length>=30,card.id+' needs a literal image brief');
  }
  const shared=M.storyCards.filter(card=>D.storyCards.some(classic=>classic.title===card.title));
  assert.ok(shared.length>=10,'common words may be reused across worlds, not renamed for novelty');
  for(const card of shared){
    for(const classic of D.storyCards.filter(candidate=>candidate.title===card.title)){
      assert.notEqual(card.id,classic.id);assert.notEqual(card.imagePath,classic.imagePath);
    }
  }
  for(const value of [M,M.storyCards,M.endingCards,D.worlds,D.storyById,D.endingById])assert.ok(Object.isFrozen(value));
  assert.equal(D.getWorld('unknown-world'),null);
});

test('Modern & Future uses short English Story hooks and complete, readable original Endings',()=>{
  for(const card of M.storyCards){
    assert.match(card.title,/^[\p{L}]+(?: [\p{L}]+){0,2}$/u,card.id);
    assert.ok(card.title.length<=32);assert.equal(typeof card.isInterrupt,'boolean');
    assert.doesNotMatch(card.title,/^(?:A|An|The)\b|\b(?:who|whose|wearing)\b/i);
  }
  for(const card of M.endingCards){
    assert.match(card.text,/^[A-Z][A-Za-z ,']+\.$/);assert.ok(card.text.length<=115);
    assert.ok(card.text.split(/\s+/).length<=18,card.id);
    assert.equal(Object.hasOwn(card,'isInterrupt'),false);
  }
  assert.equal(new Set(M.storyCards.map(card=>card.title.toLowerCase())).size,60);
  assert.equal(new Set(M.endingCards.map(card=>card.text.toLowerCase())).size,18);
  for(const title of ['Doctor','Robot','Phone','Spaceship','Apartment','Spaceport','Happy','Broken','Rescue','Repair']){
    assert.ok(M.storyCards.some(card=>card.title===title),title);
  }
});

test('new browser module loads before base in both player and host pages, producing the same separate worlds',()=>{
  const context={};vm.createContext(context);
  for(const file of ['once-upon-a-time-modern-future-deck.js','once-upon-a-time-halloween-deck.js','once-upon-a-time-deck.js']){
    vm.runInContext(fs.readFileSync(path.join(repo,file),'utf8'),context,{filename:file});
  }
  assert.equal(JSON.stringify(context.ONCE_MODERN_FUTURE_DECK),JSON.stringify(M));
  assert.equal(JSON.stringify(context.ONCE_DECK.worlds),JSON.stringify(D.worlds));
  assert.equal(context.ONCE_DECK.storyById[M.storyCards[0].id].title,M.storyCards[0].title);
  assert.equal(context.ONCE_DECK.endingById[M.endingCards[0].id].text,M.endingCards[0].text);
  for(const file of ['once-upon-a-time.html','play.html']){
    const html=fs.readFileSync(path.join(repo,file),'utf8');
    const scripts=Array.from(html.matchAll(/<script\s+src="([^"?]+)(?:\?[^" ]+)?"/g),match=>match[1]);
    const expansion=scripts.indexOf('once-upon-a-time-modern-future-deck.js'),base=scripts.indexOf('once-upon-a-time-deck.js');
    assert.ok(expansion>=0&&base>expansion,file+' must register expansion before base maps');
  }
});

test('an old base-only browser still has the complete Classic world without requiring the new module',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(path.join(repo,'once-upon-a-time-deck.js'),'utf8'),context);
  const classic=context.ONCE_DECK;
  assert.equal(classic.storyCards.length,129);assert.equal(classic.endingCards.length,51);
  assert.equal(classic.worlds.length,1);assert.equal(classic.getWorld('classic').id,'classic');
  assert.equal(classic.getWorld('modern-future'),null);assert.equal(Object.keys(classic.storyById).length,129);
  assert.equal(JSON.stringify(classic.storyCards),JSON.stringify(D.storyCards));
});

test('modern artwork manifest and prompt provenance independently account for all 78 original scenes',()=>{
  const manifest=json('art-manifest-v1.json'),provenance=json('art-prompts-v1.json');
  assert.equal(manifest.version,1);assert.equal(manifest.world,'modern-future');
  assert.equal(manifest.uniqueIllustrationCount,78);assert.equal(manifest.mainWidth,768);assert.equal(manifest.thumbnailWidth,384);
  assert.deepEqual(Object.keys(manifest.cards).sort(),all.map(card=>card.id).sort());
  assert.equal(provenance.records.length,78);
  const byAsset=new Map(provenance.records.map(record=>[record.imagePath,record]));
  assert.equal(byAsset.size,78);assert.equal(new Set(provenance.records.map(record=>record.generatedPath)).size,78);
  assert.equal(new Set(provenance.records.map(record=>record.originalPath)).size,78);
  for(const card of all){
    const record=manifest.cards[card.id],prompt=byAsset.get(card.imagePath),category=card.category||'ending';
    assert.equal(record.artKey,card.artKey);assert.equal(record.imagePath,card.imagePath);
    assert.equal(record.thumbnailPath,card.thumbnailPath);assert.equal(record.status,'semantic-illustration');
    assert.equal(record.semanticDescription,card.artBrief);
    assert.ok(prompt,card.id+' has individual provenance');assert.equal(prompt.category,category);
    assert.equal(prompt.slug,slugOf(card));assert.equal(prompt.label,card.title||card.text);assert.equal(prompt.scene,card.artBrief);
    assert.ok(typeof prompt.prompt==='string'&&prompt.prompt.includes(prompt.scene),card.id+' prompt includes its actual scene');
    assert.ok(typeof prompt.mode==='string'&&prompt.mode.length>0);
    assert.match(prompt.generatedPath,/\.png$/i);assert.match(prompt.originalPath.replace(/\\/g,'/'),new RegExp('/'+slugOf(card)+'-v1\\.png$'));
    assert.equal(prompt.thumbnailPath,card.thumbnailPath);
  }
});

function webpSize(bytes,file){
  assert.equal(bytes.subarray(0,4).toString(),'RIFF',file);assert.equal(bytes.subarray(8,12).toString(),'WEBP',file);
  const type=bytes.subarray(12,16).toString();
  if(type==='VP8 '){
    assert.equal(bytes.subarray(23,26).toString('hex'),'9d012a',file+' key-frame signature');
    return [bytes.readUInt16LE(26)&0x3fff,bytes.readUInt16LE(28)&0x3fff];
  }
  if(type==='VP8X')return [1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3)];
  assert.fail(file+' requires an ordinary optimized WebP image, found '+type);
}

test('every modern main and thumbnail WebP is unique, 2:3, optimized and not reused from Classic',()=>{
  const main=new Set(),thumb=new Set();let total=0;
  const classic=new Set([...D.storyCards,...D.endingCards].map(card=>digest(fs.readFileSync(path.join(repo,card.imagePath)))));
  for(const card of all){
    for(const [file,width,hashes] of [[card.imagePath,768,main],[card.thumbnailPath,384,thumb]]){
      const bytes=fs.readFileSync(path.join(repo,file));
      assert.deepEqual(webpSize(bytes,file),[width,width*1.5],file);
      const hash=digest(bytes);assert.equal(classic.has(hash),false,file+' cannot reuse a Classic painting');
      hashes.add(hash);total+=bytes.length;
    }
  }
  assert.equal(main.size,78,'each card has its own painting, not category placeholders');
  assert.equal(thumb.size,78);assert.ok(total<40*1024*1024,'new card WebPs should stay below40MiB');
  const mainPaths=new Set(all.map(card=>card.imagePath));
  assert.equal(mainPaths.size,78);assert.equal(new Set(all.map(card=>card.thumbnailPath)).size,78);
});
