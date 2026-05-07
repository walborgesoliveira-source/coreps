import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Equipamentos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/equipamentos').then(r => setRows(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Equipamentos</h2>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Tipo</th><th>Marca / Modelo</th><th>S/N</th><th>IP</th><th>S.O.</th><th>Entidade</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Carregando...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Nenhum equipamento cadastrado.</td></tr>}
            {rows.map(eq => (
              <tr key={eq.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/entidades/${eq.entidade_id}`)}>
                <td>{eq.tipo_equipamento || '—'}</td>
                <td>{[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}</td>
                <td>{eq.numero_serie || '—'}</td>
                <td><code style={{ fontSize: 12 }}>{eq.ip || '—'}</code></td>
                <td>{eq.sistema_operacional || '—'}</td>
                <td style={{ color: '#2563eb' }}>#{eq.entidade_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
