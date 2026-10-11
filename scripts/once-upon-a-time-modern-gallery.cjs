'use strict';
// Visual QA of the public authored deck only; never a private room or player hand.
// The CLI mechanically lays out existing paintings with readable title labels.
// It does not generate or creatively edit images and never rewrites source art.
const fs=require('node:fs'),path=require('node:path');
const M=require('../once-upon-a-time-modern-future-deck.js');
const D=require('../once-upon-a-time-deck.js');
const repo=path.resolve(__dirname,'..');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups=()=>[...D.categories.map(category=>({id:category.id,label:category.label,
  cards:M.storyCards.filter(card=>card.category===category.id),color:category.color})),
  {id:'ending-01',label:'Ending · 1–9',cards:M.endingCards.slice(0,9),color:'#d4af37'},
  {id:'ending-02',label:'Ending · 10–18',cards:M.endingCards.slice(9),color:'#d4af37'}];
function galleryHTML(){
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Modern & Future · public card art QA</title><style>body{margin:0;padding:24px;background:#0b1425;color:#eef3fa;font:16px system-ui}h1{font-family:Georgia,serif;color:#f5dfab}h2{margin:36px 0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}.card{border:1px solid #405674;border-radius:12px;overflow:hidden;background:#18253b}.card img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.label{padding:12px;line-height:1.5}.label small{display:block;color:#9fb3ce;margin-top:6px}p{color:#9fb3ce}</style><h1>Modern & Future · Artwork review</h1><p>LOCAL QA — original public card pool, no room connection or private hands. Picture meaning still requires human review.</p>'+groups().map(group=>'<h2>'+esc(group.label)+'</h2><div class="grid">'+group.cards.map(card=>'<article class="card"><img src="'+esc(card.imagePath)+'" alt="'+esc(card.title||card.text)+'"><div class="label">'+esc(card.title||card.text)+'<small>'+esc(card.isInterrupt?'Interrupt · '+card.category:card.category||'Ending')+'</small></div></article>').join('')+'</div>').join('')+'</html>';
}
function wrap(text,max){
  const lines=[];let line='';
  for(const word of text.split(/\s+/)){
    if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);return lines;
}
async function renderGalleries(output,{skipMissing=false}={}){
  const sharp=require(process.env.ONCE_SHARP_PATH||'sharp');
  const dir=path.resolve(output);fs.mkdirSync(dir,{recursive:true});
  const results=[];
  for(const group of groups()){
    const cols=group.id.startsWith('ending')?3:4,tileWidth=320,imageHeight=480;
    const labelHeight=group.id.startsWith('ending')?104:70,gap=18,margin=24,header=88;
    const tileHeight=imageHeight+labelHeight,rows=Math.ceil(group.cards.length/cols);
    const width=margin*2+cols*tileWidth+(cols-1)*gap,height=header+rows*tileHeight+(rows-1)*gap+margin;
    const layers=[],missing=[];
    const svg=(w,h,contents)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'">'+contents+'</svg>');
    layers.push({input:svg(width,header,'<text x="24" y="34" fill="#f5dfab" font-family="sans-serif" font-size="26" font-weight="bold">Modern &amp; Future · '+esc(group.label)+'</text><text x="24" y="63" fill="#9fb3ce" font-family="sans-serif" font-size="15">PUBLIC ART QA · '+group.cards.length+' individually generated original cards · not a player hand</text>'),left:0,top:0});
    for(const [index,card] of group.cards.entries()){
      const left=margin+(index%cols)*(tileWidth+gap),top=header+Math.floor(index/cols)*(tileHeight+gap),file=path.join(repo,card.imagePath);
      if(!fs.existsSync(file)){
        if(!skipMissing)throw new Error('Missing required artwork: '+card.imagePath);
        missing.push(card.id);
        layers.push({input:svg(tileWidth,imageHeight,'<rect width="100%" height="100%" fill="#283347"/><text x="24" y="240" fill="#bdc9dc" font-family="sans-serif" font-size="20">NOT GENERATED YET</text>'),left,top});
      }else layers.push({input:await sharp(file).resize(tileWidth,imageHeight,{fit:'contain',background:'#0b1425'}).png().toBuffer(),left,top});
      const label=card.title||card.text,lines=wrap(label,group.id.startsWith('ending')?34:25);
      const content='<rect width="100%" height="100%" fill="#18253b"/><rect width="100%" height="3" fill="'+group.color+'"/>'+lines.map((line,i)=>'<text x="12" y="'+(28+i*23)+'" fill="#eef3fa" font-family="sans-serif" font-size="18"'+(card.title?' font-weight="bold"':'')+'>'+esc(line)+'</text>').join('')+'<text x="12" y="'+(labelHeight-10)+'" fill="#9fb3ce" font-family="sans-serif" font-size="12">'+esc(card.isInterrupt?'Interrupt · '+card.category:card.category||'Ending')+'</text>';
      layers.push({input:svg(tileWidth,labelHeight,content),left,top:top+imageHeight});
    }
    const file=path.join(dir,'once-modern-'+group.id+'.png');
    await sharp({create:{width,height,channels:3,background:'#0b1425'}}).composite(layers).png().toFile(file);
    results.push({category:group.id,file,cards:group.cards.length,missing});
  }
  return {complete:results.every(result=>!result.missing.length),syntheticPrivateData:false,results};
}
module.exports=galleryHTML;
module.exports.renderGalleries=renderGalleries;
if(require.main===module){
  const args=process.argv.slice(2),output=args.find(arg=>!arg.startsWith('--'));
  if(!output){console.error('Usage: node scripts/once-upon-a-time-modern-gallery.cjs <output-directory> [--skip-missing]');process.exitCode=1;}
  else renderGalleries(output,{skipMissing:args.includes('--skip-missing')}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
}
