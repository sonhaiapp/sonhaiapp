-- Sonhaí: tabela única onde ficam os dados (rode uma vez no SQL Editor do Supabase)
create table if not exists public.kv (
  chave text primary key,
  valor jsonb not null,
  atualizado timestamptz not null default now()
);
-- Segurança: ninguém acessa pela internet; só o servidor do Sonhaí (com a chave secreta)
alter table public.kv enable row level security;
