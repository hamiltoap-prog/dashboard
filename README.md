# Palco — Dashboard de Projetos de Teatro

Gestão de projetos de teatro: roteiros e documentos, referências visuais (YouTube e imagens),
quadro Kanban por fases, calendário de reuniões (com Google Agenda e Google Maps) e histórico de
quem fez o quê. Visual inspirado no design da Apple, claro/escuro, pensado primeiro para celular.

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · Firebase (Authentication + Firestore) · hospedagem na Vercel.

Os dados atualizam **em tempo real** entre dispositivos e pessoas (Firestore).

---

## 1. Configurar o Firebase (uma vez)

1. Entre em [console.firebase.google.com](https://console.firebase.google.com) → **Adicionar projeto** (pode desativar o Google Analytics).
2. **Build → Authentication → Vamos começar → Método de login** e ative:
   - **E-mail/senha**
   - **Google** (escolha um e-mail de suporte do projeto)
3. **Build → Firestore Database → Criar banco de dados**: modo **produção**, região `southamerica-east1` (São Paulo).
4. Na aba **Regras** do Firestore, apague o conteúdo e cole o arquivo [`firestore.rules`](./firestore.rules) → **Publicar**.
   *(Alternativa pela linha de comando: `npx firebase-tools deploy --only firestore:rules --project SEU_PROJETO`.)*
5. **Configurações do projeto (engrenagem) → Geral → Seus aplicativos → `</>` Web**: registre um app e copie
   `apiKey`, `authDomain`, `projectId` e `appId`.
6. **Authentication → Configurações → Domínios autorizados**: adicione o endereço do site na Vercel
   (ex.: `palco.vercel.app`) e o seu domínio próprio, se tiver. Sem isso o login com Google e o link de
   recuperação de senha não funcionam.
7. *(Opcional)* **Authentication → Modelos → Redefinição de senha** (lápis): troque o idioma do e-mail para **Português (Brasil)**.

O plano gratuito (Spark) é suficiente para uma equipe pequena; não é preciso cadastrar cartão.

## 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` (uso local) e cadastre **as mesmas quatro variáveis** na Vercel
(**Project → Settings → Environment Variables**), depois faça um novo deploy:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Essas chaves **não são segredos** (vão para o navegador de qualquer forma); quem protege os dados são as regras do
Firestore. Sem as variáveis, o app mostra um aviso de "Firebase não configurado".

## 3. Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

## 4. Migrar os dados do Supabase (se você usava a versão anterior)

O script `scripts/migrate-supabase-to-firebase.mjs` leva pessoas, projetos, kanban, arquivos, referências,
reuniões e histórico para o Firebase. Ele cria uma conta Firebase **sem senha** para cada pessoa (pelo e-mail);
depois cada pessoa entra com o **Google** (mesmo e-mail) ou usa **"Esqueci minha senha"**.

1. No Firebase: **Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Guarde o `.json`
   **fora do repositório** (ele é secreto).
2. No Supabase: **Project Settings → API** → copie a **URL** e a chave **`service_role`** (também secreta).
3. No terminal, na pasta do projeto:

```bash
export SUPABASE_URL=https://SEU-PROJETO.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...                     # chave service_role
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/chave-firebase.json

npm run migrate:supabase             # SIMULAÇÃO: só lê o Supabase e mostra o plano e avisos
npm run migrate:supabase -- --apply  # grava de verdade no Firebase
```

Pode rodar mais de uma vez sem duplicar nada (os documentos mantêm os mesmos ids). Contas que já existem no
Firebase são reaproveitadas pelo e-mail e perfis já criados não são sobrescritos. Depois de conferir, você pode
apagar o projeto no Supabase.

## 5. Como os dados são guardados

```
users/{uid}                          perfil público (nome, e-mail, cor)
projects/{projectId}                 projeto; memberIds = quem tem acesso; createdBy = dono
projects/{projectId}/columns|cards|files|references|meetings|activity/{id}
```

Regras principais (veja [`firestore.rules`](./firestore.rules)):

- Só **membros** leem e editam um projeto e seus itens.
- Qualquer membro pode adicionar pessoas (pelo e-mail de quem já tem conta); só o **dono** remove outras
  pessoas e **exclui** o projeto; qualquer pessoa pode **sair** de um projeto.
- O histórico de atividade não pode ser editado.

## 6. Testar com os emuladores (opcional, para quem desenvolve)

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-palco
# em outro terminal, com o app apontando para o emulador:
NEXT_PUBLIC_FIREBASE_API_KEY=x NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-palco NEXT_PUBLIC_FIREBASE_APP_ID=1:1:web:1 \
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 npm run dev
```

## Estrutura

- `app/(app)` — dashboard, páginas de projeto e "Alterar senha" (exigem login)
- `app/login` — entrar, criar conta, entrar com Google e "Esqueci minha senha"
- `components/` — interface, por área (`kanban/`, `files/`, `references/`, `calendar/`)
- `lib/store.tsx` — dados em tempo real do Firestore + todas as ações (criar, mover, excluir...)
- `lib/firebase/` — configuração, autenticação e perfil
- `firestore.rules`, `firebase.json` — regras de segurança e configuração dos emuladores
- `scripts/` — migração do Supabase
