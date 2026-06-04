import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { Notificacion } from "@/lib/types";

export const notificacionesKeys = {
  all: ["notificaciones"] as const,
  list: (userId: string) =>
    [...notificacionesKeys.all, "list", userId] as const,
};

const LIMITE_LISTA = 30;

type NotificacionListener = (n: Notificacion) => void;

/** Una sola suscripcion Realtime por usuario (evita conflicto campana + bandeja). */
let canalActivo: RealtimeChannel | null = null;
let usuarioCanalActivo: string | null = null;
let suscriptores = 0;
const oyentes = new Set<NotificacionListener>();
let queryClientGlobal: QueryClient | null = null;

function iniciarCanal(userId: string, qc: QueryClient) {
  queryClientGlobal = qc;

  if (canalActivo && usuarioCanalActivo === userId) {
    return;
  }

  if (canalActivo) {
    void supabase.removeChannel(canalActivo);
    canalActivo = null;
    usuarioCanalActivo = null;
  }

  usuarioCanalActivo = userId;
  canalActivo = supabase
    .channel(`notificaciones:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notificaciones",
        filter: `usuario_id=eq.${userId}`,
      },
      (payload) => {
        const nueva = payload.new as Notificacion;
        void queryClientGlobal?.invalidateQueries({
          queryKey: notificacionesKeys.list(userId),
        });
        oyentes.forEach((fn) => fn(nueva));
      },
    )
    .subscribe();
}

function cerrarCanalSiNoHaySuscriptores() {
  if (suscriptores > 0) return;
  if (canalActivo) {
    void supabase.removeChannel(canalActivo);
    canalActivo = null;
    usuarioCanalActivo = null;
  }
}

/** Cantidad de notificaciones sin leer (derivado de la lista en cache). */
export function useNotificacionesNoLeidas(userId: string | undefined) {
  const query = useNotificaciones(userId);
  const count = (query.data ?? []).filter((n) => !n.leida).length;
  return { ...query, count };
}

export function useNotificaciones(userId: string | undefined) {
  return useQuery({
    queryKey: notificacionesKeys.list(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Notificacion[]> => {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("usuario_id", userId as string)
        .order("created_at", { ascending: false })
        .limit(LIMITE_LISTA);
      if (error) throw new Error(error.message);
      return (data ?? []) as Notificacion[];
    },
  });
}

/**
 * Suscripcion Realtime compartida. Varios componentes pueden usarla;
 * solo se crea un canal por usuario.
 */
export function useNotificacionesRealtime(
  userId: string | undefined,
  onNueva?: NotificacionListener,
) {
  const qc = useQueryClient();
  const onNuevaRef = useRef(onNueva);
  onNuevaRef.current = onNueva;

  useEffect(() => {
    if (!userId) return;

    const oyente: NotificacionListener = (n) => onNuevaRef.current?.(n);
    if (onNueva) oyentes.add(oyente);

    suscriptores += 1;
    iniciarCanal(userId, qc);

    return () => {
      if (onNueva) oyentes.delete(oyente);
      suscriptores -= 1;
      cerrarCanalSiNoHaySuscriptores();
    };
  }, [userId, qc]);
}

export function useMarcarLeida(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificacionId: string) => {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id", notificacionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: notificacionesKeys.list(userId) });
    },
  });
}

export function useMarcarTodasLeidas(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("usuario_id", userId)
        .eq("leida", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: notificacionesKeys.list(userId) });
    },
  });
}
