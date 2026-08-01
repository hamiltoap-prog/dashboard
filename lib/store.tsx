"use client";

import * as React from "react";
import { useParams } from "next/navigation";

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

function newId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_PHASES = [
  "Ideação",
  "Roteiro & Dramaturgia",
  "Elenco & Ensaios",
  "Cenografia & Figurino",
  "Divulgação",
  "Em Cartaz",
];

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
  const [data, setData] = React.useState<StoreData>(seedData);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Sincroniza uma única vez com o localStorage (sistema externo, não
    // acessível durante o SSR) assim que o componente monta no cliente.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setData(JSON.parse(raw));
    } catch {
      // localStorage indisponível — segue com os dados de exemplo
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // armazenamento cheio ou indisponível — ignora
    }
  }, [data, hydrated]);

  const currentUser =
    data.profiles.find((p) => p.id === CURRENT_USER_ID) ?? data.profiles[0];

  const logActivity = React.useCallback(
    (
      projectId: string,
      action: ActivityAction,
      entityType: ActivityEntityType,
      entityLabel: string,
      detail?: string
    ) => {
      const entry: ActivityEntry = {
        id: newId("act"),
        projectId,
        userId: CURRENT_USER_ID,
        action,
        entityType,
        entityLabel,
        detail,
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, activity: [entry, ...d.activity] }));
    },
    []
  );

  const value: StoreContextValue = React.useMemo(
    () => ({
      ...data,
      currentUser,
      getProfile: (id) => data.profiles.find((p) => p.id === id),

      createProject: ({ name, description, status, coverImageUrl }) => {
        const now = new Date().toISOString();
        const project: Project = {
          id: newId("p"),
          slug: `${slugify(name) || "projeto"}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          description,
          status,
          coverImageUrl: coverImageUrl || null,
          createdBy: CURRENT_USER_ID,
          memberIds: [CURRENT_USER_ID],
          createdAt: now,
          updatedAt: now,
        };
        const columns: KanbanColumn[] = DEFAULT_PHASES.map((phaseName, i) => ({
          id: newId("col"),
          projectId: project.id,
          name: phaseName,
          position: i,
        }));
        setData((d) => ({
          ...d,
          projects: [project, ...d.projects],
          columns: [...d.columns, ...columns],
        }));
        logActivity(project.id, "created", "project", project.name);
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
      },

      addCard: ({ projectId, columnId, title, description, labels, dueDate }) => {
        const now = new Date().toISOString();
        const siblings = data.cards.filter((c) => c.columnId === columnId);
        const card: KanbanCard = {
          id: newId("card"),
          columnId,
          projectId,
          title,
          description,
          position: siblings.length,
          assigneeIds: [],
          labels: labels ?? [],
          dueDate: dueDate ?? null,
          createdBy: CURRENT_USER_ID,
          createdAt: now,
          updatedAt: now,
        };
        setData((d) => ({ ...d, cards: [...d.cards, card] }));
        logActivity(projectId, "created", "card", title);
        return card;
      },

      moveCard: (cardId, toColumnId, toIndex) => {
        const movingCard = data.cards.find((c) => c.id === cardId);
        const columnChanged = movingCard ? movingCard.columnId !== toColumnId : false;

        setData((d) => {
          const card = d.cards.find((c) => c.id === cardId);
          if (!card) return d;

          const destCards = d.cards
            .filter((c) => c.columnId === toColumnId && c.id !== cardId)
            .sort((a, b) => a.position - b.position);
          const clampedIndex = Math.max(0, Math.min(toIndex, destCards.length));
          destCards.splice(clampedIndex, 0, card);

          const destPositions = new Map(destCards.map((c, idx) => [c.id, idx]));

          return {
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
          };
        });

        if (movingCard && columnChanged) {
          const column = data.columns.find((c) => c.id === toColumnId);
          logActivity(
            movingCard.projectId,
            "moved",
            "card",
            movingCard.title,
            column ? `moveu para ${column.name}` : undefined
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
      },

      deleteCard: (id) => {
        const card = data.cards.find((c) => c.id === id);
        setData((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }));
        if (card) logActivity(card.projectId, "deleted", "card", card.title);
      },

      addFile: ({ projectId, name, url, type, notes }) => {
        const file: ProjectFile = {
          id: newId("file"),
          projectId,
          name,
          url,
          type,
          notes,
          addedBy: CURRENT_USER_ID,
          addedAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, files: [file, ...d.files] }));
        logActivity(projectId, "created", "file", name);
        return file;
      },

      deleteFile: (id) => {
        const file = data.files.find((f) => f.id === id);
        setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) }));
        if (file) logActivity(file.projectId, "deleted", "file", file.name);
      },

      addReference: ({ projectId, type, url, title, sourceLabel, thumbnailUrl, tags }) => {
        const reference: ProjectReference = {
          id: newId("ref"),
          projectId,
          type,
          url,
          title,
          sourceLabel,
          thumbnailUrl: thumbnailUrl ?? null,
          tags: tags ?? [],
          addedBy: CURRENT_USER_ID,
          addedAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, references: [reference, ...d.references] }));
        logActivity(projectId, "created", "reference", title || url);
        return reference;
      },

      deleteReference: (id) => {
        const reference = data.references.find((r) => r.id === id);
        setData((d) => ({ ...d, references: d.references.filter((r) => r.id !== id) }));
        if (reference)
          logActivity(reference.projectId, "deleted", "reference", reference.title || reference.url);
      },

      addMeeting: ({ projectId, title, startsAt, endsAt, location, notes }) => {
        const meeting: Meeting = {
          id: newId("meet"),
          projectId,
          title,
          startsAt,
          endsAt: endsAt ?? null,
          location,
          notes,
          attendeeIds: [CURRENT_USER_ID],
          createdBy: CURRENT_USER_ID,
          createdAt: new Date().toISOString(),
        };
        setData((d) => ({ ...d, meetings: [...d.meetings, meeting] }));
        logActivity(projectId, "created", "meeting", title);
        return meeting;
      },

      updateMeeting: (id, patch) => {
        setData((d) => ({
          ...d,
          meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
        const meeting = data.meetings.find((m) => m.id === id);
        if (meeting) logActivity(meeting.projectId, "updated", "meeting", meeting.title);
      },

      deleteMeeting: (id) => {
        const meeting = data.meetings.find((m) => m.id === id);
        setData((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
        if (meeting) logActivity(meeting.projectId, "deleted", "meeting", meeting.title);
      },
    }),
    [data, currentUser, logActivity]
  );

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
