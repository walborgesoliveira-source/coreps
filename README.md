# CORE PS — Sistema Central de Cadastros

Stack: Node.js + Express · React · PostgreSQL 16 · Docker

## Subir pela primeira vez

```bash
# 1. Editar senhas no .env
nano /root/core-ps/.env

# 2. Criar rede proxy (se não existir)
docker network create proxy_net 2>/dev/null || true

# 3. Build e subir
cd /root/core-ps
docker compose up -d --build

# 4. Verificar
docker compose ps
docker compose logs -f coreps_api
```

## Nginx Proxy Manager

Adicionar proxy host:
- Domain: `coreps.iaguru.com.br`
- Forward hostname: `coreps_frontend`  Port: `80`
- SSL: Let's Encrypt habilitado

## Credenciais padrão

- E-mail: `admin@coreps.local`
- Senha: `Admin@1234` **(trocar imediatamente)**

## Backup manual

```bash
/root/core-ps/scripts/backup.sh
```

## Importar dados do Sistema de Chamados

```bash
/root/core-ps/scripts/import-chamados.sh
```

O script importa clientes como entidades e chamados como historico de atendimento.
Ele pode ser executado novamente sem duplicar chamados ja importados.

## Cron backup diário (2h)

```bash
echo "0 2 * * * /root/core-ps/scripts/backup.sh >> /root/core-ps/logs/backup.log 2>&1" | crontab -
```
