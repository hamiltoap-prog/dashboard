"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CURRENT_USER_ID,
  mockActivity,
  mockCards,
  mockColumns,
  mockFiles,
  mockMeetings,
  mockProfiles,
  mockProjects,
  mockReferences,
} from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/client";
import * as db from "@/lib/supabase/queries";
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

const STORAGE_KEY = "palco:dashboard:v1";

interface StoreData {
  profiles: Profile[];
  projects: Project[];
  columns: KanbanColumn[];
  cards: KanbanCard[];
  files: ProjectFile[];
  references: ProjectReference[];
  meetings: Meeting[];
  activity: ActivityEntry[];
}

function seedData(): StoreData {
  return {
    profiles: mockProfiles,
    projects: mockProjects,
    columns: mockColumns,
    cards: mockCards,
    files: mockFiles,
    references: mockReferences,
    meetings: mockMeetings,
    activity: mockActivity,
  };
}

function emptyData(): StoreData {
  return {
    profiles: [],
    projects: [],
    columns: [],
    cards: [],
    files: [],
    references: [],
    meetings: [],
    activity: [],
  };
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_PHASES = ["A iniciar", "Em Produção", "Concluído", "Recorrente"];

function reportSaveError(context: string, error: unknown) {
  console.error(context, error);
  toast.error("Não foi possível salvar no servidor", {
    description: error instanceof Error ? error.message : context,
  });
}

interface StoreContextValue extends StoreData {
  currentUser: Profile;
  getProfile: (id: string) => Profile | undefined;
  createProject: (input: {
    name: string;
    description: string;
    status: ProjectStatus;
    coverImageUrl?: string;
  }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addMember: (projectId: string, email: string) => void;
  addCard: (input: {
    projectId: string;
    columnId: string;
    title: string;
    description?: string;
    labels?: string[];
    dueDate?: string | null;
  }) => KanbanCard;
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
  updateCard: (id: string, patch: Partial<KanbanCard>) => void;
  deleteCard: (id: string) => void;
  addFile: (input: {
    projectId: string;
    name: string;
    url: string;
    type: ProjectFile["type"];
    notes?: string;
  }) => ProjectFile;
  deleteFile: (id: string) => void;
  addReference: (input: {
    projectId: string;
    type: ProjectReference["type"];
    url: string;
    title: string;
    sourceLabel: string;
    thumbnailUrl?: string | null;
    tags?: string[];
  }) => ProjectReference;
  deleteReference: (id: string) => void;
  addMeeting: (input: {
    projectId: string;
    title: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string;
    notes?: string;
  }) => Meeting;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const configured = React.useMemo(() => isSupabaseConfigured(), []);
  const supabase = React.useMemo<SupabaseClient | null>(
    () => (configured ? createClient() : null),
    [configured]
  );

  const [data, setData] = React.useState<StoreData>(configured ? emptyData : seedData);
  const [hydrated, setHydrated] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string>(
    configured ? "" : CURRENT_USER_ID
  );

  // Modo Supabase: busca os dados reais do usuário autenticado.
  React.useEffect(() => {
    if (!configured || !supabase) return;
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setHydrated(true);
        return;
      }
      try {
        const bootstrap = await db.fetchBootstrapData(supabase);
        if (cancelled) return;
        setData(bootstrap);
        setCurrentUserId(user.id);
      } catch (error) {
        reportSaveError("Não foi possível carregar seus dados.", error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, supabase]);

  // Modo demo: sincroniza uma única vez com o localStorage (sistema externo,
  // não acessível durante o SSR) assim que o componente monta no cliente.
  React.useEffect(() => {
    if (configured) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setData(JSON.parse(raw));
    } catch {
      // localStorage indisponível — segue com os dados de exemplo
    }
    setHydrated(true);
  }, [configured]);

  React.useEffect(() => {
    if (configured || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // armazenamento cheio ou indisponível — ignora
    }
  }, [data, hydrated, configured]);

  const currentUser =
    data.profiles.find((p) => p.id === currentUserId) ?? data.profiles[0];

  const logActivityLocal = React.useCallback(
    (
      projectId: string,
      action: ActivityAction,
      entityType: ActivityEntityType,
      entityLabel: string,
      detail?: string
    ): ActivityEntry => {
      const entry: ActivityEntry = {
        id: newId(),
        projectId,
        userId: currentUserId,
        action,
        entityType,
        entityLabel,
        detail,
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, activity: [entry, ...d.activity] }));
      return entry;
    },
    [currentUserId]
  );

  const logActivity = React.useCallback(
    (
      projectId: string,
      action: ActivityAction,
      entityType: ActivityEntityType,
      entityLabel: string,
      detail?: string
    ) => {
      const entry = logActivityLocal(projectId, action, entityType, entityLabel, detail);
      if (supabase) {
        db.insertActivity(supabase, entry).catch((error) =>
          console.error("Falha ao registrar atividade", error)
        );
      }
    },
    [logActivityLocal, supabase]
  );

  const value: StoreContextValue = React.useMemo(
    () => ({
      ...data,
      currentUser,
      getProfile: (id) => data.profiles.find((p) => p.id === id),

      createProject: ({ name, description, status, coverImageUrl }) => {
        const id = newId();
        const now = new Date().toISOString();
        const project: Project = {
          id,
          slug: `${slugify(name) || "projeto"}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          description,
          status,
          coverImageUrl: coverImageUrl || null,
          createdBy: currentUserId,
          memberIds: [currentUserId],
          createdAt: now,
          updatedAt: now,
        };
        const columns: KanbanColumn[] = DEFAULT_PHASES.map((phaseName, i) => ({
          id: newId(),
          projectId: id,
          name: phaseName,
          position: i,
        }));
        setData((d) => ({
          ...d,
          projects: [project, ...d.projects],
          columns: [...d.columns, ...columns],
        }));
        const activityEntry = logActivityLocal(id, "created", "project", project.name);

        if (supabase) {
          (async () => {
            try {
              await db.insertProject(supabase, {
                id,
                slug: project.slug,
                name,
                description,
                status,
                coverImageUrl: project.coverImageUrl ?? null,
                createdBy: currentUserId,
              });
              await db.insertColumns(supabase, columns);
              await db.insertActivity(supabase, activityEntry);
            } catch (error) {
              reportSaveError("Não foi possível criar o projeto no servidor.", error);
            }
          })();
        }

        return project;
      },

      updateProject: (id, patch) => {
        setData((d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        }));
        const project = data.projects.find((p) => p.id === id);
        if (project) logActivity(id, "updated", "project", project.name);

        if (supabase) {
          db.updateProjectRow(supabase, id, patch).catch((error) =>
            reportSaveError("Não foi possível salvar as alterações do projeto.", error)
          );
        }
      },

      deleteProject: (id) => {
        setData((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          columns: d.columns.filter((c) => c.projectId !== id),
          cards: d.cards.filter((c) => c.projectId !== id),
          files: d.files.filter((f) => f.projectId !== id),
          references: d.references.filter((r) => r.projectId !== id),
          meetings: d.meetings.filter((m) => m.projectId !== id),
          activity: d.activity.filter((a) => a.projectId !== id),
        }));

        if (supabase) {
          db.deleteProjectRow(supabase, id).catch((error) =>
            reportSaveError("Não foi possível excluir o projeto no servidor.", error)
          );
        }
      },

      addMember: (projectId, email) => {
        const trimmed = email.trim().toLowerCase();
        const profile = data.profiles.find((p) => p.email.toLowerCase() === trimmed);
        if (!profile) {
          toast.error("Pessoa não encontrada", {
            description: configured
              ? "Essa pessoa precisa criar uma conta no Palco primeiro (tela de login)."
              : "Nenhum perfil de exemplo tem esse e-mail.",
          });
          return;
        }

        const project = data.projects.find((p) => p.id === projectId);
        if (!project) return;
        if (project.memberIds.includes(profile.id)) {
          toast.info(`${profile.name} já faz parte do projeto.`);
          return;
        }

        setData((d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === projectId ? { ...p, memberIds: [...p.memberIds, profile.id] } : p
          ),
        }));
        logActivity(
          projectId,
          "updated",
          "project",
          project.name,
          `adicionou ${profile.name} ao projeto`
        );
        toast.success(`${profile.name} foi adicionado(a) ao projeto`);

        if (supabase) {
          db.addProjectMember(supabase, projectId, profile.id).catch((error) =>
            reportSaveError("Não foi possível adicionar a pessoa no servidor.", error)
          );
        }
      },

      addCard: ({ projectId, columnId, title, description, labels, dueDate }) => {
        const id = newId();
        const now = new Date().toISOString();
        const siblings = data.cards.filter((c) => c.columnId === columnId);
        const card: KanbanCard = {
          id,
          columnId,
          projectId,
          title,
          description,
          position: siblings.length,
          assigneeIds: [],
          labels: labels ?? [],
          dueDate: dueDate ?? null,
          createdBy: currentUserId,
          createdAt: now,
          updatedAt: now,
        };
        setData((d) => ({ ...d, cards: [...d.cards, card] }));
        logActivity(projectId, "created", "card", title);

        if (supabase) {
          db.insertCard(supabase, {
            id,
            columnId,
            projectId,
            title,
            description,
            position: card.position,
            labels: card.labels,
            dueDate: card.dueDate ?? null,
            createdBy: currentUserId,
          }).catch((error) => reportSaveError("Não foi possível salvar o card.", error));
        }

        return card;
      },

      moveCard: (cardId, toColumnId, toIndex) => {
        const movingCard = data.cards.find((c) => c.id === cardId);
        if (!movingCard) return;
        const columnChanged = movingCard.columnId !== toColumnId;

        const destCards = data.cards
          .filter((c) => c.columnId === toColumnId && c.id !== cardId)
          .sort((a, b) => a.position - b.position);
        const clampedIndex = Math.max(0, Math.min(toIndex, destCards.length));
        destCards.splice(clampedIndex, 0, movingCard);
        const destPositions = new Map(destCards.map((c, idx) => [c.id, idx]));

        setData((d) => ({
          ...d,
          cards: d.cards.map((c) => {
            if (c.id === cardId) {
              return {
                ...c,
                columnId: toColumnId,
                position: destPositions.get(c.id) ?? 0,
                updatedAt: new Date().toISOString(),
              };
            }
            if (destPositions.has(c.id)) {
              return { ...c, position: destPositions.get(c.id)! };
            }
            return c;
          }),
        }));

        if (columnChanged) {
          const column = data.columns.find((c) => c.id === toColumnId);
          logActivity(
            movingCard.projectId,
            "moved",
            "card",
            movingCard.title,
            column ? `moveu para ${column.name}` : undefined
          );
        }

        if (supabase) {
          const updates = Array.from(destPositions.entries()).map(([id, position]) => ({
            id,
            columnId: toColumnId,
            position,
          }));
          db.updateCardPositions(supabase, updates).catch((error) =>
            reportSaveError("Não foi possível salvar a posição do card.", error)
          );
        }
      },

      updateCard: (id, patch) => {
        setData((d) => ({
          ...d,
          cards: d.cards.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        }));
        const card = data.cards.find((c) => c.id === id);
        if (card) logActivity(card.projectId, "updated", "card", card.title);

        if (supabase) {
          db.updateCardRow(supabase, id, patch).catch((error) =>
            reportSaveError("Não foi possível salvar as alterações do card.", error)
          );
        }
      },

      deleteCard: (id) => {
        const card = data.cards.find((c) => c.id === id);
        setData((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }));
        if (card) logActivity(card.projectId, "deleted", "card", card.title);

        if (supabase) {
          db.deleteCardRow(supabase, id).catch((error) =>
            reportSaveError("Não foi possível excluir o card no servidor.", error)
          );
        }
      },

      addFile: ({ projectId, name, url, type, notes }) => {
        const id = newId();
        const file: ProjectFile = {
          id,
          projectId,
          name,
          url,
          type,
          notes,
          addedBy: currentUserId,
          addedAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, files: [file, ...d.files] }));
        logActivity(projectId, "created", "file", name);

        if (supabase) {
          db.insertFile(supabase, {
            id,
            projectId,
            name,
            url,
            type,
            notes,
            addedBy: currentUserId,
          }).catch((error) => reportSaveError("Não foi possível salvar o arquivo.", error));
        }

        return file;
      },

      deleteFile: (id) => {
        const file = data.files.find((f) => f.id === id);
        setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) }));
        if (file) logActivity(file.projectId, "deleted", "file", file.name);

        if (supabase) {
          db.deleteFileRow(supabase, id).catch((error) =>
            reportSaveError("Não foi possível excluir o arquivo no servidor.", error)
          );
        }
      },

      addReference: ({ projectId, type, url, title, sourceLabel, thumbnailUrl, tags }) => {
        const id = newId();
        const reference: ProjectReference = {
          id,
          projectId,
          type,
          url,
          title,
          sourceLabel,
          thumbnailUrl: thumbnailUrl ?? null,
          tags: tags ?? [],
          addedBy: currentUserId,
          addedAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, references: [reference, ...d.references] }));
        logActivity(projectId, "created", "reference", title || url);

        if (supabase) {
          db.insertReference(supabase, {
            id,
            projectId,
            type,
            url,
            title,
            sourceLabel,
            thumbnailUrl: reference.thumbnailUrl ?? null,
            tags: reference.tags,
            addedBy: currentUserId,
          }).catch((error) => reportSaveError("Não foi possível salvar a referência.", error));
        }

        return reference;
      },

      deleteReference: (id) => {
        const reference = data.references.find((r) => r.id === id);
        setData((d) => ({ ...d, references: d.references.filter((r) => r.id !== id) }));
        if (reference)
          logActivity(reference.projectId, "deleted", "reference", reference.title || reference.url);

        if (supabase) {
          db.deleteReferenceRow(supabase, id).catch((error) =>
            reportSaveError("Não foi possível excluir a referência no servidor.", error)
          );
        }
      },

      addMeeting: ({ projectId, title, startsAt, endsAt, location, notes }) => {
        const id = newId();
        const meeting: Meeting = {
          id,
          projectId,
          title,
          startsAt,
          endsAt: endsAt ?? null,
          location,
          notes,
          attendeeIds: [currentUserId],
          createdBy: currentUserId,
          createdAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, meetings: [...d.meetings, meeting] }));
        logActivity(projectId, "created", "meeting", title);

        if (supabase) {
          db.insertMeeting(supabase, {
            id,
            projectId,
            title,
            startsAt,
            endsAt: meeting.endsAt ?? null,
            location,
            notes,
            createdBy: currentUserId,
          }).catch((error) => reportSaveError("Não foi possível salvar a reunião.", error));
        }

        return meeting;
      },

      updateMeeting: (id, patch) => {
        setData((d) => ({
          ...d,
          meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
        const meeting = data.meetings.find((m) => m.id === id);
        if (meeting) logActivity(meeting.projectId, "updated", "meeting", meeting.title);

        if (supabase) {
          db.updateMeetingRow(supabase, id, patch).catch((error) =>
            reportSaveError("Não foi possível salvar as alterações da reunião.", error)
          );
        }
      },

      deleteMeeting: (id) => {
        const meeting = data.meetings.find((m) => m.id === id);
        setData((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
        if (meeting) logActivity(meeting.projectId, "deleted", "meeting", meeting.title);

        if (supabase) {
          db.deleteMeetingRow(supabase, id).catch((error) =>
            reportSaveError("Não foi possível excluir a reunião no servidor.", error)
          );
        }
      },
    }),
    [data, currentUser, currentUserId, logActivity, logActivityLocal, supabase, configured]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}

export function useProject() {
  const params = useParams<{ slug: string }>();
  const { projects } = useStore();
  return projects.find((p) => p.slug === params.slug);
}
