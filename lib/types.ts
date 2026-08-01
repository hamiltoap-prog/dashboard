export type ProjectStatus =
  | "planejamento"
  | "em_producao"
  | "ensaios"
  | "em_cartaz"
  | "concluido"
  | "pausado";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planejamento: "Planejamento",
  em_producao: "Em produção",
  ensaios: "Ensaios",
  em_cartaz: "Em cartaz",
  concluido: "Concluído",
  pausado: "Pausado",
};

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  colorHex: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverImageUrl?: string | null;
  status: ProjectStatus;
  createdBy: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  name: string;
  position: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description?: string;
  position: number;
  assigneeIds: string[];
  labels: string[];
  dueDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FileType = "roteiro" | "documento" | "planilha" | "outro";

export const FILE_TYPE_LABEL: Record<FileType, string> = {
  roteiro: "Roteiro",
  documento: "Documento de referência",
  planilha: "Planilha",
  outro: "Outro",
};

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: FileType;
  notes?: string;
  addedBy: string;
  addedAt: string;
}

export type ReferenceType = "video" | "imagem" | "link";

export interface ProjectReference {
  id: string;
  projectId: string;
  type: ReferenceType;
  url: string;
  title: string;
  sourceLabel: string;
  thumbnailUrl?: string | null;
  tags: string[];
  addedBy: string;
  addedAt: string;
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  notes?: string;
  attendeeIds: string[];
  createdBy: string;
  createdAt: string;
}

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "moved"
  | "commented"
  | "joined";

export type ActivityEntityType =
  | "project"
  | "card"
  | "column"
  | "file"
  | "reference"
  | "meeting";

export interface ActivityEntry {
  id: string;
  projectId: string;
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityLabel: string;
  detail?: string;
  createdAt: string;
}
