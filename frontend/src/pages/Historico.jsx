import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_COR  = { aberto: '#fef3c7', em_andamento: '#dbeafe', concluido: '#dcfce7' };
const STATUS_TEXT = { aberto: '#92400e', em_andamento: '#1e40af', concluido: '#166534' };

export default function Historico() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    const params = { page, limit };
    if (filtroStatus) params.status = filtroStatus;
    api.get('/historico', { params }).then(r => setRows(r.data)).catch(() => {});
  }, [filtroStatus, page]);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Atendimentos</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(1); }} style={{ maxWidth: 200 }}>
          <option value="">Todos os status</option>
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && <div style={{ color: '#9ca3af', padding: 32, textAlign: 'center' }}>Nenhum atendimento.</div>}
        {rows.map(r => (
          <div
            key={r.id}
            onClick={() => navigate(`/entidades/${r.entidade_id}`)}
            style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {r.tipo || 'Atendimento'} — <span style={{ color: '#2563eb' }}>{r.entidade_nome || `Entidade #${r.entidade_id}`}</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', marginBottom: r.solucao ? 4 : 0 }}>{r.descricao}</div>
              {r.solucao && <div style={{ fontSize: 12, color: '#059669' }}>Solução: {r.solucao}</div>}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                {r.responsavel && `${r.responsavel} · `}
                {new Date(r.atendido_em).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div style={{ alignSelf: 'start' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: STATUS_COR[r.status], color: STATUS_TEXT[r.status] }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', fontSize: 14 }}>
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Anterior</button>
        <span>Página {page}</span>
        <button onClick={() => setPage(p => p+1)} disabled={rows.length < limit}>Próxima</button>
      </div>
    </div>
  );
}
