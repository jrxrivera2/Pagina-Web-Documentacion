-- =============================================================================
-- FIX: usuarios emisor (Nomina) pueden crear documentos
-- =============================================================================
-- Corrige el error "new row violates row-level security policy for table
-- documentos" cuando un usuario con rol emisor intenta crear/enviar.
-- =============================================================================

-- Asegura permisos del rol emisor_receptor (por si 0008 no se ejecuto)
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.clave in ('documentos.crear', 'documentos.aprobar')
where r.nombre = 'emisor_receptor'
on conflict do nothing;

-- Reasegura permiso crear para emisor
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.clave = 'documentos.crear'
where r.nombre = 'emisor'
on conflict do nothing;

-- Helper: usuario con rol que puede emitir documentos
create or replace function public.es_emisor_o_admin()
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
          and r.nombre in ('emisor', 'emisor_receptor', 'administrador')
    );
$$;

-- Valida origen + permiso de creacion
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
        where ud.usuario_id = auth.uid()
          and ud.dependencia_id = p_dependencia_origen_id
    )
    and (
        public.tiene_permiso('documentos.crear')
        or public.es_emisor_o_admin()
    );
$$;

-- Politica de INSERT mas clara (reemplaza la anterior)
drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
    for insert to authenticated
    with check (
        creado_por = auth.uid()
        and public.puede_crear_documento(dependencia_origen_id)
    );

grant execute on function public.es_emisor_o_admin() to authenticated;
grant execute on function public.puede_crear_documento(uuid) to authenticated;
