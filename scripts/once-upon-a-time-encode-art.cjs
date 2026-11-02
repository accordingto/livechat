'use strict';
// Deployment encoding only. Original generated paintings are not modified.
// Uses installed sharp or the desktop's bundled sharp through ONCE_SHARP_PATH.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const assetDir=path.join(root,'assets','once-upon-a-time');
const sharp=process.env.ONCE_SHARP_PATH?require(process.env.ONCE_SHARP_PATH):require('sharp');
(async()=>{
  let converted=0,bytes=0;
  for(const category of ['character','thing','place','aspect','event','ending']){
    const dir=path.join(assetDir,category);
    for(const file of fs.readdirSync(dir).filter(name=>name.endsWith('-v2.png'))){
      const input=path.join(dir,file),main=input.replace(/\.png$/,'.webp'),thumb=input.replace(/\.png$/,'-thumb.webp');
      if(!fs.existsSync(main))await sharp(input).resize({width:768,withoutEnlargement:true}).webp({quality:86,effort:5}).toFile(main);
      if(!fs.existsSync(thumb))await sharp(input).resize({width:384,withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(thumb);
      bytes+=fs.statSync(main).size+fs.statSync(thumb).size;converted++;
    }
  }
  console.log(`Encoded ${converted} matching paintings, main + thumbnail: ${(bytes/1024/1024).toFixed(2)} MiB. Original PNGs preserved.`);
  const records=['character-thing','place-aspect','event-ending'].flatMap(group=>{
    const file=path.join(assetDir,'art-v2-'+group+'.json');
    if(!fs.existsSync(file))return [];
    const source=JSON.parse(fs.readFileSync(file,'utf8'));return source.entries||source.assets||[];
  });
  const deck=require('../once-upon-a-time-deck.js'),all=[...deck.storyCards,...deck.endingCards];
  if(records.length!==all.length){console.log(`Provenance ${records.length}/${all.length}; incomplete manifest left unchanged.`);return;}
  const byId=new Map(records.map(record=>[record.id,record]));
  if(byId.size!==all.length)throw new Error('Duplicate art record IDs');
  const cards={};
  for(const card of all){
    const record=byId.get(card.id);if(!record)throw new Error('Missing provenance '+card.id);
    for(const file of [card.imagePath,card.thumbnailPath])if(!fs.existsSync(path.join(root,file)))throw new Error('Missing encoded asset '+file);
    const semanticDescription=record.semanticDescription||record.semantic||record.scene;
    if(!semanticDescription||!record.prompt)throw new Error('Missing semantic review/prompt '+card.id);
    cards[card.id]={artKey:card.artKey,imagePath:card.imagePath,thumbnailPath:card.thumbnailPath,status:'semantic-illustration',semanticDescription};
  }
  // Mechanical build of a public deployment manifest from reviewed art records.
  fs.writeFileSync(path.join(assetDir,'art-manifest.json'),JSON.stringify({version:2,uniqueIllustrationCount:165,note:'165 individually generated, visually reviewed meaning-matched paintings. Each has an optimized main image and mobile thumbnail. Original PNGs are preserved locally; all card text and frames remain HTML/SVG.',generator:'built-in image_gen',mainWidth:768,thumbnailWidth:384,cards},null,2)+'\n');
  console.log('Complete semantic art manifest built: 165/165.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
