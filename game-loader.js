/* game-loader.js — loads scenarios from Supabase; falls back to game-data.js silently */
const GAME_LOADER = (() => {

  async function fetchRows(gameId) {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/game_scenarios` +
        `?game_id=eq.${encodeURIComponent(gameId)}&active=eq.true&order=sort_order.asc,created_at.asc`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return rows.length ? rows : null;
    } catch { return null; }
  }

  function transform(rows, gameId) {
    switch (gameId) {
      case 'never':
      case 'hottake':
        return rows.map(r => r.content.text).filter(Boolean);
      case 'sophies':
      case 'persuade':
      case 'scene':
        return rows.map(r => r.content);
      case 'storyteller': {
        const result = { characters: [], actions: [], locations: [] };
        for (const row of rows) {
          const key = row.subcategory;
          if (result[key]) result[key].push(row.content.text);
        }
        return result;
      }
      default: return null;
    }
  }

  async function init(gameId) {
    const rows = await fetchRows(gameId);
    if (!rows) return null;
    return transform(rows, gameId);
  }

  return { init };
})();
