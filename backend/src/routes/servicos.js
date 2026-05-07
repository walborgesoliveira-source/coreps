const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM servicos ORDER BY nome');
    res.json(r.rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, categoria, descricao, ativo = true } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  try {
    const r = await db.query(
      'INSERT INTO servicos (nome,categoria,descricao,ativo) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, categoria, descricao, ativo]
    );
    res.status(201).json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao criar serviço.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, categoria, descricao, ativo } = req.body;
  try {
    const r = await db.query(
      'UPDATE servicos SET nome=$1,categoria=$2,descricao=$3,ativo=$4 WHERE id=$5 RETURNING *',
      [nome, categoria, descricao, ativo, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
});

module.exports = router;
