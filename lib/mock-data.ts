import type {
  ActivityEntry,
  KanbanCard,
  KanbanColumn,
  Meeting,
  Profile,
  Project,
  ProjectFile,
  ProjectReference,
} from "@/lib/types";

// Dados de exemplo — usados enquanto o Supabase não está configurado
// (ver README para conectar um projeto real).

const iso = (offsetDays: number, hour = 10, minute = 0) => {
  const base = new Date("2026-08-01T12:00:00.000Z");
  base.setUTCDate(base.getUTCDate() + offsetDays);
  base.setUTCHours(hour, minute, 0, 0);
  return base.toISOString();
};

export const CURRENT_USER_ID = "u_hamilton";

export const mockProfiles: Profile[] = [
  {
    id: "u_hamilton",
    name: "Hamilton Apcido",
    email: "hamilton.apcido@gmail.com",
    avatarUrl: null,
    colorHex: "#5B8DEF",
  },
  {
    id: "u_beatriz",
    name: "Beatriz Lima",
    email: "beatriz.lima@example.com",
    avatarUrl: null,
    colorHex: "#E7A23E",
  },
  {
    id: "u_rafael",
    name: "Rafael Souza",
    email: "rafael.souza@example.com",
    avatarUrl: null,
    colorHex: "#4FB286",
  },
  {
    id: "u_carla",
    name: "Carla Mendes",
    email: "carla.mendes@example.com",
    avatarUrl: null,
    colorHex: "#C868D0",
  },
];

export const mockProjects: Project[] = [
  {
    id: "p_compadecida",
    slug: "auto-da-compadecida",
    name: "Auto da Compadecida — Remontagem",
    description:
      "Remontagem do clássico de Ariano Suassuna para temporada de outubro, com novo elenco e revisão de cenografia.",
    coverImageUrl:
      "https://picsum.photos/seed/compadecida-cover/1600/900",
    status: "em_producao",
    createdBy: "u_hamilton",
    memberIds: ["u_hamilton", "u_beatriz", "u_rafael", "u_carla"],
    createdAt: iso(-40),
    updatedAt: iso(-1),
  },
  {
    id: "p_sonho",
    slug: "sonho-de-uma-noite-de-verao",
    name: "Sonho de Uma Noite de Verão",
    description:
      "Adaptação livre de Shakespeare para elenco jovem, ambientada em um festival de música contemporâneo.",
    coverImageUrl:
      "https://picsum.photos/seed/sonho-cover/1600/900",
    status: "planejamento",
    createdBy: "u_beatriz",
    memberIds: ["u_hamilton", "u_beatriz", "u_carla"],
    createdAt: iso(-15),
    updatedAt: iso(-2),
  },
  {
    id: "p_bodas",
    slug: "bodas-de-sangue",
    name: "Bodas de Sangue",
    description:
      "Montagem de Lorca com forte trabalho corporal e sonoplastia ao vivo. Em fase final de ensaios.",
    coverImageUrl:
      "https://picsum.photos/seed/bodas-cover/1600/900",
    status: "ensaios",
    createdBy: "u_hamilton",
    memberIds: ["u_hamilton", "u_rafael"],
    createdAt: iso(-90),
    updatedAt: iso(-3),
  },
];

const phaseNames = [
  "Ideação",
  "Roteiro & Dramaturgia",
  "Elenco & Ensaios",
  "Cenografia & Figurino",
  "Divulgação",
  "Em Cartaz",
];

export const mockColumns: KanbanColumn[] = mockProjects.flatMap((project) =>
  phaseNames.map((name, index) => ({
    id: `${project.id}_col_${index}`,
    projectId: project.id,
    name,
    position: index,
  }))
);

export const mockCards: KanbanCard[] = [
  {
    id: "card_1",
    columnId: "p_compadecida_col_2",
    projectId: "p_compadecida",
    title: "Ensaio geral — 1º ato",
    description: "Foco nas cenas do Palhaço e João Grilo. Marcar horário com o Rafael para luz.",
    position: 0,
    assigneeIds: ["u_hamilton", "u_rafael"],
    labels: ["Ensaio", "Urgente"],
    dueDate: iso(3),
    createdBy: "u_hamilton",
    createdAt: iso(-10),
    updatedAt: iso(-1),
  },
  {
    id: "card_2",
    columnId: "p_compadecida_col_3",
    projectId: "p_compadecida",
    title: "Revisar figurino da Compadecida",
    description: "Ajustar tecido e provar com a atriz na quinta.",
    position: 0,
    assigneeIds: ["u_carla"],
    labels: ["Figurino"],
    dueDate: iso(5),
    createdBy: "u_carla",
    createdAt: iso(-8),
    updatedAt: iso(-2),
  },
  {
    id: "card_3",
    columnId: "p_compadecida_col_4",
    projectId: "p_compadecida",
    title: "Postar teaser no Instagram",
    description: "Usar trecho do ensaio técnico de terça.",
    position: 0,
    assigneeIds: ["u_beatriz"],
    labels: ["Divulgação"],
    dueDate: iso(2),
    createdBy: "u_beatriz",
    createdAt: iso(-4),
    updatedAt: iso(-4),
  },
  {
    id: "card_4",
    columnId: "p_compadecida_col_1",
    projectId: "p_compadecida",
    title: "Fechar corte do texto final",
    description: "",
    position: 1,
    assigneeIds: ["u_beatriz", "u_hamilton"],
    labels: ["Roteiro"],
    dueDate: null,
    createdBy: "u_beatriz",
    createdAt: iso(-30),
    updatedAt: iso(-9),
  },
  {
    id: "card_5",
    columnId: "p_sonho_col_0",
    projectId: "p_sonho",
    title: "Levantar referências visuais de festival",
    description: "Buscar paletas de cor e figurinos para o mundo da floresta encantada.",
    position: 0,
    assigneeIds: ["u_carla"],
    labels: ["Referência"],
    dueDate: iso(7),
    createdBy: "u_beatriz",
    createdAt: iso(-6),
    updatedAt: iso(-1),
  },
  {
    id: "card_6",
    columnId: "p_sonho_col_1",
    projectId: "p_sonho",
    title: "Primeira leitura do texto adaptado",
    description: "",
    position: 0,
    assigneeIds: ["u_hamilton", "u_beatriz"],
    labels: ["Roteiro"],
    dueDate: iso(10),
    createdBy: "u_hamilton",
    createdAt: iso(-5),
    updatedAt: iso(-5),
  },
  {
    id: "card_7",
    columnId: "p_bodas_col_2",
    projectId: "p_bodas",
    title: "Ensaio de sonoplastia ao vivo",
    description: "Testar percussão com o elenco na sala grande.",
    position: 0,
    assigneeIds: ["u_rafael"],
    labels: ["Ensaio", "Som"],
    dueDate: iso(1),
    createdBy: "u_rafael",
    createdAt: iso(-12),
    updatedAt: iso(0),
  },
  {
    id: "card_8",
    columnId: "p_bodas_col_5",
    projectId: "p_bodas",
    title: "Confirmar datas de temporada no teatro municipal",
    description: "",
    position: 0,
    assigneeIds: ["u_hamilton"],
    labels: ["Produção"],
    dueDate: iso(15),
    createdBy: "u_hamilton",
    createdAt: iso(-20),
    updatedAt: iso(-6),
  },
];

export const mockFiles: ProjectFile[] = [
  {
    id: "file_1",
    projectId: "p_compadecida",
    name: "Roteiro final — Ato I e II",
    url: "https://docs.google.com/document/d/exemplo-roteiro-compadecida",
    type: "roteiro",
    notes: "Última revisão com cortes aprovados pela direção.",
    addedBy: "u_beatriz",
    addedAt: iso(-9),
  },
  {
    id: "file_2",
    projectId: "p_compadecida",
    name: "Planta baixa do cenário",
    url: "https://drive.google.com/file/d/exemplo-planta-cenario",
    type: "documento",
    addedBy: "u_rafael",
    addedAt: iso(-14),
  },
  {
    id: "file_3",
    projectId: "p_compadecida",
    name: "Planilha de orçamento",
    url: "https://docs.google.com/spreadsheets/d/exemplo-orcamento",
    type: "planilha",
    addedBy: "u_hamilton",
    addedAt: iso(-20),
  },
  {
    id: "file_4",
    projectId: "p_sonho",
    name: "Adaptação de texto — rascunho 2",
    url: "https://docs.google.com/document/d/exemplo-sonho-rascunho",
    type: "roteiro",
    addedBy: "u_beatriz",
    addedAt: iso(-3),
  },
  {
    id: "file_5",
    projectId: "p_bodas",
    name: "Roteiro — versão de ensaio",
    url: "https://docs.google.com/document/d/exemplo-bodas-roteiro",
    type: "roteiro",
    addedBy: "u_hamilton",
    addedAt: iso(-60),
  },
];

export const mockReferences: ProjectReference[] = [
  {
    id: "ref_1",
    projectId: "p_compadecida",
    type: "video",
    url: "https://www.youtube.com/watch?v=exemplo-compadecida-cena",
    title: "Referência de encenação — cena do julgamento",
    sourceLabel: "YouTube",
    thumbnailUrl:
      "https://picsum.photos/seed/compadecida-ref-julgamento/800/600",
    tags: ["cena", "encenação"],
    addedBy: "u_hamilton",
    addedAt: iso(-11),
  },
  {
    id: "ref_2",
    projectId: "p_compadecida",
    type: "imagem",
    url: "https://picsum.photos/seed/compadecida-figurino/800/600",
    title: "Paleta de figurino nordestino",
    sourceLabel: "Instagram",
    thumbnailUrl:
      "https://picsum.photos/seed/compadecida-figurino/800/600",
    tags: ["figurino", "cor"],
    addedBy: "u_carla",
    addedAt: iso(-7),
  },
  {
    id: "ref_3",
    projectId: "p_compadecida",
    type: "imagem",
    url: "https://picsum.photos/seed/compadecida-cenario/800/600",
    title: "Textura de cenário — madeira e sertão",
    sourceLabel: "Pinterest",
    thumbnailUrl:
      "https://picsum.photos/seed/compadecida-cenario/800/600",
    tags: ["cenografia"],
    addedBy: "u_rafael",
    addedAt: iso(-13),
  },
  {
    id: "ref_4",
    projectId: "p_sonho",
    type: "imagem",
    url: "https://picsum.photos/seed/sonho-festival/800/600",
    title: "Estética de festival — luzes e tule",
    sourceLabel: "Instagram",
    thumbnailUrl:
      "https://picsum.photos/seed/sonho-festival/800/600",
    tags: ["figurino", "luz"],
    addedBy: "u_carla",
    addedAt: iso(-4),
  },
  {
    id: "ref_5",
    projectId: "p_bodas",
    type: "video",
    url: "https://www.youtube.com/watch?v=exemplo-bodas-percussao",
    title: "Referência de percussão corporal",
    sourceLabel: "YouTube",
    thumbnailUrl:
      "https://picsum.photos/seed/bodas-percussao/800/600",
    tags: ["som", "movimento"],
    addedBy: "u_rafael",
    addedAt: iso(-16),
  },
];

export const mockMeetings: Meeting[] = [
  {
    id: "meet_1",
    projectId: "p_compadecida",
    title: "Ensaio técnico com luz e som",
    startsAt: iso(2, 19, 0),
    endsAt: iso(2, 22, 0),
    location: "Teatro Municipal — Palco principal",
    notes: "",
    attendeeIds: ["u_hamilton", "u_rafael", "u_beatriz"],
    createdBy: "u_hamilton",
    createdAt: iso(-5),
  },
  {
    id: "meet_2",
    projectId: "p_compadecida",
    title: "Reunião de produção — orçamento",
    startsAt: iso(-2, 15, 0),
    endsAt: iso(-2, 16, 0),
    location: "Google Meet",
    notes:
      "Definido reforço de verba para cenografia. Rafael vai levantar 3 orçamentos até sexta.",
    attendeeIds: ["u_hamilton", "u_rafael"],
    createdBy: "u_hamilton",
    createdAt: iso(-9),
  },
  {
    id: "meet_3",
    projectId: "p_sonho",
    title: "Brainstorm de conceito visual",
    startsAt: iso(6, 10, 0),
    endsAt: iso(6, 12, 0),
    location: "Estúdio Beatriz",
    notes: "",
    attendeeIds: ["u_beatriz", "u_carla"],
    createdBy: "u_beatriz",
    createdAt: iso(-3),
  },
  {
    id: "meet_4",
    projectId: "p_bodas",
    title: "Ensaio geral com figurino",
    startsAt: iso(4, 20, 0),
    endsAt: iso(4, 23, 0),
    location: "Teatro Municipal — Palco principal",
    notes: "",
    attendeeIds: ["u_hamilton", "u_rafael"],
    createdBy: "u_hamilton",
    createdAt: iso(-1),
  },
];

export const mockActivity: ActivityEntry[] = [
  {
    id: "act_1",
    projectId: "p_compadecida",
    userId: "u_rafael",
    action: "moved",
    entityType: "card",
    entityLabel: "Ensaio de sonoplastia ao vivo",
    detail: "moveu para Elenco & Ensaios",
    createdAt: iso(0, 9, 20),
  },
  {
    id: "act_2",
    projectId: "p_compadecida",
    userId: "u_carla",
    action: "created",
    entityType: "reference",
    entityLabel: "Paleta de figurino nordestino",
    createdAt: iso(-7, 14, 0),
  },
  {
    id: "act_3",
    projectId: "p_compadecida",
    userId: "u_beatriz",
    action: "updated",
    entityType: "file",
    entityLabel: "Roteiro final — Ato I e II",
    createdAt: iso(-9, 11, 30),
  },
  {
    id: "act_4",
    projectId: "p_compadecida",
    userId: "u_hamilton",
    action: "created",
    entityType: "meeting",
    entityLabel: "Ensaio técnico com luz e som",
    createdAt: iso(-5, 8, 0),
  },
  {
    id: "act_5",
    projectId: "p_sonho",
    userId: "u_beatriz",
    action: "created",
    entityType: "project",
    entityLabel: "Sonho de Uma Noite de Verão",
    createdAt: iso(-15, 9, 0),
  },
  {
    id: "act_6",
    projectId: "p_bodas",
    userId: "u_rafael",
    action: "commented",
    entityType: "card",
    entityLabel: "Ensaio de sonoplastia ao vivo",
    detail: "\"Precisamos de mais dois tambores emprestados.\"",
    createdAt: iso(-1, 17, 45),
  },
];

export function getProfile(id: string): Profile | undefined {
  return mockProfiles.find((p) => p.id === id);
}
