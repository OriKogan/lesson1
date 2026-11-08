/* Local-only lobby progression. Coins are earned by playing; no purchases. */
'use strict';

const Progression = (() => {
  const VERSION = 1;
  const CHEST_COST = 100;
  const MAX_COINS = 999999;
  const catalog = Object.freeze([
    Object.freeze({ id: 'bare', type: 'weapon', name: 'Bare hands', description: 'Your original quick punch.', color: '#e9bc97', damageBonus: 0, starter: true }),
    Object.freeze({ id: 'gloves', type: 'weapon', name: 'Boxing gloves', description: '+1 punch damage', color: '#ef6262', damageBonus: 1 }),
    Object.freeze({ id: 'bat', type: 'weapon', name: 'Foam bat', description: '+2 punch damage', color: '#59c5e8', damageBonus: 2 }),
    Object.freeze({ id: 'pan', type: 'weapon', name: 'Frying pan', description: '+3 punch damage', color: '#9eafc0', damageBonus: 3 }),
    Object.freeze({ id: 'white', type: 'skin', name: 'Original', description: 'Biton\'s original outfit.', color: '#f7f5ef', shirt: '#f7f5ef', pants: '#1d2028', shoes: '#eeeeee', starter: true }),
    Object.freeze({ id: 'red', type: 'skin', name: 'Crimson', description: 'A bold red outfit.', color: '#ef6262', shirt: '#d84f5a', pants: '#322c45', shoes: '#f1d1b5' }),
    Object.freeze({ id: 'blue', type: 'skin', name: 'Ice blue', description: 'Cool blue, bright sneakers.', color: '#59c5e8', shirt: '#65c6e5', pants: '#21364b', shoes: '#f1f1ed' }),
    Object.freeze({ id: 'violet', type: 'skin', name: 'Neon violet', description: 'Violet with a lime accent.', color: '#af8bf8', shirt: '#aa7be5', pants: '#30264a', shoes: '#c3e970' }),
  ]);
  const byId = new Map(catalog.map(item => [item.id, item]));
  const starters = catalog.filter(item => item.starter).map(item => item.id);
  let save = null;
  let lastError = null;

  function coinValue(value) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(MAX_COINS, Math.max(0, Math.floor(value))) : 100;
  }

  function strings(value) {
    return Array.isArray(value)
      ? [...new Set(value.filter(s => typeof s === 'string' && s.trim() && s.length <= 160))]
      : [];
  }

  function clean(raw) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const owned = [...new Set([...starters, ...strings(raw.owned).filter(id => byId.has(id))])];
    const equipped = {};
    for (const type of ['weapon', 'skin']) {
      const requested = raw.equipped && raw.equipped[type];
      equipped[type] = owned.includes(requested) && byId.get(requested)?.type === type
        ? requested : type === 'weapon' ? 'bare' : 'white';
    }
    return {
      version: VERSION,
      coins: coinValue(raw.coins),
      owned,
      equipped,
      firstWins: strings(raw.firstWins).map(s => s.trim().toLowerCase()),
      rewardedFights: strings(raw.rewardedFights),
    };
  }

  function ready() {
    if (!save) throw new Error('Call Progression.init(Save) before using progression.');
  }

  // Save.write may return false when persistence is unavailable. Revert failed
  // transactions so a failed write never consumes coins or records a reward.
  function commit(next) {
    ready();
    const before = save.data.progression;
    save.data.progression = next;
    try {
      if (save.write() === false) throw new Error('Save unavailable');
      return true;
    } catch (error) {
      save.data.progression = before;
      return false;
    }
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(save.data.progression));
  }

  function init(source) {
    if (!source || !source.data || typeof source.write !== 'function') {
      throw new TypeError('Progression.init needs a save object with data and write().');
    }
    save = source;
    save.data.progression = clean(save.data.progression);
    // Keep old campaigns playable if localStorage is blocked. Subsequent
    // transactions surface write failures through their return values.
    try { save.write(); } catch (error) { /* initial in-memory state remains usable */ }
    return save.data.progression;
  }

  function openChest(rng = Math.random) {
    ready();
    const state = save.data.progression;
    const pool = catalog.filter(item => !item.starter && !state.owned.includes(item.id));
    if (!pool.length) return { ok: false, reason: 'collection-complete', coins: state.coins };
    if (state.coins < CHEST_COST) return { ok: false, reason: 'insufficient-coins', coins: state.coins };
    let roll;
    try { roll = rng(); } catch (error) { return { ok: false, reason: 'random-failed', coins: state.coins }; }
    if (typeof roll !== 'number' || !Number.isFinite(roll)) {
      return { ok: false, reason: 'random-failed', coins: state.coins };
    }
    const index = Math.max(0, Math.min(pool.length - 1, Math.floor(roll * pool.length)));
    const item = pool[index];
    const next = snapshot();
    next.coins -= CHEST_COST;
    next.owned.push(item.id);
    if (!commit(next)) return { ok: false, reason: 'save-failed', coins: state.coins };
    return { ok: true, item, coins: next.coins, spent: CHEST_COST };
  }

  function equip(itemId) {
    ready();
    const item = byId.get(itemId);
    if (!item || !save.data.progression.owned.includes(itemId)) return false;
    if (save.data.progression.equipped[item.type] === itemId) return true;
    const next = snapshot();
    next.equipped[item.type] = itemId;
    return commit(next);
  }

  function rewardFight({ fightId, opponent, won } = {}) {
    ready();
    lastError = null;
    if (typeof fightId !== 'string' || !fightId.trim() || fightId.length > 160) return 0;
    if (typeof opponent !== 'string' || !opponent.trim() || opponent.length > 80) return 0;
    const state = save.data.progression;
    if (state.rewardedFights.includes(fightId)) return 0;
    const next = snapshot();
    const opponentId = opponent.trim().toLowerCase();
    const firstWin = won === true && !next.firstWins.includes(opponentId);
    const amount = (won === true ? 75 : 20) + (firstWin ? 50 : 0);
    const actual = Math.min(amount, MAX_COINS - next.coins);
    next.coins += actual;
    next.rewardedFights.push(fightId);
    if (firstWin) next.firstWins.push(opponentId);
    if (commit(next)) return actual;
    lastError = 'save-failed';
    return 0;
  }

  function getLoadout() {
    ready();
    const selected = save.data.progression.equipped;
    return { weapon: byId.get(selected.weapon), skin: byId.get(selected.skin) };
  }

  return Object.freeze({
    catalog, chestCost: CHEST_COST, maxCoins: MAX_COINS,
    init, openChest, equip, rewardFight, getLoadout,
    get lastError() { return lastError; },
    get state() { ready(); return save.data.progression; },
  });
})();
