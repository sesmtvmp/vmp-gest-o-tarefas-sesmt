// api/save.js — CommonJS (Vercel Serverless Function)
// Salva dados no Upstash Redis.
// Suporta dois tipos de payload:
//   1. Payload principal (sem colaboradores)
//   2. Chunk de colaboradores  { chunk_index, chunk_total, colaboradores }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const body = req.body;
    const updatedAt = new Date().toISOString();

    if (typeof body.chunk_index === 'number') {
      // Chunk de colaboradores
      const { chunk_index, chunk_total, colaboradores } = body;
      await upstashSet(url, token, `sst:colabs:chunk:${chunk_index}`, JSON.stringify(colaboradores));
      await upstashSet(url, token, 'sst:colabs:meta', JSON.stringify({ chunk_total, updatedAt }));
      return res.status(200).json({ ok: true, chunk_index, updatedAt });
    } else {
      // Payload principal sem colaboradores
      const { colaboradores, ...mainPayload } = body;
      mainPayload.updatedAt = updatedAt;
      await upstashSet(url, token, 'sst:data', JSON.stringify(mainPayload));
      return res.status(200).json({ ok: true, updatedAt });
    }

  } catch (e) {
    console.error('[save error]', e.message);
    return res.status(500).json({ error: e.message });
  }
};

async function upstashSet(url, token, key, value) {
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, value]),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => String(r.status));
    throw new Error(`Upstash SET failed (${r.status}): ${txt}`);
  }
  return r.json();
}
