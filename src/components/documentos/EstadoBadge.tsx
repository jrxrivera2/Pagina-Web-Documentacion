import { Badge } from "@/components/ui/badge";
import type { EstadoDocumento, EstadoRecepcion } from "@/lib/types";

const ETIQUETAS_DOC: Record<EstadoDocumento, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  en_revision: "En revision",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  archivado: "Archivado",
};

const VARIANTES_DOC: Record<EstadoDocumento, Parameters<typeof Badge>[0]["variant"]> = {
  borrador: "secondary",
  enviado: "default",
  en_revision: "warning",
  aprobado: "success",
  rechazado: "destructive",
  archivado: "outline",
};

export function EstadoDocumentoBadge({ estado }: { estado: EstadoDocumento }) {
  return (
    <Badge variant={VARIANTES_DOC[estado]}>
      {ETIQUETAS_DOC[estado] ?? estado}
    </Badge>
  );
}

const ETIQUETAS_REC: Record<EstadoRecepcion, string> = {
  pendiente: "Pendiente",
  recibido: "Recibido",
  visto: "Visto",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const VARIANTES_REC: Record<EstadoRecepcion, Parameters<typeof Badge>[0]["variant"]> = {
  pendiente: "outline",
  recibido: "secondary",
  visto: "default",
  aprobado: "success",
  rechazado: "destructive",
};

export function EstadoRecepcionBadge({ estado }: { estado: EstadoRecepcion }) {
  return (
    <Badge variant={VARIANTES_REC[estado]}>
      {ETIQUETAS_REC[estado] ?? estado}
    </Badge>
  );
}
