"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";

import { FullPageSpinner } from "@/components/full-page-spinner";
import { useAuth } from "@/lib/firebase/auth";
import { getFirebase } from "@/lib/firebase/client";
import { notify } from "@/lib/notify";
import { deleteReferenceImage } from "@/lib/reference-images";
import { ensureProfile } from "@/lib/firebase/profile";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityEntry,
  CardComment,
  ChecklistItem,
  KanbanCard,
  KanbanColumn,
  Meeting,
  Profile,
  Project,
  ProjectFile,
  ProjectReference,
  ProjectStatus,
} from "@/lib/types";

// Modelo no Firestore:
//   users/{uid}                      -> Profile
//   projects/{projectId}             -> Project (memberIds = quem tem acesso)
//   projects/{projectId}/{sub}/{id}  -> columns | cards | comments | files | references | meetings | activity
// O `id` de cada item é o id do documento (não é gravado dentro dele).

const SUBCOLLECTIONS = [
  "columns",
  "cards",
  "comments",
  "files",
  "references",
  "meetings",
  "activity",
] as const;
type Sub = (typeof SUBCOLLECTIONS)[number];

const DEFAULT_PHASES = ["A iniciar", "Em Produção", "Concluído", "Recorrente"];
const ACTIVITY_LIMIT = 150;
const BATCH_LIMIT = 400;

interface ProjectData {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  comments: CardComment[];
  files: ProjectFile[];
  references: ProjectReference[];
  meetings: Meeting[];
  activity: ActivityEntry[];
}

const EMPTY_PROJECT_DATA: ProjectData = {
  columns: [],
  cards: [],
  comments: [],
  files: [],
  references: [],
  meetings: [],
  activity: [],
};

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function withoutId<T extends { id: string }>(value: T): Omit<T, "id"> {
  const copy: Partial<T> = { ...value };
  delete copy.id;
  return copy as Omit<T, "id">;
}

function pick<T extends object>(source: Partial<T>, keys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) if (key in source) result[key] = source[key];
  return result;
}

function failure(context: string) {
  return (error: unknown) => {
    console.error(context, error);
    toast.error(context, {
      description: error instanceof Error ? error.message : undefined,
    });
  };
}

function byNewest(a: { createdAt?: string; addedAt?: string }, b: { createdAt?: string; addedAt?: string }) {
  const left = a.createdAt ?? a.addedAt ?? "";
  const right = b.createdAt ?? b.addedAt ?? "";
  return right.localeCompare(left);
}

const mappers: { [K in Sub]: (id: string, data: DocumentData) => ProjectData[K][number] } = {
  columns: (id, data) => ({ id, ...data }) as KanbanColumn,
  cards: (id, data) =>
    ({
      id,
      ...data,
      assigneeIds: data.assigneeIds ?? [],
      labels: data.labels ?? [],
      checklist: data.checklist ?? [],
    }) as KanbanCard,
  comments: (id, data) => ({ id, ...data }) as CardComment,
  files: (id, data) => ({ id, ...data }) as ProjectFile,
  references: (id, data) => ({ id, ...data, tags: data.tags ?? [] }) as ProjectReference,
  meetings: (id, data) =>
    ({ id, ...data, attendeeIds: data.attendeeIds ?? [], exceptions: data.exceptions ?? [] }) as Meeting,
  activity: (id, data) => ({ id, ...data }) as ActivityEntry,
};

interface StoreData {
  profiles: Profile[];
  projects: Project[];
  columns: KanbanColumn[];
  cards: KanbanCard[];
  comments: CardComment[];
  files: ProjectFile[];
  references: ProjectReference[];
  meetings: Meeting[];
  activity: ActivityEntry[];
}

interface StoreContextValue extends StoreData {
  currentUser: Profile;
  getProfile: (id: string) => Profile | undefined;
  // false enquanto os itens do projeto (kanban, arquivos, etc.) ainda estão chegando do servidor.
  isProjectLoaded: (projectId: string) => boolean;
  createProject: (input: {
    name: string;
    description: string;
    status: ProjectStatus;
    coverImageUrl?: string;
  }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addMember: (projectId: string, email: string) => void;
  removeMember: (projectId: string, userId: string) => void;
  addCard: (input: {
    projectId: string;
    columnId: string;
    title: string;
    description?: string;
    labels?: string[];
    dueDate?: string | null;
  }) => KanbanCard;
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
  addColumn: (projectId: string, name: string) => void;
  renameColumn: (id: string, name: string) => void;
  // direction: -1 = para a esquerda, 1 = para a direita
  moveColumn: (id: string, direction: -1 | 1) => void;
  // Os cards da coluna vão para `moveCardsTo`; com null eles são excluídos junto.
  deleteColumn: (id: string, moveCardsTo: string | null) => void;
  updateProfile: (patch: Partial<Pick<Profile, "name" | "colorHex" | "avatarUrl">>) => void;
  updateCard: (id: string, patch: Partial<KanbanCard>) => void;
  deleteCard: (id: string) => void;
  // Grava a checklist na hora (sem registrar atividade a cada item marcado).
  setChecklist: (cardId: string, checklist: ChecklistItem[]) => void;
  addComment: (cardId: string, text: string) => void;
  deleteComment: (id: string) => void;
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
  // Grava direto pelo endereço (projectId + id): funciona mesmo logo após criar a referência.
  updateReference: (
    projectId: string,
    id: string,
    patch: Partial<Pick<ProjectReference, "title" | "tags" | "thumbnailUrl" | "thumbnailPath" | "thumbnailSource">>
  ) => Promise<void>;
  deleteReference: (id: string) => void;
  addMeeting: (input: {
    projectId: string;
    title: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string;
    notes?: string;
    recurrence?: Meeting["recurrence"];
  }) => Meeting;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  // Cancela só uma ocorrência de uma reunião recorrente.
  skipOccurrence: (id: string, startsAt: string) => void;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [rawProjects, setRawProjects] = React.useState<Project[]>([]);
  const [byProject, setByProject] = React.useState<Record<string, ProjectData>>({});
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set());
  const [usersLoaded, setUsersLoaded] = React.useState(false);
  const [projectsLoaded, setProjectsLoaded] = React.useState(false);
  const [loadedKeys, setLoadedKeys] = React.useState<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);

  const subscriptions = React.useRef(new Map<string, Unsubscribe[]>());

  // 1) Perfil próprio, lista de pessoas e projetos de que participo.
  React.useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();

    ensureProfile(user).catch(failure("Não foi possível criar seu perfil."));

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile));
        setUsersLoaded(true);
      },
      failure("Não foi possível carregar as pessoas.")
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), where("memberIds", "array-contains", user.uid)),
      (snap) => {
        setRawProjects(
          snap.docs.map((d) => ({ id: d.id, ...d.data(), memberIds: d.data().memberIds ?? [] }) as Project)
        );
        setProjectsLoaded(true);
      },
      failure("Não foi possível carregar os projetos.")
    );

    return () => {
      unsubUsers();
      unsubProjects();
    };
  }, [user]);

  // 2) Para cada projeto, escuta em tempo real as subcoleções (kanban, arquivos, etc.).
  const projectIdsKey = rawProjects
    .map((p) => p.id)
    .sort()
    .join(",");

  React.useEffect(() => {
    const ids = new Set(projectIdsKey ? projectIdsKey.split(",") : []);
    const { db } = getFirebase();

    for (const [projectId, unsubs] of subscriptions.current) {
      if (ids.has(projectId)) continue;
      unsubs.forEach((unsubscribe) => unsubscribe());
      subscriptions.current.delete(projectId);
    }

    for (const projectId of ids) {
      if (subscriptions.current.has(projectId)) continue;

      const unsubs = SUBCOLLECTIONS.map((sub) => {
        const key = `${projectId}/${sub}`;
        const base = collection(db, "projects", projectId, sub);
        const q: Query<DocumentData> =
          sub === "activity" ? query(base, orderBy("createdAt", "desc"), limit(ACTIVITY_LIMIT)) : base;
        const markLoaded = () =>
          setLoadedKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

        return onSnapshot(
          q,
          (snap) => {
            const items = snap.docs.map((d) => mappers[sub](d.id, d.data()));
            setByProject((prev) => ({
              ...prev,
              [projectId]: { ...(prev[projectId] ?? EMPTY_PROJECT_DATA), [sub]: items },
            }));
            markLoaded();
          },
          (error) => {
            console.error(`Falha ao carregar ${key}`, error);
            markLoaded();
          }
        );
      });
      subscriptions.current.set(projectId, unsubs);
    }
  }, [projectIdsKey]);

  React.useEffect(() => {
    const map = subscriptions.current;
    return () => {
      map.forEach((unsubs) => unsubs.forEach((unsubscribe) => unsubscribe()));
      map.clear();
    };
  }, []);

  // Só mostra o app depois que tudo carregou uma vez (evita piscar quadros vazios).
  const allLoaded =
    usersLoaded &&
    projectsLoaded &&
    rawProjects.every((p) => SUBCOLLECTIONS.every((sub) => loadedKeys.has(`${p.id}/${sub}`)));
  if (allLoaded && !ready) setReady(true);

  const data: StoreData = React.useMemo(() => {
    const projects = rawProjects
      .filter((p) => !deleting.has(p.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const parts = projects.map((p) => byProject[p.id] ?? EMPTY_PROJECT_DATA);
    return {
      profiles,
      projects,
      columns: parts.flatMap((d) => d.columns).sort((a, b) => a.position - b.position),
      cards: parts.flatMap((d) => d.cards).sort((a, b) => a.position - b.position),
      comments: parts.flatMap((d) => d.comments).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      files: parts.flatMap((d) => d.files).sort(byNewest),
      references: parts.flatMap((d) => d.references).sort(byNewest),
      meetings: parts.flatMap((d) => d.meetings).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      activity: parts.flatMap((d) => d.activity).sort(byNewest),
    };
  }, [profiles, rawProjects, byProject, deleting]);

  const currentUser: Profile = React.useMemo(
    () =>
      profiles.find((p) => p.id === uid) ?? {
        id: uid,
        name: user?.displayName || user?.email?.split("@")[0] || "Você",
        email: user?.email ?? "",
        avatarUrl: user?.photoURL ?? null,
        colorHex: "#5B8DEF",
      },
    [profiles, uid, user]
  );

  const value: StoreContextValue = React.useMemo(() => {
    const { db } = getFirebase();
    const projectDoc = (projectId: string) => doc(db, "projects", projectId);
    const itemDoc = (projectId: string, sub: Sub, id: string) =>
      doc(db, "projects", projectId, sub, id);

    function logActivity(
      projectId: string,
      action: ActivityAction,
      entityType: ActivityEntityType,
      entityLabel: string,
      detail?: string
    ) {
      const entry: ActivityEntry = {
        id: newId(),
        projectId,
        userId: uid,
        action,
        entityType,
        entityLabel,
        detail,
        createdAt: nowIso(),
      };
      setDoc(itemDoc(projectId, "activity", entry.id), withoutId(entry)).catch(() => {
        // o log de atividade nunca deve atrapalhar a ação principal
      });
    }

    return {
      ...data,
      currentUser,
      getProfile: (id) => data.profiles.find((p) => p.id === id),
      isProjectLoaded: (projectId) => SUBCOLLECTIONS.every((sub) => loadedKeys.has(`${projectId}/${sub}`)),

      createProject: ({ name, description, status, coverImageUrl }) => {
        const id = newId();
        const now = nowIso();
        const project: Project = {
          id,
          slug: `${slugify(name) || "projeto"}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          description,
          status,
          coverImageUrl: coverImageUrl || null,
          createdBy: uid,
          memberIds: [uid],
          createdAt: now,
          updatedAt: now,
        };
        const columns: KanbanColumn[] = DEFAULT_PHASES.map((phaseName, position) => ({
          id: newId(),
          projectId: id,
          name: phaseName,
          position,
        }));
        const entry: ActivityEntry = {
          id: newId(),
          projectId: id,
          userId: uid,
          action: "created",
          entityType: "project",
          entityLabel: name,
          createdAt: now,
        };

        // O projeto precisa existir antes dos itens (as regras checam o `memberIds` dele).
        // O Firestore envia as escritas na ordem, então não precisamos esperar entre elas.
        const failed = failure("Não foi possível criar o projeto.");
        setDoc(projectDoc(id), withoutId(project)).catch(failed);
        const batch = writeBatch(db);
        columns.forEach((c) => batch.set(itemDoc(id, "columns", c.id), withoutId(c)));
        batch.set(itemDoc(id, "activity", entry.id), withoutId(entry));
        batch.commit().catch(failed);

        return project;
      },

      updateProject: (id, patch) => {
        const fields = pick(patch, ["name", "description", "status", "coverImageUrl"]);
        updateDoc(projectDoc(id), { ...fields, updatedAt: nowIso() }).catch(
          failure("Não foi possível salvar as alterações do projeto.")
        );
        const project = data.projects.find((p) => p.id === id);
        if (project) logActivity(id, "updated", "project", project.name);
      },

      deleteProject: (id) => {
        // Firestore não apaga subcoleções sozinho: apagamos os itens e, por último, o projeto.
        setDeleting((prev) => new Set(prev).add(id));
        (async () => {
          try {
            for (const sub of SUBCOLLECTIONS) {
              const snap = await getDocs(collection(db, "projects", id, sub));
              for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
                const batch = writeBatch(db);
                snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
                await batch.commit();
              }
            }
            await deleteDoc(projectDoc(id));
          } catch (error) {
            setDeleting((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            failure("Não foi possível excluir o projeto. Só quem criou o projeto pode excluí-lo.")(error);
          }
        })();
      },

      addMember: (projectId, email) => {
        const wanted = email.trim().toLowerCase();
        const profile = data.profiles.find((p) => p.email.toLowerCase() === wanted);
        if (!profile) {
          toast.error("Pessoa não encontrada", {
            description: "Essa pessoa precisa criar uma conta no Palco primeiro (tela de login).",
          });
          return;
        }
        const project = data.projects.find((p) => p.id === projectId);
        if (!project) return;
        if (project.memberIds.includes(profile.id)) {
          toast.info(`${profile.name} já faz parte do projeto.`);
          return;
        }

        updateDoc(projectDoc(projectId), {
          memberIds: arrayUnion(profile.id),
          updatedAt: nowIso(),
        })
          .then(() => notify({ kind: "member_added", projectId, targetUserId: profile.id }))
          .catch(failure("Não foi possível adicionar a pessoa."));
        logActivity(projectId, "updated", "project", project.name, `adicionou ${profile.name} ao projeto`);
        toast.success(`${profile.name} foi adicionado(a) ao projeto`);
      },

      removeMember: (projectId, userId) => {
        const project = data.projects.find((p) => p.id === projectId);
        const profile = data.profiles.find((p) => p.id === userId);
        if (!project) return;
        updateDoc(projectDoc(projectId), {
          memberIds: arrayRemove(userId),
          updatedAt: nowIso(),
        }).catch(failure("Não foi possível remover a pessoa."));
        // Só dá para registrar atividade enquanto ainda somos membros.
        if (userId !== uid) {
          logActivity(
            projectId,
            "updated",
            "project",
            project.name,
            `removeu ${profile?.name ?? "uma pessoa"} do projeto`
          );
        }
      },

      addCard: ({ projectId, columnId, title, description, labels, dueDate }) => {
        const now = nowIso();
        const card: KanbanCard = {
          id: newId(),
          columnId,
          projectId,
          title,
          description,
          position: data.cards.filter((c) => c.columnId === columnId).length,
          assigneeIds: [],
          labels: labels ?? [],
          checklist: [],
          dueDate: dueDate ?? null,
          createdBy: uid,
          createdAt: now,
          updatedAt: now,
        };
        setDoc(itemDoc(projectId, "cards", card.id), withoutId(card)).catch(
          failure("Não foi possível salvar o card.")
        );
        logActivity(projectId, "created", "card", title);
        return card;
      },

      moveCard: (cardId, toColumnId, toIndex) => {
        const movingCard = data.cards.find((c) => c.id === cardId);
        if (!movingCard) return;
        const columnChanged = movingCard.columnId !== toColumnId;

        const destCards = data.cards
          .filter((c) => c.columnId === toColumnId && c.id !== cardId)
          .sort((a, b) => a.position - b.position);
        destCards.splice(Math.max(0, Math.min(toIndex, destCards.length)), 0, movingCard);

        const batch = writeBatch(db);
        const now = nowIso();
        destCards.forEach((card, position) => {
          const changes =
            card.id === cardId
              ? { columnId: toColumnId, position, updatedAt: now }
              : card.position !== position
                ? { position }
                : null;
          if (changes) batch.update(itemDoc(movingCard.projectId, "cards", card.id), changes);
        });
        batch.commit().catch(failure("Não foi possível salvar a posição do card."));

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
      },

      addColumn: (projectId, name) => {
        const column: KanbanColumn = {
          id: newId(),
          projectId,
          name,
          position: data.columns.filter((c) => c.projectId === projectId).length,
        };
        setDoc(itemDoc(projectId, "columns", column.id), withoutId(column)).catch(
          failure("Não foi possível criar a coluna.")
        );
        logActivity(projectId, "created", "column", name);
      },

      renameColumn: (id, name) => {
        const column = data.columns.find((c) => c.id === id);
        if (!column || column.name === name) return;
        updateDoc(itemDoc(column.projectId, "columns", id), { name }).catch(
          failure("Não foi possível renomear a coluna.")
        );
        logActivity(column.projectId, "updated", "column", name, `renomeou "${column.name}"`);
      },

      moveColumn: (id, direction) => {
        const column = data.columns.find((c) => c.id === id);
        if (!column) return;
        const siblings = data.columns
          .filter((c) => c.projectId === column.projectId)
          .sort((a, b) => a.position - b.position);
        const from = siblings.findIndex((c) => c.id === id);
        const to = from + direction;
        if (to < 0 || to >= siblings.length) return;
        siblings.splice(to, 0, siblings.splice(from, 1)[0]);
        const batch = writeBatch(db);
        siblings.forEach((c, position) => {
          if (c.position !== position) batch.update(itemDoc(column.projectId, "columns", c.id), { position });
        });
        batch.commit().catch(failure("Não foi possível reordenar as colunas."));
      },

      deleteColumn: (id, moveCardsTo) => {
        const column = data.columns.find((c) => c.id === id);
        if (!column) return;
        const cards = data.cards
          .filter((c) => c.columnId === id)
          .sort((a, b) => a.position - b.position);
        const batch = writeBatch(db);
        if (moveCardsTo) {
          // Os cards movidos entram no fim da coluna de destino, mantendo a ordem.
          const base = data.cards.filter((c) => c.columnId === moveCardsTo).length;
          const now = nowIso();
          cards.forEach((card, i) =>
            batch.update(itemDoc(column.projectId, "cards", card.id), {
              columnId: moveCardsTo,
              position: base + i,
              updatedAt: now,
            })
          );
        } else {
          cards.forEach((card) => batch.delete(itemDoc(column.projectId, "cards", card.id)));
        }
        batch.delete(itemDoc(column.projectId, "columns", id));
        // Fecha o espaço deixado na ordem das colunas.
        data.columns
          .filter((c) => c.projectId === column.projectId && c.id !== id)
          .sort((a, b) => a.position - b.position)
          .forEach((c, position) => {
            if (c.position !== position) batch.update(itemDoc(column.projectId, "columns", c.id), { position });
          });
        batch.commit().catch(failure("Não foi possível excluir a coluna."));
        logActivity(
          column.projectId,
          "deleted",
          "column",
          column.name,
          cards.length && !moveCardsTo ? `excluiu junto ${cards.length} card(s)` : undefined
        );
      },

      updateProfile: (patch) => {
        const fields = pick(patch, ["name", "colorHex", "avatarUrl"]);
        updateDoc(doc(db, "users", uid), fields).catch(
          failure("Não foi possível salvar seu perfil.")
        );
      },

      updateCard: (id, patch) => {
        const card = data.cards.find((c) => c.id === id);
        if (!card) return;
        const fields = pick(patch, [
          "title",
          "description",
          "labels",
          "dueDate",
          "assigneeIds",
          "checklist",
          "columnId",
          "position",
        ]);
        // Quem acabou de virar responsável recebe um aviso (depois que o servidor confirmar a gravação).
        const newAssignees = (fields.assigneeIds ?? []).filter(
          (userId) => userId !== uid && !card.assigneeIds.includes(userId)
        );
        updateDoc(itemDoc(card.projectId, "cards", id), { ...fields, updatedAt: nowIso() })
          .then(() => {
            if (newAssignees.length > 0) {
              notify({ kind: "assigned", projectId: card.projectId, cardId: id, targetUserIds: newAssignees });
            }
          })
          .catch(failure("Não foi possível salvar as alterações do card."));
        logActivity(card.projectId, "updated", "card", card.title);
      },

      deleteCard: (id) => {
        const card = data.cards.find((c) => c.id === id);
        if (!card) return;
        deleteDoc(itemDoc(card.projectId, "cards", id)).catch(
          failure("Não foi possível excluir o card.")
        );
        // Apaga também os comentários (só é permitido apagar os próprios; o dono apaga todos).
        const project = data.projects.find((p) => p.id === card.projectId);
        const removable = data.comments.filter(
          (c) => c.cardId === id && (c.userId === uid || project?.createdBy === uid)
        );
        if (removable.length > 0) {
          const batch = writeBatch(db);
          removable.forEach((c) => batch.delete(itemDoc(card.projectId, "comments", c.id)));
          batch.commit().catch(() => {});
        }
        logActivity(card.projectId, "deleted", "card", card.title);
      },

      setChecklist: (cardId, checklist) => {
        const card = data.cards.find((c) => c.id === cardId);
        if (!card) return;
        updateDoc(itemDoc(card.projectId, "cards", cardId), { checklist, updatedAt: nowIso() }).catch(
          failure("Não foi possível salvar a checklist.")
        );
      },

      addComment: (cardId, text) => {
        const card = data.cards.find((c) => c.id === cardId);
        const trimmed = text.trim();
        if (!card || !trimmed) return;
        const comment: CardComment = {
          id: newId(),
          projectId: card.projectId,
          cardId,
          userId: uid,
          text: trimmed,
          createdAt: nowIso(),
        };
        setDoc(itemDoc(card.projectId, "comments", comment.id), withoutId(comment))
          .then(() => notify({ kind: "comment", projectId: card.projectId, cardId, commentId: comment.id }))
          .catch(failure("Não foi possível salvar o comentário."));
        logActivity(card.projectId, "commented", "card", card.title, trimmed.slice(0, 140));
      },

      deleteComment: (id) => {
        const comment = data.comments.find((c) => c.id === id);
        if (!comment) return;
        deleteDoc(itemDoc(comment.projectId, "comments", id)).catch(
          failure("Não foi possível excluir o comentário.")
        );
      },

      addFile: ({ projectId, name, url, type, notes }) => {
        const file: ProjectFile = {
          id: newId(),
          projectId,
          name,
          url,
          type,
          notes,
          addedBy: uid,
          addedAt: nowIso(),
        };
        setDoc(itemDoc(projectId, "files", file.id), withoutId(file)).catch(
          failure("Não foi possível salvar o arquivo.")
        );
        logActivity(projectId, "created", "file", name);
        return file;
      },

      deleteFile: (id) => {
        const file = data.files.find((f) => f.id === id);
        if (!file) return;
        deleteDoc(itemDoc(file.projectId, "files", id)).catch(
          failure("Não foi possível excluir o arquivo.")
        );
        logActivity(file.projectId, "deleted", "file", file.name);
      },

      addReference: ({ projectId, type, url, title, sourceLabel, thumbnailUrl, tags }) => {
        const reference: ProjectReference = {
          id: newId(),
          projectId,
          type,
          url,
          title,
          sourceLabel,
          thumbnailUrl: thumbnailUrl ?? null,
          tags: tags ?? [],
          addedBy: uid,
          addedAt: nowIso(),
        };
        setDoc(itemDoc(projectId, "references", reference.id), withoutId(reference)).catch(
          failure("Não foi possível salvar a referência.")
        );
        logActivity(projectId, "created", "reference", title || url);
        return reference;
      },

      updateReference: async (projectId, id, patch) => {
        const fields = pick(patch, ["title", "tags", "thumbnailUrl", "thumbnailPath", "thumbnailSource"]);
        await updateDoc(itemDoc(projectId, "references", id), fields).catch((error) => {
          failure("Não foi possível salvar a referência.")(error);
          throw error;
        });
      },

      deleteReference: (id) => {
        const reference = data.references.find((r) => r.id === id);
        if (!reference) return;
        deleteDoc(itemDoc(reference.projectId, "references", id)).catch(
          failure("Não foi possível excluir a referência.")
        );
        // apaga também a imagem de capa guardada no Storage (se houver)
        if (reference.thumbnailPath) deleteReferenceImage(reference.thumbnailPath);
        logActivity(reference.projectId, "deleted", "reference", reference.title || reference.url);
      },

      addMeeting: ({ projectId, title, startsAt, endsAt, location, notes, recurrence }) => {
        const meeting: Meeting = {
          id: newId(),
          projectId,
          title,
          startsAt,
          endsAt: endsAt ?? null,
          location,
          notes,
          attendeeIds: [uid],
          recurrence: recurrence ?? null,
          exceptions: [],
          createdBy: uid,
          createdAt: nowIso(),
        };
        setDoc(itemDoc(projectId, "meetings", meeting.id), withoutId(meeting))
          .then(() => notify({ kind: "meeting", projectId, meetingId: meeting.id }))
          .catch(failure("Não foi possível salvar a reunião."));
        logActivity(projectId, "created", "meeting", title);
        return meeting;
      },

      updateMeeting: (id, patch) => {
        const meeting = data.meetings.find((m) => m.id === id);
        if (!meeting) return;
        const fields = pick(patch, [
          "title",
          "startsAt",
          "endsAt",
          "location",
          "notes",
          "attendeeIds",
          "recurrence",
          "exceptions",
        ]);
        updateDoc(itemDoc(meeting.projectId, "meetings", id), fields).catch(
          failure("Não foi possível salvar as alterações da reunião.")
        );
        logActivity(meeting.projectId, "updated", "meeting", meeting.title);
      },

      skipOccurrence: (id, startsAt) => {
        const meeting = data.meetings.find((m) => m.id === id);
        if (!meeting) return;
        updateDoc(itemDoc(meeting.projectId, "meetings", id), {
          exceptions: arrayUnion(startsAt),
        }).catch(failure("Não foi possível cancelar a reunião."));
        logActivity(meeting.projectId, "deleted", "meeting", meeting.title, "cancelou uma ocorrência");
      },

      deleteMeeting: (id) => {
        const meeting = data.meetings.find((m) => m.id === id);
        if (!meeting) return;
        deleteDoc(itemDoc(meeting.projectId, "meetings", id)).catch(
          failure("Não foi possível excluir a reunião.")
        );
        logActivity(meeting.projectId, "deleted", "meeting", meeting.title);
      },
    };
  }, [data, currentUser, uid, loadedKeys]);

  if (!ready) return <FullPageSpinner />;
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
