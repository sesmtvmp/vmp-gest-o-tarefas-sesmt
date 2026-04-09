// GET /api/data — lê sst:data do Upstash Redis
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json({ _empty: true });
  }

  try {
    const r = await fetch(url + '/get/sst:data', {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!r.ok) throw new Error('Upstash HTTP ' + r.status);

    const json = await r.json();

    if (!json.result) {
      return res.status(200).json({ _empty: true });
    }

    const data = JSON.parse(json.result);
    return res.status(200).json(data);

  } catch (err) {
    console.error('[GET /api/data]', err.message);
    return res.status(500).json({ error: 'Failed to load', detail: err.message });
  }
};
