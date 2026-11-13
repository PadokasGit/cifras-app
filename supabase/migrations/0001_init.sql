-- Cifras: tabelas de sincronização de um único usuário.
-- Antes de aplicar: desligue o cadastro aberto (Auth > Providers > Email > "Allow new users to sign up" = off)
-- e crie o seu usuário manualmente no painel.

create table public.songs (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null,
  artist       text not null default '',
  original_key text not null default '',
  raw_text     text not null default '',
  semitones    int  not null default 0,
  font_size    int  not null default 20,
  accidental   text not null default 'sharp' check (accidental in ('sharp','flat')),
  source       jsonb not null default '{"kind":"paste"}',
  created_at   bigint not null,
  updated_at   bigint not null,
  deleted_at   bigint
);

create table public.setlists (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  song_ids   jsonb not null default '[]',
  updated_at bigint not null,
  deleted_at bigint
);

create index songs_user_idx on public.songs (user_id);
create index setlists_user_idx on public.setlists (user_id);

alter table public.songs enable row level security;
alter table public.setlists enable row level security;

create policy songs_select on public.songs for select to authenticated using (user_id = (select auth.uid()));
create policy songs_insert on public.songs for insert to authenticated with check (user_id = (select auth.uid()));
create policy songs_update on public.songs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy setlists_select on public.setlists for select to authenticated using (user_id = (select auth.uid()));
create policy setlists_insert on public.setlists for insert to authenticated with check (user_id = (select auth.uid()));
create policy setlists_update on public.setlists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- sem política de delete: apagar é marcar deleted_at (tombstone), e isso sincroniza.
