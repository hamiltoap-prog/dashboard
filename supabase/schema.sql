-- Palco — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (https://app.supabase.com > seu projeto > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Perfis (1 por usuário autenticado)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  color_hex text not null default '#5B8DEF',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Perfis são visíveis para qualquer usuário autenticado"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Usuário pode atualizar o próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- cria automaticamente um perfil quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  cover_image_url text,
  status text not null default 'planejamento'
    check (status in ('planejamento','em_producao','ensaios','em_cartaz','concluido','pausado')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'membro' check (role in ('dono','editor','membro')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "Membros veem os projetos de que participam"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id));

create policy "Usuário autenticado pode criar projetos"
  on public.projects for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Membros podem editar o projeto"
  on public.projects for update
  to authenticated
  using (public.is_project_member(id));

create policy "Membros veem a lista de membros dos seus projetos"
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "Membros podem adicionar outros membros"
  on public.project_members for insert
  to authenticated
  with check (public.is_project_member(project_id) or user_id = auth.uid());

create policy "Membros podem sair do projeto"
  on public.project_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Kanban (fases do projeto)
-- ---------------------------------------------------------------------
create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position integer not null default 0
);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.kanban_columns (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text default '',
  position integer not null default 0,
  assignee_ids uuid[] not null default '{}',
  labels text[] not null default '{}',
  due_date timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;

create policy "Membros gerenciam colunas do projeto"
  on public.kanban_columns for all
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy "Membros gerenciam cards do projeto"
  on public.kanban_cards for all
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- ---------------------------------------------------------------------
-- Arquivos (roteiros, documentos, planilhas)
-- ---------------------------------------------------------------------
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  url text not null,
  type text not null default 'outro'
    check (type in ('roteiro','documento','planilha','outro')),
  notes text,
  added_by uuid not null references public.profiles (id),
  added_at timestamptz not null default now()
);

alter table public.project_files enable row level security;

create policy "Membros gerenciam arquivos do projeto"
  on public.project_files for all
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- ---------------------------------------------------------------------
-- Referências visuais (vídeos, imagens, links)
-- ---------------------------------------------------------------------
create table if not exists public.project_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null default 'link' check (type in ('video','imagem','link')),
  url text not null,
  title text not null default '',
  source_label text not null default '',
  thumbnail_url text,
  tags text[] not null default '{}',
  added_by uuid not null references public.profiles (id),
  added_at timestamptz not null default now()
);

alter table public.project_references enable row level security;

create policy "Membros gerenciam referências do projeto"
  on public.project_references for all
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- ---------------------------------------------------------------------
-- Reuniões
-- ---------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  attendee_ids uuid[] not null default '{}',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "Membros gerenciam reuniões do projeto"
  on public.meetings for all
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- ---------------------------------------------------------------------
-- Atividade (quem fez o quê)
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  action text not null check (action in ('created','updated','deleted','moved','commented','joined')),
  entity_type text not null check (entity_type in ('project','card','column','file','reference','meeting')),
  entity_label text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "Membros veem a atividade do projeto"
  on public.activity_log for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "Membros registram atividade do projeto"
  on public.activity_log for insert
  to authenticated
  with check (public.is_project_member(project_id) and user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: bucket para upload de imagens de referência / capas
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

create policy "Qualquer um pode visualizar mídia dos projetos"
  on storage.objects for select
  to public
  using (bucket_id = 'project-media');

create policy "Usuários autenticados podem enviar mídia"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-media');
