module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return res.status(200).json({ _empty: true });

  try {
    const r = await fetch(url + '/get/sst:data', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Redis ' + r.status);
    const j = await r.json();
    if (!j.result) return res.status(200).json({ _empty: true });

    // O valor pode ser string simples ou string duplo-codificada — trata os dois casos
    let value = j.result;
    // Se for string, faz parse
    if (typeof value === 'string') value = JSON.parse(value);
    // Se ainda for string (duplo encode), faz parse novamente
    if (typeof value === 'string') value = JSON.parse(value);

    return res.status(200).json(value);
  } catch (e) {
    console.error('[data]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
