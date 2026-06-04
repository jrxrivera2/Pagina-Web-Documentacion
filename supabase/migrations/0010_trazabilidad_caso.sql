-- =============================================================================
-- Trazabilidad extendida: descargas, estados de caso y sincronizacion
-- =============================================================================

-- Recalcula el estado del documento segun respuestas de destinatarios
create or replace function public.actualizar_estado_documento(p_documento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_total      int;
    v_rechazados int;
    v_aprobados  int;
    v_interactuo int;
begin
    select
        count(*)::int,
        count(*) filter (where estado_recepcion = 'rechazado')::int,
        count(*) filter (where estado_recepcion = 'aprobado')::int,
        count(*) filter (
            where estado_recepcion in ('visto', 'aprobado', 'rechazado')
        )::int
    into v_total, v_rechazados, v_aprobados, v_interactuo
    from public.documento_destinatarios
    where documento_id = p_documento_id;

    if v_total = 0 then
        return;
    end if;

    if v_rechazados > 0 then
        update public.documentos
           set estado = 'rechazado', updated_at = now()
         where id = p_documento_id
           and estado not in ('borrador', 'archivado');
    elsif v_aprobados = v_total then
        update public.documentos
           set estado = 'aprobado', updated_at = now()
         where id = p_documento_id
           and estado not in ('borrador', 'archivado');
    elsif v_interactuo > 0 then
        update public.documentos
           set estado = 'en_revision', updated_at = now()
         where id = p_documento_id
           and estado in ('enviado', 'en_revision');
    end if;
end;
$$;

-- Registra cada descarga de archivo en la bitacora
create or replace function public.registrar_descarga(
    p_documento_id   uuid,
    p_archivo_id     uuid default null,
    p_nombre_archivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.puede_ver_documento(p_documento_id) then
        raise exception 'No tienes acceso a este documento';
    end if;

    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (
        p_documento_id,
        auth.uid(),
        'descargado',
        jsonb_build_object(
            'archivo_id', p_archivo_id,
            'nombre_archivo', p_nombre_archivo
        )
    );

    update public.documento_destinatarios
       set estado_recepcion = case
               when estado_recepcion in ('pendiente', 'recibido') then 'visto'
               else estado_recepcion
           end,
           fecha_visto = coalesce(fecha_visto, now())
     where documento_id = p_documento_id
       and (usuario_id = auth.uid()
            or (usuario_id is null
                and dependencia_id in (
                    select dependencia_id from public.usuarios_dependencias
                    where usuario_id = auth.uid()
                )));

    perform public.actualizar_estado_documento(p_documento_id);
end;
$$;

-- Marcar visto: tambien pasa el documento a en_revision si estaba enviado
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
       set estado_recepcion = case
               when estado_recepcion = 'pendiente' then 'visto'
               else estado_recepcion
           end,
           fecha_visto = coalesce(fecha_visto, now())
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

    perform public.actualizar_estado_documento(p_documento_id);
end;
$$;

-- Responder: sincroniza estado global del documento
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
           fecha_respuesta  = now(),
           fecha_visto      = coalesce(fecha_visto, now())
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

    perform public.actualizar_estado_documento(p_documento_id);

    insert into public.notificaciones (usuario_id, documento_id, tipo, mensaje)
    select d.creado_por, d.id, 'documento_respondido',
           'Tu documento "' || d.titulo || '" fue ' || v_estado
    from public.documentos d
    where d.id = p_documento_id
      and d.creado_por <> auth.uid();
end;
$$;

grant execute on function public.actualizar_estado_documento(uuid) to authenticated;
grant execute on function public.registrar_descarga(uuid, uuid, text) to authenticated;
grant execute on function public.registrar_evento(uuid, text, jsonb) to authenticated;
