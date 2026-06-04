import { Badge } from "@/components/ui/badge";
import type { EstadoCasoManual } from "@/lib/types";
import type { EstadoSolucion } from "@/lib/estado-caso";

const VARIANTE_CASO: Record<
  EstadoCasoManual | "borrador",
  NonNullable<Parameters<typeof Badge>[0]["variant"]>
> = {
  borrador: "secondary",
  abierto: "warning",
  cerrado: "outline",
  en_seguimiento: "default",
};

const VARIANTE_SOLUCION: Record<
  EstadoSolucion,
  NonNullable<Parameters<typeof Badge>[0]["variant"]>
> = {
  pendiente: "outline",
  parcial: "warning",
  aprobado: "success",
  rechazado: "destructive",
  mixto: "default",
  no_aplica: "secondary",
};

export function EstadoCasoBadge({
  etiqueta,
  estado,
}: {
  etiqueta: string;
  estado: EstadoCasoManual | "borrador";
}) {
  return <Badge variant={VARIANTE_CASO[estado]}>{etiqueta}</Badge>;
}

export function EstadoSolucionBadge({
  etiqueta,
  solucion,
}: {
  etiqueta: string;
  solucion: EstadoSolucion;
}) {
  return <Badge variant={VARIANTE_SOLUCION[solucion]}>{etiqueta}</Badge>;
}
