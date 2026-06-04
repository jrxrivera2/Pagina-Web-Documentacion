import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  Profile,
  UsuarioDependenciaFull,
} from "@/lib/types";

import type { FlagsRolUsuario } from "@/lib/admin-roles";

export const usuariosAdminKeys = {
  all: ["admin", "usuarios"] as const,
  list: () => [...usuariosAdminKeys.all, "list"] as const,
  detalle: (id: string) => [...usuariosAdminKeys.all, "detalle", id] as const,
  porDependencia: (dependenciaId: string) =>
    [...usuariosAdminKeys.all, "por-dependencia", dependenciaId] as const,
};

export interface UsuarioEnDependencia {
  asignacion_id: string;
  usuario_id: string;
  nombre_completo: string;
  email: string | null;
  cargo: string | null;
  activo: boolean;
  rol_nombre: string;
  es_principal: boolean;
}

export interface UsuarioAdminListItem extends Profile {
  dependencias: { rol_nombre: string; dependencia_nombre: string }[];
}

interface UsuarioRow extends Profile {
  usuarios_dependencias?: {
    rol: { nombre: string } | { nombre: string }[] | null;
    dependencia: { nombre: string } | { nombre: string }[] | null;
  }[];
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function useUsuariosAdmin() {
  return useQuery({
    queryKey: usuariosAdminKeys.list(),
    queryFn: async (): Promise<UsuarioAdminListItem[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "*, usuarios_dependencias(rol:roles(nombre), dependencia:dependencias(nombre))",
        )
        .order("nombre_completo");
      if (error) throw new Error(error.message);

      return ((data ?? []) as unknown as UsuarioRow[]).map((u) => ({
        ...u,
        dependencias: (u.usuarios_dependencias ?? []).map((ud) => ({
          rol_nombre: pickFirst(ud.rol)?.nombre ?? "",
          dependencia_nombre: pickFirst(ud.dependencia)?.nombre ?? "",
        })),
      }));
    },
  });
}

/** Asignaciones detalladas (con IDs) de un usuario. */
export function useAsignacionesUsuario(usuarioId: string | undefined) {
  return useQuery({
    queryKey: usuariosAdminKeys.detalle(usuarioId ?? ""),
    enabled: Boolean(usuarioId),
    queryFn: async (): Promise<UsuarioDependenciaFull[]> => {
      const { data, error } = await supabase
        .from("usuarios_dependencias")
        .select(
          "id, usuario_id, dependencia_id, rol_id, es_principal, created_at, " +
            "dependencia:dependencias(id, nombre, activo), rol:roles(id, nombre)",
        )
        .eq("usuario_id", usuarioId as string)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as UsuarioDependenciaFull[];
    },
  });
}

export function useAsignarRolEnDependencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: {
        usuario_id: string;
        dependencia_id: string;
        es_principal?: boolean;
      } & FlagsRolUsuario,
    ) => {
      const { error } = await supabase.rpc("admin_asignar_dependencia", {
        p_usuario_id: input.usuario_id,
        p_dependencia_id: input.dependencia_id,
        p_es_emisor: input.esEmisor,
        p_es_receptor: input.esReceptor,
        p_es_administrador: input.esAdministrador,
        p_es_principal: input.es_principal ?? false,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.detalle(variables.usuario_id),
      });
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.porDependencia(variables.dependencia_id),
      });
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.list() });
    },
  });
}

export function useQuitarAsignacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; usuario_id: string }) => {
      const { error } = await supabase
        .from("usuarios_dependencias")
        .delete()
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.detalle(variables.usuario_id),
      });
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.list() });
    },
  });
}

export function useToggleUsuarioActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ activo: input.activo })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.list() });
    },
  });
}

export function useUsuariosPorDependencia(dependenciaId: string | undefined) {
  return useQuery({
    queryKey: usuariosAdminKeys.porDependencia(dependenciaId ?? ""),
    enabled: Boolean(dependenciaId),
    queryFn: async (): Promise<UsuarioEnDependencia[]> => {
      const { data, error } = await supabase
        .from("usuarios_dependencias")
        .select(
          "id, usuario_id, es_principal, " +
            "rol:roles(nombre), " +
            "usuario:profiles(id, nombre_completo, email, cargo, activo)",
        )
        .eq("dependencia_id", dependenciaId as string)
        .order("created_at");
      if (error) throw new Error(error.message);

      type Row = {
        id: string;
        usuario_id: string;
        es_principal: boolean;
        rol: { nombre: string } | { nombre: string }[] | null;
        usuario:
          | {
              id: string;
              nombre_completo: string;
              email: string | null;
              cargo: string | null;
              activo: boolean;
            }
          | {
              id: string;
              nombre_completo: string;
              email: string | null;
              cargo: string | null;
              activo: boolean;
            }[]
          | null;
      };

      return ((data ?? []) as unknown as Row[]).map((row) => {
        const u = pickFirst(row.usuario);
        const rol = pickFirst(row.rol);
        return {
          asignacion_id: row.id,
          usuario_id: row.usuario_id,
          nombre_completo: u?.nombre_completo ?? "—",
          email: u?.email ?? null,
          cargo: u?.cargo ?? null,
          activo: u?.activo ?? false,
          rol_nombre: rol?.nombre ?? "",
          es_principal: row.es_principal,
        };
      });
    },
  });
}

export function useCrearUsuarioAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      nombre_completo: string;
      dependencia_id: string;
      cedula?: string;
      cargo?: string;
      es_principal?: boolean;
    } & FlagsRolUsuario) => {
      const { data, error } = await supabase.rpc("admin_crear_usuario", {
        p_email: input.email.trim().toLowerCase(),
        p_password: input.password,
        p_nombre_completo: input.nombre_completo.trim(),
        p_dependencia_id: input.dependencia_id,
        p_es_emisor: input.esEmisor,
        p_es_receptor: input.esReceptor,
        p_es_administrador: input.esAdministrador,
        p_cedula: input.cedula?.trim() || null,
        p_cargo: input.cargo?.trim() || null,
        p_es_principal: input.es_principal ?? true,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.all });
    },
  });
}

export function useActualizarRolAsignacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: {
        asignacion_id: string;
        usuario_id: string;
        dependencia_id: string;
      } & FlagsRolUsuario,
    ) => {
      const { error } = await supabase.rpc("admin_actualizar_rol_asignacion", {
        p_asignacion_id: input.asignacion_id,
        p_es_emisor: input.esEmisor,
        p_es_receptor: input.esReceptor,
        p_es_administrador: input.esAdministrador,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.detalle(variables.usuario_id),
      });
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.porDependencia(variables.dependencia_id),
      });
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.list() });
    },
  });
}

export function useEliminarUsuarioAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (usuarioId: string) => {
      const { error } = await supabase.rpc("admin_eliminar_usuario", {
        p_usuario_id: usuarioId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.all });
    },
  });
}

export function useActualizarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      nombre_completo?: string;
      cedula?: string | null;
      cargo?: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...(input.nombre_completo !== undefined && {
            nombre_completo: input.nombre_completo.trim(),
          }),
          ...(input.cedula !== undefined && { cedula: input.cedula }),
          ...(input.cargo !== undefined && { cargo: input.cargo }),
        })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({
        queryKey: usuariosAdminKeys.detalle(variables.id),
      });
      qc.invalidateQueries({ queryKey: usuariosAdminKeys.list() });
    },
  });
}
