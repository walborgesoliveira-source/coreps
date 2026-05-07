import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Campo from '../components/Campo';

const TIPOS = ['Cliente', 'Empresa', 'Prestador', 'Fornecedor', 'Parceiro', 'Vendedor', 'Interno'];
const STATUS = ['ativo', 'inativo', 'bloqueado'];
const VAZIO = { nome: '', nome_fantasia: '', email: '', telefone: '', whatsapp: '', documento: '', tipo_principal: 'Cliente', origem: '', status: 'ativo', observacoes: '', tipos: [] };

export default function EntidadeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const editando = Boolean(id);

  useEffect(() => {
    if (!editando) return;
    api.get(`/entidades/${id}`).then(r => {
      const { tipos, equipamentos, servicos, ...rest } = r.data;
      setForm({ ...VAZIO, ...rest, tipos: tipos || [] });
    }).catch(() => setErro('Erro ao carregar entidade.'));
  }, [id, editando]);

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function toggleTipo(tipo) {
    setForm(f => ({
      ...f,
      tipos: f.tipos.includes(tipo) ? f.tipos.filter(t => t !== tipo) : [...f.tipos, tipo],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      if (editando) {
        await api.put(`/entidades/${id}`, form);
      } else {
        await api.post('/entidades', form);
      }
      navigate('/entidades');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/entidades')} style={{ background: '#e5e7eb', color: '#374151' }}>← Voltar</button>
        <h2>{editando ? 'Editar Entidade' : 'Nova Entidade'}</h2>
      </div>

      {erro && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{erro}</div>}

      <form onSubmit={salvar} style={{ background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Campo label="Nome" required>
            <input value={form.nome} onChange={e => set('nome', e.target.value)} required />
          </Campo>
          <Campo label="Nome fantasia">
            <input value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)} />
          </Campo>
          <Campo label="Tipo principal" required>
            <select value={form.tipo_principal} onChange={e => set('tipo_principal', e.target.value)}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="CPF / CNPJ">
            <input value={form.documento} onChange={e => set('documento', e.target.value)} />
          </Campo>
          <Campo label="E-mail">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </Campo>
          <Campo label="Telefone">
            <input value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          </Campo>
          <Campo label="WhatsApp">
            <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </Campo>
          <Campo label="Origem">
            <input value={form.origem} onChange={e => set('origem', e.target.value)} placeholder="Indicação, site, ligação..." />
          </Campo>
        </div>

        <Campo label="Tipos adicionais">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {TIPOS.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '4px 10px', borderRadius: 999, border: '1px solid', borderColor: form.tipos.includes(t) ? '#2563eb' : '#d1d5db', background: form.tipos.includes(t) ? '#eff6ff' : '#fff', color: form.tipos.includes(t) ? '#2563eb' : '#374151' }}>
                <input type="checkbox" hidden checked={form.tipos.includes(t)} onChange={() => toggleTipo(t)} />
                {t}
              </label>
            ))}
          </div>
        </Campo>

        <Campo label="Observações">
          <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} />
        </Campo>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" className="primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" onClick={() => navigate('/entidades')} style={{ background: '#e5e7eb', color: '#374151' }}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
