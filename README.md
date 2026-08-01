# Palco — Dashboard de Projetos de Teatro

Dashboard para gerenciar projetos de teatro: roteiros, documentos de
referência, referências visuais (vídeos do YouTube e imagens de outras
fontes), quadro estilo Trello por fases do projeto e calendário de reuniões.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

**O app já funciona sem nenhuma configuração adicional.** Sem as variáveis do
Supabase definidas, ele roda em **modo demo**: os dados de exemplo (3
projetos de teatro fictícios) ficam guardados no `localStorage` do navegador,
então criar/editar projetos, cards, arquivos, referências e reuniões
funciona de verdade — só não é compartilhado entre pessoas/dispositivos
ainda.

## Conectando um Supabase real (contas de verdade, dados compartilhados)

O projeto já vem com toda a infraestrutura pronta para o [Supabase](https://supabase.com)
(gratuito no plano free):

1. Crie uma conta e um projeto em [app.supabase.com](https://app.supabase.com).
2. No projeto, vá em **SQL Editor** → **New query**, cole o conteúdo de
   [`supabase/schema.sql`](./supabase/schema.sql) e rode. Isso cria as
   tabelas, as políticas de segurança (cada pessoa só vê/edita os projetos
   de que participa) e o bucket de storage para imagens.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public
   key**.
4. Copie `.env.local.example` para `.env.local` e preencha:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. Reinicie o servidor (`npm run dev`). A partir daí, `/login` passa a
   pedir conta de verdade (e-mail/senha) e cada pessoa que criar conta
   ganha automaticamente um perfil (nome, avatar, cor).

Depois de conectar o Supabase, o próximo passo natural é trocar as ações do
`lib/store.tsx` (que hoje leem/escrevem em `localStorage`) para chamar o
cliente Supabase (`lib/supabase/client.ts`) — a mesma estrutura de dados é
usada dos dois lados, então é uma troca direta, tabela por tabela.

## Google Agenda

Cada reunião tem um botão que abre uma página do Google Agenda já
preenchida com título, data/horário, local e notas — é só clicar em salvar.
Isso não exige nenhuma credencial. Uma sincronização automática (two-way,
via OAuth do Google Cloud) pode ser adicionada depois, se fizer sentido.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4, componentes no estilo shadcn/ui (Radix UI por baixo)
- [Supabase](https://supabase.com) para autenticação, banco de dados e storage (opcional, ver acima)
- [dnd-kit](https://dndkit.com) para o quadro Kanban
- [next-themes](https://github.com/pacocoursey/next-themes) para o modo claro/escuro

## Estrutura

- `app/(app)` — dashboard e páginas de projeto (protegidas por login quando o Supabase está configurado)
- `app/login` — tela de entrada/cadastro
- `components/` — componentes de UI, organizados por área (`kanban/`, `files/`, `references/`, `calendar/`)
- `lib/store.tsx` — estado da aplicação hoje (local, com persistência em `localStorage`)
- `lib/mock-data.ts` — dados de exemplo (tema: projetos de teatro)
- `lib/types.ts` — tipos de domínio (Project, KanbanCard, ProjectFile, ProjectReference, Meeting, ActivityEntry...)
- `supabase/schema.sql` — schema completo pronto para rodar num projeto Supabase
