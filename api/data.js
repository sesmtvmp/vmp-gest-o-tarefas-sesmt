module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) return res.status(200).json({ _empty: true });

  try {
    const r = await fetch(url + '/get/sst:data', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Upstash ' + r.status);
    const j = await r.json();
    if (!j.result) return res.status(200).json({ _empty: true });
    return res.status(200).json(JSON.parse(j.result));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
