import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  DocumentoEvento,
  TipoEventoDocumento,
} from "@/lib/types";

export const auditoriaKeys = {
  all: ["admin", "auditoria"] as const,
  filtered: (f: AuditoriaFiltros) =>
    [...auditoriaKeys.all, "filtered", f] as const,
};

export interface AuditoriaFiltros {
  dependenciaId?: string;
  tipoEvento?: TipoEventoDocumento;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  limite?: number;
}

export interface EventoAuditoria extends DocumentoEvento {
  usuario: { id: string; nombre_completo: string } | null;
  documento:
    | {
        id: string;
        titulo: string;
        estado: string;
        dependencia_origen_id: string;
      }
    | null;
}

interface RawEvento extends DocumentoEvento {
  usuario?:
    | { id: string; nombre_completo: string }
    | { id: string; nombre_completo: string }[]
    | null;
  documento?:
    | {
        id: string;
        titulo: string;
        estado: string;
        dependencia_origen_id: string;
      }
    | {
        id: string;
        titulo: string;
        estado: string;
        dependencia_origen_id: string;
      }[]
    | null;
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function useAuditoria(filtros: AuditoriaFiltros) {
  return useQuery({
    queryKey: auditoriaKeys.filtered(filtros),
    queryFn: async (): Promise<EventoAuditoria[]> => {
      let q = supabase
        .from("documento_eventos")
        .select(
          "*, usuario:profiles(id, nombre_completo)," +
            " documento:documentos(id, titulo, estado, dependencia_origen_id)",
        )
        .order("created_at", { ascending: false })
        .limit(filtros.limite ?? 200);

      if (filtros.tipoEvento) {
        q = q.eq("tipo_evento", filtros.tipoEvento);
      }
      if (filtros.usuarioId) {
        q = q.eq("usuario_id", filtros.usuarioId);
      }
      if (filtros.desde) {
        q = q.gte("created_at", filtros.desde);
      }
      if (filtros.hasta) {
        q = q.lte("created_at", filtros.hasta);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      let resultado = ((data ?? []) as unknown as RawEvento[]).map((e) => ({
        ...e,
        usuario: pickFirst(e.usuario),
        documento: pickFirst(e.documento),
      }));

      if (filtros.dependenciaId) {
        resultado = resultado.filter(
          (e) =>
            e.documento?.dependencia_origen_id === filtros.dependenciaId,
        );
      }

      return resultado;
    },
  });
}
