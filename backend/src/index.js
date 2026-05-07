require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/entidades',   require('./routes/entidades'));
app.use('/api/equipamentos', require('./routes/equipamentos'));
app.use('/api/historico',   require('./routes/historico'));
app.use('/api/servicos',    require('./routes/servicos'));
app.use('/api/usuarios',   require('./routes/usuarios'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// 404
app.use((_, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Erro global
app.use((err, _, res, __) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info(`CORE PS API rodando na porta ${PORT}`));
