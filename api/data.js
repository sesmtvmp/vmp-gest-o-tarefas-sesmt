// api/data.js — CommonJS (Vercel Serverless Function)
const https = require('https');
const url_module = require('url');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    // 1. Carrega payload principal
    const mainResult = await redisGet(REDIS_URL, REDIS_TOKEN, 'sst:data');
    if (mainResult === null) {
      return res.status(200).json({ _empty: true });
    }

    let main;
    try { main = JSON.parse(mainResult); }
    catch (e) { return res.status(200).json({ _empty: true }); }

    // 2. Tenta carregar chunks de colaboradores
    let colaboradores = main.colaboradores || [];
    delete main.colaboradores;

    const metaResult = await redisGet(REDIS_URL, REDIS_TOKEN, 'sst:colabs:meta');
    if (metaResult) {
      try {
        const meta = JSON.parse(metaResult);
        const chunk_total = meta.chunk_total || 0;
        if (chunk_total > 0) {
          const chunkValues = await Promise.all(
            Array.from({ length: chunk_total }, (_, i) =>
              redisGet(REDIS_URL, REDIS_TOKEN, `sst:colabs:chunk:${i}`)
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

function redisGet(redisUrl, token, key) {
  return new Promise((resolve, reject) => {
    const parsed = url_module.parse(redisUrl);
    const bodyData = JSON.stringify(['GET', key]);

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
          try {
            const json = JSON.parse(data);
            // Upstash retorna { result: "valor" } ou { result: null }
            resolve(json.result !== undefined ? json.result : null);
          } catch {
            resolve(null);
          }
        } else {
          reject(new Error(`Redis GET failed (${resp.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyData);
    req.end();
  });
}
