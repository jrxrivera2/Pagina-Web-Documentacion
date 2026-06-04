-- =============================================================================
-- FASE 4 - NUEVA VERSION DE DOCUMENTO
-- =============================================================================
-- Pega esto en el SQL Editor de Supabase (despues de haber corrido
-- 0001_initial_schema.sql).
--
-- Permite que el creador de un documento rechazado lo "reabra":
--   - se incrementa la version
--   - el estado vuelve a 'borrador' (asi puede subir nuevos archivos)
--   - los destinatarios vuelven a 'pendiente'
--   - se registra evento 'version_nueva'
-- Despues de subir los archivos nuevos, llama a enviar_documento() para
-- pasar a 'enviado' otra vez (eso reusara la funcion ya creada y notificara
-- a los destinatarios).
-- =============================================================================

create or replace function public.nueva_version_documento(p_documento_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_doc public.documentos%rowtype;
    v_nueva_version integer;
begin
    select * into v_doc from public.documentos where id = p_documento_id;
    if not found then
        raise exception 'Documento no encontrado';
    end if;

    if v_doc.creado_por <> auth.uid()
       and not public.es_admin() then
        raise exception 'Solo el creador puede crear una nueva version';
    end if;

    if v_doc.estado not in ('rechazado', 'aprobado') then
        raise exception 'Solo se puede crear nueva version de documentos aprobados o rechazados (estado actual: %)', v_doc.estado;
    end if;

    v_nueva_version := v_doc.version + 1;

    update public.documentos
       set version     = v_nueva_version,
           estado      = 'borrador',
           fecha_envio = null,
           updated_at  = now()
     where id = p_documento_id;

    update public.documento_destinatarios
       set estado_recepcion = 'pendiente',
           fecha_visto      = null,
           fecha_respuesta  = null
     where documento_id = p_documento_id;

    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (p_documento_id, auth.uid(), 'version_nueva',
            jsonb_build_object('version_anterior', v_doc.version,
                               'version_nueva',    v_nueva_version));

    return v_nueva_version;
end;
$$;

grant execute on function public.nueva_version_documento(uuid) to authenticated;
