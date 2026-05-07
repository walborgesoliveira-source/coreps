const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authMiddleware, apenasAdmin } = require('../middleware/auth');

router.use(authMiddleware, apenasAdmin);

router.get('/', async (_, res) => {
  const r = await db.query('SELECT id,nome,email,perfil,ativo,criado_em FROM usuarios ORDER BY nome');
  res.json(r.rows);
});

router.post('/', async (req, res) => {
  const { nome, email, senha, perfil = 'operador' } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'nome, email e senha são obrigatórios.' });
  try {
    const hash = await bcrypt.hash(senha, 12);
    const r = await db.query(
      'INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES ($1,$2,$3,$4) RETURNING id,nome,email,perfil,ativo',
      [nome, email.toLowerCase(), hash, perfil]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    res.status(500).json({ erro: 'Erro ao criar usuário.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, perfil, ativo, senha } = req.body;
  try {
    if (senha) {
      const hash = await bcrypt.hash(senha, 12);
      await db.query('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, req.params.id]);
    }
    const r = await db.query(
      'UPDATE usuarios SET nome=$1,perfil=$2,ativo=$3,atualizado_em=NOW() WHERE id=$4 RETURNING id,nome,email,perfil,ativo',
      [nome, perfil, ativo, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

module.exports = router;
