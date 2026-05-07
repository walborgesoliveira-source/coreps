import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Campo from '../components/Campo';

const VAZIO = { nome: '', categoria: '', descricao: '', ativo: true };

export default function Servicos() {
  const [rows, setRows] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  function carregar() {
    api.get('/servicos').then(r => setRows(r.data)).catch(() => {});
  }

  useEffect(() => { carregar(); }, []);

  function abrir(servico = null) {
    setEditId(servico?.id || null);
    setForm(servico ? { nome: servico.nome, categoria: servico.categoria || '', descricao: servico.descricao || '', ativo: servico.ativo } : VAZIO);
    setShow(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/servicos/${editId}`, form);
      } else {
        await api.post('/servicos', form);
      }
      setShow(false);
      carregar();
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Serviços</h2>
        <button className="primary" onClick={() => abrir()}>+ Novo serviço</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Descrição</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Nenhum serviço cadastrado.</td></tr>}
            {rows.map(s => (
              <tr key={s.id}>
                <td><strong>{s.nome}</strong></td>
                <td>{s.categoria || '—'}</td>
                <td style={{ color: '#6b7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descricao || '—'}</td>
                <td><span className={`badge ${s.ativo ? 'ativo' : 'inativo'}`}>{s.ativo ? 'ativo' : 'inativo'}</span></td>
                <td>
                  <button onClick={() => abrir(s)} style={{ background: '#f3f4f6', color: '#374151', padding: '4px 12px', fontSize: 13 }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal titulo={editId ? 'Editar serviço' : 'Novo serviço'} onClose={() => setShow(false)}>
          <form onSubmit={salvar}>
            <Campo label="Nome" required>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </Campo>
            <Campo label="Categoria">
              <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="TI, Suporte, Consultoria..." />
            </Campo>
            <Campo label="Descrição">
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
            </Campo>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              Serviço ativo
            </label>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
