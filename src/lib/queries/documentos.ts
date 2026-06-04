import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  Documento,
  DocumentoArchivo,
  DocumentoComentario,
  DocumentoDestinatario,
  DocumentoEvento,
} from "@/lib/types";

export const documentosKeys = {
  all: ["documentos"] as const,
  mios: (userId: string) => [...documentosKeys.all, "mios", userId] as const,
  bandeja: (userId: string) =>
    [...documentosKeys.all, "bandeja", userId] as const,
  detalle: (id: string) => [...documentosKeys.all, "detalle", id] as const,
  archivos: (id: string) => [...documentosKeys.all, "archivos", id] as const,
  destinatarios: (id: string) =>
    [...documentosKeys.all, "destinatarios", id] as const,
  eventos: (id: string) => [...documentosKeys.all, "eventos", id] as const,
  comentarios: (id: string) =>
    [...documentosKeys.all, "comentarios", id] as const,
};

/** Documento + datos del creador y dependencia origen para listados. */
export interface DocumentoListItem extends Documento {
  dependencia_origen: { id: string; nombre: string } | null;
  creador: { nombre_completo: string } | null;
  archivos_count: number;
  destinatarios_count: number;
}

interface DocumentoRow extends Documento {
  dependencia_origen?:
    | { id: string; nombre: string }
    | { id: string; nombre: string }[]
    | null;
  creador?:
    | { nombre_completo: string }
    | { nombre_completo: string }[]
    | null;
  documento_archivos?: { id: string }[];
  documento_destinatarios?: { id: string }[];
}

const SELECT_LIST =
  "*, dependencia_origen:dependencias!documentos_dependencia_origen_id_fkey(id, nombre)," +
  "creador:profiles!documentos_creado_por_fkey(nombre_completo)," +
  "documento_archivos(id), documento_destinatarios(id)";

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapDocumento(row: DocumentoRow): DocumentoListItem {
  return {
    ...row,
    dependencia_origen: pickFirst(row.dependencia_origen),
    creador: pickFirst(row.creador),
    archivos_count: row.documento_archivos?.length ?? 0,
    destinatarios_count: row.documento_destinatarios?.length ?? 0,
  };
}

/** Documentos creados por el usuario actual. */
export function useMisDocumentos(userId: string | undefined) {
  return useQuery({
    queryKey: documentosKeys.mios(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: async (): Promise<DocumentoListItem[]> => {
      const { data, error } = await supabase
        .from("documentos")
        .select(SELECT_LIST)
        .eq("creado_por", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DocumentoRow[]).map(mapDocumento);
    },
  });
}

/** Documentos donde el usuario actual es destinatario (directo o por dependencia). */
export function useBandeja(userId: string | undefined) {
  return useQuery({
    queryKey: documentosKeys.bandeja(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: async (): Promise<DocumentoListItem[]> => {
      const { data, error } = await supabase
        .from("documentos")
        .select(SELECT_LIST)
        .neq("creado_por", userId as string)
        .neq("estado", "borrador")
        .order("fecha_envio", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DocumentoRow[]).map(mapDocumento);
    },
  });
}

/** Documento individual con todos los datos relacionados. */
export interface DocumentoDetalle extends DocumentoListItem {
  archivos: DocumentoArchivo[];
  destinatarios: DocumentoDestinatarioFull[];
}

export interface DocumentoDestinatarioFull extends DocumentoDestinatario {
  dependencia: { id: string; nombre: string } | null;
  usuario: { id: string; nombre_completo: string } | null;
}

interface DestinatarioRow extends DocumentoDestinatario {
  dependencia?:
    | { id: string; nombre: string }
    | { id: string; nombre: string }[]
    | null;
  usuario?:
    | { id: string; nombre_completo: string }
    | { id: string; nombre_completo: string }[]
    | null;
}

export function useDocumento(id: string | undefined) {
  return useQuery({
    queryKey: documentosKeys.detalle(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<DocumentoDetalle> => {
      const { data, error } = await supabase
        .from("documentos")
        .select(SELECT_LIST)
        .eq("id", id as string)
        .single();
      if (error) throw new Error(error.message);
      const base = mapDocumento(data as unknown as DocumentoRow);

      const [{ data: archivos }, { data: destinatarios }] = await Promise.all([
        supabase
          .from("documento_archivos")
          .select("*")
          .eq("documento_id", id as string)
          .order("created_at", { ascending: false }),
        supabase
          .from("documento_destinatarios")
          .select(
            "*, dependencia:dependencias(id, nombre), usuario:profiles(id, nombre_completo)",
          )
          .eq("documento_id", id as string),
      ]);

      const destinatariosFull = ((destinatarios ?? []) as unknown as DestinatarioRow[]).map(
        (d) => ({
          ...d,
          dependencia: pickFirst(d.dependencia),
          usuario: pickFirst(d.usuario),
        }),
      );

      return {
        ...base,
        archivos: (archivos ?? []) as DocumentoArchivo[],
        destinatarios: destinatariosFull,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

export interface CrearDocumentoInput {
  titulo: string;
  descripcion: string;
  tipo: string;
  dependencia_origen_id: string;
  creado_por: string;
  destinatarios: { dependencia_id: string }[];
  archivos: File[];
  enviar: boolean;
}

interface CrearDocumentoResult {
  documento: Documento;
  archivos: DocumentoArchivo[];
}

export function useCrearDocumento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrearDocumentoInput): Promise<CrearDocumentoResult> => {
      const { data: doc, error: errDoc } = await supabase
        .from("documentos")
        .insert({
          titulo: input.titulo,
          descripcion: input.descripcion || null,
          tipo: input.tipo,
          dependencia_origen_id: input.dependencia_origen_id,
          creado_por: input.creado_por,
          estado: "borrador",
        })
        .select("*")
        .single();

      if (errDoc || !doc) {
        throw new Error(errDoc?.message ?? "No se pudo crear el documento");
      }
      const documento = doc as Documento;

      if (input.destinatarios.length > 0) {
        const { error: errDest } = await supabase
          .from("documento_destinatarios")
          .insert(
            input.destinatarios.map((d) => ({
              documento_id: documento.id,
              dependencia_id: d.dependencia_id,
              usuario_id: null,
              estado_recepcion: "pendiente" as const,
            })),
          );
        if (errDest) throw new Error(errDest.message);
      }

      const archivosCreados: DocumentoArchivo[] = [];
      for (const file of input.archivos) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${documento.id}/v${documento.version}/${Date.now()}_${safeName}`;

        const { error: errUp } = await supabase.storage
          .from("documentos")
          .upload(path, file, { upsert: false });
        if (errUp) throw new Error(`Error subiendo ${file.name}: ${errUp.message}`);

        const { data: archivo, error: errAr } = await supabase
          .from("documento_archivos")
          .insert({
            documento_id: documento.id,
            storage_path: path,
            nombre_archivo: file.name,
            mime_type: file.type || null,
            tamano: file.size,
            version: documento.version,
            subido_por: input.creado_por,
          })
          .select("*")
          .single();
        if (errAr || !archivo) {
          throw new Error(errAr?.message ?? "No se pudo registrar el archivo");
        }
        archivosCreados.push(archivo as DocumentoArchivo);
      }

      if (input.enviar) {
        const { error: errEnv } = await supabase.rpc("enviar_documento", {
          p_documento_id: documento.id,
        });
        if (errEnv) throw new Error(errEnv.message);
      }

      return { documento, archivos: archivosCreados };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: documentosKeys.mios(variables.creado_por) });
      qc.invalidateQueries({ queryKey: documentosKeys.all });
    },
  });
}

export function useEnviarDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentoId: string) => {
      const { error } = await supabase.rpc("enviar_documento", {
        p_documento_id: documentoId,
      });
      if (error) throw new Error(error.message);
      return documentoId;
    },
    onSuccess: (documentoId) => {
      qc.invalidateQueries({ queryKey: documentosKeys.all });
      qc.invalidateQueries({ queryKey: documentosKeys.detalle(documentoId) });
    },
  });
}

/** Devuelve una URL firmada (60s) para descargar un archivo del bucket privado. */
export async function getUrlDescarga(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 60);
  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo generar URL de descarga");
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// FASE 4: Trazabilidad, comentarios, respuestas, nueva version
// ---------------------------------------------------------------------------

export interface DocumentoEventoFull extends DocumentoEvento {
  usuario: { id: string; nombre_completo: string } | null;
}

interface EventoRow extends DocumentoEvento {
  usuario?:
    | { id: string; nombre_completo: string }
    | { id: string; nombre_completo: string }[]
    | null;
}

export function useDocumentoEventos(documentoId: string | undefined) {
  return useQuery({
    queryKey: documentosKeys.eventos(documentoId ?? ""),
    enabled: Boolean(documentoId),
    queryFn: async (): Promise<DocumentoEventoFull[]> => {
      const { data, error } = await supabase
        .from("documento_eventos")
        .select("*, usuario:profiles(id, nombre_completo)")
        .eq("documento_id", documentoId as string)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as EventoRow[]).map((row) => ({
        ...row,
        usuario: pickFirst(row.usuario),
      }));
    },
  });
}

export interface DocumentoComentarioFull extends DocumentoComentario {
  usuario: { id: string; nombre_completo: string; avatar_url: string | null } | null;
}

interface ComentarioRow extends DocumentoComentario {
  usuario?:
    | { id: string; nombre_completo: string; avatar_url: string | null }
    | { id: string; nombre_completo: string; avatar_url: string | null }[]
    | null;
}

export function useDocumentoComentarios(documentoId: string | undefined) {
  return useQuery({
    queryKey: documentosKeys.comentarios(documentoId ?? ""),
    enabled: Boolean(documentoId),
    queryFn: async (): Promise<DocumentoComentarioFull[]> => {
      const { data, error } = await supabase
        .from("documento_comentarios")
        .select("*, usuario:profiles(id, nombre_completo, avatar_url)")
        .eq("documento_id", documentoId as string)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as ComentarioRow[]).map((row) => ({
        ...row,
        usuario: pickFirst(row.usuario),
      }));
    },
  });
}

export function useCrearComentario(documentoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contenido: string; usuarioId: string }) => {
      const { error } = await supabase.from("documento_comentarios").insert({
        documento_id: documentoId,
        usuario_id: input.usuarioId,
        contenido: input.contenido.trim(),
      });
      if (error) throw new Error(error.message);

      const { error: errEvt } = await supabase.rpc("registrar_evento", {
        p_documento_id: documentoId,
        p_tipo_evento: "comentado",
        p_metadata: {},
      });
      if (errEvt) throw new Error(errEvt.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentosKeys.comentarios(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.eventos(documentoId) });
    },
  });
}

export function useResponderDocumento(documentoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { aprobar: boolean; comentario?: string }) => {
      const { error } = await supabase.rpc("responder_documento", {
        p_documento_id: documentoId,
        p_aprobar: input.aprobar,
        p_comentario: input.comentario && input.comentario.trim().length > 0
          ? input.comentario.trim()
          : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentosKeys.detalle(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.eventos(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.comentarios(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.all });
    },
  });
}

export function useMarcarVisto(documentoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!documentoId) return;
      const { error } = await supabase.rpc("marcar_visto", {
        p_documento_id: documentoId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!documentoId) return;
      qc.invalidateQueries({ queryKey: documentosKeys.detalle(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.eventos(documentoId) });
    },
  });
}

export function useNuevaVersion(documentoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("nueva_version_documento", {
        p_documento_id: documentoId,
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentosKeys.detalle(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.eventos(documentoId) });
      qc.invalidateQueries({ queryKey: documentosKeys.all });
    },
  });
}

export interface SubirArchivosInput {
  documentoId: string;
  version: number;
  archivos: File[];
  usuarioId: string;
}

export function useSubirArchivos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubirArchivosInput) => {
      const subidos: DocumentoArchivo[] = [];
      for (const file of input.archivos) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${input.documentoId}/v${input.version}/${Date.now()}_${safeName}`;

        const { error: errUp } = await supabase.storage
          .from("documentos")
          .upload(path, file, { upsert: false });
        if (errUp) {
          throw new Error(`Error subiendo ${file.name}: ${errUp.message}`);
        }

        const { data: archivo, error: errAr } = await supabase
          .from("documento_archivos")
          .insert({
            documento_id: input.documentoId,
            storage_path: path,
            nombre_archivo: file.name,
            mime_type: file.type || null,
            tamano: file.size,
            version: input.version,
            subido_por: input.usuarioId,
          })
          .select("*")
          .single();
        if (errAr || !archivo) {
          throw new Error(errAr?.message ?? "No se pudo registrar el archivo");
        }
        subidos.push(archivo as DocumentoArchivo);
      }
      return subidos;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: documentosKeys.detalle(variables.documentoId),
      });
    },
  });
}
