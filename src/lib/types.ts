/**
 * Tipos del dominio mapeados al esquema de Supabase
 * (supabase/migrations/0001_initial_schema.sql).
 *
 * Cuando agreguemos la CLI de Supabase podremos generar tipos
 * automaticos con `supabase gen types typescript`. Por ahora los
 * mantenemos a mano para tener autocompletado en toda la app.
 */

export type EstadoDocumento =
  | "borrador"
  | "enviado"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "archivado";

export type EstadoRecepcion =
  | "pendiente"
  | "recibido"
  | "visto"
  | "aprobado"
  | "rechazado";

export type TipoEventoDocumento =
  | "creado"
  | "enviado"
  | "visto"
  | "descargado"
  | "aprobado"
  | "rechazado"
  | "comentado"
  | "editado"
  | "version_nueva"
  | "archivado";

export type NombreRol = "administrador" | "emisor" | "receptor" | string;

export type ClavePermiso =
  | "documentos.crear"
  | "documentos.enviar_todos"
  | "documentos.ver_todos"
  | "documentos.aprobar"
  | "documentos.archivar"
  | "usuarios.gestionar"
  | "dependencias.gestionar"
  | "roles.gestionar"
  | "auditoria.ver"
  | string;

export interface Profile {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  cargo: string | null;
  avatar_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dependencia {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rol {
  id: string;
  nombre: NombreRol;
  descripcion: string | null;
  es_sistema: boolean;
  created_at: string;
}

export interface Permiso {
  id: string;
  clave: ClavePermiso;
  descripcion: string;
  categoria: string | null;
  created_at: string;
}

export interface UsuarioDependencia {
  id: string;
  usuario_id: string;
  dependencia_id: string;
  rol_id: string;
  es_principal: boolean;
  created_at: string;
}

/** Filas de usuarios_dependencias enriquecidas con rol y dependencia. */
export interface UsuarioDependenciaFull extends UsuarioDependencia {
  dependencia: Pick<Dependencia, "id" | "nombre" | "activo">;
  rol: Pick<Rol, "id" | "nombre">;
}

export interface Documento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  dependencia_origen_id: string;
  creado_por: string;
  estado: EstadoDocumento;
  version: number;
  fecha_envio: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoArchivo {
  id: string;
  documento_id: string;
  storage_path: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano: number | null;
  version: number;
  subido_por: string | null;
  created_at: string;
}

export interface DocumentoDestinatario {
  id: string;
  documento_id: string;
  dependencia_id: string;
  usuario_id: string | null;
  estado_recepcion: EstadoRecepcion;
  fecha_visto: string | null;
  fecha_respuesta: string | null;
  created_at: string;
}

export interface DocumentoEvento {
  id: string;
  documento_id: string;
  usuario_id: string | null;
  tipo_evento: TipoEventoDocumento;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentoComentario {
  id: string;
  documento_id: string;
  usuario_id: string | null;
  contenido: string;
  created_at: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  documento_id: string | null;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

/** Snapshot del usuario actual con todo lo que la UI necesita. */
export interface SesionUsuario {
  profile: Profile;
  dependencias: UsuarioDependenciaFull[];
  permisos: ClavePermiso[];
  esAdmin: boolean;
}
