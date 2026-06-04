-- =============================================================================
-- FASE 6 - EMAIL EN PROFILES (para el panel de administracion)
-- =============================================================================
-- Pega esto en el SQL Editor de Supabase despues de haber corrido las
-- migraciones anteriores.
--
-- Agrega la columna 'email' a public.profiles para que el panel de admin
-- pueda identificar usuarios por su correo sin necesitar acceso directo a
-- auth.users (que esta restringido para clientes anonimos/authenticated).
-- =============================================================================

alter table public.profiles
    add column if not exists email text;

-- Actualizamos el trigger para guardar el email al crearse el usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, nombre_completo)
    values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data ->> 'nombre_completo',
            new.raw_user_meta_data ->> 'full_name',
            split_part(new.email, '@', 1)
        )
    )
    on conflict (id) do update
        set email = excluded.email;
    return new;
end;
$$;

-- Backfill: sincronizamos el email de los usuarios ya existentes
update public.profiles p
   set email = au.email
  from auth.users au
 where p.id = au.id
   and (p.email is null or p.email <> au.email);
