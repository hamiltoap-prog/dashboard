#!/usr/bin/env node
// Migra os dados do Palco do Supabase para o Firebase (Auth + Firestore).
//
//   node scripts/migrate-supabase-to-firebase.mjs            -> SIMULAÇÃO (só lê o Supabase e mostra o plano)
//   node scripts/migrate-supabase-to-firebase.mjs --apply    -> grava de verdade no Firebase
//
// Variáveis de ambiente:
//   SUPABASE_URL                   ex.: https://abcd1234.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY      chave "service_role" (Supabase > Project Settings > API). É SECRETA:
//                                  use só no seu computador, nunca coloque no site nem no GitHub.
//   GOOGLE_APPLICATION_CREDENTIALS caminho do JSON da conta de serviço do Firebase
//                                  (Firebase > Project settings > Service accounts > Generate new private key).
//                                  Só é necessário com --apply.
//
// O script pode ser executado mais de uma vez com segurança: os documentos usam os mesmos ids do
// Supabase e perfis que já existem no Firebase não são sobrescritos.

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Uso: node scripts/migrate-supabase-to-firebase.mjs [--apply]\nVeja o cabeçalho do arquivo para as variáveis de ambiente.");
  process.exit(0);
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. Veja o cabeçalho do arquivo.");
  process.exit(1);
}

// ------------------------------------------------------------------ leitura do Supabase
async function fetchTable(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + pageSize - 1}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Falha ao ler "${table}" no Supabase: ${response.status} ${await response.text()}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const tables = {};
for (const name of [
  "profiles",
  "projects",
  "project_members",
  "kanban_columns",
  "kanban_cards",
  "project_files",
  "project_references",
  "meetings",
  "activity_log",
]) {
  tables[name] = await fetchTable(name);
}

console.log("Lido do Supabase:");
for (const [name, rows] of Object.entries(tables)) console.log(`  ${name.padEnd(20)} ${rows.length}`);

// ------------------------------------------------------------------ planejamento
const warnings = [];
const warn = (message) => warnings.push(message);
const orNull = (value) => (value === undefined ? null : value);
const omitNull = (object) => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== null && v !== undefined));
const emailOf = (profile) => String(profile.email ?? "").trim().toLowerCase();

const profilesById = new Map(tables.profiles.map((p) => [p.id, p]));
const validProfiles = tables.profiles.filter((p) => emailOf(p));
for (const p of tables.profiles) if (!emailOf(p)) warn(`Perfil ${p.id} ("${p.name}") sem e-mail — ignorado.`);

const membersByProject = new Map();
for (const row of tables.project_members) {
  if (!profilesById.has(row.user_id)) {
    warn(`Membro ${row.user_id} do projeto ${row.project_id} não tem perfil — ignorado.`);
    continue;
  }
  const list = membersByProject.get(row.project_id) ?? [];
  list.push(row.user_id);
  membersByProject.set(row.project_id, list);
}

const projectsPlanned = [];
for (const project of tables.projects) {
  const members = membersByProject.get(project.id) ?? [];
  const owner = profilesById.has(project.created_by) ? project.created_by : members[0];
  if (!owner) {
    warn(`Projeto "${project.name}" (${project.id}) sem dono nem membros válidos — ignorado.`);
    continue;
  }
  if (owner !== project.created_by) warn(`Projeto "${project.name}": dono original não encontrado; usando ${owner}.`);
  projectsPlanned.push({ project, owner, members: [...new Set([owner, ...members])] });
}
const plannedProjectIds = new Set(projectsPlanned.map((p) => p.project.id));
const ownerByProject = new Map(projectsPlanned.map((p) => [p.project.id, p.owner]));

const childRows = (table) =>
  tables[table].filter((row) => {
    if (plannedProjectIds.has(row.project_id)) return true;
    warn(`${table}: linha ${row.id} pertence a um projeto ignorado/inexistente (${row.project_id}) — ignorada.`);
    return false;
  });

console.log(`\nPlano: ${validProfiles.length} pessoas, ${projectsPlanned.length} projetos.`);

if (!APPLY) {
  for (const w of warnings) console.log(`  aviso: ${w}`);
  console.log("\nSIMULAÇÃO: nada foi gravado. Para migrar de verdade, rode de novo com --apply.");
  process.exit(0);
}

// ------------------------------------------------------------------ gravação no Firebase
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho do JSON da conta de serviço do Firebase.");
  process.exit(1);
}
initializeApp(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { credential: applicationDefault() }
    : { projectId: process.env.GCLOUD_PROJECT ?? "demo-palco" }
);
const auth = getAuth();
const db = getFirestore();

// 1) Pessoas: contas do Firebase (sem senha) + perfil. Mapeia id do Supabase -> uid do Firebase, pelo e-mail.
const uidBySupabaseId = new Map();
const createdAccounts = [];
const existingAccounts = [];
for (const profile of validProfiles) {
  const email = emailOf(profile);
  let user;
  try {
    user = await auth.getUserByEmail(email);
    existingAccounts.push(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      email,
      displayName: profile.name,
      // Quem faz a migração atesta que esses e-mails são da equipe; isso também permite
      // que a pessoa entre com o Google usando o mesmo e-mail.
      emailVerified: true,
      ...(/^https?:\/\//.test(profile.avatar_url ?? "") ? { photoURL: profile.avatar_url } : {}),
    });
    createdAccounts.push(email);
  }
  uidBySupabaseId.set(profile.id, user.uid);

  const ref = db.collection("users").doc(user.uid);
  if (!(await ref.get()).exists) {
    await ref.set({
      name: profile.name || email.split("@")[0],
      email,
      avatarUrl: orNull(profile.avatar_url),
      colorHex: profile.color_hex || "#5B8DEF",
      createdAt: profile.created_at ?? new Date().toISOString(),
    });
  }
}

const uid = (supabaseId, fallbackProjectId) =>
  uidBySupabaseId.get(supabaseId) ?? uidBySupabaseId.get(ownerByProject.get(fallbackProjectId));

// 2) Projetos e itens (mesmos ids do Supabase => pode rodar de novo sem duplicar).
const writer = db.bulkWriter();
writer.onWriteError((error) => {
  console.error("Erro de escrita:", error.message);
  return false;
});
const counts = {};
const put = (kind, ref, data) => {
  counts[kind] = (counts[kind] ?? 0) + 1;
  writer.set(ref, data);
};

for (const { project, owner, members } of projectsPlanned) {
  const projectRef = db.collection("projects").doc(project.id);
  put("projects", projectRef, {
    slug: project.slug,
    name: project.name,
    description: project.description ?? "",
    coverImageUrl: orNull(project.cover_image_url),
    status: project.status,
    createdBy: uidBySupabaseId.get(owner),
    memberIds: members.map((id) => uidBySupabaseId.get(id)).filter(Boolean),
    createdAt: project.created_at,
    updatedAt: project.updated_at ?? project.created_at,
  });
}

for (const row of childRows("kanban_columns")) {
  put("columns", db.doc(`projects/${row.project_id}/columns/${row.id}`), {
    projectId: row.project_id,
    name: row.name,
    position: row.position ?? 0,
  });
}

for (const row of childRows("kanban_cards")) {
  put("cards", db.doc(`projects/${row.project_id}/cards/${row.id}`), {
    projectId: row.project_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description ?? "",
    position: row.position ?? 0,
    assigneeIds: (row.assignee_ids ?? []).map((id) => uidBySupabaseId.get(id)).filter(Boolean),
    labels: row.labels ?? [],
    dueDate: orNull(row.due_date),
    createdBy: uid(row.created_by, row.project_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  });
}

for (const row of childRows("project_files")) {
  put("files", db.doc(`projects/${row.project_id}/files/${row.id}`), {
    projectId: row.project_id,
    ...omitNull({ notes: row.notes }),
    name: row.name,
    url: row.url,
    type: row.type,
    addedBy: uid(row.added_by, row.project_id),
    addedAt: row.added_at,
  });
}

for (const row of childRows("project_references")) {
  put("references", db.doc(`projects/${row.project_id}/references/${row.id}`), {
    projectId: row.project_id,
    type: row.type,
    url: row.url,
    title: row.title ?? "",
    sourceLabel: row.source_label ?? "",
    thumbnailUrl: orNull(row.thumbnail_url),
    tags: row.tags ?? [],
    addedBy: uid(row.added_by, row.project_id),
    addedAt: row.added_at,
  });
}

for (const row of childRows("meetings")) {
  put("meetings", db.doc(`projects/${row.project_id}/meetings/${row.id}`), {
    projectId: row.project_id,
    ...omitNull({ location: row.location, notes: row.notes }),
    title: row.title,
    startsAt: row.starts_at,
    endsAt: orNull(row.ends_at),
    attendeeIds: (row.attendee_ids ?? []).map((id) => uidBySupabaseId.get(id)).filter(Boolean),
    createdBy: uid(row.created_by, row.project_id),
    createdAt: row.created_at,
  });
}

for (const row of childRows("activity_log")) {
  put("activity", db.doc(`projects/${row.project_id}/activity/${row.id}`), {
    projectId: row.project_id,
    ...omitNull({ detail: row.detail }),
    userId: uid(row.user_id, row.project_id),
    action: row.action,
    entityType: row.entity_type,
    entityLabel: row.entity_label,
    createdAt: row.created_at,
  });
}

await writer.close();

console.log("\nGravado no Firebase:");
console.log(`  contas criadas (sem senha):  ${createdAccounts.length}`);
console.log(`  contas que já existiam:      ${existingAccounts.length}`);
for (const [kind, n] of Object.entries(counts)) console.log(`  ${kind.padEnd(28)} ${n}`);
for (const w of warnings) console.log(`  aviso: ${w}`);

if (createdAccounts.length) {
  console.log("\nContas novas, criadas SEM senha. Cada pessoa deve entrar com o Google (mesmo e-mail) ou usar");
  console.log("“Esqueci minha senha” na tela de login para definir a sua:");
  for (const email of createdAccounts) console.log(`  - ${email}`);
}
console.log("\nMigração concluída.");
