/* Approved Bomb Relay artwork. Presentation only: no fuse, gameplay timer,
 * commands, audio, storage or room writes. Call refresh with the room clock. */
var BOMB_RELAY_VISUALS = (() => {
  'use strict';
  const avatars = ['boy', 'girl', 'curly', 'ponytail'];
  const monsters = ['pumpkin', 'ghost', 'furry'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const metadata = () => typeof BOMB_RELAY_ART === 'undefined' ? { assets: {}, geometry: {} } : BOMB_RELAY_ART;
  const language = () => typeof I18N !== 'undefined' ? I18N.lang : 'en';
  const asset = name => metadata().assets?.[name] || '';
  const url = source => `url("${String(source || '').replace(/["\\\r\n]/g, encodeURIComponent)}")`;
  const px = value => `${Number.isFinite(value) ? value : 0}px`;
  const rectOK = rect => Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite) && rect[2] > 0 && rect[3] > 0;
  const rectOf = value => Array.isArray(value) ? value : value?.rect;
  function appearance(bomb) {
    const value = bomb?.appearance || {};
    return { edition: value.edition === 'halloween' ? 'halloween' : 'classic', monster: monsters.includes(value.monster) ? value.monster : 'pumpkin' };
  }
  function crop(sheet, rect, scale, source) {
    if (!sheet || !rectOK(rect) || !Number.isFinite(scale) || scale <= 0) return '';
    return `width:${px(rect[2] * scale)};height:${px(rect[3] * scale)};background-image:${url(source)};background-size:${px(sheet[0] * scale)} ${px(sheet[1] * scale)};background-position:${px(-rect[0] * scale)} ${px(-rect[1] * scale)};`;
  }
  function heroCrop(monster, expression) {
    const config = metadata().geometry?.monsters?.[monster];
    const heroes = config?.heroes, rect = rectOf(heroes?.[expression]);
    if (!rectOK(rect)) return '';
    const all = Object.values(heroes).map(rectOf).filter(rectOK);
    const scale = Math.min(154 / Math.max(...all.map(item => item[2])), 154 / Math.max(...all.map(item => item[3])));
    return crop(config.sheet, rect, scale, config.source || asset(monster)) + `left:${px((154 - rect[2] * scale) / 2)};top:${px(154 - rect[3] * scale)};`;
  }
  function avatarHTML(value) {
    const avatar = avatars.includes(value) ? value : 'boy';
    const upper = metadata().geometry?.avatars?.[avatar]?.upper;
    if (!upper || !rectOK(upper.rect)) return '<span class="br-avatar-art" aria-hidden="true"></span>';
    const scale = Math.min(48 / upper.rect[2], 48 / upper.rect[3]);
    return `<span class="br-avatar-art" aria-hidden="true"><span style="${escape(crop(upper.sheet, upper.rect, scale, upper.source || asset('upper-' + avatar)))}"></span></span>`;
  }
  function partHTML(part, sheet, scale, source, className) {
    if (!part?.pivotSource || !rectOK(part.rect)) return '';
    const style = crop(sheet, part.rect, scale, source) + `left:${px((part.rect[0] - part.pivotSource[0]) * scale)};top:${px((part.rect[1] - part.pivotSource[1]) * scale)};`;
    return `<span class="br-run-paint ${className}" style="${escape(style)}"></span>`;
  }
  function actorHTML(config, key, kind) {
    if (!config?.upper || !rectOK(config.upper.rect) || !config.hipsLocal || !config.thigh || !config.shin) return '';
    const upper = config.upper, hips = config.hipsLocal;
    const targets = Object.assign({ bodyHeight: 50, thighAnchorLength: 15, shinPivotToSoleLength: 14 }, config.targets || {});
    const sourceMid = [(upper.backHipSource[0] + upper.frontHipSource[0]) / 2, (upper.backHipSource[1] + upper.frontHipSource[1]) / 2];
    const localMid = [(hips.back[0] + hips.front[0]) / 2, (hips.back[1] + hips.front[1]) / 2];
    const sourceSpan = Math.hypot(upper.frontHipSource[0] - upper.backHipSource[0], upper.frontHipSource[1] - upper.backHipSource[1]);
    const localSpan = Math.hypot(hips.front[0] - hips.back[0], hips.front[1] - hips.back[1]);
    const scale = upper.fitMode === 'hip-span' && sourceSpan > 0 ? localSpan / sourceSpan : (upper.targetHeight || targets.bodyHeight) / upper.rect[3];
    const bodyStyle = crop(upper.sheet, upper.rect, scale, upper.source || asset('upper-' + key)) + `left:${px(localMid[0] - (sourceMid[0] - upper.rect[0]) * scale)};top:${px(localMid[1] - (sourceMid[1] - upper.rect[1]) * scale)};`;
    const thigh = config.thigh;
    const delta = [thigh.distalSource[0] - thigh.pivotSource[0], thigh.distalSource[1] - thigh.pivotSource[1]];
    const thighScale = targets.thighAnchorLength / Math.hypot(...delta);
    const shinScale = targets.shinPivotToSoleLength / Math.abs(config.shin.soleSource[1] - config.shin.pivotSource[1]);
    const source = config.source || asset(kind === 'avatar' ? 'avatar-' + key : key);
    const legs = ['back', 'front'].map(side => `<span class="br-run-leg br-run-leg-${side}" style="left:${px(hips[side][0])};top:${px(hips[side][1])}">${partHTML(thigh, config.sheet, thighScale, source, 'br-run-thigh')}<span class="br-run-knee" style="left:${px(delta[0] * thighScale)};top:${px(delta[1] * thighScale)}">${partHTML(config.shin, config.sheet, shinScale, source, 'br-run-shin')}</span></span>`);
    return `<span class="br-run-actor br-run-${kind}" aria-hidden="true"><span class="br-run-shadow"></span>${legs[0]}<span class="br-run-paint br-run-upper" style="${escape(bodyStyle)}"></span>${legs[1]}</span>`;
  }
  function chaseHTML(bomb, { playerNum = 0, lang = language(), name = '' } = {}) {
    const chase = bomb?.lastChase;
    if (!chase || chase.edition !== 'halloween' || (playerNum && chase.loser !== playerNum)) return '';
    const monster = monsters.includes(chase.monster) ? chase.monster : 'pumpkin';
    const avatar = avatars.includes(chase.avatar) ? chase.avatar : 'boy';
    const labels = { pumpkin: ['南瓜怪', 'Pumpkin'], ghost: ['小幽靈', 'Ghost'], furry: ['毛毛怪', 'Furry'] };
    const label = lang === 'zh' ? `上一輪：${name} · ${labels[monster][0]}追逐中` : `Last round: ${name} · ${labels[monster][1]} is chasing`;
    const description = lang === 'zh' ? '玩家雙手舉高，身體固定，雙腿交替跑步。' : 'Hands raised, upper bodies still, legs running in place.';
    const geometry = metadata().geometry || {};
    return `<section class="br-chase br-visual" data-br-chase data-br-visual-key="${escape('chase:' + chase.id)}"><p class="br-chase-caption">${escape(label)}</p><div class="br-chase-lane" role="img" aria-label="${escape(description)}"><span class="br-chase-ground" aria-hidden="true"></span>${actorHTML(geometry.monsters?.[monster], monster, 'monster')}${actorHTML(geometry.avatars?.[avatar], avatar, 'avatar')}</div></section>`;
  }
  function heroHTML(bomb) {
    const look = appearance(bomb);
    const key = ['hero', bomb?.sessionId || 'setup', bomb?.cardNo || 0, look.edition, look.monster].join(':');
    return `<div class="br-visual br-hero-art" data-br-hero data-br-visual-key="${escape(key)}" data-br-edition="${look.edition}" data-br-monster="${look.monster}" data-br-expression="idle" aria-hidden="true"><span class="br-hero-monster"><span class="br-hero-crop" style="${escape(heroCrop(look.monster, 'idle'))}"></span></span><span class="br-hero-classic" style="background-image:${escape(url(asset('normal-bomb')))}"></span><span class="br-hero-burst" style="background-image:${escape(url(asset('bomb')))}"></span></div>`;
  }
  function elapsed(bomb, now) {
    const clock = bomb?.clock || {};
    return Math.max(0, Number(clock.elapsedMs) || 0) + (bomb?.phase === 'ticking' && Number.isFinite(clock.startedAt) ? Math.max(0, now - clock.startedAt) : 0);
  }
  function refresh(container, bomb, { now = Date.now() } = {}) {
    if (!container?.querySelectorAll || !bomb) return;
    const look = appearance(bomb), exploded = ['boom', 'discussion'].includes(bomb.phase);
    for (const hero of container.querySelectorAll('[data-br-hero]')) {
      hero.dataset.brEdition = look.edition; hero.dataset.brMonster = look.monster;
      hero.dataset.brPaused = String(bomb.phase === 'paused');
      let burstElapsed = 0, newBurst = false;
      let expression = elapsed(bomb, now) >= 10000 ? (look.edition === 'halloween' ? 'warning' : 'angry') : 'idle';
      if (exploded) {
        if (look.edition === 'halloween') expression = 'rage';
        else {
          const id = bomb.boom?.id || '';
          const canonicalAt = Number.isFinite(bomb.boom?.at) ? bomb.boom.at : Number.isFinite(bomb.phaseUntil) ? bomb.phaseUntil - 4500 : null;
          newBurst = hero.dataset.brBurstId !== id;
          if (newBurst || Number.isFinite(canonicalAt)) {
            hero.dataset.brBurstId = id;
            hero.dataset.brBurstAt = String(Number.isFinite(canonicalAt) ? canonicalAt : now);
          }
          burstElapsed = Math.max(0, now - Number(hero.dataset.brBurstAt));
          expression = bomb.phase === 'boom' && burstElapsed < 850 ? 'burst' : 'spent';
        }
      }
      if (expression === 'burst' && (newBurst || hero.dataset.brExpression !== 'burst')) {
        const burst = hero.querySelector('.br-hero-burst');
        if (burst) burst.style.animationDelay = `-${burstElapsed}ms, -${burstElapsed}ms`;
      }
      if (hero.dataset.brExpression !== expression) hero.dataset.brExpression = expression;
      const cropElement = hero.querySelector('.br-hero-crop');
      const style = heroCrop(look.monster, ['warning', 'rage'].includes(expression) ? expression : 'idle');
      if (cropElement && cropElement.getAttribute('style') !== style) cropElement.setAttribute('style', style);
    }
    for (const chase of container.querySelectorAll('[data-br-chase]')) chase.dataset.brPaused = String(bomb.phase === 'paused');
  }
  function preserve(container, html) {
    if (!container) return;
    if (!container.querySelectorAll) { container.innerHTML = html; return; }
    const old = new Map(Array.from(container.querySelectorAll('[data-br-visual-key]'), element => {
      const animations = typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: true }).filter(animation => animation.animationName && animation.effect?.target).map(animation => ({ target: animation.effect.target, name: animation.animationName, time: animation.currentTime })) : [];
      return [element.dataset.brVisualKey, { element, animations }];
    }));
    container.innerHTML = html;
    for (const element of container.querySelectorAll('[data-br-visual-key]')) {
      const record = old.get(element.dataset.brVisualKey);
      if (record) {
        const retained = record.element;
        // Language/name changes update the caption without replacing the legs.
        const caption = element.querySelector('.br-chase-caption');
        const previousCaption = retained.querySelector('.br-chase-caption');
        if (caption && previousCaption) previousCaption.textContent = caption.textContent;
        const lane = element.querySelector('.br-chase-lane');
        const previousLane = retained.querySelector('.br-chase-lane');
        if (lane && previousLane) previousLane.setAttribute('aria-label', lane.getAttribute('aria-label'));
        element.replaceWith(retained);
        // A synchronous detach/reinsert can still restart CSS animations.
        // Restore only matching cosmetic tracks on the retained actual nodes.
        for (const saved of record.animations) {
          if (!Number.isFinite(saved.time)) continue;
          const animation = saved.target.getAnimations().find(item => item.animationName === saved.name);
          if (animation) animation.currentTime = saved.time;
        }
      }
    }
  }
  // A convenience signature for host paint loops. No interval is installed.
  const update = (container, bomb, now) => refresh(container, bomb, { now });
  const clear = container => { if (container?.querySelectorAll) for (const element of container.querySelectorAll('[data-br-hero]')) { delete element.dataset.brBurstAt; delete element.dataset.brBurstId; } };
  return { heroHTML, chaseHTML, avatarHTML, appearance, elapsed, preserve, refresh, update, clear };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOMB_RELAY_VISUALS;
