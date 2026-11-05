const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
  'Access-Control-Max-Age': '86400'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const encoder = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const random = (n) => crypto.getRandomValues(new Uint8Array(n));
async function sha256(value) { return b64(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 210000 }, key, 256));
}
async function ensureTables(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS sync_store (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updatedAt TEXT NOT NULL, device TEXT)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS clients_log (id TEXT PRIMARY KEY, clientId TEXT, action TEXT, payload TEXT, at TEXT)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)').run();
}
async function bodyJson(request) { try { return await request.json(); } catch { return null; } }
async function authenticatedAccount(request, db) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length < 30) return null;
  const row = await db.prepare('SELECT accounts.id, accounts.email FROM sessions JOIN accounts ON accounts.id=sessions.account_id WHERE sessions.token_hash=? AND sessions.expires_at>?').bind(await sha256(token), new Date().toISOString()).first();
  return row || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.DB) return json({ error: 'Base de datos no configurada' }, 503);
    try { await ensureTables(env.DB); } catch (e) { return json({ error: 'No se pudo inicializar la base de datos', detail: e.message }, 503); }
    if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, service: 'brujula-crm-sync', version: '2.0.0', accounts: true, time: new Date().toISOString() });

    if (url.pathname === '/auth/register' && request.method === 'POST') {
      const data = await bodyJson(request);
      const email = String(data?.email || '').trim().toLowerCase();
      const password = String(data?.password || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Escribe un correo válido.' }, 400);
      if (password.length < 10) return json({ error: 'La contraseña debe tener al menos 10 caracteres.' }, 400);
      const salt = b64(random(24)); const id = crypto.randomUUID(); const now = new Date().toISOString();
      const token = b64(random(32)); const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
      try {
        await env.DB.prepare('INSERT INTO accounts(id,email,salt,password_hash,created_at) VALUES(?,?,?,?,?)').bind(id, email, salt, await derive(password, salt), now).run();
        await env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha256(token), id, expires, now).run();
        return json({ token, expiresAt: expires, account: { id, email } }, 201);
      } catch (e) { return json({ error: 'Ese correo ya está registrado o no se pudo crear la cuenta.' }, 409); }
    }

    if (url.pathname === '/auth/login' && request.method === 'POST') {
      const data = await bodyJson(request); const email = String(data?.email || '').trim().toLowerCase(); const password = String(data?.password || '');
      const row = await env.DB.prepare('SELECT id,email,salt,password_hash FROM accounts WHERE email=?').bind(email).first();
      if (!row || await derive(password, row.salt) !== row.password_hash) return json({ error: 'Correo o contraseña incorrectos.' }, 401);
      const token = b64(random(32)); const now = new Date().toISOString(); const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
      await env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha256(token), row.id, expires, now).run();
      return json({ token, expiresAt: expires, account: { id: row.id, email: row.email } });
    }

    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
      if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
      return json({ ok: true });
    }

    if (url.pathname === '/auth/me' && request.method === 'GET') {
      const account = await authenticatedAccount(request, env.DB);
      return account ? json({ account }) : json({ error: 'Sesión no válida o vencida.' }, 401);
    }

    if (url.pathname === '/sync' || url.pathname === '/api/sync') {
      const account = await authenticatedAccount(request, env.DB);
      if (!account) return json({ error: 'Inicia sesión para sincronizar.' }, 401);
      const key = account.id;
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT payload, updatedAt FROM sync_store WHERE key=?').bind(key).first();
        if (!row) return json({ key, clients: [], services: [], projects: [], updatedAt: null, empty: true });
        try { return json({ key, updatedAt: row.updatedAt, ...JSON.parse(row.payload) }); }
        catch { return json({ error: 'Datos sincronizados dañados.' }, 500); }
      }
      if (request.method === 'POST' || request.method === 'PUT') {
        const data = await bodyJson(request);
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'El contenido de sincronización no es válido.' }, 400);
        for (const field of ['clients', 'services', 'projects', 'deletedClientIds', 'deletedProjectIds']) if (data[field] !== undefined && !Array.isArray(data[field])) return json({ error: `El campo ${field} debe ser una lista.` }, 400);
        const prior = await env.DB.prepare('SELECT payload FROM sync_store WHERE key=?').bind(key).first();
        let previous = {};
        try { previous = prior ? JSON.parse(prior.payload) : {}; } catch (_) {}
        const merge = (left, right) => {
          const items = new Map();
          for (const item of [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]) {
            const id = String(item?.id || ''); if (!id) continue;
            const old = items.get(id);
            if (!old || Date.parse(item.updatedAt || 0) >= Date.parse(old.updatedAt || 0)) items.set(id, item);
          }
          return [...items.values()];
        };
        const deletedClientIds = [...new Set([...(previous.deletedClientIds || []), ...(data.deletedClientIds || [])])];
        const deletedProjectIds = [...new Set([...(previous.deletedProjectIds || []), ...(data.deletedProjectIds || [])])];
        const clients = merge(previous.clients, data.clients).filter(x => !deletedClientIds.includes(String(x.id)));
        const projects = merge(previous.projects, data.projects).filter(x => !deletedProjectIds.includes(String(x.id)));
        const services = merge(previous.services, data.services);
        const now = new Date().toISOString();
        const payload = JSON.stringify({ clients, services, projects, deletedClientIds, deletedProjectIds, meta: { updatedAt: now, device: String(request.headers.get('X-Device-Id') || '').slice(0, 100) } });
        await env.DB.prepare('INSERT OR REPLACE INTO sync_store(key,payload,updatedAt,device) VALUES(?,?,?,?)').bind(key, payload, now, request.headers.get('X-Device-Id') || 'unknown').run();
        return json({ ok: true, updatedAt: now, count: clients.length });
      }
      return json({ error: 'Método no permitido.' }, 405);
    }
    return json({ error: 'No encontrado.' }, 404);
  }
};
