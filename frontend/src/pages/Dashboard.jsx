import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ entidades: 0, equipamentos: 0, abertos: 0, servicos: 0 });

  useEffect(() => {
    Promise.allSettled([
      api.get('/entidades?limit=1'),
      api.get('/equipamentos'),
      api.get('/historico?status=aberto&limit=100'),
      api.get('/servicos'),
    ]).then(([e, eq, h, s]) => {
      setStats({
        entidades:   e.status  === 'fulfilled' ? (e.value.data.total ?? 0)    : 0,
        equipamentos: eq.status === 'fulfilled' ? (eq.value.data.length ?? 0)  : 0,
        abertos:     h.status  === 'fulfilled' ? (h.value.data.length ?? 0)   : 0,
        servicos:    s.status  === 'fulfilled' ? (s.value.data.length ?? 0)   : 0,
      });
    });
  }, []);

  const cards = [
    { label: 'Entidades',         value: stats.entidades,    cor: '#2563eb', path: '/entidades' },
    { label: 'Equipamentos',      value: stats.equipamentos, cor: '#7c3aed', path: '/equipamentos' },
    { label: 'Atendimentos abertos', value: stats.abertos,  cor: '#dc2626', path: '/historico' },
    { label: 'Serviços',          value: stats.servicos,     cor: '#059669', path: '/servicos' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 22 }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 20, marginBottom: 32 }}>
        {cards.map(({ label, value, cor, path }) => (
          <div
            key={label}
            onClick={() => navigate(path)}
            style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderTop: `4px solid ${cor}`, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: cor }}>{value}</div>
          </div>
        ))}
      </div>
      <RecentesAtendimentos />
    </div>
  );
}

function RecentesAtendimentos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/historico?limit=5').then(r => setRows(r.data)).catch(() => {});
  }, []);

  if (rows.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <h3 style={{ marginBottom: 16, fontSize: 15 }}>Atendimentos recentes</h3>
      {rows.map(r => (
        <div
          key={r.id}
          onClick={() => navigate(`/entidades/${r.entidade_id}`)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: 13 }}
        >
          <span><strong>{r.entidade_nome || `#${r.entidade_id}`}</strong> — {r.tipo || 'Atendimento'}: {r.descricao?.slice(0, 60)}{r.descricao?.length > 60 ? '...' : ''}</span>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 16, whiteSpace: 'nowrap' }}>{new Date(r.atendido_em).toLocaleDateString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}
