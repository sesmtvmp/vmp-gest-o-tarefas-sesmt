// GET /api/data
// Reads sst:data from Upstash Redis via HTTP REST API.
// Env vars set automatically when you connect Upstash on Vercel Marketplace:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Running locally or Upstash not connected yet — return empty state
    return res.status(200).json({ _empty: true });
  }

  try {
    // Upstash REST: GET https://<url>/get/<key>
    const r = await fetch(`${url}/get/sst:data`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!r.ok) throw new Error(`Upstash HTTP ${r.status}`);

    const json = await r.json();

    // Upstash returns { result: "<json-string>" } or { result: null }
    if (!json.result) {
      return res.status(200).json({ _empty: true });
    }

    const data = JSON.parse(json.result);
    return res.status(200).json(data);

  } catch (err) {
    console.error('[GET /api/data]', err.message);
    return res.status(500).json({ error: 'Failed to load', detail: err.message });
  }
}
