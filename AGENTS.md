# Regras do CORE PS para a agenda Massoterapia RJ

Ao alterar `backend/src/routes/agendamentos.js` ou dados da agenda Massoterapia RJ:

- A API/banco é a fonte oficial da escala, indisponibilidades e agendamentos.
- Usar entradas por data para exceções temporárias; não modificar a escala recorrente sem solicitação explícita.
- Antes de escrever, consultar bloqueios e agendamentos existentes. Nunca cancelar, excluir ou reagendar clientes automaticamente.
- Aplicar indisponibilidades por sobreposição do intervalo completo da sessão, não apenas pelo horário inicial.
- Validar todas as datas e profissionais afetados com durações de 50, 90 e 120 minutos.
- Comparar as rotas públicas `/coreps-api/agendamentos/horarios-disponiveis` e `/painel/api/agendamentos/horarios-disponiveis` após publicar.
- Confirmar no domínio público que site e painel refletem a API e que outras datas e profissionais permanecem inalterados.
- Não incluir no commit alterações preexistentes ou não relacionadas.
