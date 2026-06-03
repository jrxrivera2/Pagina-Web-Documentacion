import { useAuth } from "@/hooks/useAuth";
import type { ClavePermiso } from "@/lib/types";

/**
 * Devuelve true si el usuario actual tiene el permiso indicado.
 * Los administradores se consideran con TODOS los permisos.
 */
export function usePermiso(clave: ClavePermiso): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.esAdmin) return true;
  return user.permisos.includes(clave);
}

/** Devuelve true si el usuario tiene AL MENOS uno de los permisos. */
export function usePermisos(claves: ClavePermiso[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.esAdmin) return true;
  return claves.some((c) => user.permisos.includes(c));
}
