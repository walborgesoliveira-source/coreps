import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Entidades() {
  const navigate = useNavigate();
  const [dados, setDados] = useState({ data: [], total: 0 });
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/entidades', { params: { q: busca || undefined, page, limit: 20 } })
      .then(r => setDados(r.data))
      .catch(() => {});
  }, [busca, page]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Entidades</h2>
        <button className="primary" onClick={() => navigate('/entidades/novo')}>+ Nova entidade</button>
      </div>
      <input
        placeholder="Buscar por nome, e-mail ou documento..."
        value={busca}
        onChange={e => { setBusca(e.target.value); setPage(1); }}
        style={{ marginBottom: 16, maxWidth: 400 }}
      />
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th>Telefone</th><th>Status</th></tr>
          </thead>
          <tbody>
            {dados.data.map(e => (
              <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/entidades/${e.id}`)}>
                <td>{e.nome}</td>
                <td>{e.tipo_principal}</td>
                <td>{e.telefone || e.whatsapp || '—'}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
              </tr>
            ))}
            {dados.data.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Nenhum resultado</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Anterior</button>
        <span>Página {page} — {dados.total} registro(s)</span>
        <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= dados.total}>Próxima</button>
      </div>
    </div>
  );
}
