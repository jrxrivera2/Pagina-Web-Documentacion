-- =============================================================================
-- BOOTSTRAP: USUARIO ADMINISTRADOR (crear + acceso total al sistema)
-- =============================================================================
-- Ejecutalo DESPUES de:
--   1) 0001_initial_schema.sql
--   2) 0005_seed_dependencias.sql (debe existir la dependencia "Gerencia")
--
-- Crea el usuario en auth.users (si no existe) y lo asigna como administrador
-- en Gerencia. El rol "administrador" tiene TODOS los permisos del sistema:
--   - dependencias.gestionar  (crear, editar, activar/desactivar dependencias)
--   - usuarios.gestionar      (activar/desactivar usuarios, editar perfil)
--   - roles.gestionar         (asignar y quitar roles por dependencia)
--   - auditoria.ver           (ver auditoria global)
--   - documentos.*            (crear, ver todos, enviar, aprobar, archivar)
--
-- Edita las variables TODO antes de ejecutar.
-- =============================================================================

create extension if not exists pgcrypto;

do $$
declare
    -- TODO: credenciales del administrador
    v_email              text := 'admin@ejemplo.com';
    v_password           text := 'Admin2026!';
    v_nombre_completo    text := 'Administrador del Sistema';

    v_user_id            uuid;
    v_dependencia_id     uuid;
    v_rol_admin_id       uuid;
begin
    select id into v_user_id
    from auth.users
    where lower(email) = lower(v_email);

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
            crypt(v_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nombre_completo', v_nombre_completo),
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

        raise notice 'Administrador creado: % (contrasena inicial: %)', v_email, v_password;
    else
        raise notice 'El usuario % ya existia; solo se actualiza la asignacion.', v_email;
    end if;

    insert into public.profiles (id, email, nombre_completo)
    values (v_user_id, v_email, v_nombre_completo)
    on conflict (id) do update
        set email = excluded.email,
            nombre_completo = excluded.nombre_completo;

    select id into v_dependencia_id
    from public.dependencias
    where nombre = 'Gerencia';

    if v_dependencia_id is null then
        raise exception 'No existe la dependencia Gerencia. Ejecuta 0005_seed_dependencias.sql primero.';
    end if;

    select id into v_rol_admin_id
    from public.roles
    where nombre = 'administrador';

    insert into public.usuarios_dependencias
        (usuario_id, dependencia_id, rol_id, es_principal)
    values
        (v_user_id, v_dependencia_id, v_rol_admin_id, true)
    on conflict (usuario_id, dependencia_id) do update
        set rol_id = excluded.rol_id,
            es_principal = true;

    raise notice 'Usuario % asignado como administrador en Gerencia (acceso total)', v_email;
end;
$$;
