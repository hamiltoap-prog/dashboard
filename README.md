# Palco — Dashboard de Projetos de Teatro

Gestão de projetos de teatro: roteiros e documentos, referências visuais (YouTube e imagens),
quadro Kanban por fases, calendário de reuniões (com Google Agenda e Google Maps) e histórico de
quem fez o quê. Visual inspirado no design da Apple, claro/escuro, pensado primeiro para celular.

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · Firebase (Authentication + Firestore) · hospedagem no Firebase App Hosting.

Os dados atualizam **em tempo real** entre dispositivos e pessoas (Firestore).

**O que dá para fazer:** criar projetos e convidar pessoas pelo e-mail; Kanban com colunas próprias
(criar, renomear, reordenar, excluir), responsáveis, etiquetas, prazos e filtros (pessoa, etiqueta, atrasados);
**Minhas tarefas** (tudo o que é seu, em todos os projetos, agrupado por prazo); arquivos e roteiros,
referências visuais, calendário de reuniões e histórico de atividade; **Perfil** (nome, cor e foto).

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
6. **Authentication → Configurações → Domínios autorizados**: depois de publicar o site (seção 2), adicione o
   endereço dele (algo como `palco--SEU-PROJETO.REGIAO.hosted.app`) e o seu domínio próprio, se tiver. Os
   endereços do próprio Firebase (`*.web.app`, `*.firebaseapp.com`) já vêm autorizados. Sem isso o login com
   Google e o link de recuperação de senha não funcionam no site publicado.
7. *(Opcional)* **Authentication → Modelos → Redefinição de senha** (lápis): troque o idioma do e-mail para **Português (Brasil)**.

O login e o banco ficam no plano gratuito (**Spark**), sem cartão. A hospedagem do site (seção 2) exige o plano **Blaze**.

## 2. Publicar o site (Firebase App Hosting)

O site roda no **Firebase App Hosting**, que publica sozinho a cada push no GitHub. Ele exige o plano **Blaze**
(pagamento por uso, com cartão): só é cobrado o que passar das cotas gratuitas, e o `apphosting.yaml` deste
repositório limita o site a no máximo 2 instâncias e a zero instâncias paradas. Crie um **alerta de orçamento**
em *Google Cloud Console → Faturamento → Orçamentos e alertas* para ser avisado antes de gastar.

1. Console do Firebase → **Configurações do projeto → Uso e faturamento → Modificar plano → Blaze**.
2. **Build → App Hosting → Começar**:
   - região: **`southamerica-east1`** (São Paulo), se estiver disponível;
   - **conecte o repositório do GitHub** (`hamiltoap-prog/dashboard`) e escolha a **branch ao vivo** (a que será
     publicada a cada push);
   - diretório raiz: `/` · rollouts automáticos: **ativados**;
   - dê um nome ao backend (ex.: `palco`) e **associe o app Web** criado no passo 5 da seção 1. É isso que faz a
     configuração do Firebase chegar sozinha ao site (`FIREBASE_WEBAPP_CONFIG`), sem copiar chaves.
3. Aguarde o primeiro *rollout* (alguns minutos). O endereço aparece no painel do App Hosting.
4. Volte ao passo 6 da seção 1 e autorize esse endereço.

O arquivo [`apphosting.yaml`](./apphosting.yaml) define os limites de recursos. Se o site abrir com o aviso
"Firebase não configurado", abra o arquivo e siga o trecho comentado para informar as chaves manualmente.

> **Alternativa (Vercel):** também funciona. Cadastre as quatro variáveis `NEXT_PUBLIC_FIREBASE_API_KEY`,
> `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` e `NEXT_PUBLIC_FIREBASE_APP_ID`
> (valores do passo 5) em *Project → Settings → Environment Variables* e autorize o endereço da Vercel no Firebase.

## 3. Rodar localmente

Copie `.env.local.example` para `.env.local` e preencha as quatro variáveis com os dados do app Web.

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

- `app/(app)` — dashboard, páginas de projeto, "Minhas tarefas", "Perfil" e "Alterar senha" (exigem login)
- `app/login` — entrar, criar conta, entrar com Google e "Esqueci minha senha"
- `components/` — interface, por área (`kanban/`, `files/`, `references/`, `calendar/`)
- `lib/store.tsx` — dados em tempo real do Firestore + todas as ações (criar, mover, excluir...)
- `lib/firebase/` — configuração, autenticação e perfil
- `firestore.rules`, `firebase.json` — regras de segurança e configuração dos emuladores
- `apphosting.yaml`, `next.config.ts` — hospedagem no App Hosting e repasse da configuração do Firebase ao site
- `scripts/` — migração do Supabase
