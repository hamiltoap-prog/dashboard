import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityEntry,
  KanbanCard,
  KanbanColumn,
  Meeting,
  Profile,
  Project,
  ProjectFile,
  ProjectReference,
  ProjectStatus,
} from "@/lib/types";

// Camada fina sobre o Supabase: só lê/escreve linhas (snake_case) e
// converte para os tipos da aplicação (camelCase) definidos em lib/types.ts.
// O schema correspondente está em supabase/schema.sql.

export interface BootstrapData {
  profiles: Profile[];
  projects: Project[];
  columns: KanbanColumn[];
  cards: KanbanCard[];
  files: ProjectFile[];
  references: ProjectReference[];
  meetings: Meeting[];
  activity: ActivityEntry[];
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  color_hex: string;
}

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ColumnRow {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

interface CardRow {
  id: string;
  column_id: string;
  project_id: string;
  title: string;
  description: string | null;
  position: number;
  assignee_ids: string[] | null;
  labels: string[] | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface FileRow {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: ProjectFile["type"];
  notes: string | null;
  added_by: string;
  added_at: string;
}

interface ReferenceRow {
  id: string;
  project_id: string;
  type: ProjectReference["type"];
  url: string;
  title: string;
  source_label: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  added_by: string;
  added_at: string;
}

interface MeetingRow {
  id: string;
  project_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  attendee_ids: string[] | null;
  created_by: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  project_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_label: string;
  detail: string | null;
  created_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    colorHex: row.color_hex,
  };
}

function mapProject(row: ProjectRow, memberIds: string[]): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    coverImageUrl: row.cover_image_url,
    status: row.status,
    createdBy: row.created_by,
    memberIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapColumn(row: ColumnRow): KanbanColumn {
  return { id: row.id, projectId: row.project_id, name: row.name, position: row.position };
}

function mapCard(row: CardRow): KanbanCard {
  return {
    id: row.id,
    columnId: row.column_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? "",
    position: row.position,
    assigneeIds: row.assignee_ids ?? [],
    labels: row.labels ?? [],
    dueDate: row.due_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFile(row: FileRow): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    url: row.url,
    type: row.type,
    notes: row.notes ?? undefined,
    addedBy: row.added_by,
    addedAt: row.added_at,
  };
}

function mapReference(row: ReferenceRow): ProjectReference {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    url: row.url,
    title: row.title,
    sourceLabel: row.source_label,
    thumbnailUrl: row.thumbnail_url,
    tags: row.tags ?? [],
    addedBy: row.added_by,
    addedAt: row.added_at,
  };
}

function mapMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    attendeeIds: row.attendee_ids ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapActivity(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityLabel: row.entity_label,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  };
}

function assertOk<T>(result: { data: T | null; error: { message: string } | null }): T | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function fetchBootstrapData(supabase: SupabaseClient): Promise<BootstrapData> {
  const [
    profilesRes,
    projectsRes,
    membersRes,
    columnsRes,
    cardsRes,
    filesRes,
    referencesRes,
    meetingsRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("projects").select("*"),
    supabase.from("project_members").select("project_id, user_id"),
    supabase.from("kanban_columns").select("*").order("position"),
    supabase.from("kanban_cards").select("*").order("position"),
    supabase.from("project_files").select("*").order("added_at", { ascending: false }),
    supabase.from("project_references").select("*").order("added_at", { ascending: false }),
    supabase.from("meetings").select("*").order("starts_at"),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const profiles: ProfileRow[] = assertOk(profilesRes) ?? [];
  const memberRows: { project_id: string; user_id: string }[] = assertOk(membersRes) ?? [];
  const membersByProject = new Map<string, string[]>();
  for (const row of memberRows) {
    const list = membersByProject.get(row.project_id) ?? [];
    list.push(row.user_id);
    membersByProject.set(row.project_id, list);
  }

  const projectRows: ProjectRow[] = assertOk(projectsRes) ?? [];
  const columnRows: ColumnRow[] = assertOk(columnsRes) ?? [];
  const cardRows: CardRow[] = assertOk(cardsRes) ?? [];
  const fileRows: FileRow[] = assertOk(filesRes) ?? [];
  const referenceRows: ReferenceRow[] = assertOk(referencesRes) ?? [];
  const meetingRows: MeetingRow[] = assertOk(meetingsRes) ?? [];
  const activityRows: ActivityRow[] = assertOk(activityRes) ?? [];

  return {
    profiles: profiles.map(mapProfile),
    projects: projectRows.map((row) => mapProject(row, membersByProject.get(row.id) ?? [])),
    columns: columnRows.map(mapColumn),
    cards: cardRows.map(mapCard),
    files: fileRows.map(mapFile),
    references: referenceRows.map(mapReference),
    meetings: meetingRows.map(mapMeeting),
    activity: activityRows.map(mapActivity),
  };
}

export async function insertProject(
  supabase: SupabaseClient,
  input: {
    id: string;
    slug: string;
    name: string;
    description: string;
    status: ProjectStatus;
    coverImageUrl: string | null;
    createdBy: string;
  }
) {
  assertOk(
    await supabase.from("projects").insert({
      id: input.id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      status: input.status,
      cover_image_url: input.coverImageUrl,
      created_by: input.createdBy,
    })
  );
  assertOk(
    await supabase
      .from("project_members")
      .insert({ project_id: input.id, user_id: input.createdBy, role: "dono" })
  );
}

export async function addProjectMember(supabase: SupabaseClient, projectId: string, userId: string) {
  assertOk(
    await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId, role: "membro" })
  );
}

export async function insertColumns(
  supabase: SupabaseClient,
  columns: { id: string; projectId: string; name: string; position: number }[]
) {
  assertOk(
    await supabase.from("kanban_columns").insert(
      columns.map((c) => ({ id: c.id, project_id: c.projectId, name: c.name, position: c.position }))
    )
  );
}

export async function updateProjectRow(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Project>
) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.coverImageUrl !== undefined) row.cover_image_url = patch.coverImageUrl;
  row.updated_at = new Date().toISOString();
  assertOk(await supabase.from("projects").update(row).eq("id", id));
}

export async function deleteProjectRow(supabase: SupabaseClient, id: string) {
  assertOk(await supabase.from("projects").delete().eq("id", id));
}

export async function insertCard(
  supabase: SupabaseClient,
  input: {
    id: string;
    columnId: string;
    projectId: string;
    title: string;
    description?: string;
    position: number;
    labels: string[];
    dueDate: string | null;
    createdBy: string;
  }
) {
  assertOk(
    await supabase.from("kanban_cards").insert({
      id: input.id,
      column_id: input.columnId,
      project_id: input.projectId,
      title: input.title,
      description: input.description ?? "",
      position: input.position,
      labels: input.labels,
      due_date: input.dueDate,
      created_by: input.createdBy,
    })
  );
}

export async function updateCardRow(supabase: SupabaseClient, id: string, patch: Partial<KanbanCard>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.columnId !== undefined) row.column_id = patch.columnId;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.labels !== undefined) row.labels = patch.labels;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.assigneeIds !== undefined) row.assignee_ids = patch.assigneeIds;
  row.updated_at = new Date().toISOString();
  assertOk(await supabase.from("kanban_cards").update(row).eq("id", id));
}

export async function updateCardPositions(
  supabase: SupabaseClient,
  updates: { id: string; columnId: string; position: number }[]
) {
  await Promise.all(
    updates.map(async (u) => {
      assertOk(
        await supabase
          .from("kanban_cards")
          .update({ column_id: u.columnId, position: u.position })
          .eq("id", u.id)
      );
    })
  );
}

export async function deleteCardRow(supabase: SupabaseClient, id: string) {
  assertOk(await supabase.from("kanban_cards").delete().eq("id", id));
}

export async function insertFile(
  supabase: SupabaseClient,
  input: {
    id: string;
    projectId: string;
    name: string;
    url: string;
    type: ProjectFile["type"];
    notes?: string;
    addedBy: string;
  }
) {
  assertOk(
    await supabase.from("project_files").insert({
      id: input.id,
      project_id: input.projectId,
      name: input.name,
      url: input.url,
      type: input.type,
      notes: input.notes,
      added_by: input.addedBy,
    })
  );
}

export async function deleteFileRow(supabase: SupabaseClient, id: string) {
  assertOk(await supabase.from("project_files").delete().eq("id", id));
}

export async function insertReference(
  supabase: SupabaseClient,
  input: {
    id: string;
    projectId: string;
    type: ProjectReference["type"];
    url: string;
    title: string;
    sourceLabel: string;
    thumbnailUrl: string | null;
    tags: string[];
    addedBy: string;
  }
) {
  assertOk(
    await supabase.from("project_references").insert({
      id: input.id,
      project_id: input.projectId,
      type: input.type,
      url: input.url,
      title: input.title,
      source_label: input.sourceLabel,
      thumbnail_url: input.thumbnailUrl,
      tags: input.tags,
      added_by: input.addedBy,
    })
  );
}

export async function deleteReferenceRow(supabase: SupabaseClient, id: string) {
  assertOk(await supabase.from("project_references").delete().eq("id", id));
}

export async function insertMeeting(
  supabase: SupabaseClient,
  input: {
    id: string;
    projectId: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    location?: string;
    notes?: string;
    createdBy: string;
  }
) {
  assertOk(
    await supabase.from("meetings").insert({
      id: input.id,
      project_id: input.projectId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location,
      notes: input.notes,
      attendee_ids: [input.createdBy],
      created_by: input.createdBy,
    })
  );
}

export async function updateMeetingRow(supabase: SupabaseClient, id: string, patch: Partial<Meeting>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.startsAt !== undefined) row.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) row.ends_at = patch.endsAt;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.notes !== undefined) row.notes = patch.notes;
  assertOk(await supabase.from("meetings").update(row).eq("id", id));
}

export async function deleteMeetingRow(supabase: SupabaseClient, id: string) {
  assertOk(await supabase.from("meetings").delete().eq("id", id));
}

export async function insertActivity(
  supabase: SupabaseClient,
  entry: {
    id: string;
    projectId: string;
    userId: string;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityLabel: string;
    detail?: string;
  }
) {
  assertOk(
    await supabase.from("activity_log").insert({
      id: entry.id,
      project_id: entry.projectId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_label: entry.entityLabel,
      detail: entry.detail,
    })
  );
}
