-- =============================================================================
-- FIX: bloquear creacion/envio de documentos desde o hacia dependencias inactivas
-- =============================================================================

-- Origen: usuario asignado + dependencia activa + permiso de creacion
create or replace function public.puede_crear_documento(p_dependencia_origen_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.usuarios_dependencias ud
        join public.dependencias dep on dep.id = ud.dependencia_id
        where ud.usuario_id = auth.uid()
          and ud.dependencia_id = p_dependencia_origen_id
          and dep.activo = true
    )
    and (
        public.tiene_permiso('documentos.crear')
        or public.es_emisor_o_admin()
    );
$$;

-- Mensajes mas claros al crear documento
create or replace function public.crear_documento(
    p_titulo                  text,
    p_descripcion             text,
    p_tipo                    text,
    p_dependencia_origen_id   uuid
)
returns public.documentos
language plpgsql
security definer
set search_path = public
as $$
declare
    v_doc public.documentos;
begin
    if auth.uid() is null then
        raise exception 'Debes iniciar sesion';
    end if;

    if not exists (
        select 1 from public.dependencias
        where id = p_dependencia_origen_id and activo = true
    ) then
        raise exception
            'La dependencia origen esta inactiva. El administrador debe reactivarla para enviar documentos.';
    end if;

    if not public.puede_crear_documento(p_dependencia_origen_id) then
        raise exception
            'No tienes permiso para crear documentos en esta dependencia. Verifica rol emisor y asignacion activa.';
    end if;

    insert into public.documentos (
        titulo,
        descripcion,
        tipo,
        dependencia_origen_id,
        creado_por,
        estado
    ) values (
        trim(p_titulo),
        nullif(trim(coalesce(p_descripcion, '')), ''),
        coalesce(nullif(trim(p_tipo), ''), 'informe'),
        p_dependencia_origen_id,
        auth.uid(),
        'borrador'
    )
    returning * into v_doc;

    return v_doc;
end;
$$;

-- Destinatarios: solo dependencias activas
create or replace function public.agregar_destinatarios_documento(
    p_documento_id      uuid,
    p_dependencia_ids   uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_dep_id uuid;
    v_nombre text;
begin
    if auth.uid() is null then
        raise exception 'Debes iniciar sesion';
    end if;

    if not exists (
        select 1 from public.documentos d
        where d.id = p_documento_id
          and (d.creado_por = auth.uid() or public.es_admin())
    ) then
        raise exception 'No tienes permiso para editar este documento';
    end if;

    if p_dependencia_ids is null or array_length(p_dependencia_ids, 1) is null then
        return;
    end if;

    foreach v_dep_id in array p_dependencia_ids
    loop
        select nombre into v_nombre
        from public.dependencias
        where id = v_dep_id and activo = true;

        if v_nombre is null then
            raise exception
                'No se puede enviar a una dependencia inactiva. Reactivala desde Administracion → Dependencias.';
        end if;

        if not exists (
            select 1 from public.documento_destinatarios
            where documento_id = p_documento_id
              and dependencia_id = v_dep_id
        ) then
            insert into public.documento_destinatarios (
                documento_id,
                dependencia_id,
                usuario_id,
                estado_recepcion
            ) values (
                p_documento_id,
                v_dep_id,
                null,
                'pendiente'
            );
        end if;
    end loop;
end;
$$;

grant execute on function public.puede_crear_documento(uuid) to authenticated;
grant execute on function public.crear_documento(text, text, text, uuid) to authenticated;
grant execute on function public.agregar_destinatarios_documento(uuid, uuid[]) to authenticated;
