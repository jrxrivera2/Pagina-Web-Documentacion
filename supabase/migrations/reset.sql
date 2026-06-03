-- =============================================================================
-- RESET COMPLETO (usar SOLO en desarrollo)
-- =============================================================================
-- Borra todas las tablas, funciones y politicas creadas por el esquema.
-- NO borra los usuarios de auth.users (eso se hace desde el panel).
-- =============================================================================

-- Triggers en auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- Tablas (cascade arrastra indices, FKs y triggers asociados)
drop table if exists public.notificaciones          cascade;
drop table if exists public.documento_comentarios   cascade;
drop table if exists public.documento_eventos       cascade;
drop table if exists public.documento_destinatarios cascade;
drop table if exists public.documento_archivos      cascade;
drop table if exists public.documentos              cascade;
drop table if exists public.usuarios_dependencias   cascade;
drop table if exists public.roles_permisos          cascade;
drop table if exists public.permisos                cascade;
drop table if exists public.roles                   cascade;
drop table if exists public.dependencias            cascade;
drop table if exists public.profiles                cascade;

-- Funciones
drop function if exists public.handle_updated_at()                cascade;
drop function if exists public.handle_new_user()                  cascade;
drop function if exists public.tiene_permiso(text)                cascade;
drop function if exists public.es_admin()                         cascade;
drop function if exists public.puede_ver_documento(uuid)          cascade;
drop function if exists public.registrar_evento(uuid, text, jsonb) cascade;
drop function if exists public.enviar_documento(uuid)             cascade;
drop function if exists public.marcar_visto(uuid)                 cascade;
drop function if exists public.responder_documento(uuid, boolean, text) cascade;
drop function if exists public.trg_documento_creado()             cascade;

-- Storage bucket y politicas (Supabase bloquea drop si hay objetos;
-- borralos primero desde Storage si es necesario)
do $$
begin
    drop policy if exists storage_documentos_select on storage.objects;
    drop policy if exists storage_documentos_insert on storage.objects;
    drop policy if exists storage_documentos_delete on storage.objects;
exception when others then null;
end; $$;

delete from storage.buckets where id = 'documentos';
