SUL NA URNA — v5 / ADMIN DA URNA SIMULADA

1) A v5 mantém a urna completa da v4 e não altera a tabela pública de 63 candidatos regionais.
2) O som continua fora por enquanto, como combinado.
3) Antes de publicar a v5, abra o Supabase > SQL Editor e rode SOMENTE:
   supabase/simulator_admin_migration.sql
   Esse arquivo é idempotente e não contém DELETE/TRUNCATE nas tabelas existentes.
4) Depois publique os arquivos da v5 no mesmo projeto.
5) Entre em /admin/ e abra a nova aba "Urna Simulada".

O que é registrado:
- visualizações, inícios, conclusões, reinícios e correções;
- confirmações por etapa;
- quantidade de brancos, nulos e votos de legenda;
- se a chave estiver ATIVA, apenas a contagem agregada por candidato e por dia.

O que NÃO é registrado:
- nome, e-mail, telefone ou login do leitor;
- IP em tabela da aplicação;
- identificador de sessão;
- uma cédula com a combinação de votos da mesma pessoa;
- relação entre um voto para Federal e outro para Presidente.

A chave "Registro de escolhas" no Admin pode ser desligada sem desativar a urna e sem interromper as métricas gerais.
