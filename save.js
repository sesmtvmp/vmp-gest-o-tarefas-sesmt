import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sst-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple secret check — set SST_SECRET as Vercel env var
  const secret = process.env.SST_SECRET;
  if (secret && req.headers['x-sst-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid body' });
    }

    const payload = {
      cfg: body.cfg || {},
      users: body.users || [],
      tasks: body.tasks || [],
      messages: body.messages || [],
      updatedAt: new Date().toISOString()
    };

    await kv.set('sst:data', payload);

    return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
  } catch (err) {
    console.error('[POST /api/save]', err);
    return res.status(500).json({ error: 'Failed to save data', detail: err.message });
  }
}
