import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Rol } from "@/lib/types";

export const rolesKeys = {
  all: ["roles"] as const,
  list: () => [...rolesKeys.all, "list"] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: async (): Promise<Rol[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("nombre");
      if (error) throw new Error(error.message);
      return (data ?? []) as Rol[];
    },
  });
}
