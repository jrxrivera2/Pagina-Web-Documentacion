-- =============================================================================
-- FASE 6+: Crear usuarios desde la app, rol emisor+receptor, utilidades admin
-- =============================================================================

create extension if not exists pgcrypto;

-- Rol combinado: puede crear/enviar Y aprobar/rechazar documentos
insert into public.roles (nombre, descripcion, es_sistema)
values (
    'emisor_receptor',
    'Crea, envia y responde (aprueba/rechaza) documentos en su dependencia',
    true
)
on conflict (nombre) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.clave in ('documentos.crear', 'documentos.aprobar')
where r.nombre = 'emisor_receptor'
on conflict do nothing;

-- Resuelve el rol segun flags (solo uno por dependencia)
create or replace function public.resolver_rol_id(
    p_es_administrador boolean,
    p_es_emisor        boolean,
    p_es_receptor      boolean
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_rol_id uuid;
begin
    if p_es_administrador then
        select id into v_rol_id from public.roles where nombre = 'administrador';
        return v_rol_id;
    end if;

    if p_es_emisor and p_es_receptor then
        select id into v_rol_id from public.roles where nombre = 'emisor_receptor';
        return v_rol_id;
    end if;

    if p_es_emisor then
        select id into v_rol_id from public.roles where nombre = 'emisor';
        return v_rol_id;
    end if;

    if p_es_receptor then
        select id into v_rol_id from public.roles where nombre = 'receptor';
        return v_rol_id;
    end if;

    raise exception 'Debes seleccionar al menos un permiso: emisor, receptor o administrador';
end;
$$;

-- Crea usuario en auth + perfil + asignacion (solo admins del sistema)
create or replace function public.admin_crear_usuario(
    p_email              text,
    p_password           text,
    p_nombre_completo    text,
    p_dependencia_id     uuid,
    p_es_emisor          boolean default false,
    p_es_receptor        boolean default false,
    p_es_administrador   boolean default false,
    p_cedula             text default null,
    p_cargo              text default null,
    p_es_principal       boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id      uuid;
    v_rol_id       uuid;
    v_email        text := lower(trim(p_email));
begin
    if not public.es_admin() then
        raise exception 'No tienes permiso para crear usuarios';
    end if;

    if v_email is null or v_email = '' then
        raise exception 'El correo es obligatorio';
    end if;

    if p_password is null or length(p_password) < 8 then
        raise exception 'La contrasena debe tener al menos 8 caracteres';
    end if;

    if p_nombre_completo is null or trim(p_nombre_completo) = '' then
        raise exception 'El nombre completo es obligatorio';
    end if;

    if not exists (
        select 1 from public.dependencias
        where id = p_dependencia_id and activo = true
    ) then
        raise exception 'La dependencia no existe o esta inactiva';
    end if;

    select id into v_user_id
    from auth.users
    where lower(email) = v_email;

    if v_user_id is null then
        v_user_id := gen_random_uuid();

        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nombre_completo', trim(p_nombre_completo)),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        insert into auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) values (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            v_user_id::text,
            now(),
            now(),
            now()
        );
    end if;

    insert into public.profiles (id, email, nombre_completo, cedula, cargo, activo)
    values (
        v_user_id,
        v_email,
        trim(p_nombre_completo),
        nullif(trim(p_cedula), ''),
        nullif(trim(p_cargo), ''),
        true
    )
    on conflict (id) do update
        set email = excluded.email,
            nombre_completo = excluded.nombre_completo,
            cedula = excluded.cedula,
            cargo = excluded.cargo,
            activo = true;

    v_rol_id := public.resolver_rol_id(
        p_es_administrador,
        p_es_emisor,
        p_es_receptor
    );

    insert into public.usuarios_dependencias
        (usuario_id, dependencia_id, rol_id, es_principal)
    values
        (v_user_id, p_dependencia_id, v_rol_id, coalesce(p_es_principal, true))
    on conflict (usuario_id, dependencia_id) do update
        set rol_id = excluded.rol_id,
            es_principal = excluded.es_principal;

    return v_user_id;
end;
$$;

-- Asigna un usuario existente a una dependencia con permisos
create or replace function public.admin_asignar_dependencia(
    p_usuario_id       uuid,
    p_dependencia_id   uuid,
    p_es_emisor        boolean default false,
    p_es_receptor      boolean default false,
    p_es_administrador boolean default false,
    p_es_principal     boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_rol_id uuid;
begin
    if not public.es_admin() then
        raise exception 'No tienes permiso para asignar dependencias';
    end if;

    if not exists (select 1 from public.profiles where id = p_usuario_id) then
        raise exception 'Usuario no encontrado';
    end if;

    v_rol_id := public.resolver_rol_id(
        p_es_administrador,
        p_es_emisor,
        p_es_receptor
    );

    insert into public.usuarios_dependencias
        (usuario_id, dependencia_id, rol_id, es_principal)
    values
        (p_usuario_id, p_dependencia_id, v_rol_id, coalesce(p_es_principal, false))
    on conflict (usuario_id, dependencia_id) do update
        set rol_id = excluded.rol_id,
            es_principal = excluded.es_principal;
end;
$$;

-- Actualiza el rol de una asignacion existente
create or replace function public.admin_actualizar_rol_asignacion(
    p_asignacion_id    uuid,
    p_es_emisor        boolean default false,
    p_es_receptor      boolean default false,
    p_es_administrador boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_rol_id uuid;
begin
    if not public.es_admin() then
        raise exception 'No tienes permiso para modificar asignaciones';
    end if;

    v_rol_id := public.resolver_rol_id(
        p_es_administrador,
        p_es_emisor,
        p_es_receptor
    );

    update public.usuarios_dependencias
       set rol_id = v_rol_id
     where id = p_asignacion_id;

    if not found then
        raise exception 'Asignacion no encontrada';
    end if;
end;
$$;

-- Elimina usuario de auth (cascade a profiles y asignaciones)
create or replace function public.admin_eliminar_usuario(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not public.es_admin() then
        raise exception 'No tienes permiso para eliminar usuarios';
    end if;

    if p_usuario_id = auth.uid() then
        raise exception 'No puedes eliminar tu propia cuenta';
    end if;

    delete from auth.users where id = p_usuario_id;

    if not found then
        raise exception 'Usuario no encontrado';
    end if;
end;
$$;

grant execute on function public.resolver_rol_id(boolean, boolean, boolean) to authenticated;
grant execute on function public.admin_crear_usuario(
    text, text, text, uuid, boolean, boolean, boolean, text, text, boolean
) to authenticated;
grant execute on function public.admin_asignar_dependencia(
    uuid, uuid, boolean, boolean, boolean, boolean
) to authenticated;
grant execute on function public.admin_actualizar_rol_asignacion(
    uuid, boolean, boolean, boolean
) to authenticated;
grant execute on function public.admin_eliminar_usuario(uuid) to authenticated;
