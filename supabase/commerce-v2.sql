-- Run once in the Supabase SQL editor before publishing the updated site.
-- Existing products retain a null price and display "Preço sob consulta".
begin;
alter table public.produtos add column if not exists preco numeric(12,2) check (preco >= 0);
alter table public.produtos add column if not exists tem_variacoes boolean not null default false;
alter table public.produtos add column if not exists variacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(variacoes) = 'array');
create table if not exists public.loja_config (
    id integer primary key check (id = 1),
    whatsapp text not null default '',
    frete_cortesia numeric(12,2) not null default 150 check (frete_cortesia >= 0)
);
insert into public.loja_config (id, whatsapp, frete_cortesia) values (1, '5521967453706', 150) on conflict (id) do nothing;
-- Explicitly grant management only to store administrators.
create table if not exists public.loja_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.loja_admins enable row level security;
revoke all on public.loja_admins from anon, authenticated;
create or replace function public.is_loja_admin() returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.loja_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_loja_admin() from public;
grant execute on function public.is_loja_admin() to authenticated;
alter table public.loja_config enable row level security;
revoke all on public.loja_config from anon, authenticated;
grant select on public.loja_config to anon, authenticated;
grant update on public.loja_config to authenticated;
drop policy if exists "Public store settings" on public.loja_config;
create policy "Public store settings" on public.loja_config for select to anon, authenticated using (true);
drop policy if exists "Store admins update settings" on public.loja_config;
create policy "Store admins update settings" on public.loja_config for update to authenticated using (public.is_loja_admin()) with check (public.is_loja_admin());
commit;
-- Register the existing admin using their UUID from Authentication > Users:
-- insert into public.loja_admins(user_id) values ('ADMIN_USER_UUID') on conflict do nothing;
-- Product and image permissions retain the project's existing policies.
