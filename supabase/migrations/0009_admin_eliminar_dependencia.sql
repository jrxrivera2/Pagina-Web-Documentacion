-- =============================================================================
-- Eliminar dependencia (solo admin, con validacion de documentos vinculados)
-- =============================================================================

create or replace function public.admin_eliminar_dependencia(p_dependencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nombre           text;
    v_docs_origen      int;
    v_docs_destino     int;
begin
    if not public.es_admin() then
        raise exception 'No tienes permiso para eliminar dependencias';
    end if;

    select nombre into v_nombre
    from public.dependencias
    where id = p_dependencia_id;

    if v_nombre is null then
        raise exception 'Dependencia no encontrada';
    end if;

    select count(*)::int into v_docs_origen
    from public.documentos
    where dependencia_origen_id = p_dependencia_id;

    select count(*)::int into v_docs_destino
    from public.documento_destinatarios
    where dependencia_id = p_dependencia_id;

    if v_docs_origen > 0 or v_docs_destino > 0 then
        raise exception
            'No se puede eliminar "%": hay documentos vinculados (% como origen, % como destinatario). Elimina o archiva esos documentos primero.',
            v_nombre, v_docs_origen, v_docs_destino;
    end if;

    -- usuarios_dependencias se elimina en cascada
    delete from public.dependencias
    where id = p_dependencia_id;
end;
$$;

grant execute on function public.admin_eliminar_dependencia(uuid) to authenticated;
