-- =============================================================================
-- Estado de caso manual (abierto / cerrado / en seguimiento) + notificaciones
-- =============================================================================

alter table public.documentos
    add column if not exists estado_caso text not null default 'abierto'
        check (estado_caso in ('abierto', 'cerrado', 'en_seguimiento'));

comment on column public.documentos.estado_caso is
    'Estado del caso marcado por el usuario: abierto, cerrado o en_seguimiento';

update public.documentos
   set estado_caso = 'abierto'
 where estado_caso is null;

-- Actualiza estado de caso y notifica a las partes involucradas
create or replace function public.actualizar_estado_caso(
    p_documento_id uuid,
    p_estado_caso  text
)
returns public.documentos
language plpgsql
security definer
set search_path = public
as $$
declare
    v_doc           public.documentos%rowtype;
    v_anterior      text;
    v_etiquetas     jsonb := '{"abierto":"Abierto","cerrado":"Cerrado","en_seguimiento":"En seguimiento"}'::jsonb;
    v_etiq_nueva    text;
    v_usuario       record;
begin
    if auth.uid() is null then
        raise exception 'Debes iniciar sesion';
    end if;

    if p_estado_caso not in ('abierto', 'cerrado', 'en_seguimiento') then
        raise exception 'Estado de caso invalido. Use: abierto, cerrado o en_seguimiento';
    end if;

    if not public.puede_ver_documento(p_documento_id) then
        raise exception 'No tienes acceso a este documento';
    end if;

    select * into v_doc from public.documentos where id = p_documento_id;

    if v_doc.estado = 'borrador' then
        raise exception 'No puedes cambiar el estado de caso de un borrador. Envia el documento primero.';
    end if;

    v_anterior := v_doc.estado_caso;
    v_etiq_nueva := v_etiquetas ->> p_estado_caso;

    if v_anterior = p_estado_caso then
        return v_doc;
    end if;

    update public.documentos
       set estado_caso = p_estado_caso,
           updated_at  = now()
     where id = p_documento_id
     returning * into v_doc;

    insert into public.documento_eventos (documento_id, usuario_id, tipo_evento, metadata)
    values (
        p_documento_id,
        auth.uid(),
        'editado',
        jsonb_build_object(
            'accion', 'estado_caso',
            'estado_caso_anterior', v_anterior,
            'estado_caso_nuevo', p_estado_caso
        )
    );

    -- Notificar al creador si lo cambia un destinatario
    if v_doc.creado_por <> auth.uid() then
        insert into public.notificaciones (usuario_id, documento_id, tipo, mensaje)
        values (
            v_doc.creado_por,
            p_documento_id,
            'estado_caso_actualizado',
            'Estado del caso actualizado a "' || v_etiq_nueva || '": ' || v_doc.titulo
        );
    end if;

    -- Notificar destinatarios si lo cambia el creador o admin
    if v_doc.creado_por = auth.uid() or public.es_admin() then
        for v_usuario in
            select distinct coalesce(dd.usuario_id, ud.usuario_id) as uid
            from public.documento_destinatarios dd
            left join public.usuarios_dependencias ud
                on ud.dependencia_id = dd.dependencia_id
               and dd.usuario_id is null
            where dd.documento_id = p_documento_id
              and coalesce(dd.usuario_id, ud.usuario_id) is not null
              and coalesce(dd.usuario_id, ud.usuario_id) <> auth.uid()
        loop
            insert into public.notificaciones (usuario_id, documento_id, tipo, mensaje)
            values (
                v_usuario.uid,
                p_documento_id,
                'estado_caso_actualizado',
                'Estado del caso actualizado a "' || v_etiq_nueva || '": ' || v_doc.titulo
            );
        end loop;
    end if;

    return v_doc;
end;
$$;

grant execute on function public.actualizar_estado_caso(uuid, text) to authenticated;
