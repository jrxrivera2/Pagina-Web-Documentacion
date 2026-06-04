-- =============================================================================
-- BOOTSTRAP: USUARIO DE NOMINA (crear + asignar dependencia)
-- =============================================================================
-- Ejecutalo DESPUES de:
--   1) 0001_initial_schema.sql
--   2) 0005_seed_dependencias.sql (debe existir la dependencia "Nomina")
--
-- Crea el usuario en auth.users (si no existe) y lo asigna como emisor en Nomina.
-- Edita las variables TODO antes de ejecutar.
-- =============================================================================

create extension if not exists pgcrypto;

do $$
declare
    -- TODO: credenciales del usuario de nomina
    v_email              text := 'nomina@ejemplo.com';
    v_password           text := 'Nomina2026!';
    v_nombre_completo    text := 'Usuario Nomina';

    v_user_id            uuid;
    v_dependencia_id     uuid;
    v_rol_emisor_id      uuid;
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

        raise notice 'Usuario creado: % (contrasena inicial: %)', v_email, v_password;
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
    where nombre = 'Nomina';

    if v_dependencia_id is null then
        raise exception 'No existe la dependencia Nomina. Ejecuta 0005_seed_dependencias.sql primero.';
    end if;

    select id into v_rol_emisor_id
    from public.roles
    where nombre = 'emisor';

    insert into public.usuarios_dependencias
        (usuario_id, dependencia_id, rol_id, es_principal)
    values
        (v_user_id, v_dependencia_id, v_rol_emisor_id, true)
    on conflict (usuario_id, dependencia_id) do update
        set rol_id = excluded.rol_id,
            es_principal = true;

    raise notice 'Usuario % asignado como emisor en Nomina', v_email;
end;
$$;
