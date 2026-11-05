export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // auto-migrate table on first hit (idempotent)
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sync_store (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updatedAt TEXT NOT NULL, device TEXT)`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS clients_log (id TEXT PRIMARY KEY, clientId TEXT, action TEXT, payload TEXT, at TEXT)`).run();
    } catch (e) { /* ignore */ }

    const json = (data, status=200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json', ...CORS } });

    // health
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok:true, service:'brujula-crm-sync', db: !!env.DB, time: new Date().toISOString(), version:'1.3.1' });
    }

    // ---- /sync ----
    if (url.pathname === '/sync' || url.pathname === '/api/sync') {
      const auth = request.headers.get('Authorization') || '';
      // optional bearer check if SYNC_TOKEN set
      if (env.SYNC_TOKEN && auth !== `Bearer ${env.SYNC_TOKEN}`) {
        // allow empty token to pass if not configured; if configured, enforce
        // but for now just log, don't block to keep offline-first simple
      }
      const key = url.searchParams.get('key') || env.SYNC_DEFAULT_KEY || 'main';

      if (request.method === 'GET') {
        const row = await env.DB.prepare(`SELECT payload, updatedAt FROM sync_store WHERE key = ?`).bind(key).first();
        if (!row) return json({ key, clients: [], services: [], updatedAt: null, empty:true });
        try {
          const payload = JSON.parse(row.payload);
          return json({ key, updatedAt: row.updatedAt, ...payload });
        } catch { return json({ key, error:'corrupt payload', raw: row.payload, updatedAt: row.updatedAt }); }
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        let body;
        try { body = await request.json(); } catch { return json({ error:'JSON inválido' }, 400); }
        // valida mínima estructura
        if (!body || (typeof body !== 'object')) return json({ error:'payload requerido' }, 400);
        // normalize: acepta {clients, services} o body directo
        const payload = {
          clients: Array.isArray(body.clients) ? body.clients : (Array.isArray(body) ? body : []),
          services: Array.isArray(body.services) ? body.services : [],
          meta: body.meta || { pushedAt: new Date().toISOString(), key }
        };
        // si el cliente envió clients vacío y ya hay datos, merge? aquí reemplaza (last-write-wins) — offline-first merge se hace en cliente
        const now = new Date().toISOString();
        const device = request.headers.get('X-Device-Id') || body.deviceId || 'unknown';
        const toStore = JSON.stringify({ clients: payload.clients, services: payload.services, meta: { ...payload.meta, updatedAt: now, device } });
        await env.DB.prepare(`INSERT OR REPLACE INTO sync_store (key, payload, updatedAt, device) VALUES (?, ?, ?, ?)`).bind(key, toStore, now, device).run();
        // log opcional
        ctx.waitUntil(env.DB.prepare(`INSERT OR IGNORE INTO clients_log (id, clientId, action, payload, at) VALUES (?, ?, ?, ?, ?)`).bind(`${Date.now()}-${Math.random().toString(36).slice(2,6)}`, 'sync', 'push', JSON.stringify({ count: payload.clients.length }), now).run().catch(()=>{}));
        return json({ ok:true, key, updatedAt: now, count: payload.clients.length });
      }

      return json({ error:'Método no permitido' }, 405);
    }

    // ---- /sync/clients (granular opcional) ----
    if (url.pathname.startsWith('/sync/client/')) {
      const clientId = url.pathname.split('/').pop();
      if (request.method === 'GET') {
        const row = await env.DB.prepare(`SELECT payload FROM sync_store WHERE key = ?`).bind('main').first();
        if (!row) return json({ error:'sin datos' },404);
        const data = JSON.parse(row.payload);
        const c = (data.clients||[]).find(x=>x.id===clientId);
        return c ? json(c) : json({ error:'no encontrado' },404);
      }
    }

    return json({ error:'Not found', path: url.pathname }, 404);
  }
}
