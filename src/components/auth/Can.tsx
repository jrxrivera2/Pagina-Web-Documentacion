import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { ClavePermiso } from "@/lib/types";

interface CanProps {
  permiso: ClavePermiso | ClavePermiso[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renderiza children si el usuario tiene el permiso (o alguno de los permisos).
 * Los administradores siempre pasan. Si no, renderiza el fallback (vacio por defecto).
 */
export function Can({ permiso, children, fallback = null }: CanProps) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;
  if (user.esAdmin) return <>{children}</>;

  const claves = Array.isArray(permiso) ? permiso : [permiso];
  const tiene = claves.some((c) => user.permisos.includes(c));
  return <>{tiene ? children : fallback}</>;
}
