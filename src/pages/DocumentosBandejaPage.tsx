import { Link } from "react-router-dom";
import { Bell, Inbox, Paperclip } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BandejaNotificacionesAlert } from "@/components/documentos/BandejaNotificacionesAlert";
import { EstadoDocumentoBadge } from "@/components/documentos/EstadoBadge";
import {
  EstadoCasoBadge,
  EstadoSolucionBadge,
} from "@/components/documentos/EstadoCasoBadge";
import { useAuth } from "@/hooks/useAuth";
import { useBandeja } from "@/lib/queries/documentos";
import { calcularResumenCaso } from "@/lib/estado-caso";
import { fechaRelativa } from "@/lib/formato";
import { useNotificaciones } from "@/lib/queries/notificaciones";
import type { EstadoRecepcion } from "@/lib/types";

export function DocumentosBandejaPage() {
  const { user } = useAuth();
  const userId = user?.profile.id;
  const { data: documentos = [], isLoading, error } = useBandeja(userId);
  const { data: notificaciones = [] } = useNotificaciones(userId);

  const noLeidas = notificaciones.filter((n) => !n.leida);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bandeja</h1>
          <p className="text-sm text-muted-foreground">
            Documentos recibidos y notificaciones nuevas.
          </p>
        </div>
        {noLeidas.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
            <Bell className="h-4 w-4" />
            {noLeidas.length} notificacion{noLeidas.length === 1 ? "" : "es"}{" "}
            nueva{noLeidas.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <BandejaNotificacionesAlert
        notificaciones={noLeidas}
        userId={userId}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recibidos</CardTitle>
          <CardDescription>
            {documentos.length}{" "}
            {documentos.length === 1 ? "documento" : "documentos"} visibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No has recibido documentos todavia.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Caso</TableHead>
                  <TableHead>Solucion</TableHead>
                  <TableHead className="text-center">Archivos</TableHead>
                  <TableHead>Recibido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((doc) => {
                  const resumen = calcularResumenCaso(
                    doc.estado,
                    doc.estado_caso ?? "abierto",
                    doc.destinatarios_estados.map((d) => ({
                      estado_recepcion:
                        d.estado_recepcion as EstadoRecepcion,
                    })),
                  );
                  return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        to={`/documentos/${doc.id}`}
                        className="font-medium hover:underline"
                      >
                        {doc.titulo}
                      </Link>
                      {doc.descripcion && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {doc.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{doc.tipo}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {doc.dependencia_origen?.nombre ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.creador?.nombre_completo ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoDocumentoBadge estado={doc.estado} />
                    </TableCell>
                    <TableCell>
                      <EstadoCasoBadge
                        etiqueta={resumen.etiquetaCaso}
                        estado={resumen.estadoCaso}
                      />
                    </TableCell>
                    <TableCell>
                      <EstadoSolucionBadge
                        etiqueta={resumen.etiquetaSolucion}
                        solucion={resumen.solucion}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        {doc.archivos_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fechaRelativa(doc.fecha_envio ?? doc.created_at)}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
