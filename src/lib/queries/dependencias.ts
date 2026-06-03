import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Dependencia } from "@/lib/types";

export const dependenciasKeys = {
  all: ["dependencias"] as const,
  list: () => [...dependenciasKeys.all, "list"] as const,
};

export function useDependencias() {
  return useQuery({
    queryKey: dependenciasKeys.list(),
    queryFn: async (): Promise<Dependencia[]> => {
      const { data, error } = await supabase
        .from("dependencias")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}
