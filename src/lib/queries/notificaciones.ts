import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Notificacion } from "@/lib/types";

export const notificacionesKeys = {
  all: ["notificaciones"] as const,
  list: (userId: string) =>
    [...notificacionesKeys.all, "list", userId] as const,
};

const LIMITE_LISTA = 30;

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
 * Suscripcion Realtime: cuando llega un INSERT a notificaciones del usuario,
 * invalida la query y ejecuta opcionalmente un callback (util para toasts).
 */
export function useNotificacionesRealtime(
  userId: string | undefined,
  onNueva?: (n: Notificacion) => void,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const canal = supabase
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
          qc.invalidateQueries({ queryKey: notificacionesKeys.list(userId) });
          onNueva?.(nueva);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId, qc, onNueva]);
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
