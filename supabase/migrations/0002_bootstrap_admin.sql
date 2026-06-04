-- =============================================================================
-- BOOTSTRAP: ASIGNAR UN USUARIO EXISTENTE COMO ADMINISTRADOR
-- =============================================================================
-- Preferible: usa 0007_bootstrap_usuario_admin.sql (crea el usuario y lo asigna).
--
-- Este script solo asigna el rol si el usuario YA existe en Authentication.
-- Ejecutalo DESPUES de 0001 y 0005. Edita v_email y ejecuta en SQL Editor.
-- =============================================================================

do $$
declare
    -- TODO: cambia este email por el del usuario que sera administrador
    v_email              text := 'admin@ejemplo.com';

    -- TODO: nombre de la dependencia inicial donde quedara asignado el admin
    v_dependencia_nombre text := 'Gerencia';

    v_user_id        uuid;
    v_profile_id     uuid;
    v_dependencia_id uuid;
    v_rol_admin_id   uuid;
begin
    select id into v_user_id
    from auth.users
    where lower(email) = lower(v_email);

    if v_user_id is null then
        raise exception 'No existe ningun usuario con email %. Crealo primero desde Authentication > Users.', v_email;
    end if;

    insert into public.profiles (id, email, nombre_completo)
    values (v_user_id, v_email, split_part(v_email, '@', 1))
    on conflict (id) do update
        set email = excluded.email;

    v_profile_id := v_user_id;

    insert into public.dependencias (nombre, descripcion)
    values (v_dependencia_nombre, 'Dependencia inicial creada en el bootstrap')
    on conflict (nombre) do nothing
    returning id into v_dependencia_id;

    if v_dependencia_id is null then
        select id into v_dependencia_id
        from public.dependencias
        where nombre = v_dependencia_nombre;
    end if;

    if v_dependencia_id is null then
        raise exception 'No existe la dependencia %. Ejecuta 0005_seed_dependencias.sql primero.', v_dependencia_nombre;
    end if;

    select id into v_rol_admin_id
    from public.roles
    where nombre = 'administrador';

    insert into public.usuarios_dependencias
        (usuario_id, dependencia_id, rol_id, es_principal)
    values
        (v_profile_id, v_dependencia_id, v_rol_admin_id, true)
    on conflict (usuario_id, dependencia_id) do update
        set rol_id = excluded.rol_id,
            es_principal = true;

    raise notice 'Usuario % asignado como administrador en %', v_email, v_dependencia_nombre;
end;
$$;
