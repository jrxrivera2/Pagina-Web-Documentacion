import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  MessageSquare,
} from "lucide-react";

import {
  EstadoCasoBadge,
  EstadoSolucionBadge,
} from "@/components/documentos/EstadoCasoBadge";
import { SelectorEstadoCaso } from "@/components/documentos/SelectorEstadoCaso";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calcularResumenCaso,
  calcularResumenDestinatario,
  contarEventos,
} from "@/lib/estado-caso";
import { useDocumentoEventos } from "@/lib/queries/documentos";
import type { DocumentoDestinatarioFull } from "@/lib/queries/documentos";
import type { EstadoCasoManual, EstadoDocumento } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  documentoId: string;
  estado: EstadoDocumento;
  estadoCaso: EstadoCasoManual;
  destinatarios: DocumentoDestinatarioFull[];
  puedeEditarEstadoCaso: boolean;
}

export function ResumenCasoDocumento({
  documentoId,
  estado,
  estadoCaso,
  destinatarios,
  puedeEditarEstadoCaso,
}: Props) {
  const { data: eventos = [], isLoading } = useDocumentoEventos(documentoId);

  const resumen = calcularResumenCaso(estado, estadoCaso, destinatarios);
  const stats = contarEventos(eventos);

  const respondidos = destinatarios.filter((d) =>
    ["aprobado", "rechazado"].includes(d.estado_recepcion),
  ).length;
  const progreso =
    destinatarios.length > 0
      ? Math.round((respondidos / destinatarios.length) * 100)
      : 0;

  const casoBadgeEstado =
    estado === "borrador" ? ("borrador" as const) : resumen.estadoCaso;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del caso</CardTitle>
        <CardDescription>
          Marca el expediente como abierto, en seguimiento o cerrado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SelectorEstadoCaso
          documentoId={documentoId}
          estadoCaso={estadoCaso}
          puedeEditar={puedeEditarEstadoCaso && estado !== "borrador"}
        />

        <div className="flex flex-wrap gap-2">
          <EstadoCasoBadge
            etiqueta={resumen.etiquetaCaso}
            estado={casoBadgeEstado}
          />
          <EstadoSolucionBadge
            etiqueta={resumen.etiquetaSolucion}
            solucion={resumen.solucion}
          />
        </div>
        <p className="text-sm text-muted-foreground">{resumen.descripcion}</p>

        {destinatarios.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Respuestas de destinatarios</span>
              <span>
                {respondidos}/{destinatarios.length} ({progreso}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progreso === 100
                    ? "bg-emerald-500"
                    : progreso > 0
                      ? "bg-amber-500"
                      : "bg-muted-foreground/30",
                )}
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatMini icon={Eye} label="Vistas" value={stats.vistas} />
            <StatMini icon={Download} label="Descargas" value={stats.descargas} />
            <StatMini
              icon={MessageSquare}
              label="Comentarios"
              value={stats.comentarios}
            />
            <StatMini
              icon={CheckCircle2}
              label="Respuestas"
              value={stats.respuestas}
            />
          </div>
        )}

        {destinatarios.length > 0 && (
          <ul className="space-y-2 border-t pt-3">
            {destinatarios.map((d) => {
              const r = calcularResumenDestinatario(d.estado_recepcion);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium">
                    {d.dependencia?.nombre ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      r.conSolucion
                        ? "text-emerald-600"
                        : r.abierto
                          ? "text-amber-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {r.etiqueta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <FileCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Abierto:</strong> pendiente de accion.{" "}
            <strong>En seguimiento:</strong> gestion activa.{" "}
            <strong>Cerrado:</strong> asunto resuelto. Los cambios generan
            notificacion en la bandeja.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
