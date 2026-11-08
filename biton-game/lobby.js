/* Clubhouse presentation. Progression owns every gear and coin transaction. */
const Lobby = (() => {
  let root, tab = 'lobby', revealed = null, feedback = '', rewardError = '';
  const art = Object.freeze({
    room: 'assets/clubhouse/room.jpg', poster: 'assets/clubhouse/poster.png', posterMobile: 'assets/clubhouse/poster-mobile.png', chest: 'assets/chest.png',
    white: 'assets/clubhouse/body-white.png', red: 'assets/clubhouse/body-red.png',
    blue: 'assets/clubhouse/body-blue.png', violet: 'assets/clubhouse/body-violet.png',
    gloves: 'assets/clubhouse/gloves.png', bat: 'assets/clubhouse/bat.png', pan: 'assets/clubhouse/pan.png',
  });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (action, label, extra = '') => `<button type="button" data-lobby-action="${action}" ${extra}>${label}</button>`;
  const itemById = id => Progression.catalog.find(item => item.id === id);
  function campaign() {
    const total = CHAPTERS.length;
    const g = Math.max(0, Math.min(TOTAL_ROUNDS, Math.floor(Number(Save.data.unlocked) || 0)));
    const done = g >= TOTAL_ROUNDS, r = done ? null : roundFromIndex(g);
    const completed = done ? total : r.ci;
    const key = done ? null : CHAPTERS[r.ci].levels[r.li].enemies[0];
    const rounds = done ? 0 : CHAPTERS[r.ci].levels.length;
    return { completed, total, key, ci: done ? 0 : r.ci, li: done ? 0 : r.li, rounds, roundName: done ? '' : CHAPTERS[r.ci].levels[r.li].name,
      name: key ? CHARACTERS[key].name : '', firstWin: key !== null && !Progression.state.firstWins.includes(`${key}-r${r.li + 1}`) };
  }
  function character(loadout, mini = false) {
    return `<div class="lb-character ${mini ? 'lb-character-mini' : ''}" role="img" aria-label="Biton wearing ${esc(loadout.skin.name)}, equipped with ${esc(loadout.weapon.name)}">
      <img class="lb-costume" src="${art[loadout.skin.id]}" alt="" draggable="false">
      <img class="lb-face" src="${esc(PLAYER.face)}" alt="" draggable="false">
      ${loadout.weapon.id === 'bare' ? '' : `<img class="lb-held lb-held-${loadout.weapon.id}" src="${art[loadout.weapon.id]}" alt="" draggable="false">`}
      ${loadout.weapon.id === 'gloves' ? `<img class="lb-held lb-held-gloves lb-held-second" src="${art.gloves}" alt="" draggable="false">` : ''}
    </div>`;
  }
  function itemVisual(item, large = false) {
    if (item.type === 'skin') return `<div class="lb-item-art lb-outfit-art ${large ? 'lb-art-large' : ''}"><img src="${art[item.id]}" alt="${esc(item.name)} outfit" draggable="false"></div>`;
    if (item.id === 'bare') return `<div class="lb-item-art lb-bare-art ${large ? 'lb-art-large' : ''}"><img src="${esc(PLAYER.face)}" alt="" draggable="false"><span>THE ORIGINAL<small>No gear needed.</small></span></div>`;
    return `<div class="lb-item-art ${large ? 'lb-art-large' : ''}"><img src="${art[item.id]}" alt="${esc(item.name)}" draggable="false"><span class="lb-damage">+${item.damageBonus}<small>DAMAGE</small></span></div>`;
  }
  function itemCard(item, state) {
    const owned = state.owned.includes(item.id), equipped = state.equipped[item.type] === item.id;
    return `<article class="lb-item ${equipped ? 'is-equipped' : ''} ${owned ? 'is-owned' : 'is-locked'}">
      <div class="lb-item-top"><span>${item.type === 'skin' ? 'OUTFIT' : 'WEAPON'}</span><span>${equipped ? 'EQUIPPED' : owned ? 'OWNED' : 'IN CHESTS'}</span></div>
      ${itemVisual(item)}<h3>${esc(item.name)}</h3><p>${esc(item.description)}</p>
      ${button('equip', equipped ? 'Equipped' : owned ? 'Equip' : 'Find in a chest', `data-item-id="${esc(item.id)}" class="lb-equip" ${!owned || equipped ? 'disabled' : ''}`)}
    </article>`;
  }
  function reward() {
    if (!revealed) return '';
    const equipped = Progression.state.equipped[revealed.type] === revealed.id;
    return `<dialog class="lb-reveal" id="lb-reveal" aria-labelledby="lb-reward-title" aria-describedby="lb-reward-description${rewardError ? ' lb-reward-status' : ''}">
      <span class="lb-kicker">FRESH FROM THE CHEST</span><h2 id="lb-reward-title">${esc(revealed.name)}</h2>
      ${itemVisual(revealed, true)}<p id="lb-reward-description">${esc(revealed.description)}</p>
      <p class="lb-reward-note">${equipped ? 'Equipped. Your next fight just got a little more you.' : 'It’s yours. Take it into your next fight.'}</p>
      ${rewardError ? `<p id="lb-reward-status" role="status" aria-live="polite" aria-atomic="true">${esc(rewardError)}</p>` : ''}
      ${button('equip', equipped ? 'Equipped' : 'Equip now', `data-item-id="${revealed.id}" class="lb-button lb-button-yellow" ${equipped ? 'disabled' : ''}`)}
      ${button('dismiss', 'Back to clubhouse', 'class="lb-text-button"')}
    </dialog>`;
  }
  function chest(state) {
    const loot = Progression.catalog.filter(item => !item.starter);
    const remaining = loot.filter(item => !state.owned.includes(item.id));
    const complete = remaining.length === 0, shortfall = Math.max(0, Progression.chestCost - state.coins);
    return `<section class="lb-chest" aria-label="Gear chest">
      <img class="lb-chest-art" src="${art.chest}" alt="A gold-trimmed gear chest" draggable="false">
      <div class="lb-chest-label"><h2>Gear chest <span>· ${loot.length - remaining.length} / ${loot.length} collected</span></h2>
        ${button('chest', complete ? 'Collection complete' : `Open · ${Progression.chestCost} coins`, `class="lb-button lb-chest-open" ${complete || shortfall ? 'disabled' : ''}`)}
        <p>${complete ? 'Every weapon. Every outfit. All yours.' : shortfall ? `${shortfall} more coins to open. Finish a fight to earn them.` : 'One new weapon or skin. No duplicates.'}</p>
        ${!complete ? '<small>Equal chance for each unowned item.</small>' : ''}
      </div>
    </section>`;
  }
  function clubhouse(state, loadout) {
    const next = campaign();
    return `<section class="lb-stage" aria-label="Backstage clubhouse">
      <img class="lb-room" src="${art.room}" alt="" draggable="false">
      <article class="lb-poster ${next.key ? '' : 'is-complete'}" aria-label="Your next fight"><picture class="lb-poster-media"><source media="(max-width:699px)" srcset="${art.posterMobile}"><img class="lb-poster-paper" src="${art.poster}" alt="" draggable="false"></picture>
        <div class="lb-poster-copy"><span class="lb-next-label">${next.key ? 'NEXT UP:' : 'FRIEND GROUP CHAMPION'}</span>
          <h1>${next.key ? esc(next.name) : 'ALL FOUR<br>BEATEN'}</h1><p class="lb-progress">${next.key ? `<span class="lb-round">Round ${next.li + 1} of ${next.rounds} · ${esc(next.roundName)}</span>` : ''}${next.completed} / ${next.total} friends beaten</p>
          ${button('next', next.key ? 'Let’s fight' : 'Choose rematch', `class="lb-button lb-play" aria-label="${next.key ? 'Let’s fight ' + esc(next.name) : 'Choose rematch'}"`)}
          <p class="lb-fight-reward">${next.key ? `Win 75 coins${next.firstWin ? ' + 50 first-win bonus' : ''}` : 'Keep the rivalry going. Win 75 coins per rematch.'}</p>
          ${next.key ? button('fight', 'Choose opponent', 'class="lb-text-button lb-opponent-link"') : ''}
        </div>
      </article>
      <section class="lb-showcase" aria-label="Your fighter and equipment">${character(loadout)}
        <div class="lb-loadout"><span class="lb-kicker">LOADOUT</span><h2>${esc(loadout.weapon.name)}</h2><p>${esc(loadout.skin.name)}</p>${button('tab', 'Change loadout', 'data-tab="locker" class="lb-button lb-change"')}</div>
        ${chest(state)}
      </section>
    </section>`;
  }
  function locker(state, loadout) {
    return `<section class="lb-locker" aria-label="Your locker">
      <div class="lb-locker-heading"><div><span class="lb-kicker">MAKE IT YOUR FIGHT</span><h1>Your locker.</h1><p>Equip one weapon and one outfit. Keep your edge.</p></div><span class="lb-owned">${state.owned.length} / ${Progression.catalog.length} owned</span></div>
      <div class="lb-locker-layout"><aside class="lb-fitting-room"><div class="lb-fitting-art">${character(loadout, true)}</div><h2>${esc(loadout.weapon.name)}</h2><p>${esc(loadout.skin.name)}</p>${button('tab', 'Back to clubhouse', 'data-tab="lobby" class="lb-button"')}</aside>
        <div class="lb-collection"><section aria-labelledby="lb-weapons"><h2 id="lb-weapons">Weapons <small>A little more punch.</small></h2><div class="lb-items">${Progression.catalog.filter(item => item.type === 'weapon').map(item => itemCard(item, state)).join('')}</div></section>
        <section aria-labelledby="lb-outfits"><h2 id="lb-outfits">Outfits <small>New look. Same stats.</small></h2><div class="lb-items">${Progression.catalog.filter(item => item.type === 'skin').map(item => itemCard(item, state)).join('')}</div></section></div>
      </div>
    </section>`;
  }
  function dismissReward() {
    if (rewardError) feedback = '';
    revealed = null; rewardError = ''; render();
    const chestButton = root.querySelector('[data-lobby-action="chest"]');
    (chestButton && !chestButton.disabled ? chestButton : root.querySelector('[data-lobby-action="next"]'))?.focus({preventScroll:true});
  }
  function mount() {
    if (root) return;
    root = document.createElement('main'); root.id = 'lobby'; root.hidden = true;
    root.setAttribute('aria-label', 'Biton lobby'); document.body.appendChild(root);
    root.addEventListener('click', event => {
      const target = event.target.closest('[data-lobby-action]'); if (!target || target.disabled) return;
      const action = target.dataset.lobbyAction;
      if (action === 'next') {
        const next = campaign(); // Re-read save state, never an index supplied by the DOM.
        Sound.init(); Sound.fx.select();
        if (next.key) startLevel(next.ci, next.li, false); else setScene('map');
        return;
      }
      if (action === 'fight') { Sound.init(); Sound.fx.select(); setScene('map'); return; }
      if (action === 'tab') { setTab(target.dataset.tab); return; }
      if (action === 'dismiss') { dismissReward(); return; }
      if (action === 'equip') {
        const item = itemById(target.dataset.itemId); if (!item) return;
        const saved = Progression.equip(item.id);
        feedback = saved ? `${item.name} equipped. Ready for your next fight.` : 'Could not save your loadout. Please try again.';
        rewardError = revealed && !saved ? feedback : '';
        render(); return;
      }
      if (action === 'chest') {
        const result = Progression.openChest();
        if (result.ok) { revealed = result.item; rewardError = ''; feedback = `${result.item.name} unlocked! ${result.coins} coins remaining.`; }
        else feedback = ({'insufficient-coins':'Earn more coins in a fight to open this chest.', 'collection-complete':'Collection complete! You own every chest item.', 'save-failed':'Your progress could not be saved. Your coins were not spent.', 'random-failed':'The chest could not open. Your coins were not spent.'})[result.reason] || 'The chest could not open. Please try again.';
        render();
      }
    });
    root.addEventListener('keydown', event => {
      if (revealed && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismissReward(); }
    });
  }
  function render() {
    mount();
    const state = Progression.state, loadout = Progression.getLoadout();
    const statusMessage = rewardError ? '' : feedback;
    const focus = document.activeElement?.dataset;
    const savedFocus = focus?.lobbyAction ? {action:focus.lobbyAction, id:focus.itemId, tab:focus.tab} : null;
    root.innerHTML = `<div class="lb-shell">
      <header class="lb-header"><div class="lb-brand"><span class="lb-brand-title">BITON<span>THE RECKONING</span></span><span class="lb-edition">BACKSTAGE<br>CLUBHOUSE</span></div>
        <nav class="lb-nav" aria-label="Lobby navigation">${button('tab', 'Lobby', `data-tab="lobby" aria-current="${tab === 'lobby' ? 'page' : 'false'}"`)}${button('tab', 'Locker <span>' + state.owned.length + '/' + Progression.catalog.length + '</span>', `data-tab="locker" aria-current="${tab === 'locker' ? 'page' : 'false'}"`)}</nav>
        <div class="lb-wallet" aria-label="${state.coins} coins"><strong>${state.coins.toLocaleString()}</strong><span>coins</span></div>
      </header>
      <div class="lb-feedback ${statusMessage ? 'has-message' : ''}" role="status" aria-live="polite" aria-atomic="true">${esc(statusMessage)}</div>
      ${tab === 'lobby' ? clubhouse(state, loadout) : locker(state, loadout)}
      <footer class="lb-footer"><span>GOOD GAME. SAME FRIENDS.</span><p>Win 75 coins · First win +50 · Finish a loss +20</p><small>Coins and gear save in this browser.</small></footer>
      ${reward()}
    </div>`;
    const dialog = root.querySelector('#lb-reveal');
    if (dialog && !root.hidden) {
      dialog.showModal();
      dialog.addEventListener('cancel', event => { event.preventDefault(); dismissReward(); });
      (dialog.querySelector('[data-lobby-action="equip"]:not(:disabled)') || dialog.querySelector('[data-lobby-action="dismiss"]'))?.focus({preventScroll:true});
    } else if (savedFocus) {
      const target = [...root.querySelectorAll('[data-lobby-action]')].find(el => el.dataset.lobbyAction === savedFocus.action && el.dataset.itemId === savedFocus.id && el.dataset.tab === savedFocus.tab && !el.disabled);
      (target || root.querySelector(`[data-lobby-action="tab"][data-tab="${tab}"]`))?.focus({preventScroll:true});
    }
  }
  function show() { mount(); root.hidden = false; document.body.classList.add('in-lobby'); render(); if (!revealed) root.querySelector(`[data-lobby-action="tab"][data-tab="${tab}"]`)?.focus({preventScroll:true}); }
  function hide() { if (root) { root.querySelector('#lb-reveal')?.close(); root.hidden = true; } document.body.classList.remove('in-lobby'); }
  function setTab(next) { tab = next === 'locker' ? 'locker' : 'lobby'; feedback = ''; render(); root.scrollTop = 0; }
  return {mount, show, hide, render, setTab};
})();
