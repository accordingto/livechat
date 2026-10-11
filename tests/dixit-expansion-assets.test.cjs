'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),deck=require('../dixit-deck.js');
const original=JSON.parse(fs.readFileSync(path.join(root,'assets/dixit-v2/manifest.json'),'utf8'));
const expansion=JSON.parse(fs.readFileSync(path.join(root,'assets/dixit-expansion-1/manifest.json'),'utf8'));
const prompts=JSON.parse(fs.readFileSync(path.join(root,'assets/dixit-expansion-1/art-prompts.json'),'utf8'));
test('published126-card manifest retains every original base picture and all84 legacy atlas references',()=>{
 assert.equal(deck.version,3);assert.equal(deck.cards.length,126);assert.equal(deck.baseCardCount,84);assert.equal(deck.expansionCardCount,42);
 assert.deepEqual(deck.cards.slice(0,84),original.cards.map(({id,image,description})=>({id,image,description})));
 assert.equal(deck.legacyCards.length,84);assert.ok(deck.legacyCards.every(c=>/^assets\/dixit\/atlas-\d+\.webp$/.test(c.image)));
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,126);
 for(const c of [...deck.cards,...deck.legacyCards])assert.ok(fs.existsSync(path.join(root,c.image)),c.id);
});
test('all42 independent full-sizeWebP files match manifest hashes and include everyapprovedpreview',()=>{
 const ids=Array.from({length:42},(_,i)=>'d'+String(i+85).padStart(3,'0'));
 assert.equal(expansion.cardCount,42);assert.equal(expansion.totalCardCount,126);assert.deepEqual(expansion.cards.map(c=>c.id),ids);
 assert.deepEqual(expansion.cards.map(({id,image,description})=>({id,image,description})),deck.cards.slice(84));
 const hashes=new Set();
 for(const card of expansion.cards){
  const bytes=fs.readFileSync(path.join(root,card.image));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(card.width,768);assert.equal(card.height,1024);assert.equal(bytes.length,card.bytes);assert.ok(bytes.length<512000,card.id);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,card.sha256);hashes.add(hash);
 }
 assert.equal(hashes.size,42,'eachcardusesitsownindependentartwork');
 assert.deepEqual(prompts.cards.map(c=>c.id),ids);assert.ok(prompts.cards.every(c=>typeof c.prompt==='string'&&c.prompt.length>80));
 assert.ok(prompts.cards.find(c=>c.id==='d097').repairPrompt);assert.ok(prompts.cards.find(c=>c.id==='d104').repairPrompt);
});
test('actualbrowserpicturelookupresolveseverynewassetwhilelegacycardartremainsunchanged',()=>{
 const context={DIXIT_DECK:deck};vm.runInNewContext(fs.readFileSync(path.join(root,'dixit-ui.js'),'utf8'),context);
 for(const card of expansion.cards){const picture=context.DIXIT_UI.picture(card.id,2);assert.equal(picture.src,card.image);assert.equal(picture.alt,card.description);assert.equal(picture.atlas,false);}
 assert.equal(context.DIXIT_UI.picture('d001',1).src,deck.legacyCards[0].image);
 assert.equal(context.DIXIT_UI.picture('d084',2).src,deck.cards[83].image);
});
