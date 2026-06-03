-- =============================================================================
-- PLATAFORMA DE INTERCAMBIO DOCUMENTAL - ESQUEMA INICIAL
-- =============================================================================
-- Este archivo se puede pegar COMPLETO en el SQL Editor de Supabase.
-- Incluye: extensiones, tablas, funciones, triggers, RLS, Storage,
-- Realtime y datos iniciales (roles y permisos).
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONES
-- =============================================================================
create extension if not exists "pgcrypto";


-- =============================================================================
-- 2. TABLAS
-- =============================================================================

-- 2.1 PERFILES (extiende auth.users) -----------------------------------------
create table if not exists public.profiles (
    id              uuid primary key references auth.users (id) on delete cascade,
    nombre_completo text        not null,
    cedula          text        unique,
    cargo           text,
    avatar_url      text,
    activo          boolean     not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'Datos de perfil de cada usuario autenticado';

-- 2.2 DEPENDENCIAS -----------------------------------------------------------
create table if not exists public.dependencias (
    id          uuid        primary key default gen_random_uuid(),
    nombre      text        not null unique,
    descripcion text,
    activo      boolean     not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.dependencias is 'Areas o dependencias (Gerencia, Nomina, etc.)';

-- 2.3 ROLES ------------------------------------------------------------------
create table if not exists public.roles (
    id          uuid        primary key default gen_random_uuid(),
    nombre      text        not null unique,
    descripcion text,
    es_sistema  boolean     not null default false,
    created_at  timestamptz not null default now()
);

comment on table public.roles is 'Roles disponibles: administrador, emisor, receptor, etc.';

-- 2.4 PERMISOS ---------------------------------------------------------------
create table if not exists public.permisos (
    id          uuid        primary key default gen_random_uuid(),
    clave       text        not null unique,
    descripcion text        not null,
    categoria   text,
    created_at  timestamptz not null default now()
);

comment on table public.permisos is 'Catalogo de permisos granulares';

-- 2.5 ROLES <-> PERMISOS -----------------------------------------------------
create table if not exists public.roles_permisos (
    rol_id     uuid not null references public.roles (id)    on delete cascade,
    permiso_id uuid not null references public.permisos (id) on delete cascade,
    primary key (rol_id, permiso_id)
);

-- 2.6 USUARIOS <-> DEPENDENCIAS (con rol) ------------------------------------
create table if not exists public.usuarios_dependencias (
    id             uuid        primary key default gen_random_uuid(),
    usuario_id     uuid        not null references public.profiles    (id) on delete cascade,
    dependencia_id uuid        not null references public.dependencias(id) on delete cascade,
    rol_id         uuid        not null references public.roles       (id) on delete restrict,
    es_principal   boolean     not null default false,
    created_at     timestamptz not null default now(),
    unique (usuario_id, dependencia_id)
);

comment on table public.usuarios_dependencias
    is 'Un usuario puede pertenecer a varias dependencias, con un rol por dependencia';

create index if not exists idx_usuarios_dependencias_usuario
    on public.usuarios_dependencias (usuario_id);

create index if not exists idx_usuarios_dependencias_dependencia
    on public.usuarios_dependencias (dependencia_id);

-- 2.7 DOCUMENTOS -------------------------------------------------------------
create table if not exists public.documentos (
    id                    uuid        primary key default gen_random_uuid(),
    titulo                text        not null,
    descripcion           text,
    tipo                  text        not null default 'informe',
    dependencia_origen_id uuid        not null references public.dependencias (id) on delete restrict,
    creado_por            uuid        not null references public.profiles     (id) on delete restrict,
    estado                text        not null default 'borrador'
        check (estado in ('borrador','enviado','en_revision','aprobado','rechazado','archivado')),
    version               integer     not null default 1,
    fecha_envio           timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index if not exists idx_documentos_origen      on public.documentos (dependencia_origen_id);
create index if not exists idx_documentos_creador     on public.documentos (creado_por);
create index if not exists idx_documentos_estado      on public.documentos (estado);
create index if not exists idx_documentos_fecha_envio on public.documentos (fecha_envio desc);

-- 2.8 ARCHIVOS DEL DOCUMENTO -------------------------------------------------
create table if not exists public.documento_archivos (
    id             uuid        primary key default gen_random_uuid(),
    documento_id   uuid        not null references public.documentos (id) on delete cascade,
    storage_path   text        not null,
    nombre_archivo text        not null,
    mime_type      text,
    tamano         bigint,
    version        integer     not null default 1,
    subido_por     uuid        references public.profiles (id) on delete set null,
    created_at     timestamptz not null default now()
);

create index if not exists idx_archivos_documento on public.documento_archivos (documento_id);

-- 2.9 DESTINATARIOS ----------------------------------------------------------
create table if not exists public.documento_destinatarios (
    id                uuid        primary key default gen_random_uuid(),
    documento_id      uuid        not null references public.documentos   (id) on delete cascade,
    dependencia_id    uuid        not null references public.dependencias (id) on delete restrict,
    usuario_id        uuid        references public.profiles (id) on delete cascade,
    estado_recepcion  text        not null default 'pendiente'
        check (estado_recepcion in ('pendiente','recibido','visto','aprobado','rechazado')),
    fecha_visto       timestamptz,
    fecha_respuesta   timestamptz,
    created_at        timestamptz not null default now()
);

create index if not exists idx_destinatarios_documento   on public.documento_destinatarios (documento_id);
create index if not exists idx_destinatarios_dependencia on public.documento_destinatarios (dependencia_id);
create index if not exists idx_destinatarios_usuario     on public.documento_destinatarios (usuario_id);

-- 2.10 EVENTOS (BITACORA INMUTABLE) ------------------------------------------
create table if not exists public.documento_eventos (
    id           uuid        primary key default gen_random_uuid(),
    documento_id uuid        not null references public.documentos (id) on delete cascade,
    usuario_id   uuid        references public.profiles (id) on delete set null,
    tipo_evento  text        not null
        check (tipo_evento in
            ('creado','enviado','visto','descargado','aprobado','rechazado',
             'comentado','editado','version_nueva','archivado')),
    metadata     jsonb       not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);

create index if not exists idx_eventos_documento on public.documento_eventos (documento_id, created_at desc);
create index if not exists idx_eventos_usuario   on public.documento_eventos (usuario_id);

-- 2.11 COMENTARIOS -----------------------------------------------------------
create table if not exists public.documento_comentarios (
    id           uuid        primary key default gen_random_uuid(),
    documento_id uuid        not null references public.documentos (id) on delete cascade,
    usuario_id   uuid        references public.profiles (id) on delete set null,
    contenido    text        not null,
    created_at   timestamptz not null default now()
);

create index if not exists idx_comentarios_documento on public.documento_comentarios (documento_id, created_at);

-- 2.12 NOTIFICACIONES --------------------------------------------------------
create table if not exists public.notificaciones (
    id           uuid        primary key default gen_random_uuid(),
    usuario_id   uuid        not null references public.profiles  (id) on delete cascade,
    documento_id uuid        references public.documentos (id) on delete cascade,
    tipo         text        not null,
    mensaje      text        not null,
    leida        boolean     not null default false,
    created_at   timestamptz not null default now()
);

create index if not exists idx_notificaciones_usuario
    on public.notificaciones (usuario_id, leida, created_at desc);


-- =============================================================================
-- 3. FUNCIONES HELPER (security definer, RLS-safe)
-- =============================================================================

-- 3.1 actualizar 'updated_at' automaticamente --------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- 3.2 crear profile cuando se registra un usuario en auth.users --------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, nombre_completo)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'nombre_completo',
            new.raw_user_meta_data ->> 'full_name',
            split_part(new.email, '@', 1)
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- 3.3 verificar si el usuario actual tiene un permiso -------------------------
create or replace function public.tiene_permiso(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.usuarios_dependencias ud
        join public.roles_permisos rp on rp.rol_id = ud.rol_id
        join public.permisos       p  on p.id     = rp.permiso_id
        where ud.usuario_id = auth.uid()
          and p.clave = p_clave
    );
$$;

-- 3.4 verificar si el usuario actual es administrador -------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.usuarios_dependencias ud
        join public.roles r on r.id = ud.rol_id
        where ud.usuario_id = auth.uid()
          and r.nombre = 'administrador'
    );
$$;

-- 3.5 verificar si el usuario actual puede ver un documento -------------------
create or replace function public.puede_ver_documento(p_documento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        public.es_admin()
        or public.tiene_permiso('documentos.ver_todos')
        or exists (
            select 1 from public.documentos d
            where d.id = p_documento_id
              and d.creado_por = auth.uid()
        )
        or exists (
            select 1
            from public.documentos d
            join public.usuarios_dependencias ud
                 on ud.dependencia_id = d.dependencia_origen_id
            where d.id = p_documento_id
              and ud.usuario_id = auth.uid()
        )
        or exists (
            select 1
            from public.documento_destinatarios dd
            where dd.documento_id = p_documento_id
              and (
                   dd.usuario_id = auth.uid()
                or dd.dependencia_id in (
                       select dependencia_id
                       from public.usuarios_dependencias
                       where usuario_id = auth.uid()
                   )
              )
        );
$$;

-- 3.6 registrar evento (interno, security definer) ---------------------------
create or replace function public.registrar_evento(
    p_documento_id uuid,
    p_tipo_evento  text,
    p_metadata     jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (p_documento_id, auth.uid(), p_tipo_evento, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- 3.7 marcar documento como enviado (crea eventos + notificaciones) ----------
create or replace function public.enviar_documento(p_documento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_doc       public.documentos%rowtype;
    v_dest      record;
    v_usuario   record;
begin
    select * into v_doc from public.documentos where id = p_documento_id;
    if not found then
        raise exception 'Documento no encontrado';
    end if;

    if v_doc.creado_por <> auth.uid()
       and not public.tiene_permiso('documentos.enviar_todos') then
        raise exception 'No tienes permiso para enviar este documento';
    end if;

    update public.documentos
       set estado      = 'enviado',
           fecha_envio = coalesce(fecha_envio, now()),
           updated_at  = now()
     where id = p_documento_id;

    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (p_documento_id, auth.uid(), 'enviado',
            jsonb_build_object('version', v_doc.version));

    for v_dest in
        select dd.id, dd.dependencia_id, dd.usuario_id, dep.nombre as dep_nombre
        from public.documento_destinatarios dd
        join public.dependencias dep on dep.id = dd.dependencia_id
        where dd.documento_id = p_documento_id
    loop
        if v_dest.usuario_id is not null then
            insert into public.notificaciones
                (usuario_id, documento_id, tipo, mensaje)
            values
                (v_dest.usuario_id, p_documento_id, 'documento_recibido',
                 'Nuevo documento: ' || v_doc.titulo);
        else
            for v_usuario in
                select ud.usuario_id
                from public.usuarios_dependencias ud
                where ud.dependencia_id = v_dest.dependencia_id
            loop
                insert into public.notificaciones
                    (usuario_id, documento_id, tipo, mensaje)
                values
                    (v_usuario.usuario_id, p_documento_id, 'documento_recibido',
                     'Nuevo documento en ' || v_dest.dep_nombre || ': ' || v_doc.titulo);
            end loop;
        end if;
    end loop;
end;
$$;

-- 3.8 marcar como visto (idempotente por usuario+documento) -------------------
create or replace function public.marcar_visto(p_documento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_marcado boolean;
begin
    if not public.puede_ver_documento(p_documento_id) then
        raise exception 'No tienes acceso a este documento';
    end if;

    update public.documento_destinatarios
       set estado_recepcion = case when estado_recepcion = 'pendiente' then 'visto' else estado_recepcion end,
           fecha_visto      = coalesce(fecha_visto, now())
     where documento_id = p_documento_id
       and (usuario_id = auth.uid()
            or (usuario_id is null
                and dependencia_id in (
                    select dependencia_id from public.usuarios_dependencias
                    where usuario_id = auth.uid()
                )));

    select exists(
        select 1 from public.documento_eventos
        where documento_id = p_documento_id
          and usuario_id   = auth.uid()
          and tipo_evento  = 'visto'
    ) into v_marcado;

    if not v_marcado then
        insert into public.documento_eventos (documento_id, usuario_id, tipo_evento)
        values (p_documento_id, auth.uid(), 'visto');
    end if;
end;
$$;

-- 3.9 responder documento (aprobar / rechazar) -------------------------------
create or replace function public.responder_documento(
    p_documento_id uuid,
    p_aprobar      boolean,
    p_comentario   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_estado text;
    v_evento text;
begin
    if not public.puede_ver_documento(p_documento_id) then
        raise exception 'No tienes acceso a este documento';
    end if;

    v_estado := case when p_aprobar then 'aprobado' else 'rechazado' end;
    v_evento := v_estado;

    update public.documento_destinatarios
       set estado_recepcion = v_estado,
           fecha_respuesta  = now()
     where documento_id = p_documento_id
       and (usuario_id = auth.uid()
            or (usuario_id is null
                and dependencia_id in (
                    select dependencia_id from public.usuarios_dependencias
                    where usuario_id = auth.uid()
                )));

    if p_comentario is not null and length(trim(p_comentario)) > 0 then
        insert into public.documento_comentarios (documento_id, usuario_id, contenido)
        values (p_documento_id, auth.uid(), p_comentario);
    end if;

    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (p_documento_id, auth.uid(), v_evento,
            jsonb_build_object('comentario', p_comentario));

    insert into public.notificaciones (usuario_id, documento_id, tipo, mensaje)
    select d.creado_por, d.id, 'documento_respondido',
           'Tu documento "' || d.titulo || '" fue ' || v_estado
    from public.documentos d
    where d.id = p_documento_id
      and d.creado_por <> auth.uid();
end;
$$;


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- 4.1 updated_at en tablas con esa columna -----------------------------------
drop trigger if exists trg_profiles_updated      on public.profiles;
create trigger trg_profiles_updated      before update on public.profiles
    for each row execute function public.handle_updated_at();

drop trigger if exists trg_dependencias_updated  on public.dependencias;
create trigger trg_dependencias_updated  before update on public.dependencias
    for each row execute function public.handle_updated_at();

drop trigger if exists trg_documentos_updated    on public.documentos;
create trigger trg_documentos_updated    before update on public.documentos
    for each row execute function public.handle_updated_at();

-- 4.2 crear profile al registrarse el usuario --------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 4.3 evento "creado" al insertar un documento --------------------------------
create or replace function public.trg_documento_creado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento)
    values (new.id, new.creado_por, 'creado');
    return new;
end;
$$;

drop trigger if exists trg_documentos_creado on public.documentos;
create trigger trg_documentos_creado
    after insert on public.documentos
    for each row execute function public.trg_documento_creado();


-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table public.profiles                enable row level security;
alter table public.dependencias            enable row level security;
alter table public.roles                   enable row level security;
alter table public.permisos                enable row level security;
alter table public.roles_permisos          enable row level security;
alter table public.usuarios_dependencias   enable row level security;
alter table public.documentos              enable row level security;
alter table public.documento_archivos      enable row level security;
alter table public.documento_destinatarios enable row level security;
alter table public.documento_eventos       enable row level security;
alter table public.documento_comentarios   enable row level security;
alter table public.notificaciones          enable row level security;

-- 5.1 PROFILES ---------------------------------------------------------------
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
    for select to authenticated
    using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
    for update to authenticated
    using (id = auth.uid() or public.es_admin())
    with check (id = auth.uid() or public.es_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
    for insert to authenticated
    with check (public.es_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
    for delete to authenticated
    using (public.es_admin());

-- 5.2 DEPENDENCIAS -----------------------------------------------------------
drop policy if exists dependencias_select on public.dependencias;
create policy dependencias_select on public.dependencias
    for select to authenticated
    using (true);

drop policy if exists dependencias_modify_admin on public.dependencias;
create policy dependencias_modify_admin on public.dependencias
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- 5.3 ROLES y PERMISOS (catalogos) -------------------------------------------
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
    for select to authenticated using (true);

drop policy if exists roles_modify_admin on public.roles;
create policy roles_modify_admin on public.roles
    for all to authenticated
    using (public.es_admin()) with check (public.es_admin());

drop policy if exists permisos_select on public.permisos;
create policy permisos_select on public.permisos
    for select to authenticated using (true);

drop policy if exists permisos_modify_admin on public.permisos;
create policy permisos_modify_admin on public.permisos
    for all to authenticated
    using (public.es_admin()) with check (public.es_admin());

drop policy if exists roles_permisos_select on public.roles_permisos;
create policy roles_permisos_select on public.roles_permisos
    for select to authenticated using (true);

drop policy if exists roles_permisos_modify_admin on public.roles_permisos;
create policy roles_permisos_modify_admin on public.roles_permisos
    for all to authenticated
    using (public.es_admin()) with check (public.es_admin());

-- 5.4 USUARIOS_DEPENDENCIAS --------------------------------------------------
drop policy if exists ud_select on public.usuarios_dependencias;
create policy ud_select on public.usuarios_dependencias
    for select to authenticated
    using (usuario_id = auth.uid() or public.es_admin());

drop policy if exists ud_modify_admin on public.usuarios_dependencias;
create policy ud_modify_admin on public.usuarios_dependencias
    for all to authenticated
    using (public.es_admin()) with check (public.es_admin());

-- 5.5 DOCUMENTOS -------------------------------------------------------------
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
    for select to authenticated
    using (public.puede_ver_documento(id));

drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
    for insert to authenticated
    with check (
        creado_por = auth.uid()
        and (
            public.tiene_permiso('documentos.crear')
            or public.es_admin()
        )
        and dependencia_origen_id in (
            select dependencia_id from public.usuarios_dependencias
            where usuario_id = auth.uid()
        )
    );

drop policy if exists documentos_update on public.documentos;
create policy documentos_update on public.documentos
    for update to authenticated
    using (
        creado_por = auth.uid()
        or public.es_admin()
    )
    with check (
        creado_por = auth.uid()
        or public.es_admin()
    );

drop policy if exists documentos_delete on public.documentos;
create policy documentos_delete on public.documentos
    for delete to authenticated
    using (public.es_admin() or (creado_por = auth.uid() and estado = 'borrador'));

-- 5.6 DOCUMENTO_ARCHIVOS -----------------------------------------------------
drop policy if exists archivos_select on public.documento_archivos;
create policy archivos_select on public.documento_archivos
    for select to authenticated
    using (public.puede_ver_documento(documento_id));

drop policy if exists archivos_insert on public.documento_archivos;
create policy archivos_insert on public.documento_archivos
    for insert to authenticated
    with check (
        subido_por = auth.uid()
        and exists (
            select 1 from public.documentos d
            where d.id = documento_id
              and (d.creado_por = auth.uid() or public.es_admin())
        )
    );

drop policy if exists archivos_delete on public.documento_archivos;
create policy archivos_delete on public.documento_archivos
    for delete to authenticated
    using (
        public.es_admin()
        or exists (
            select 1 from public.documentos d
            where d.id = documento_id
              and d.creado_por = auth.uid()
              and d.estado = 'borrador'
        )
    );

-- 5.7 DOCUMENTO_DESTINATARIOS -----------------------------------------------
drop policy if exists destinatarios_select on public.documento_destinatarios;
create policy destinatarios_select on public.documento_destinatarios
    for select to authenticated
    using (public.puede_ver_documento(documento_id));

drop policy if exists destinatarios_insert on public.documento_destinatarios;
create policy destinatarios_insert on public.documento_destinatarios
    for insert to authenticated
    with check (
        exists (
            select 1 from public.documentos d
            where d.id = documento_id
              and (d.creado_por = auth.uid() or public.es_admin())
        )
    );

drop policy if exists destinatarios_delete on public.documento_destinatarios;
create policy destinatarios_delete on public.documento_destinatarios
    for delete to authenticated
    using (
        public.es_admin()
        or exists (
            select 1 from public.documentos d
            where d.id = documento_id
              and d.creado_por = auth.uid()
              and d.estado = 'borrador'
        )
    );

-- 5.8 DOCUMENTO_EVENTOS (bitacora) -------------------------------------------
drop policy if exists eventos_select on public.documento_eventos;
create policy eventos_select on public.documento_eventos
    for select to authenticated
    using (public.puede_ver_documento(documento_id));

-- INSERT/UPDATE/DELETE: solo a traves de funciones SECURITY DEFINER.
-- Sin politicas para esos comandos -> bloqueadas para usuarios autenticados.

-- 5.9 DOCUMENTO_COMENTARIOS --------------------------------------------------
drop policy if exists comentarios_select on public.documento_comentarios;
create policy comentarios_select on public.documento_comentarios
    for select to authenticated
    using (public.puede_ver_documento(documento_id));

drop policy if exists comentarios_insert on public.documento_comentarios;
create policy comentarios_insert on public.documento_comentarios
    for insert to authenticated
    with check (
        usuario_id = auth.uid()
        and public.puede_ver_documento(documento_id)
    );

drop policy if exists comentarios_delete on public.documento_comentarios;
create policy comentarios_delete on public.documento_comentarios
    for delete to authenticated
    using (usuario_id = auth.uid() or public.es_admin());

-- 5.10 NOTIFICACIONES --------------------------------------------------------
drop policy if exists notif_select_self on public.notificaciones;
create policy notif_select_self on public.notificaciones
    for select to authenticated
    using (usuario_id = auth.uid());

drop policy if exists notif_update_self on public.notificaciones;
create policy notif_update_self on public.notificaciones
    for update to authenticated
    using (usuario_id = auth.uid())
    with check (usuario_id = auth.uid());

drop policy if exists notif_delete_self on public.notificaciones;
create policy notif_delete_self on public.notificaciones
    for delete to authenticated
    using (usuario_id = auth.uid() or public.es_admin());


-- =============================================================================
-- 6. STORAGE (bucket privado para los archivos)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Convencion: los archivos se guardan bajo "<documento_id>/<version>/<nombre>"
-- Validamos extrayendo el primer segmento del path.

drop policy if exists storage_documentos_select on storage.objects;
create policy storage_documentos_select on storage.objects
    for select to authenticated
    using (
        bucket_id = 'documentos'
        and public.puede_ver_documento((split_part(name, '/', 1))::uuid)
    );

drop policy if exists storage_documentos_insert on storage.objects;
create policy storage_documentos_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'documentos'
        and exists (
            select 1 from public.documentos d
            where d.id = (split_part(name, '/', 1))::uuid
              and (d.creado_por = auth.uid() or public.es_admin())
        )
    );

drop policy if exists storage_documentos_delete on storage.objects;
create policy storage_documentos_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'documentos'
        and (
            public.es_admin()
            or exists (
                select 1 from public.documentos d
                where d.id = (split_part(name, '/', 1))::uuid
                  and d.creado_por = auth.uid()
                  and d.estado = 'borrador'
            )
        )
    );


-- =============================================================================
-- 7. REALTIME (para notificaciones in-app)
-- =============================================================================

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notificaciones'
    ) then
        execute 'alter publication supabase_realtime add table public.notificaciones';
    end if;
end;
$$;


-- =============================================================================
-- 8. SEED: ROLES Y PERMISOS INICIALES
-- =============================================================================

insert into public.roles (nombre, descripcion, es_sistema) values
    ('administrador', 'Acceso total al sistema',                          true),
    ('emisor',        'Crea y envia documentos a otras dependencias',     true),
    ('receptor',      'Recibe, visualiza y responde documentos',          true)
on conflict (nombre) do nothing;

insert into public.permisos (clave, descripcion, categoria) values
    ('documentos.crear',          'Crear documentos',                             'documentos'),
    ('documentos.enviar_todos',   'Enviar documentos creados por cualquier user', 'documentos'),
    ('documentos.ver_todos',      'Ver todos los documentos del sistema',         'documentos'),
    ('documentos.aprobar',        'Aprobar o rechazar documentos recibidos',      'documentos'),
    ('documentos.archivar',       'Archivar documentos',                          'documentos'),
    ('usuarios.gestionar',        'Crear, editar y desactivar usuarios',          'administracion'),
    ('dependencias.gestionar',    'Crear y editar dependencias',                  'administracion'),
    ('roles.gestionar',           'Asignar roles y permisos',                     'administracion'),
    ('auditoria.ver',             'Ver auditoria global de eventos',              'administracion')
on conflict (clave) do nothing;

-- Asignaciones por defecto
-- ADMINISTRADOR: todos los permisos
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join public.permisos p
where r.nombre = 'administrador'
on conflict do nothing;

-- EMISOR: crear documentos
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.clave in ('documentos.crear')
where r.nombre = 'emisor'
on conflict do nothing;

-- RECEPTOR: aprobar documentos
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.clave in ('documentos.aprobar')
where r.nombre = 'receptor'
on conflict do nothing;


-- =============================================================================
-- 9. PERMISOS DE EJECUCION SOBRE FUNCIONES
-- =============================================================================

grant execute on function public.tiene_permiso(text)               to authenticated;
grant execute on function public.es_admin()                        to authenticated;
grant execute on function public.puede_ver_documento(uuid)         to authenticated;
grant execute on function public.enviar_documento(uuid)            to authenticated;
grant execute on function public.marcar_visto(uuid)                to authenticated;
grant execute on function public.responder_documento(uuid, boolean, text) to authenticated;


-- =============================================================================
-- LISTO. Ahora crea tu primer usuario admin desde la app o desde
-- Authentication -> Users en Supabase, y ejecuta el snippet de
-- supabase/migrations/0002_bootstrap_admin.sql para asignarle el rol.
-- =============================================================================
