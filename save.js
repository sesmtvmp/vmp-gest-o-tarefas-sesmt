// api/save.js
// Salva dados no Upstash Redis (Vercel KV)
// Suporta payload principal + chunks de colaboradores separados
// para contornar o limite de 4.5 MB da Vercel por requisição.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Redis not configured' });

  try {
    const body = req.body;
    const updatedAt = new Date().toISOString();

    // Decide o que veio no payload:
    // - chunk_index presente  → é um chunk de colaboradores
    // - caso contrário        → é o payload principal (sem colaboradores)

    if (typeof body.chunk_index === 'number') {
      // ── Chunk de colaboradores ─────────────────────────────────────
      const { chunk_index, chunk_total, colaboradores } = body;
      const key = `sst:colabs:chunk:${chunk_index}`;
      const metaKey = 'sst:colabs:meta';

      await kv(url, token, 'SET', key, JSON.stringify(colaboradores));

      // Atualiza metadados do chunk (total de chunks)
      await kv(url, token, 'SET', metaKey, JSON.stringify({ chunk_total, updatedAt }));

      return res.status(200).json({ ok: true, chunk_index, updatedAt });

    } else {
      // ── Payload principal (sem colaboradores) ──────────────────────
      const { colaboradores, ...mainPayload } = body;
      mainPayload.updatedAt = updatedAt;

      await kv(url, token, 'SET', 'sst:data', JSON.stringify(mainPayload));

      return res.status(200).json({ ok: true, updatedAt });
    }

  } catch (e) {
    console.error('[save]', e);
    return res.status(500).json({ error: e.message });
  }
}

async function kv(url, token, cmd, key, value) {
  const body = value !== undefined ? [cmd, key, value] : [cmd, key];
  const r = await fetch(`${url}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Redis ${cmd} failed: ${r.status}`);
  return r.json();
}
