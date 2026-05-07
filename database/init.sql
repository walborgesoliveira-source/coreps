-- CORE PS — Estrutura inicial do banco de dados
-- PostgreSQL 16

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Usuários do sistema ───────────────────────────────────────────────────

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  perfil      VARCHAR(50) NOT NULL DEFAULT 'operador', -- admin | operador | viewer
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Entidades ────────────────────────────────────────────────────────────

CREATE TABLE entidades (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(200) NOT NULL,
  nome_fantasia   VARCHAR(200),
  email           VARCHAR(150),
  telefone        VARCHAR(30),
  whatsapp        VARCHAR(30),
  documento       VARCHAR(30),          -- CPF ou CNPJ
  tipo_principal  VARCHAR(50) NOT NULL, -- Cliente | Empresa | Prestador | ...
  origem          VARCHAR(100),
  status          VARCHAR(30) NOT NULL DEFAULT 'ativo',
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tipos adicionais por entidade ────────────────────────────────────────

CREATE TABLE entidade_tipos (
  id          SERIAL PRIMARY KEY,
  entidade_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL -- Cliente | Empresa | Prestador | Fornecedor | Parceiro | Vendedor | Interno
);

-- ─── Equipamentos ─────────────────────────────────────────────────────────

CREATE TABLE equipamentos (
  id                  SERIAL PRIMARY KEY,
  entidade_id         INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  tipo_equipamento    VARCHAR(100),
  marca               VARCHAR(100),
  modelo              VARCHAR(100),
  numero_serie        VARCHAR(100),
  sistema_operacional VARCHAR(100),
  ip                  VARCHAR(45),
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Histórico de atendimentos ────────────────────────────────────────────

CREATE TABLE historico_atendimentos (
  id              SERIAL PRIMARY KEY,
  entidade_id     INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  equipamento_id  INTEGER REFERENCES equipamentos(id) ON DELETE SET NULL,
  tipo            VARCHAR(100),        -- Suporte | Instalação | Visita | Remoto ...
  descricao       TEXT NOT NULL,
  solucao         TEXT,
  responsavel     VARCHAR(150),
  status          VARCHAR(50) NOT NULL DEFAULT 'aberto', -- aberto | em_andamento | concluido
  origem          VARCHAR(100),
  origem_codigo   VARCHAR(100),
  atendido_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Serviços ─────────────────────────────────────────────────────────────

CREATE TABLE servicos (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  categoria   VARCHAR(100),
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Serviços contratados por entidade ────────────────────────────────────

CREATE TABLE entidade_servicos (
  id          SERIAL PRIMARY KEY,
  entidade_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  servico_id  INTEGER NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  status      VARCHAR(50) NOT NULL DEFAULT 'ativo',
  data_inicio DATE,
  data_fim    DATE,
  observacoes TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────────────────

CREATE INDEX idx_entidades_status       ON entidades(status);
CREATE INDEX idx_entidades_tipo         ON entidades(tipo_principal);
CREATE INDEX idx_entidade_tipos_entid   ON entidade_tipos(entidade_id);
CREATE INDEX idx_equipamentos_entid     ON equipamentos(entidade_id);
CREATE INDEX idx_historico_entid        ON historico_atendimentos(entidade_id);
CREATE UNIQUE INDEX idx_historico_origem_codigo
  ON historico_atendimentos(origem, origem_codigo)
  WHERE origem IS NOT NULL AND origem_codigo IS NOT NULL;
CREATE INDEX idx_entidade_servicos_entid ON entidade_servicos(entidade_id);

-- ─── Usuário admin padrão (senha: Admin@1234 — troque imediatamente) ────

-- Hash bcrypt gerado para 'Admin@1234' com saltRounds=12
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES (
  'Administrador',
  'admin@coreps.local',
  '$2b$12$7FgQtdOF1JnrArpqKeAW/uN3DqXgacoUs5V0D3r7VBZtIB3KCjV72',
  'admin'
);
