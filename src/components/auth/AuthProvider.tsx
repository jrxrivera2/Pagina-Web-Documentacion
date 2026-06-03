import { createContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  ClavePermiso,
  Profile,
  SesionUsuario,
  UsuarioDependenciaFull,
} from "@/lib/types";

export interface AuthContextValue {
  session: Session | null;
  user: SesionUsuario | null;
  isLoadingSession: boolean;
  isLoadingUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

const SESSION_QUERY_KEY = ["auth", "session"] as const;
const USER_QUERY_KEY = ["auth", "user"] as const;

async function fetchSesionUsuario(userId: string): Promise<SesionUsuario> {
  const { data: profile, error: errProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (errProfile) {
    throw new Error(`No se pudo cargar el perfil: ${errProfile.message}`);
  }

  const { data: dependencias, error: errDeps } = await supabase
    .from("usuarios_dependencias")
    .select(
      "id, usuario_id, dependencia_id, rol_id, es_principal, created_at, " +
        "dependencia:dependencias(id, nombre, activo), rol:roles(id, nombre)",
    )
    .eq("usuario_id", userId);

  if (errDeps) {
    throw new Error(
      `No se pudieron cargar las dependencias: ${errDeps.message}`,
    );
  }

  const dependenciasFull = (dependencias ?? []) as unknown as UsuarioDependenciaFull[];
  const rolIds = dependenciasFull.map((d) => d.rol_id);

  let permisos: ClavePermiso[] = [];
  if (rolIds.length > 0) {
    const { data: permisosData, error: errPerms } = await supabase
      .from("roles_permisos")
      .select("permiso:permisos(clave)")
      .in("rol_id", rolIds);

    if (errPerms) {
      throw new Error(
        `No se pudieron cargar los permisos: ${errPerms.message}`,
      );
    }

    type PermisoRow = {
      permiso: { clave: string } | { clave: string }[] | null;
    };
    const claves = ((permisosData ?? []) as unknown as PermisoRow[])
      .flatMap((row) => {
        if (!row.permiso) return [];
        return Array.isArray(row.permiso)
          ? row.permiso.map((p) => p.clave)
          : [row.permiso.clave];
      })
      .filter((c): c is string => Boolean(c));
    permisos = Array.from(new Set(claves));
  }

  const esAdmin = dependenciasFull.some((d) => d.rol?.nombre === "administrador");

  return { profile, dependencias: dependenciasFull, permisos, esAdmin };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoadingSession(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const userQuery = useQuery({
    queryKey: [...USER_QUERY_KEY, userId],
    queryFn: () => fetchSesionUsuario(userId as string),
    enabled: Boolean(userId),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: userQuery.data ?? null,
      isLoadingSession,
      isLoadingUser: Boolean(userId) && userQuery.isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        queryClient.clear();
      },
    }),
    [session, userQuery.data, userQuery.isLoading, isLoadingSession, userId, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
