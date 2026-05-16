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
]);

const STATUS_BLOQUEANTES = ['Pendente', 'Aprovado', 'Reagendado'];

function normalizarHora(valor) {
  return valor ? String(valor).slice(0, 5) : '';
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
  if (!data.whatsapp && !data.telefone && !data.email && !data.telegram) {
    erros.push('Informe ao menos um contato do cliente.');
  }
  return erros;
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
      `SELECT id, codigo, status
       FROM agendamentos
       WHERE data_agendada = $1
         AND hora_agendada = $2
         AND COALESCE(local, '') = COALESCE($3, '')
         AND status = ANY($4)
       LIMIT 1`,
      [data.data_agendada, data.hora_agendada, data.local || null, STATUS_BLOQUEANTES]
    );
    if (conflito.rows[0]) {
      const err = new Error('Horário indisponível.');
      err.code = 'HORARIO_INDISPONIVEL';
      throw err;
    }

    const entidadeId = await criarEntidadeCliente(client, data);
    const agendamento = await client.query(
      `INSERT INTO agendamentos (
        codigo, entidade_id, nome_cliente, telefone, whatsapp, email, telegram,
        servico, duracao_media, valor_referencia, data_agendada, hora_agendada,
        local, status, observacoes_cliente, origem, payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pendente',$14,$15,$16)
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
    const agendamento = await inserirAgendamento(data);
    res.status(201).json({
      mensagem: 'Pedido de agendamento recebido.',
      agendamento,
    });
  } catch (err) {
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
      `SELECT hora_agendada, status, COUNT(*)::int AS total
       FROM agendamentos
       WHERE ${where.join(' AND ')}
       GROUP BY hora_agendada, status
       ORDER BY hora_agendada`,
      params
    );

    const horarios_ocupados = [...new Set(r.rows.map((row) => normalizarHora(row.hora_agendada)))];
    res.json({
      data,
      local: local || null,
      status_bloqueantes: STATUS_BLOQUEANTES,
      horarios_ocupados,
      registros: r.rows.map((row) => ({
        hora: normalizarHora(row.hora_agendada),
        status: row.status,
        total: row.total,
      })),
    });
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar disponibilidade.' });
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

router.put('/:id/status', async (req, res) => {
  const { status, observacoes_gerente, colaborador, data_agendada, hora_agendada, local } = req.body;
  if (!STATUS_VALIDOS.has(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }

  try {
    const r = await db.query(
      `UPDATE agendamentos
       SET status=$1,
           observacoes_gerente=$2,
           colaborador=$3,
           data_agendada=COALESCE($4, data_agendada),
           hora_agendada=COALESCE($5, hora_agendada),
           local=COALESCE($6, local),
           aprovado_por=CASE WHEN $1 = 'Aprovado' THEN $7 ELSE aprovado_por END,
           aprovado_em=CASE WHEN $1 = 'Aprovado' THEN NOW() ELSE aprovado_em END,
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
    if (!r.rows[0]) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
});

module.exports = router;
