module.exports = function handler(req, res) {
  // Lista todas as env vars que começam com UPSTASH ou KV
  const vars = {};
  Object.keys(process.env).forEach(k => {
    if (k.includes('UPSTASH') || k.includes('KV_') || k.includes('REDIS')) {
      vars[k] = process.env[k] ? '✅ SET ('+process.env[k].slice(0,20)+'...)' : '❌ EMPTY';
    }
  });
  res.status(200).json({ env_vars_found: vars, total: Object.keys(vars).length });
};
