import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { ClavePermiso } from "@/lib/types";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Si se pasa, exige al menos uno de estos permisos. */
  requierePermiso?: ClavePermiso | ClavePermiso[];
}

export function ProtectedRoute({
  children,
  requierePermiso,
}: ProtectedRouteProps) {
  const { session, user, isLoadingSession, isLoadingUser } = useAuth();
  const location = useLocation();

  if (isLoadingSession || (session && isLoadingUser)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user || !user.profile.activo) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-semibold">Cuenta inactiva</h1>
        <p className="text-sm text-muted-foreground">
          Tu usuario existe pero esta inactivo o sin perfil asignado.
          Contacta al administrador.
        </p>
      </div>
    );
  }

  if (requierePermiso) {
    const claves = Array.isArray(requierePermiso)
      ? requierePermiso
      : [requierePermiso];
    const tiene =
      user.esAdmin || claves.some((c) => user.permisos.includes(c));
    if (!tiene) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
