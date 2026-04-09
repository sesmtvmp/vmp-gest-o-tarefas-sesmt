import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = await kv.get('sst:data');

    if (!data) {
      return res.status(200).json({
        cfg: {
          siteTitle: 'SST Manager',
          sub: 'Gestão de Segurança do Trabalho',
          hdr: 'SST Manager',
          company: 'Empresa SST',
          ftr: '© 2024 Empresa SST — Sistema de Gestão de SST',
          ver: 'v1.0.0',
          email: 'admin@empresa.com',
          accent: '#3b82f6',
          units: ['Unidade A', 'Unidade B', 'Unidade C']
        },
        users: [
          {
            id: 'u1', un: 'admin', pw: 'sesmtvmp', name: 'Administrador',
            turno: 'diurno', units: ['Unidade A', 'Unidade B', 'Unidade C'],
            p: { changeSelf: true, changeAll: true, addObs: true, editTask: true, manageTask: true, deleteTask: true, isAdmin: true },
            active: true
          }
        ],
        tasks: [],
        messages: [],
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[GET /api/data]', err);
    return res.status(500).json({ error: 'Failed to load data', detail: err.message });
  }
}
