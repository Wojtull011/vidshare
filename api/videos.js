// GET    /api/videos            -> lista filmów
// POST   /api/videos            -> zapis metadanych po wysłaniu pliku
// DELETE /api/videos?id=...     -> usunięcie (wymaga hasła admina w nagłówku x-admin-password)
import { list, put, del, head } from '@vercel/blob';

const CATEGORIES = ['Inne', 'Gry', 'Muzyka', 'Sport', 'Śmieszne', 'Edukacja', 'Vlog', 'Motoryzacja'];
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const metas = await listAll('meta/');
      const items = await Promise.all(
        metas.map(async (b) => {
          try {
            const r = await fetch(b.url, { cache: 'no-store' });
            return r.ok ? await r.json() : null;
          } catch { return null; }
        })
      );
      const videos = items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
      return res.status(200).json({ videos, categories: CATEGORIES });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const url = String(body.url || '');
      if (!/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/videos\//i.test(url)) {
        return res.status(400).json({ error: 'Nieprawidłowy adres pliku' });
      }
      // upewnij się, że plik naprawdę istnieje w naszym magazynie
      const info = await head(url).catch(() => null);
      if (!info) return res.status(400).json({ error: 'Plik nie istnieje w magazynie' });

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const meta = {
        id,
        url,
        title: clean(body.title, 100) || 'Bez tytułu',
        description: clean(body.description, 1000),
        category: CATEGORIES.includes(body.category) ? body.category : 'Inne',
        author: clean(body.author, 40) || 'Anonim',
        duration: Math.max(0, Number(body.duration) || 0),
        size: info.size,
        createdAt: Date.now(),
      };
      await put(`meta/${id}.json`, JSON.stringify(meta), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      return res.status(201).json(meta);
    }

    if (req.method === 'DELETE') {
      const admin = process.env.ADMIN_PASSWORD;
      if (!admin) return res.status(403).json({ error: 'Usuwanie wyłączone (brak ADMIN_PASSWORD)' });
      if (req.headers['x-admin-password'] !== admin) return res.status(401).json({ error: 'Złe hasło admina' });
      const id = String(req.query.id || '').replace(/[^a-z0-9]/gi, '');
      const metas = await list({ prefix: `meta/${id}.json`, limit: 1 });
      const m = metas.blobs[0];
      if (!m) return res.status(404).json({ error: 'Nie znaleziono' });
      const meta = await (await fetch(m.url, { cache: 'no-store' })).json();
      await del([m.url, meta.url].filter(Boolean));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const msg = /BLOB_READ_WRITE_TOKEN|No token found/i.test(String(err))
      ? 'Brak połączonego magazynu Vercel Blob (BLOB_READ_WRITE_TOKEN).'
      : err.message || 'Błąd serwera';
    return res.status(500).json({ error: msg });
  }
}
