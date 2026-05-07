import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import Campo from '../components/Campo';

const TIPOS_EQ = ['Desktop', 'Notebook', 'Servidor', 'Impressora', 'Switch', 'Roteador', 'Câmera', 'Tablet', 'Outro'];

export default function EntidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entidade, setEntidade] = useState(null);
  const [erro, setErro] = useState('');

  // Modais
  const [showEq, setShowEq] = useState(false);
  const [showAt, setShowAt] = useState(false);
  const [eqForm, setEqForm] = useState({ tipo_equipamento: '', marca: '', modelo: '', numero_serie: '', sistema_operacional: '', ip: '', observacoes: '' });
  const [atForm, setAtForm] = useState({ tipo: '', descricao: '', solucao: '', responsavel: '', status: 'aberto', equipamento_id: '' });
  const [saving, setSaving] = useState(false);

  async function carregar() {
    try {
      const r = await api.get(`/entidades/${id}`);
      setEntidade(r.data);
    } catch {
      setErro('Entidade não encontrada.');
    }
  }

  useEffect(() => { carregar(); }, [id]);

  async function excluir() {
    if (!window.confirm('Excluir esta entidade?')) return;
    await api.delete(`/entidades/${id}`);
    navigate('/entidades');
  }

  async function salvarEq(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/equipamentos', { ...eqForm, entidade_id: id });
      setShowEq(false);
      setEqForm({ tipo_equipamento: '', marca: '', modelo: '', numero_serie: '', sistema_operacional: '', ip: '', observacoes: '' });
      carregar();
    } finally { setSaving(false); }
  }

  async function salvarAt(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/historico', { ...atForm, entidade_id: id, equipamento_id: atForm.equipamento_id || null });
      setShowAt(false);
      setAtForm({ tipo: '', descricao: '', solucao: '', responsavel: '', status: 'aberto', equipamento_id: '' });
      carregar();
    } finally { setSaving(false); }
  }

  if (erro) return <div style={{ color: '#dc2626', padding: 24 }}>{erro}</div>;
  if (!entidade) return <div style={{ padding: 24, color: '#9ca3af' }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/entidades')} style={{ background: '#e5e7eb', color: '#374151' }}>← Voltar</button>
        <h2 style={{ flex: 1 }}>{entidade.nome}</h2>
        <button onClick={() => navigate(`/entidades/${id}/editar`)} style={{ background: '#f59e0b', color: '#fff' }}>Editar</button>
        <button className="danger" onClick={excluir}>Excluir</button>
      </div>

      {/* Dados */}
      <Section titulo="Dados gerais">
        <Grid>
          <Info label="Tipo">{entidade.tipo_principal}</Info>
          <Info label="Status"><span className={`badge ${entidade.status}`}>{entidade.status}</span></Info>
          <Info label="Documento">{entidade.documento || '—'}</Info>
          <Info label="E-mail">{entidade.email || '—'}</Info>
          <Info label="Telefone">{entidade.telefone || '—'}</Info>
          <Info label="WhatsApp">{entidade.whatsapp || '—'}</Info>
          <Info label="Origem">{entidade.origem || '—'}</Info>
          <Info label="Cadastro">{new Date(entidade.criado_em).toLocaleDateString('pt-BR')}</Info>
        </Grid>
        {entidade.tipos?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>TIPOS ADICIONAIS: </span>
            {entidade.tipos.map(t => <span key={t} className="badge ativo" style={{ marginLeft: 6 }}>{t}</span>)}
          </div>
        )}
        {entidade.observacoes && <div style={{ marginTop: 12, fontSize: 14, color: '#374151', background: '#f9fafb', padding: 10, borderRadius: 6 }}>{entidade.observacoes}</div>}
      </Section>

      {/* Equipamentos */}
      <Section titulo="Equipamentos" acao={{ label: '+ Adicionar', onClick: () => setShowEq(true) }}>
        {entidade.equipamentos?.length === 0 && <Vazio>Nenhum equipamento cadastrado.</Vazio>}
        {entidade.equipamentos?.map(eq => (
          <div key={eq.id} style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
            <strong>{eq.tipo_equipamento || 'Equipamento'}</strong>
            {eq.marca && ` — ${eq.marca}`}{eq.modelo && ` ${eq.modelo}`}
            {eq.ip && <span style={{ marginLeft: 10, color: '#6b7280' }}>IP: {eq.ip}</span>}
            {eq.numero_serie && <span style={{ marginLeft: 10, color: '#6b7280' }}>S/N: {eq.numero_serie}</span>}
          </div>
        ))}
      </Section>

      {/* Histórico */}
      <Section titulo="Histórico de atendimentos" acao={{ label: '+ Registrar', onClick: () => setShowAt(true) }}>
        {entidade.servicos?.length === 0 && entidade.equipamentos && <></>}
        {!entidade.historico && <Vazio>Carregando...</Vazio>}
        <HistoricoTabela entidade_id={id} equipamentos={entidade.equipamentos} />
      </Section>

      {/* Modal equipamento */}
      {showEq && (
        <Modal titulo="Novo equipamento" onClose={() => setShowEq(false)}>
          <form onSubmit={salvarEq}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Campo label="Tipo">
                <select value={eqForm.tipo_equipamento} onChange={e => setEqForm(f => ({ ...f, tipo_equipamento: e.target.value }))}>
                  <option value="">Selecione</option>
                  {TIPOS_EQ.map(t => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Marca"><input value={eqForm.marca} onChange={e => setEqForm(f => ({ ...f, marca: e.target.value }))} /></Campo>
              <Campo label="Modelo"><input value={eqForm.modelo} onChange={e => setEqForm(f => ({ ...f, modelo: e.target.value }))} /></Campo>
              <Campo label="Nº de série"><input value={eqForm.numero_serie} onChange={e => setEqForm(f => ({ ...f, numero_serie: e.target.value }))} /></Campo>
              <Campo label="Sistema operacional"><input value={eqForm.sistema_operacional} onChange={e => setEqForm(f => ({ ...f, sistema_operacional: e.target.value }))} /></Campo>
              <Campo label="IP"><input value={eqForm.ip} onChange={e => setEqForm(f => ({ ...f, ip: e.target.value }))} /></Campo>
            </div>
            <Campo label="Observações"><textarea value={eqForm.observacoes} onChange={e => setEqForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></Campo>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </form>
        </Modal>
      )}

      {/* Modal atendimento */}
      {showAt && (
        <Modal titulo="Registrar atendimento" onClose={() => setShowAt(false)}>
          <form onSubmit={salvarAt}>
            <Campo label="Tipo">
              <select value={atForm.tipo} onChange={e => setAtForm(f => ({ ...f, tipo: e.target.value }))}>
                {['', 'Suporte', 'Instalação', 'Manutenção', 'Visita', 'Remoto', 'Consultoria', 'Outro'].map(t => <option key={t} value={t}>{t || 'Selecione'}</option>)}
              </select>
            </Campo>
            <Campo label="Equipamento">
              <select value={atForm.equipamento_id} onChange={e => setAtForm(f => ({ ...f, equipamento_id: e.target.value }))}>
                <option value="">Nenhum</option>
                {entidade.equipamentos?.map(eq => <option key={eq.id} value={eq.id}>{eq.tipo_equipamento} {eq.marca} {eq.modelo}</option>)}
              </select>
            </Campo>
            <Campo label="Descrição" required><textarea required value={atForm.descricao} onChange={e => setAtForm(f => ({ ...f, descricao: e.target.value }))} rows={3} /></Campo>
            <Campo label="Solução"><textarea value={atForm.solucao} onChange={e => setAtForm(f => ({ ...f, solucao: e.target.value }))} rows={2} /></Campo>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Campo label="Responsável"><input value={atForm.responsavel} onChange={e => setAtForm(f => ({ ...f, responsavel: e.target.value }))} /></Campo>
              <Campo label="Status">
                <select value={atForm.status} onChange={e => setAtForm(f => ({ ...f, status: e.target.value }))}>
                  {['aberto', 'em_andamento', 'concluido'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Campo>
            </div>
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Section({ titulo, acao, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</h3>
        {acao && <button className="primary" onClick={acao.onClick} style={{ fontSize: 13, padding: '6px 14px' }}>{acao.label}</button>}
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '12px 20px' }}>{children}</div>;
}

function Info({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827' }}>{children}</div>
    </div>
  );
}

function Vazio({ children }) {
  return <div style={{ color: '#9ca3af', fontSize: 14, padding: '12px 0' }}>{children}</div>;
}

function HistoricoTabela({ entidade_id }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get('/historico', { params: { entidade_id, limit: 50 } }).then(r => setRows(r.data)).catch(() => {});
  }, [entidade_id]);

  if (rows.length === 0) return <Vazio>Nenhum atendimento registrado.</Vazio>;

  const cor = { aberto: '#fef3c7', em_andamento: '#dbeafe', concluido: '#dcfce7' };
  const txt = { aberto: '#92400e', em_andamento: '#1e40af', concluido: '#166534' };

  return rows.map(r => (
    <div key={r.id} style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong>{r.tipo || 'Atendimento'}</strong>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: cor[r.status], color: txt[r.status] }}>{r.status}</span>
      </div>
      <div style={{ color: '#374151', marginBottom: r.solucao ? 4 : 0 }}>{r.descricao}</div>
      {r.solucao && <div style={{ color: '#059669', fontSize: 12 }}>Solução: {r.solucao}</div>}
      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
        {r.responsavel && `Resp: ${r.responsavel} · `}
        {new Date(r.atendido_em).toLocaleDateString('pt-BR')}
      </div>
    </div>
  ));
}
