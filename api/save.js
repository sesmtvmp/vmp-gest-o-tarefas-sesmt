// api/save.js — CommonJS (Vercel Serverless Function)
const https = require('https');
const url_module = require('url');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel KV usa KV_REST_API_URL e KV_REST_API_TOKEN
  const REDIS_URL   = process.env.KV_REST_API_URL
                   || process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN
                   || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured — KV_REST_API_URL/TOKEN not found' });
  }

  try {
    const body = req.body;
    const updatedAt = new Date().toISOString();

    if (typeof body.chunk_index === 'number') {
      // Chunk de colaboradores
      const { chunk_index, chunk_total, colaboradores } = body;
      await redisSet(REDIS_URL, REDIS_TOKEN, `sst:colabs:chunk:${chunk_index}`, JSON.stringify(colaboradores));
      await redisSet(REDIS_URL, REDIS_TOKEN, 'sst:colabs:meta', JSON.stringify({ chunk_total, updatedAt }));
      return res.status(200).json({ ok: true, chunk_index, updatedAt });
    } else {
      // Payload principal sem colaboradores
      const { colaboradores, ...mainPayload } = body;
      mainPayload.updatedAt = updatedAt;
      await redisSet(REDIS_URL, REDIS_TOKEN, 'sst:data', JSON.stringify(mainPayload));
      return res.status(200).json({ ok: true, updatedAt });
    }

  } catch (e) {
    console.error('[save error]', e.message);
    return res.status(500).json({ error: e.message });
  }
};

function redisSet(redisUrl, token, key, value) {
  return new Promise((resolve, reject) => {
    const parsed = url_module.parse(redisUrl);
    const bodyData = JSON.stringify(['SET', key, value]);

    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.path || '/',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyData),
      },
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        } else {
          reject(new Error(`Redis SET failed (${resp.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyData);
    req.end();
  });
}
