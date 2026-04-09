module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) return res.status(200).json({ ok: true, warn: 'no upstash' });

  try {
    const body = req.body;
    const payload = {
      cfg:       body.cfg      || {},
      users:     body.users    || [],
      tasks:     body.tasks    || [],
      messages:  body.messages || [],
      updatedAt: new Date().toISOString()
    };
    const r = await fetch(url + '/set/sst:data', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(payload))
    });
    if (!r.ok) throw new Error('Upstash ' + r.status + ' ' + await r.text());
    return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
  } catch (e) {
    console.error('[save]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
