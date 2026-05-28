const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const STATUS_VALIDOS = new Set([
  'Pendente',
  'Aprovado',
  'Recusado',
  'Reagendado',
  'Cancelado',
  'Concluído',
  'Não compareceu',
  'Excluído',
]);

const STATUS_BLOQUEANTES = ['Pendente', 'Aprovado', 'Reagendado'];
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';
const capacidadePadraoConfig = Number(process.env.AGENDAMENTOS_CAPACIDADE_PADRAO || 2);
const CAPACIDADE_PADRAO_AGENDAMENTO = Number.isFinite(capacidadePadraoConfig) && capacidadePadraoConfig > 0
  ? capacidadePadraoConfig
  : 2;
let disponibilidadePronta = false;

const ESCALA_OFICIAL = {
  '2026-05-28': [
    { inicio: '12:00', fim: '20:30', profissionais: ['Ellaine', 'Selma'] },
  ],
  '2026-05-29': [
    { inicio: '12:00', fim: '14:00', profissionais: ['Amanda'] },
    { inicio: '14:00', fim: '20:30', profissionais: ['Amanda', 'Diana'] },
  ],
  '2026-05-30': [
    { inicio: '09:00', fim: '19:00', profissionais: ['Diana'] },
  ],
};

function normalizarHora(valor) {
  return valor ? String(valor).slice(0, 5) : '';
}

function timeToMinutes(valor) {
  const [hora, minuto] = normalizarHora(valor).split(':').map(Number);
  return Number.isFinite(hora) && Number.isFinite(minuto) ? hora * 60 + minuto : null;
}

function duracaoAgendamento(valor) {
  const duracao = Number(valor || 50);
  return Number.isFinite(duracao) && duracao > 0 ? duracao : 50;
}

function horariosSobrepoem(inicioA, duracaoA, inicioB, duracaoB) {
  const a = timeToMinutes(inicioA);
  const b = timeToMinutes(inicioB);
  if (a === null || b === null) return false;
  return a < b + duracaoAgendamento(duracaoB) && b < a + duracaoAgendamento(duracaoA);
}

function horarioDentroIntervalo(horario, inicio, fim) {
  return horario >= normalizarHora(inicio) && horario < normalizarHora(fim);
}

function profissionaisDaEscala(data, hora) {
  const dataKey = formatarData(data);
  const horario = normalizarHora(hora);
  const blocos = ESCALA_OFICIAL[dataKey] || [];
  const nomes = blocos
    .filter((bloco) => horarioDentroIntervalo(horario, bloco.inicio, bloco.fim))
    .flatMap((bloco) => bloco.profissionais);
  return [...new Set(nomes)];
}

async function profissionaisDisponiveisNaEscala(data, hora) {
  const dataKey = formatarData(data);
  const horario = normalizarHora(hora);
  const mapa = new Map(profissionaisDaEscala(dataKey, horario).map((nome) => [nome, nome]));

  await garantirTabelaDisponibilidade();
  const r = await db.query(
    `SELECT funcionario, disponivel, substituto
     FROM colaborador_disponibilidade
     WHERE data = $1
       AND $2::time >= hora_inicio
       AND $2::time < hora_fim`,
    [dataKey, horario]
  );

  r.rows.forEach((regra) => {
    if (regra.disponivel === false) {
      mapa.delete(regra.funcionario);
      if (regra.substituto) mapa.set(regra.substituto, regra.substituto);
    } else {
      mapa.set(regra.funcionario, regra.funcionario);
    }
  });

  return Array.from(mapa.values());
}

function agoraNoFusoDeAtendimento() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    data: `${value('year')}-${value('month')}-${value('day')}`,
    hora: `${value('hour')}:${value('minute')}`,
  };
}

function agendamentoNoPassado(data) {
  if (!data.data_agendada || !data.hora_agendada) return false;
  const agora = agoraNoFusoDeAtendimento();
  const dataHoraAgendada = `${String(data.data_agendada).slice(0, 10)} ${normalizarHora(data.hora_agendada)}`;
  const dataHoraAtual = `${agora.data} ${agora.hora}`;
  return dataHoraAgendada <= dataHoraAtual;
}

function formatarData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

async function garantirTabelaDisponibilidade() {
  if (disponibilidadePronta) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS colaborador_disponibilidade (
      id SERIAL PRIMARY KEY,
      data DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fim TIME NOT NULL,
      funcionario VARCHAR(180) NOT NULL,
      disponivel BOOLEAN NOT NULL DEFAULT true,
      substituto VARCHAR(180),
      motivo VARCHAR(180),
      observacoes TEXT,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_colaborador_disponibilidade_data ON colaborador_disponibilidade(data)');
  disponibilidadePronta = true;
}

function normalizarDisponibilidade(row) {
  return {
    ...row,
    data: formatarData(row.data),
    hora_inicio: normalizarHora(row.hora_inicio),
    hora_fim: normalizarHora(row.hora_fim),
  };
}

function validarDisponibilidade(body) {
  const erros = [];
  if (!body.data || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) erros.push('Data inválida.');
  if (!body.hora_inicio || !/^\d{2}:\d{2}$/.test(body.hora_inicio)) erros.push('Horário inicial inválido.');
  if (!body.hora_fim || !/^\d{2}:\d{2}$/.test(body.hora_fim)) erros.push('Horário final inválido.');
  if (body.hora_inicio && body.hora_fim && body.hora_inicio >= body.hora_fim) erros.push('Horário final deve ser maior que o inicial.');
  if (!body.funcionario) erros.push('Funcionário é obrigatório.');
  return erros;
}

function montarPayloadNotificacao(agendamento) {
  return {
    evento: 'agendamento_status',
    codigo: agendamento.codigo,
    nome_cliente: agendamento.nome_cliente,
    email: agendamento.email,
    telefone: agendamento.telefone,
    whatsapp: agendamento.whatsapp,
    servico: agendamento.servico,
    data_agendada: formatarData(agendamento.data_agendada),
    hora_agendada: normalizarHora(agendamento.hora_agendada),
    local: agendamento.local,
    status: agendamento.status,
    colaborador: agendamento.colaborador,
    observacoes_gerente: agendamento.observacoes_gerente,
  };
}

async function notificarStatusAgendamento(agendamento) {
  const url = process.env.AGENDAMENTO_STATUS_WEBHOOK_URL;
  if (!url || agendamento.status !== 'Aprovado') return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agendamentos-token': process.env.AGENDAMENTOS_API_TOKEN || '',
      },
      body: JSON.stringify(montarPayloadNotificacao(agendamento)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Falha ao notificar aprovação do agendamento:', response.status, text.slice(0, 300));
    }
  } catch (err) {
    console.error('Erro ao notificar aprovação do agendamento:', err.message);
  } finally {
    clearTimeout(timeout);
  }
}

function requireApiToken(req, res, next) {
  const expected = process.env.AGENDAMENTOS_API_TOKEN;
  if (!expected) {
    return res.status(503).json({ erro: 'Integração de agendamentos não configurada.' });
  }
  const received = req.get('x-agendamentos-token') || req.get('x-webhook-token');
  if (received !== expected) {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
  next();
}

function normalizarAgendamento(body) {
  return {
    codigo: body.id_agendamento || body.codigo || `MRJ-${Date.now()}`,
    nome_cliente: body.nome_cliente || body.name || body.nome,
    telefone: body.telefone || body.phone || body.whatsapp,
    whatsapp: body.whatsapp,
    email: body.email,
    telegram: body.telegram,
    servico: body.servico || body.service,
    duracao_media: body.duracao_media || body.duration || null,
    valor_referencia: body.valor_referencia || body.price || null,
    data_agendada: body.data_agendada || body.date,
    hora_agendada: body.hora_agendada || body.time,
    local: body.local || body.location,
    observacoes_cliente: body.observacoes_cliente || body.notes,
    colaborador: body.profissional_solicitada || body.colaborador || null,
    origem: body.origem || 'site_massoterapiarj',
    payload: body,
  };
}

function validarAgendamento(data) {
  const erros = [];
  if (!data.nome_cliente) erros.push('Nome do cliente é obrigatório.');
  if (!data.servico) erros.push('Serviço é obrigatório.');
  if (!data.data_agendada) erros.push('Data é obrigatória.');
  if (!data.hora_agendada) erros.push('Horário é obrigatório.');
  if (agendamentoNoPassado(data)) erros.push('Escolha um horário futuro para o agendamento.');
  if (!data.whatsapp && !data.telefone && !data.email && !data.telegram) {
    erros.push('Informe ao menos um contato do cliente.');
  }
  return erros;
}

async function validarEscalaAgendamento(data) {
  const profissionais = await profissionaisDisponiveisNaEscala(data.data_agendada, data.hora_agendada);
  if (!profissionais.length) {
    const err = new Error('Sem Atendimento para esta data e horário.');
    err.code = 'FORA_DA_ESCALA';
    throw err;
  }
  if (data.colaborador && !profissionais.includes(data.colaborador)) {
    const err = new Error('Profissional fora da escala neste horário.');
    err.code = 'FORA_DA_ESCALA';
    throw err;
  }
  return profissionais;
}

async function criarEntidadeCliente(client, data) {
  const contato = data.email || data.whatsapp || data.telefone;
  if (contato) {
    const existente = await client.query(
      `SELECT id FROM entidades
       WHERE email = $1 OR whatsapp = $2 OR telefone = $3
       ORDER BY id DESC
       LIMIT 1`,
      [data.email || null, data.whatsapp || null, data.telefone || null]
    );
    if (existente.rows[0]) return existente.rows[0].id;
  }

  const entidade = await client.query(
    `INSERT INTO entidades (nome,email,telefone,whatsapp,tipo_principal,origem,status,observacoes)
     VALUES ($1,$2,$3,$4,'Cliente',$5,'ativo',$6)
     RETURNING id`,
    [
      data.nome_cliente,
      data.email || null,
      data.telefone || null,
      data.whatsapp || null,
      data.origem,
      data.telegram ? `Telegram: ${data.telegram}` : null,
    ]
  );

  await client.query('INSERT INTO entidade_tipos (entidade_id, tipo) VALUES ($1,$2)', [entidade.rows[0].id, 'Cliente']);
  return entidade.rows[0].id;
}

async function inserirAgendamento(data) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const conflito = await client.query(
      `SELECT hora_agendada, duracao_media, colaborador
       FROM agendamentos
       WHERE data_agendada = $1
         AND COALESCE(local, '') = COALESCE($2, '')
         AND status = ANY($3)
       FOR UPDATE`,
      [data.data_agendada, data.local || null, STATUS_BLOQUEANTES]
    );
    const sobrepostos = conflito.rows.filter((row) => (
      horariosSobrepoem(data.hora_agendada, data.duracao_media, row.hora_agendada, row.duracao_media)
    ));
    const colaboradorOcupado = data.colaborador && sobrepostos.some((row) => (
      (row.colaborador || '') === data.colaborador
    ));
    if (colaboradorOcupado) {
      const err = new Error('Profissional indisponível.');
      err.code = 'HORARIO_INDISPONIVEL';
      throw err;
    }
    const capacidadeEscala = Array.isArray(data.profissionais_disponiveis) && data.profissionais_disponiveis.length
      ? data.profissionais_disponiveis.length
      : CAPACIDADE_PADRAO_AGENDAMENTO;
    if (sobrepostos.length >= capacidadeEscala) {
      const err = new Error('Horário indisponível.');
      err.code = 'HORARIO_INDISPONIVEL';
      throw err;
    }

    const entidadeId = await criarEntidadeCliente(client, data);
    const agendamento = await client.query(
      `INSERT INTO agendamentos (
        codigo, entidade_id, nome_cliente, telefone, whatsapp, email, telegram,
        servico, duracao_media, valor_referencia, data_agendada, hora_agendada,
        local, status, observacoes_cliente, aprovado_em, colaborador, origem, payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Aprovado',$14,NOW(),$15,$16,$17)
      RETURNING *`,
      [
        data.codigo,
        entidadeId,
        data.nome_cliente,
        data.telefone || null,
        data.whatsapp || null,
        data.email || null,
        data.telegram || null,
        data.servico,
        data.duracao_media,
        data.valor_referencia,
        data.data_agendada,
        data.hora_agendada,
        data.local || null,
        data.observacoes_cliente || null,
        data.colaborador || null,
        data.origem,
        data.payload,
      ]
    );
    await client.query('COMMIT');
    return agendamento.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

router.post('/public', requireApiToken, async (req, res) => {
  const data = normalizarAgendamento(req.body);
  const erros = validarAgendamento(data);
  if (erros.length) return res.status(400).json({ erros });

  try {
    data.profissionais_disponiveis = await validarEscalaAgendamento(data);
    const agendamento = await inserirAgendamento(data);
    res.status(201).json({
      mensagem: 'Pedido de agendamento recebido.',
      agendamento,
    });
  } catch (err) {
    if (err.code === 'FORA_DA_ESCALA') {
      return res.status(409).json({ erro: err.message, status: 'Sem Atendimento' });
    }
    if (err.code === 'HORARIO_INDISPONIVEL') {
      return res.status(409).json({ erro: 'Horário indisponível para esta data.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Agendamento já registrado.' });
    }
    res.status(500).json({ erro: 'Erro ao registrar agendamento.' });
  }
});

router.get('/disponibilidade', async (req, res) => {
  const { data, local } = req.query;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ erro: 'Informe a data no formato AAAA-MM-DD.' });
  }

  const params = [data, STATUS_BLOQUEANTES];
  const where = ['data_agendada = $1', 'status = ANY($2)'];

  if (local) {
    params.push(local);
    where.push(`COALESCE(local, '') = COALESCE($${params.length}, '')`);
  }

  try {
    const r = await db.query(
      `SELECT hora_agendada, status, colaborador, duracao_media, COUNT(*)::int AS total
       FROM agendamentos
       WHERE ${where.join(' AND ')}
       GROUP BY hora_agendada, status, colaborador, duracao_media
       ORDER BY hora_agendada`,
      params
    );

    const horarios_ocupados = [...new Set(r.rows.map((row) => normalizarHora(row.hora_agendada)))];
    res.json({
      data,
      local: local || null,
      status_bloqueantes: STATUS_BLOQUEANTES,
      escala_oficial: ESCALA_OFICIAL[data] || [],
      horarios_ocupados,
      registros: r.rows.map((row) => ({
        hora: normalizarHora(row.hora_agendada),
        status: row.status,
        colaborador: row.colaborador || null,
        duracao_media: duracaoAgendamento(row.duracao_media),
        total: row.total,
      })),
    });
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar disponibilidade.' });
  }
});

router.get('/colaboradores-disponibilidade', async (req, res) => {
  const { data } = req.query;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ erro: 'Informe a data no formato AAAA-MM-DD.' });
  }

  try {
    await garantirTabelaDisponibilidade();
    const r = await db.query(
      `SELECT *
       FROM colaborador_disponibilidade
       WHERE data = $1
       ORDER BY hora_inicio, funcionario, id`,
      [data]
    );
    res.json({ data, registros: r.rows.map(normalizarDisponibilidade) });
  } catch (err) {
    console.error('Erro ao buscar disponibilidade dos colaboradores:', err);
    res.status(500).json({ erro: 'Erro ao buscar disponibilidade dos colaboradores.' });
  }
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { status, data, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where = [];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (data) {
    params.push(data);
    where.push(`data_agendada = $${params.length}`);
  }

  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const [dados, total] = await Promise.all([
      db.query(
        `SELECT * FROM agendamentos ${cond}
         ORDER BY data_agendada DESC, hora_agendada DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM agendamentos ${cond}`, params),
    ]);
    res.json({ data: dados.rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

router.post('/colaboradores-disponibilidade', async (req, res) => {
  const erros = validarDisponibilidade(req.body || {});
  if (erros.length) return res.status(400).json({ erros });

  try {
    await garantirTabelaDisponibilidade();
    const r = await db.query(
      `INSERT INTO colaborador_disponibilidade (
        data, hora_inicio, hora_fim, funcionario, disponivel, substituto, motivo, observacoes, criado_por
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.body.data,
        req.body.hora_inicio,
        req.body.hora_fim,
        req.body.funcionario,
        req.body.disponivel !== false,
        req.body.substituto || null,
        req.body.motivo || null,
        req.body.observacoes || null,
        req.usuario.id,
      ]
    );
    res.status(201).json(normalizarDisponibilidade(r.rows[0]));
  } catch (err) {
    console.error('Erro ao registrar disponibilidade:', err);
    res.status(500).json({ erro: 'Erro ao registrar disponibilidade.' });
  }
});

router.delete('/colaboradores-disponibilidade/:id', async (req, res) => {
  try {
    await garantirTabelaDisponibilidade();
    const r = await db.query('DELETE FROM colaborador_disponibilidade WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ erro: 'Registro não encontrado.' });
    res.status(204).end();
  } catch (err) {
    console.error('Erro ao remover disponibilidade:', err);
    res.status(500).json({ erro: 'Erro ao remover disponibilidade.' });
  }
});

router.put('/:id/status', async (req, res) => {
  const { status, observacoes_gerente, colaborador, data_agendada, hora_agendada, local } = req.body;
  if (!STATUS_VALIDOS.has(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }

  try {
    const anterior = await db.query(
      'SELECT status, colaborador, data_agendada, hora_agendada FROM agendamentos WHERE id=$1',
      [req.params.id]
    );
    if (!anterior.rows[0]) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    const dataValidacao = {
      data_agendada: data_agendada || formatarData(anterior.rows[0].data_agendada),
      hora_agendada: hora_agendada || normalizarHora(anterior.rows[0].hora_agendada),
      colaborador: colaborador || null,
    };
    if (STATUS_BLOQUEANTES.includes(status)) {
      await validarEscalaAgendamento(dataValidacao);
    }

    const r = await db.query(
      `UPDATE agendamentos
       SET status=$1::varchar,
           observacoes_gerente=$2,
           colaborador=$3,
           data_agendada=COALESCE($4, data_agendada),
           hora_agendada=COALESCE($5, hora_agendada),
           local=COALESCE($6, local),
           aprovado_por=CASE WHEN $1::varchar = 'Aprovado' THEN $7 ELSE aprovado_por END,
           aprovado_em=CASE WHEN $1::varchar = 'Aprovado' THEN NOW() ELSE aprovado_em END,
           atualizado_em=NOW()
       WHERE id=$8
       RETURNING *`,
      [
        status,
        observacoes_gerente || null,
        colaborador || null,
        data_agendada || null,
        hora_agendada || null,
        local || null,
        req.usuario.id,
        req.params.id,
      ]
    );
    const agendamento = r.rows[0];
    res.json(agendamento);

    const statusMudouParaAprovado = anterior.rows[0]?.status !== 'Aprovado' && agendamento.status === 'Aprovado';
    const colaboradorMudou = (anterior.rows[0]?.colaborador || '') !== (agendamento.colaborador || '');
    if (statusMudouParaAprovado || (agendamento.status === 'Aprovado' && colaboradorMudou)) {
      notificarStatusAgendamento(agendamento);
    }
  } catch (err) {
    if (err.code === 'FORA_DA_ESCALA') {
      return res.status(409).json({ erro: err.message, status: 'Sem Atendimento' });
    }
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
});

module.exports = router;
