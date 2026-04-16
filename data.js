// api/data.js
// Lê dados do Upstash Redis (Vercel KV)
// Reconstrói colaboradores a partir dos chunks salvos separadamente.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Redis not configured' });

  try {
    // 1. Carrega payload principal
    const mainRaw = await kv(url, token, 'GET', 'sst:data');
    if (!mainRaw || mainRaw.result === null) {
      return res.status(200).json({ _empty: true });
    }

    const main = JSON.parse(mainRaw.result);

    // 2. Carrega metadados dos chunks de colaboradores
    const metaRaw = await kv(url, token, 'GET', 'sst:colabs:meta');
    let colaboradores = main.colaboradores || []; // fallback: se não tiver chunks, usa o que estava no main

    if (metaRaw && metaRaw.result) {
      const meta = JSON.parse(metaRaw.result);
      const { chunk_total } = meta;

      if (chunk_total > 0) {
        // Carrega todos os chunks em paralelo
        const chunkKeys = Array.from({ length: chunk_total }, (_, i) => `sst:colabs:chunk:${i}`);
        const chunkResults = await Promise.all(
          chunkKeys.map(key => kv(url, token, 'GET', key))
        );

        colaboradores = chunkResults.flatMap(r => {
          if (!r || r.result === null) return [];
          try { return JSON.parse(r.result); }
          catch { return []; }
        });
      }
    }

    // Remove colaboradores do main para não duplicar (legado)
    delete main.colaboradores;

    return res.status(200).json({ ...main, colaboradores });

  } catch (e) {
    console.error('[data]', e);
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
