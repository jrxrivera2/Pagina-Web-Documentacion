import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { dependenciasKeys } from "@/lib/queries/dependencias";
import type { Dependencia } from "@/lib/types";

export const dependenciasAdminKeys = {
  ...dependenciasKeys,
  listAll: () => [...dependenciasKeys.all, "list-all-admin"] as const,
};

export interface DependenciaConContadores extends Dependencia {
  usuarios_count: number;
}

export function useDependenciasAdmin() {
  return useQuery({
    queryKey: dependenciasAdminKeys.listAll(),
    queryFn: async (): Promise<DependenciaConContadores[]> => {
      const { data, error } = await supabase
        .from("dependencias")
        .select("*, usuarios_dependencias(id)")
        .order("nombre");
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as (Dependencia & {
        usuarios_dependencias: { id: string }[];
      })[]).map((d) => ({
        ...d,
        usuarios_count: d.usuarios_dependencias?.length ?? 0,
      }));
    },
  });
}

export function useCrearDependencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nombre: string; descripcion: string }) => {
      const { data, error } = await supabase
        .from("dependencias")
        .insert({
          nombre: input.nombre.trim(),
          descripcion: input.descripcion.trim() || null,
          activo: true,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as Dependencia;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependenciasKeys.all });
    },
  });
}

export function useActualizarDependencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      nombre: string;
      descripcion: string;
    }) => {
      const { error } = await supabase
        .from("dependencias")
        .update({
          nombre: input.nombre.trim(),
          descripcion: input.descripcion.trim() || null,
        })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependenciasKeys.all });
    },
  });
}

export function useToggleDependenciaActiva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("dependencias")
        .update({ activo: input.activo })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependenciasKeys.all });
    },
  });
}

export function useEliminarDependencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_eliminar_dependencia", {
        p_dependencia_id: id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependenciasKeys.all });
    },
  });
}
