const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { entidade_id, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where = [];

  if (entidade_id) { params.push(entidade_id); where.push(`h.entidade_id=$${params.length}`); }
  if (status) { params.push(status); where.push(`h.status=$${params.length}`); }

  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const r = await db.query(
      `SELECT h.*, e.nome AS entidade_nome FROM historico_atendimentos h
       LEFT JOIN entidades e ON e.id = h.entidade_id
       ${cond} ORDER BY h.criado_em DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

router.post('/', async (req, res) => {
  const { entidade_id, equipamento_id, tipo, descricao, solucao, responsavel, status = 'aberto', atendido_em } = req.body;
  if (!entidade_id || !descricao) return res.status(400).json({ erro: 'entidade_id e descricao são obrigatórios.' });
  try {
    const r = await db.query(
      `INSERT INTO historico_atendimentos (entidade_id,equipamento_id,tipo,descricao,solucao,responsavel,status,atendido_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [entidade_id, equipamento_id || null, tipo, descricao, solucao, responsavel, status, atendido_em || new Date()]
    );
    res.status(201).json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao registrar atendimento.' });
  }
});

router.put('/:id', async (req, res) => {
  const { tipo, descricao, solucao, responsavel, status } = req.body;
  try {
    const r = await db.query(
      `UPDATE historico_atendimentos SET tipo=$1,descricao=$2,solucao=$3,responsavel=$4,status=$5 WHERE id=$6 RETURNING *`,
      [tipo, descricao, solucao, responsavel, status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: 'Atendimento não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar atendimento.' });
  }
});

module.exports = router;
