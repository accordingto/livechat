/* Original Hub cards keep their existing seat. Only that seat's credential is
 * sent to its original player node; private credentials stay in URL fragments. */
(function(root){
  'use strict';
  const validRoom = value => /^[A-Z0-9]{4,12}$/.test(value || '');
  function normalize(value){
    if(!value || !validRoom(value.code))return null;
    const count=Number(value.playerCount),tokens=Array.isArray(value.tokens)?value.tokens.slice(0,count):null;
    if(!Number.isInteger(count)||count<3||count>9||tokens?.length!==count||tokens.some(t=>!/^[a-f0-9]{20}$/.test(t))||new Set(tokens).size!==count)return null;
    return {code:value.code,playerCount:count,tokens,names:tokens.map((_,i)=>String(value.names?.[i]||'').trim().slice(0,40)||`Player ${i+1}`)};
  }
  function readSetup(storage){
    try{const code=storage.getItem('room-last-session'),raw=JSON.parse(storage.getItem('room-session-'+code));return normalize({...Array.isArray(raw)?{tokens:raw,playerCount:raw.length}:raw,code});}catch(_){return null;}
  }
  function validCard(value){return value?.version===2&&validRoom(value.room)&&/^[a-f0-9]{64}$/.test(value.token||'')&&/^[a-f0-9]{40}$/.test(value.identityId||'')&&/^[a-f0-9]{64}$/.test(value.historyToken||'');}
  function frameURL(value,base){
    if(!validCard(value)&&!(value?.version===1&&validRoom(value.room)))return null;
    const url=new URL('bluff-king-live-chat.html',base);url.searchParams.set('room',value.room);url.searchParams.set('card','1');
    if(value.version===2)url.hash=new URLSearchParams({session:value.token,identity:value.identityId,history:value.historyToken}).toString();
    return url.href;
  }
  function readCard(hash,room){
    const fields=new URLSearchParams(String(hash||'').replace(/^#/,''));
    const value={version:2,room,token:fields.get('session'),identityId:fields.get('identity'),historyToken:fields.get('history')};
    return validCard(value)?value:null;
  }
  const api={normalize,readSetup,frameURL,readCard};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.BLUFF_CARDS=api;
})(typeof globalThis==='object'?globalThis:this);
