-- CORE PS — Agendamentos Massoterapia RJ
-- Aplicar em bancos existentes com:
-- docker exec -i coreps_db psql -U coreps_user -d coreps < database/agendamentos.sql

CREATE TABLE IF NOT EXISTS agendamentos (
  id                    SERIAL PRIMARY KEY,
  codigo                VARCHAR(40) NOT NULL UNIQUE,
  entidade_id           INTEGER REFERENCES entidades(id) ON DELETE SET NULL,
  nome_cliente          VARCHAR(200) NOT NULL,
  telefone              VARCHAR(40),
  whatsapp              VARCHAR(40),
  email                 VARCHAR(180),
  telegram              VARCHAR(120),
  servico               VARCHAR(180) NOT NULL,
  duracao_media         INTEGER,
  valor_referencia      NUMERIC(10,2),
  data_agendada         DATE NOT NULL,
  hora_agendada         TIME NOT NULL,
  local                 VARCHAR(220),
  status                VARCHAR(40) NOT NULL DEFAULT 'Aprovado',
  observacoes_cliente   TEXT,
  observacoes_gerente   TEXT,
  aprovado_por          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  colaborador           VARCHAR(180),
  origem                VARCHAR(120) DEFAULT 'site_massoterapiarj',
  payload               JSONB,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(data_agendada, hora_agendada);
CREATE INDEX IF NOT EXISTS idx_agendamentos_entidade ON agendamentos(entidade_id);

CREATE TABLE IF NOT EXISTS colaborador_disponibilidade (
  id          SERIAL PRIMARY KEY,
  data        DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim    TIME NOT NULL,
  funcionario VARCHAR(180) NOT NULL,
  disponivel  BOOLEAN NOT NULL DEFAULT true,
  substituto  VARCHAR(180),
  motivo      VARCHAR(180),
  observacoes TEXT,
  criado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colaborador_disponibilidade_data
  ON colaborador_disponibilidade(data);
