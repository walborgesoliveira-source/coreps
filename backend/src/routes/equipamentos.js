const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { entidade_id } = req.query;
  const params = entidade_id ? [entidade_id] : [];
  const where = entidade_id ? 'WHERE entidade_id=$1' : '';
  try {
    const r = await db.query(`SELECT * FROM equipamentos ${where} ORDER BY id DESC`, params);
    res.json(r.rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar equipamentos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM equipamentos WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ erro: 'Equipamento não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar equipamento.' });
  }
});

router.post('/', async (req, res) => {
  const { entidade_id, tipo_equipamento, marca, modelo, numero_serie, sistema_operacional, ip, observacoes } = req.body;
  if (!entidade_id) return res.status(400).json({ erro: 'entidade_id é obrigatório.' });
  try {
    const r = await db.query(
      `INSERT INTO equipamentos (entidade_id,tipo_equipamento,marca,modelo,numero_serie,sistema_operacional,ip,observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [entidade_id, tipo_equipamento, marca, modelo, numero_serie, sistema_operacional, ip, observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao criar equipamento.' });
  }
});

router.put('/:id', async (req, res) => {
  const { tipo_equipamento, marca, modelo, numero_serie, sistema_operacional, ip, observacoes } = req.body;
  try {
    const r = await db.query(
      `UPDATE equipamentos SET tipo_equipamento=$1,marca=$2,modelo=$3,numero_serie=$4,
       sistema_operacional=$5,ip=$6,observacoes=$7 WHERE id=$8 RETURNING *`,
      [tipo_equipamento, marca, modelo, numero_serie, sistema_operacional, ip, observacoes, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: 'Equipamento não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar equipamento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM equipamentos WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ erro: 'Equipamento não encontrado.' });
    res.json({ mensagem: 'Equipamento removido.' });
  } catch {
    res.status(500).json({ erro: 'Erro ao remover equipamento.' });
  }
});

module.exports = router;
