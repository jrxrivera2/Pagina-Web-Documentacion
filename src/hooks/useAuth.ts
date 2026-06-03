import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "@/components/auth/AuthProvider";

/**
 * Devuelve la sesion completa: session de Supabase + perfil + dependencias +
 * permisos + acciones (signIn, signOut). Lanza si se usa fuera del Provider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
