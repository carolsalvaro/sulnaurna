# Sul na Urna v4

Versão reconstruída a partir do HTML original e da planilha oficial de perfil do eleitor.

## Estrutura
- `index.html`: página pública.
- `admin/index.html`: painel de candidatos, matérias e banners.
- `data/profile-data.js`: perfil eleitoral convertido da planilha TSE enviada.
- `data/seed-data.js`: 63 candidatos atuais + conteúdo inicial.
- `supabase/schema.sql`: banco, RLS, autenticação administrativa e Storage.
- `supabase/seed.sql`: carga inicial no Supabase.
- `js/config.js`: endereço e chave pública do Supabase.

## Antes do Supabase
A página pública já funciona com os dados locais. O admin abre em **modo demonstração** e grava apenas no navegador.

## Quando o Supabase for criado
1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Execute `supabase/seed.sql`.
4. Em Authentication > Users, crie o usuário administrador.
5. Copie o UUID desse usuário e execute: `insert into public.admin_users(user_id) values ('UUID');`
6. Preencha `js/config.js` com `supabaseUrl` e a chave pública/anon. **Nunca coloque service_role no front-end.**
7. Publique a pasta inteira no GitHub Pages ou hospedagem escolhida.

## Perfil do eleitor
A base usada soma **817.875 eleitores** nas 3 regiões (AMREC 339.968, AMUREL 301.390, AMESC 176.517), conforme a planilha enviada. A versão antiga da página mostrava 817.915; esta versão segue a planilha consolidada.

Campos com alta taxa de “NÃO INFORMADO” exibem aviso de cobertura antes da interpretação.


## Ajustes v4
- Logos HN Notícias e Vertical FM maiores e centralizadas.
- Lista pública padronizada sem exibir nome completo.
- Campo `candidate_number` preenchido para os 63 candidatos com os números de urna de 2026 conferidos em listas publicadas a partir dos dados oficiais do TSE.
- Delegado Ulisses Gabriel exibido apenas na AMREC.
- Observação pública da Victoria Salgado removida.
- Botão “Informar uma correção” com formulário (nome, contato e mensagem).
- Nova aba “Correções” no admin. Com Supabase configurado, as mensagens entram na tabela `feedback`.
- `schema.sql` atualizado com tabela `feedback`, RLS e coluna `candidate_number`.

## Números de urna
- 63 candidatos com número eleitoral preenchido.
- Deputado federal: 4 dígitos.
- Deputado estadual: 5 dígitos.
- O número aparece na listagem pública e pode ser editado no admin.
