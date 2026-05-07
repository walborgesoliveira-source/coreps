#!/bin/bash
set -euo pipefail

CORE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_FILE="$(mktemp /tmp/coreps-chamados.XXXXXX.csv)"
CONTAINER_FILE="/tmp/coreps-chamados-import.csv"

cleanup() {
  rm -f "$TMP_FILE"
  docker exec coreps_db rm -f "$CONTAINER_FILE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$CORE_DIR"

docker exec chamados_db psql -U chamados_user -d chamados -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    codigo,
    cliente,
    assunto,
    prioridade,
    COALESCE(acoes, '') AS acoes,
    COALESCE(status, 'Aberto') AS status,
    COALESCE(dispositivo, '') AS dispositivo,
    data_abertura,
    data_finalizacao
  FROM chamados
  ORDER BY id
) TO STDOUT WITH CSV HEADER" > "$TMP_FILE"

docker cp "$TMP_FILE" "coreps_db:$CONTAINER_FILE"

docker exec -i coreps_db psql -U coreps_user -d coreps -v ON_ERROR_STOP=1 <<SQL
BEGIN;

ALTER TABLE historico_atendimentos
  ADD COLUMN IF NOT EXISTS origem VARCHAR(100),
  ADD COLUMN IF NOT EXISTS origem_codigo VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_origem_codigo
  ON historico_atendimentos(origem, origem_codigo)
  WHERE origem IS NOT NULL AND origem_codigo IS NOT NULL;

CREATE TEMP TABLE import_chamados (
  codigo VARCHAR(20),
  cliente VARCHAR(255),
  assunto VARCHAR(255),
  prioridade VARCHAR(50),
  acoes TEXT,
  status VARCHAR(50),
  dispositivo VARCHAR(100),
  data_abertura TIMESTAMP,
  data_finalizacao TIMESTAMP
);

\\copy import_chamados FROM '$CONTAINER_FILE' WITH CSV HEADER

INSERT INTO entidades (nome, tipo_principal, origem, status, observacoes)
SELECT DISTINCT ON (trim(cliente))
  trim(cliente),
  'Cliente',
  'chamados',
  'ativo',
  'Importado do sistema de chamados'
FROM import_chamados
WHERE trim(cliente) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM entidades e
    WHERE lower(trim(e.nome)) = lower(trim(import_chamados.cliente))
  )
ORDER BY trim(cliente), data_abertura;

INSERT INTO historico_atendimentos (
  entidade_id,
  tipo,
  descricao,
  solucao,
  responsavel,
  status,
  origem,
  origem_codigo,
  atendido_em,
  criado_em
)
SELECT
  e.id,
  'Chamado',
  concat_ws(E'\\n',
    'Codigo: ' || i.codigo,
    'Assunto: ' || i.assunto,
    'Prioridade: ' || i.prioridade,
    NULLIF('Dispositivo: ' || NULLIF(i.dispositivo, ''), 'Dispositivo: '),
    NULLIF('Acoes: ' || NULLIF(i.acoes, ''), 'Acoes: ')
  ),
  CASE WHEN i.status = 'Finalizado' THEN 'Finalizado no sistema de chamados' ELSE NULL END,
  'Sistema de Chamados',
  CASE
    WHEN i.status = 'Finalizado' THEN 'concluido'
    WHEN i.status = 'Em andamento' THEN 'em_andamento'
    ELSE 'aberto'
  END,
  'chamados',
  i.codigo,
  COALESCE(i.data_finalizacao, i.data_abertura, NOW()),
  COALESCE(i.data_abertura, NOW())
FROM import_chamados i
JOIN entidades e ON lower(trim(e.nome)) = lower(trim(i.cliente))
WHERE NOT EXISTS (
  SELECT 1
  FROM historico_atendimentos h
  WHERE h.origem = 'chamados'
    AND h.origem_codigo = i.codigo
);

COMMIT;

SELECT
  (SELECT COUNT(*) FROM import_chamados) AS chamados_lidos,
  (SELECT COUNT(*) FROM entidades WHERE origem = 'chamados') AS entidades_origem_chamados,
  (SELECT COUNT(*) FROM historico_atendimentos WHERE origem = 'chamados') AS historicos_origem_chamados;
SQL
