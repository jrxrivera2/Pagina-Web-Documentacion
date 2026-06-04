-- =============================================================================
-- FIX DEFINITIVO: crear documento via RPC (evita bloqueos RLS del cliente)
-- =============================================================================

-- SELECT: el creador siempre puede ver sus documentos (sin depender solo de la funcion)
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
    for select to authenticated
    using (
        creado_por = auth.uid()
        or public.puede_ver_documento(id)
    );

-- Crea el borrador (security definer, valida permisos antes)
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

    if not public.puede_crear_documento(p_dependencia_origen_id) then
        raise exception
            'No tienes permiso para crear documentos en esta dependencia. Verifica rol emisor en Nomina.';
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

-- Agrega destinatarios al documento (solo el creador o admin)
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

-- Registra archivo en BD despues de subirlo a Storage (solo creador)
create or replace function public.registrar_archivo_documento(
    p_documento_id   uuid,
    p_storage_path   text,
    p_nombre_archivo text,
    p_mime_type      text,
    p_tamano         bigint,
    p_version        integer
)
returns public.documento_archivos
language plpgsql
security definer
set search_path = public
as $$
declare
    v_archivo public.documento_archivos;
begin
    if not exists (
        select 1 from public.documentos d
        where d.id = p_documento_id
          and (d.creado_por = auth.uid() or public.es_admin())
    ) then
        raise exception 'No tienes permiso para agregar archivos a este documento';
    end if;

    insert into public.documento_archivos (
        documento_id,
        storage_path,
        nombre_archivo,
        mime_type,
        tamano,
        version,
        subido_por
    ) values (
        p_documento_id,
        p_storage_path,
        p_nombre_archivo,
        p_mime_type,
        p_tamano,
        p_version,
        auth.uid()
    )
    returning * into v_archivo;

    return v_archivo;
end;
$$;

grant execute on function public.crear_documento(text, text, text, uuid) to authenticated;
grant execute on function public.agregar_destinatarios_documento(uuid, uuid[]) to authenticated;
grant execute on function public.registrar_archivo_documento(uuid, text, text, text, bigint, integer) to authenticated;
