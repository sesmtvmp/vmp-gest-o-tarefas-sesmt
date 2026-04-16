// api/data.js — CommonJS (Vercel Serverless Function)
// Lê dados do Upstash Redis.
// Reconstrói colaboradores a partir dos chunks salvos separadamente.

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    // 1. Carrega payload principal
    const mainResult = await upstashGet(url, token, 'sst:data');
    if (mainResult === null) {
      return res.status(200).json({ _empty: true });
    }

    let main;
    try { main = JSON.parse(mainResult); }
    catch (e) { return res.status(200).json({ _empty: true }); }

    // 2. Carrega metadados dos chunks de colaboradores
    let colaboradores = main.colaboradores || []; // fallback legado
    delete main.colaboradores;

    const metaResult = await upstashGet(url, token, 'sst:colabs:meta');
    if (metaResult) {
      try {
        const meta = JSON.parse(metaResult);
        const chunk_total = meta.chunk_total || 0;

        if (chunk_total > 0) {
          // Carrega todos os chunks em paralelo
          const chunkValues = await Promise.all(
            Array.from({ length: chunk_total }, (_, i) =>
              upstashGet(url, token, `sst:colabs:chunk:${i}`)
            )
          );
          colaboradores = chunkValues.flatMap(v => {
            if (!v) return [];
            try { return JSON.parse(v); }
            catch { return []; }
          });
        }
      } catch (e) {
        console.warn('[data] meta parse error:', e.message);
      }
    }

    return res.status(200).json({ ...main, colaboradores });

  } catch (e) {
    console.error('[data error]', e.message);
    return res.status(500).json({ error: e.message });
  }
};

async function upstashGet(url, token, key) {
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => String(r.status));
    throw new Error(`Upstash GET failed (${r.status}): ${txt}`);
  }
  const json = await r.json();
  // Upstash retorna { result: "valor" } ou { result: null }
  return json.result !== undefined ? json.result : null;
}
