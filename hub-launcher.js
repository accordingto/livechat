/* Homepage initialization for independent player-card games.
 * Only this trusted setup page holds the full roster and temporary control
 * credentials. Players keep their original Hub links and filtered cards. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HUB_LAUNCHER = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const VERSION = 'hub-launch-1';
  const specs = Object.freeze({
    letstalk: { href:'lets-talk.html', min:2, max:9, sync:'TALK_SYNC', scripts:['talk-crazy.js','talk-engine.js','talk-topics.js','talk-sync.js'] },
    onceupon: { href:'once-upon-a-time.html', min:2, max:6, sync:'ONCE_SYNC', scripts:['once-upon-a-time-deck.js','once-upon-a-time-engine.js','talk-sync.js','once-upon-a-time-sync.js'] },
    dixit: { href:'dixit.html', min:3, max:8, sync:'DIXIT_SYNC', scripts:['dixit-deck.js','dixit-engine.js','talk-sync.js','dixit-sync.js'] },
    cut: { href:'cut.html', min:2, max:9, sync:'CUT_SYNC', scripts:['cut-config.js','cut-random.js','cut-topics.js','cut-engine.js','cut-sync.js'] },
    openmic: { href:'open-mic-rescue.html', min:2, max:9, sync:'OPEN_MIC_SYNC', scripts:['open-mic-content.js','open-mic-engine.js','open-mic-sync.js'] },
    bluffking: { href:'bluff-king-live-chat.html', min:3, max:9, scripts:['bluff-king-engine.js','bluff-king-topics.js','bluff-king-cards.js','bluff-king-sync.js'] },
    chatwolf: { href:'chat-wolf.html', min:3, max:12, scripts:[
      'chat-wolf-content.js','chat-wolf-v3-rules.js','chat-wolf-v3-content.js',
      'chat-wolf-v4-wolf-tasks.js','chat-wolf-v4-wolf-imagine.js','chat-wolf-v4-wolf-life.js',
      'chat-wolf-v4-expansion-a.js','chat-wolf-v4-expansion-b.js','chat-wolf-v4-expansion-c.js',
      'chat-wolf-v4-village.js','chat-wolf-v6-village.js','chat-wolf-v4-taxonomy.js',
      'chat-wolf-v5-readable-a.js','chat-wolf-v5-readable-b.js','chat-wolf-v5-readable-c.js',
      'chat-wolf-v5-readable-core.js','chat-wolf-v6-directions.js','chat-wolf-v6-soft-tells.js',
      'chat-wolf-v4-content.js','chat-wolf-v3-engine.js','chat-wolf-engine.js',
      'chat-wolf-cards.js','chat-wolf-history.js','chat-wolf-sync.js'
    ] }
  });
  const copy = {
    seat:['Your player card','我的玩家卡'], choose:['Choose your name','選擇自己的名字'],
    help:['Choose your card, then a game. Everyone continues on their original link. Change game settings on your own card.','選擇自己的卡片再開遊戲。大家繼續使用原本連結，遊戲設定也在自己的卡片調整。'],
    starting:['Preparing everyone’s cards…','正在準備大家的卡片…'],
    opening:['Opening your player card…','正在開啟你的玩家卡片…'],
    retry:['Please try again. Your original player links are unchanged.','請重試，大家原本的玩家連結不變。'],
    legacy:['Open this game’s setup page','開啟此遊戲原設定頁'],
    select_seat:['Choose your own player card first.','請先選擇自己的玩家卡片。'],
    invalid_roster:['Finish the room setup and player names first.','請先完成房間人數與玩家名稱設定。'],
    room_changed:['The room setup changed. Choose your card and try again.','房間設定已變更，請重新選擇自己的卡片再試。'],
    executor_unavailable:['Independent play is unavailable right now. Please try again shortly.','目前暫時無法獨立開局，請稍後重試。'],
    registration_failed:['The game could not finish connecting everyone’s cards. Please retry.','尚未完成所有玩家卡片的連線，請重試。'],
    connection_failed:['Could not connect to the room. Check your connection and retry.','無法連上房間，請確認網路後重試。'],
    launch_busy:['A game is already opening. Please wait.','正在開啟遊戲，請稍候。'],
    script_failed:['The game files could not load. Refresh this page and retry.','遊戲資料載入失敗，請重新整理此頁再試。']
  };
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  const readRef = async ref => (await ref.once('value')).val();
  const stateOf = raw => raw?.stateJson ? JSON.parse(raw.stateJson) : raw?.state || null;
  const dataOf = raw => raw?.data ? JSON.parse(raw.data) : raw;
  const sleep = ms => new Promise(resolve => root.setTimeout(resolve,ms));
  const scripts = new Map();
  function loadScript(file) {
    if (scripts.has(file)) return scripts.get(file);
    const promise = new Promise((resolve,reject) => {
      const script = root.document.createElement('script');
      const timer = root.setTimeout(() => { script.remove(); reject(Object.assign(new Error('script_failed'),{code:'script_failed'})); },15000);
      script.src = file + '?v=' + VERSION;
      script.onload = () => { root.clearTimeout(timer); resolve(); };
      script.onerror = () => { root.clearTimeout(timer); script.remove(); reject(Object.assign(new Error('script_failed'),{code:'script_failed'})); };
      root.document.head.append(script);
    });
    scripts.set(file,promise); promise.catch(() => scripts.delete(file)); return promise;
  }
  function snapshotRoom(room) {
    if (!room?.enabled || !/^[A-Z0-9]{4,12}$/.test(room.code || '') || !Number.isInteger(room.count)) fail('invalid_roster');
    const refs = Array.from({length:room.count},(_,i)=>room.playerRef(i));
    const tokens = refs.map(ref=>ref?.key);
    if (tokens.some(token=>!/^[a-f0-9]{20}$/.test(token || '')) || new Set(tokens).size!==tokens.length) fail('invalid_roster');
    const names = tokens.map((_,i)=>String(room.name(i)||'').trim());
    if (names.some(name=>!name || name.length>80)) fail('invalid_roster');
    return {code:room.code,playerCount:room.count,tokens,names,refs};
  }
  function playerURL(setup,seat,base) {
    const url = new URL('play.html',base);
    url.searchParams.set('s',setup.code); url.searchParams.set('p',setup.tokens[seat-1]);
    url.searchParams.set('n',setup.names[seat-1]);
    return url.href;
  }
  function create({ room = typeof ROOM !== 'undefined' ? ROOM : root.ROOM, database = () => root.firebase.database(), executor = root.HUB_EXECUTOR,
    load = loadScript, delay = sleep, timeoutMs = 20000, navigate = url => root.location.assign(url),
    baseURL = root.location?.href, storage = root.localStorage, onProgress = () => {} } = {}) {
    let running = false;
    const assertCurrent = setup => {
      const fresh = snapshotRoom(room);
      if (fresh.code!==setup.code || fresh.playerCount!==setup.playerCount ||
        fresh.tokens.some((token,i)=>token!==setup.tokens[i]) || fresh.names.some((name,i)=>name!==setup.names[i])) fail('room_changed');
    };
    const until = async (check,code='connection_failed') => {
      const start = Date.now();
      do { if (await check()) return; await delay(50); } while (Date.now()-start<timeoutMs);
      fail(code);
    };
    function facade(setup) {
      return {code:setup.code,count:setup.playerCount,
        get answers(){return room.answers || {};}, name:i=>setup.names[i],
        playerRef:i=>setup.refs[i], getExtra:key=>{assertCurrent(setup);return room.getExtra(key);},
        setExtra:(key,value)=>{assertCurrent(setup);room.setExtra(key,value);}
      };
    }
    async function confirmMarker(reads,raw,game,sessionId,extra) {
      const ticket = raw?.executor;
      if (ticket?.v!==1 || ticket.game!==game || ticket.sessionId!==sessionId || !ticket.capsule) fail('registration_failed');
      await until(async()=>{
        const cards = await Promise.all(reads.map(read=>read()));
        return cards.every((card,i)=>card?.hubExecutor?.v===1 && card.hubExecutor.game===game &&
          card.hubExecutor.sessionId===sessionId && card.hubExecutor.capsule===ticket.capsule &&
          Number(card.hubExecutor.revision)>=Number(raw.revision || 0) && !card.error && extra(card,i));
      },'registration_failed');
    }
    async function launch(game,seat) {
      if (running) fail('launch_busy');
      const spec = specs[game]; if (!spec) fail('invalid_roster');
      const setup = snapshotRoom(room);
      if (setup.playerCount<spec.min || setup.playerCount>spec.max) {
        throw Object.assign(new Error('player_count'),{code:'player_count',min:spec.min,max:spec.max});
      }
      if (!Number.isInteger(seat) || seat<1 || seat>setup.playerCount) fail('select_seat');
      running = true; let initializer = null;
      try {
        onProgress('starting');
        if (!executor?.ready || !await executor.ready()) fail('executor_unavailable');
        assertCurrent(setup);
        for (const script of spec.scripts) await load(script);
        executor.install(); assertCurrent(setup);
        const db = database();
        if (spec.sync) {
          const Host = root[spec.sync]?.Host; if (!Host || !executor.ensureHost) fail('registration_failed');
          initializer = new Host({room:facade(setup),db,onChange:()=>{},onStatus:()=>{}});
          initializer.executorDeferred=true;
          initializer.connect();
          await until(()=>initializer.connected && (initializer.own || initializer.doc?.executor?.v===1));
          assertCurrent(setup);
          let options = {};
          if (game==='dixit') options={hostPlayerNum:seat,targetScore:30};
          else if (game==='letstalk') {
            const library = typeof TALK_LIBRARY !== 'undefined' ? TALK_LIBRARY : root.TALK_LIBRARY;
            const topic = library?.draw(); if (!topic) fail('invalid_roster');
            options={topic,mode:'think',seconds:30,showStarters:true,gameMode:'normal',crazySeconds:120};
          } else if (game==='cut') options={speed:'normal',category:'mixed'};
          else if (game==='openmic') options={singingDuration:35};
          const started = await initializer.start(options);
          const sessionId = started?.sessionId || initializer.doc?.state?.sessionId;
          if (!sessionId) fail('registration_failed');
          await executor.ensureHost(initializer,game); assertCurrent(setup);
          const raw = await readRef(initializer.ref), state=stateOf(raw);
          if (state?.sessionId!==sessionId) fail('registration_failed');
          const key=({onceupon:'once',letstalk:'talk'})[game] || game;
          await confirmMarker(setup.refs.map(ref=>()=>readRef(ref)),raw,game,sessionId,(card,i)=>
            card.game===game && card.playerNum===i+1 && card[key]?.sessionId===sessionId);
        } else if (game==='bluffking') {
          if (!root.BLUFF_SYNC?.Client || !executor.ensureBluff) fail('registration_failed');
          initializer = new root.BLUFF_SYNC.Client({databaseURL:(typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : root.FIREBASE_CONFIG).databaseURL,storage,hostPresentation:true});
          await initializer.createFromCards(setup.code,setup); assertCurrent(setup);
          await executor.ensureBluff(initializer);
          const sessions = await initializer.getCardSessions();
          assertCurrent(setup);
          if (sessions.length!==setup.playerCount || sessions.some((s,i)=>s.originalToken!==setup.tokens[i])) fail('registration_failed');
          await Promise.all(setup.refs.map((ref,i)=>ref.set({game:'bluffking',playerNum:i+1,name:setup.names[i],bluff:sessions[i].credential})));
          await initializer.refresh(); await executor.ensureBluff(initializer); assertCurrent(setup);
          const raw = (await initializer._request(initializer._roomPath('players/'+initializer.hostToken))).data;
          const data = dataOf(raw), sessionId=data?.transport?.executorSessionId;
          await confirmMarker(sessions.map(s=>async()=>(await initializer._request(initializer._roomPath('players/'+s.credential.token))).data),
            raw,game,sessionId,(card,i)=>card.sessionBinding?.room===setup.code &&
              card.sessionBinding?.identityId===sessions[i].credential.identityId && typeof card.viewJson==='string');
          const originals=await Promise.all(setup.refs.map(readRef));
          if (originals.some((card,i)=>card.game!=='bluffking' || card.bluff?.token!==sessions[i].credential.token ||
            card.bluff?.room!==setup.code)) fail('registration_failed');
        } else {
          if (!root.CHAT_WOLF_SYNC?.Client || !executor.registerWolf) fail('registration_failed');
          initializer = new root.CHAT_WOLF_SYNC.Client({databaseURL:(typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : root.FIREBASE_CONFIG).databaseURL,storage,
            allowHostRecovery:true,hostPresentation:false});
          const defaults = root.CHAT_WOLF_V3_RULES.defaults;
          const wolfCount = setup.playerCount>=5 ? 2 : 1;
          await initializer.create({name:setup.names[seat-1],legacy:setup,hostSeat:seat-1,
            settings:{...defaults,playerCount:setup.playerCount,wolfCount,jesterEnabled:setup.playerCount>=wolfCount+3}});
          assertCurrent(setup);
          let raw = (await initializer.store.get(initializer.path(initializer.host.code,initializer.host.control))).value;
          initializer.executorRetryAt=0;
          if (!await executor.registerWolf(initializer,raw)) fail('registration_failed');
          await initializer.connectCards(); assertCurrent(setup);
          raw = (await initializer.store.get(initializer.path(initializer.host.code,initializer.host.control))).value;
          if (!await executor.registerWolf(initializer,raw)) fail('registration_failed');
          raw = (await initializer.store.get(initializer.path(initializer.host.code,initializer.host.control))).value;
          const data=dataOf(raw), links=[...data.cardLinks].sort((a,b)=>a.playerNum-b.playerNum), code=initializer.host.code;
          if (links.length!==setup.playerCount || links.some((s,i)=>s.sourceToken!==setup.tokens[i])) fail('registration_failed');
          await confirmMarker(links.map(s=>async()=>(await initializer.store.get(initializer.path(code,s.token))).value),
            raw,game,data.executorSessionId,(card)=>typeof card.view==='string');
          const originals=await Promise.all(setup.refs.map(readRef));
          if (originals.some((card,i)=>card.game!=='chatwolf' || card.chatWolf?.room!==code ||
            card.chatWolf?.token!==links[i].token)) fail('registration_failed');
        }
        assertCurrent(setup);
        const url=playerURL(setup,seat,baseURL);
        initializer.close(); initializer=null;
        onProgress('opening'); navigate(url);
        return {game,url};
      } finally {
        initializer?.close(); running=false;
      }
    }
    return {launch,snapshot:()=>snapshotRoom(room),get busy(){return running;}};
  }
  let installed=null;
  function text(key) { return copy[key]?.[root.I18N?.lang==='zh'?1:0] || copy.retry[root.I18N?.lang==='zh'?1:0]; }
  function install({room=typeof ROOM !== 'undefined' ? ROOM : root.ROOM,...options}={}) {
    if (installed) return installed;
    const doc=root.document, select=doc.getElementById('hub-player-seat'), status=doc.getElementById('hub-launch-status'),
      error=doc.getElementById('hub-launch-error'), legacy=doc.getElementById('hub-launch-legacy');
    if (!select || !status || !error) return null;
    const launcher=create({room,...options,onProgress:key=>{status.hidden=false;status.textContent=text(key);status.scrollIntoView?.({block:'nearest'});}});
    const anchors=Array.from(doc.querySelectorAll('a.game-card')).map(anchor=>({
      anchor,game:Object.keys(specs).find(key=>new URL(anchor.href,root.location.href).pathname.endsWith('/'+specs[key].href))
    })).filter(item=>item.game);
    function refresh() {
      let setup; try{setup=launcher.snapshot();}catch(_){setup=null;}
      select.replaceChildren();
      const first=doc.createElement('option');first.value='';first.textContent=text('choose');select.append(first);
      let saved;try{saved=JSON.parse(root.localStorage.getItem('hub-launch-seat:'+setup?.code));}catch(_){}
      setup?.names.forEach((name,i)=>{
        const option=doc.createElement('option');option.value=String(i+1);option.textContent=name;select.append(option);
        if (saved?.token===setup.tokens[i]) select.value=String(i+1);
      });
      doc.getElementById('hub-player-label').textContent=text('seat');
      doc.getElementById('hub-launch-help').textContent=text('help');
      if(legacy)legacy.textContent=text('legacy');
    }
    select.addEventListener('change',()=>{
      try{const setup=launcher.snapshot(),seat=Number(select.value);root.localStorage.setItem('hub-launch-seat:'+setup.code,
        JSON.stringify({token:setup.tokens[seat-1]}));}catch(_){}
    });
    anchors.forEach(({anchor,game})=>anchor.addEventListener('click',async event=>{
      if (event.button>0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();if(launcher.busy)return;error.hidden=true;if(legacy)legacy.hidden=true;
      select.disabled=true;anchors.forEach(item=>item.anchor.setAttribute('aria-disabled','true'));
      try{await launcher.launch(game,Number(select.value));}
      catch(cause){
        status.hidden=true;error.hidden=false;
        error.textContent=cause.code==='player_count' ? (root.I18N?.lang==='zh'
          ? '這款遊戲需要 '+cause.min+'–'+cause.max+' 位玩家，請先編輯房間人數。'
          : 'This game needs '+cause.min+'–'+cause.max+' players. Edit your room setup first.') : text(cause.code);
        if(legacy){legacy.href=specs[game].href;legacy.hidden=false;}
        if(cause.code==='select_seat')select.focus?.();else error.scrollIntoView?.({block:'nearest'});
      }finally{select.disabled=false;anchors.forEach(item=>item.anchor.removeAttribute('aria-disabled'));}
    }));
    root.I18N?.onChange(refresh);refresh();
    installed={launch:launcher.launch,snapshot:launcher.snapshot,refresh,get busy(){return launcher.busy;}};return installed;
  }
  return {create,install,refresh:()=>installed?.refresh(),specs,snapshotRoom,playerURL};
});
