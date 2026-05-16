import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Campo from '../components/Campo';
import Modal from '../components/Modal';

const STATUS = [
  'Pendente',
  'Aprovado',
  'Recusado',
  'Reagendado',
  'Cancelado',
  'Concluído',
  'Não compareceu',
];

const STATUS_CLASS = {
  Pendente: 'pendente',
  Aprovado: 'aprovado',
  Recusado: 'recusado',
  Reagendado: 'reagendado',
  Cancelado: 'cancelado',
  Concluído: 'concluido',
  'Não compareceu': 'faltou',
};

function formatarData(valor) {
  if (!valor) return '-';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(valor) {
  return valor ? valor.slice(0, 5) : '-';
}

function formatarContato(row) {
  return row.whatsapp || row.telefone || row.email || row.telegram || '-';
}

function valorInicial(row) {
  return {
    status: row.status || 'Pendente',
    data_agendada: row.data_agendada?.slice(0, 10) || '',
    hora_agendada: row.hora_agendada?.slice(0, 5) || '',
    local: row.local || '',
    colaborador: row.colaborador || '',
    observacoes_gerente: row.observacoes_gerente || '',
  };
}

export default function Agendamentos() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const resumo = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  function carregar() {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (data) params.data = data;

    api.get('/agendamentos', { params })
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setErro('Nao foi possivel carregar os agendamentos.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [status, data]);

  function abrir(row) {
    setSelecionado(row);
    setForm(valorInicial(row));
    setErro('');
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    setErro('');

    try {
      const payload = {
        ...form,
        data_agendada: form.data_agendada || null,
        hora_agendada: form.hora_agendada || null,
        local: form.local || null,
      };
      await api.put(`/agendamentos/${selecionado.id}/status`, payload);
      setSelecionado(null);
      setForm(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Nao foi possivel atualizar o agendamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>Agendamentos</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Pedidos recebidos pelo site Massoterapia RJ.</p>
        </div>
        <button className="primary" onClick={() => setData(hoje)}>Hoje</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <ResumoCard label="Total filtrado" value={total} color="#2563eb" />
        <ResumoCard label="Pendentes" value={resumo.Pendente || 0} color="#d97706" />
        <ResumoCard label="Aprovados" value={resumo.Aprovado || 0} color="#059669" />
        <ResumoCard label="Reagendados" value={resumo.Reagendado || 0} color="#7c3aed" />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(160px, 220px) auto', gap: 12, alignItems: 'end' }}>
          <Campo label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <button onClick={() => { setStatus(''); setData(''); }} style={{ background: '#f3f4f6', color: '#374151', marginBottom: 14 }}>Limpar filtros</button>
        </div>
      </div>

      {erro && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{erro}</div>}

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Servico</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Colaborador</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Carregando...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Nenhum agendamento encontrado.</td></tr>}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{formatarData(row.data_agendada)}</strong>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{formatarHora(row.hora_agendada)}</div>
                </td>
                <td>
                  <strong>{row.nome_cliente}</strong>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{row.codigo}</div>
                </td>
                <td>{row.servico}</td>
                <td>{formatarContato(row)}</td>
                <td><span className={`badge status ${STATUS_CLASS[row.status] || ''}`}>{row.status}</span></td>
                <td>{row.colaborador || '-'}</td>
                <td>
                  <button onClick={() => abrir(row)} style={{ background: '#f3f4f6', color: '#374151', padding: '4px 12px', fontSize: 13 }}>Gerenciar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selecionado && form && (
        <Modal titulo={`Agendamento ${selecionado.codigo}`} onClose={() => setSelecionado(null)}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18, fontSize: 14 }}>
            <Info label="Cliente" value={selecionado.nome_cliente} />
            <Info label="Contato" value={formatarContato(selecionado)} />
            <Info label="Servico" value={selecionado.servico} />
            <Info label="Observacoes do cliente" value={selecionado.observacoes_cliente || '-'} />
          </div>

          <form onSubmit={salvar}>
            <Campo label="Status" required>
              <select required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="Data">
                <input type="date" value={form.data_agendada} onChange={(e) => setForm((f) => ({ ...f, data_agendada: e.target.value }))} />
              </Campo>
              <Campo label="Hora">
                <input type="time" value={form.hora_agendada} onChange={(e) => setForm((f) => ({ ...f, hora_agendada: e.target.value }))} />
              </Campo>
            </div>
            <Campo label="Local">
              <input value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} />
            </Campo>
            <Campo label="Colaborador">
              <input value={form.colaborador} onChange={(e) => setForm((f) => ({ ...f, colaborador: e.target.value }))} />
            </Campo>
            <Campo label="Observacoes do gerente">
              <textarea rows={4} value={form.observacoes_gerente} onChange={(e) => setForm((f) => ({ ...f, observacoes_gerente: e.target.value }))} />
            </Campo>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alteracoes'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ResumoCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <strong style={{ fontWeight: 600 }}>{value}</strong>
    </div>
  );
}
