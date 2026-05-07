const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/entidades?q=busca&tipo=Cliente&status=ativo&page=1&limit=20
router.get('/', async (req, res) => {
  const { q, tipo, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where = [];

  if (q) { params.push(`%${q}%`); where.push(`(nome ILIKE $${params.length} OR email ILIKE $${params.length} OR documento ILIKE $${params.length})`); }
  if (tipo) { params.push(tipo); where.push(`tipo_principal = $${params.length}`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }

  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const [dados, total] = await Promise.all([
      db.query(`SELECT * FROM entidades ${cond} ORDER BY nome LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM entidades ${cond}`, params),
    ]);
    res.json({ data: dados.rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar entidades.' });
  }
});

// GET /api/entidades/:id
router.get('/:id', async (req, res) => {
  try {
    const [entidade, tipos, equipamentos, servicos] = await Promise.all([
      db.query('SELECT * FROM entidades WHERE id = $1', [req.params.id]),
      db.query('SELECT tipo FROM entidade_tipos WHERE entidade_id = $1', [req.params.id]),
      db.query('SELECT * FROM equipamentos WHERE entidade_id = $1 ORDER BY id DESC', [req.params.id]),
      db.query(`SELECT es.*, s.nome AS servico_nome FROM entidade_servicos es
                JOIN servicos s ON s.id = es.servico_id
                WHERE es.entidade_id = $1`, [req.params.id]),
    ]);
    if (!entidade.rows[0]) return res.status(404).json({ erro: 'Entidade não encontrada.' });
    res.json({ ...entidade.rows[0], tipos: tipos.rows.map(r => r.tipo), equipamentos: equipamentos.rows, servicos: servicos.rows });
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar entidade.' });
  }
});

// POST /api/entidades
router.post('/', async (req, res) => {
  const { nome, nome_fantasia, email, telefone, whatsapp, documento, tipo_principal, origem, status = 'ativo', observacoes, tipos = [] } = req.body;
  if (!nome || !tipo_principal) return res.status(400).json({ erro: 'Nome e tipo_principal são obrigatórios.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO entidades (nome,nome_fantasia,email,telefone,whatsapp,documento,tipo_principal,origem,status,observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [nome, nome_fantasia, email, telefone, whatsapp, documento, tipo_principal, origem, status, observacoes]
    );
    const entidade = r.rows[0];
    for (const tipo of tipos) {
      await client.query('INSERT INTO entidade_tipos (entidade_id, tipo) VALUES ($1,$2)', [entidade.id, tipo]);
    }
    await client.query('COMMIT');
    res.status(201).json(entidade);
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao criar entidade.' });
  } finally {
    client.release();
  }
});

// PUT /api/entidades/:id
router.put('/:id', async (req, res) => {
  const { nome, nome_fantasia, email, telefone, whatsapp, documento, tipo_principal, origem, status, observacoes } = req.body;
  try {
    const r = await db.query(
      `UPDATE entidades SET nome=$1,nome_fantasia=$2,email=$3,telefone=$4,whatsapp=$5,
       documento=$6,tipo_principal=$7,origem=$8,status=$9,observacoes=$10,atualizado_em=NOW()
       WHERE id=$11 RETURNING *`,
      [nome, nome_fantasia, email, telefone, whatsapp, documento, tipo_principal, origem, status, observacoes, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: 'Entidade não encontrada.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar entidade.' });
  }
});

// DELETE /api/entidades/:id
router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM entidades WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ erro: 'Entidade não encontrada.' });
    res.json({ mensagem: 'Entidade removida.' });
  } catch {
    res.status(500).json({ erro: 'Erro ao remover entidade.' });
  }
});

module.exports = router;
