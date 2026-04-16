// POST /api/save
// Writes sst:data to Upstash Redis via HTTP REST API.
// Env vars set automatically when you connect Upstash on Vercel Marketplace:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Upstash not connected — acknowledge but don't crash
    return res.status(200).json({ ok: true, warn: 'Upstash not configured, data not persisted' });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const payload = {
      cfg:      body.cfg      || {},
      users:    body.users    || [],
      tasks:    body.tasks    || [],
      messages: body.messages || [],
      updatedAt: new Date().toISOString()
    };

    const valueStr = JSON.stringify(payload);

    // Upstash REST: POST https://<url>/set/<key>  with body = the value
    const r = await fetch(`${url}/set/sst:data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(valueStr)   // Upstash expects the value as a JSON-encoded string
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Upstash HTTP ${r.status}: ${errText}`);
    }

    return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });

  } catch (err) {
    console.error('[POST /api/save]', err.message);
    return res.status(500).json({ error: 'Failed to save', detail: err.message });
  }
}
