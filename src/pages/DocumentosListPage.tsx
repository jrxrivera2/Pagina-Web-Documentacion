import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Paperclip, Plus, Send, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Can } from "@/components/auth/Can";
import { EstadoDocumentoBadge } from "@/components/documentos/EstadoBadge";
import {
  EstadoCasoBadge,
  EstadoSolucionBadge,
} from "@/components/documentos/EstadoCasoBadge";
import { useAuth } from "@/hooks/useAuth";
import { useMisDocumentos } from "@/lib/queries/documentos";
import { calcularResumenCaso } from "@/lib/estado-caso";
import { fechaRelativa } from "@/lib/formato";
import type { EstadoDocumento, EstadoRecepcion } from "@/lib/types";

const FILTROS: { value: EstadoDocumento | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borradores" },
  { value: "enviado", label: "Enviados" },
  { value: "en_revision", label: "En revision" },
  { value: "aprobado", label: "Aprobados" },
  { value: "rechazado", label: "Rechazados" },
  { value: "archivado", label: "Archivados" },
];

export function DocumentosListPage() {
  const { user } = useAuth();
  const { data: documentos = [], isLoading, error } = useMisDocumentos(
    user?.profile.id,
  );
  const [filtro, setFiltro] = useState<EstadoDocumento | "todos">("todos");

  const filtrados = useMemo(
    () =>
      filtro === "todos"
        ? documentos
        : documentos.filter((d) => d.estado === filtro),
    [documentos, filtro],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis documentos</h1>
          <p className="text-sm text-muted-foreground">
            Documentos que tu has creado.
          </p>
        </div>
        <Can permiso="documentos.crear">
          <Button asChild>
            <Link to="/documentos/nuevo">
              <Plus className="h-4 w-4" /> Nuevo documento
            </Link>
          </Button>
        </Can>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Listado</CardTitle>
              <CardDescription>
                {filtrados.length}{" "}
                {filtrados.length === 1 ? "documento" : "documentos"}
              </CardDescription>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTROS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes documentos {filtro === "todos" ? "" : `en estado ${filtro}`}.
              </p>
              <Can permiso="documentos.crear">
                <Button asChild size="sm">
                  <Link to="/documentos/nuevo">
                    <Plus className="h-4 w-4" /> Crear el primero
                  </Link>
                </Button>
              </Can>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Caso</TableHead>
                  <TableHead>Solucion</TableHead>
                  <TableHead className="text-center">Archivos</TableHead>
                  <TableHead className="text-center">Destinatarios</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((doc) => {
                  const resumen = calcularResumenCaso(
                    doc.estado,
                    doc.estado_caso ?? "abierto",
                    doc.destinatarios_estados.map((d) => ({
                      estado_recepcion:
                        d.estado_recepcion as EstadoRecepcion,
                    })),
                  );
                  return (
                  <TableRow key={doc.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        to={`/documentos/${doc.id}`}
                        className="font-medium hover:underline"
                      >
                        {doc.titulo}
                      </Link>
                      {doc.dependencia_origen && (
                        <p className="text-xs text-muted-foreground">
                          desde {doc.dependencia_origen.nombre}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{doc.tipo}</TableCell>
                    <TableCell>
                      <EstadoDocumentoBadge estado={doc.estado} />
                    </TableCell>
                    <TableCell>
                      <EstadoCasoBadge
                        etiqueta={resumen.etiquetaCaso}
                        estado={
                          doc.estado === "borrador"
                            ? "borrador"
                            : resumen.estadoCaso
                        }
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
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {doc.destinatarios_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.estado === "borrador" ? (
                        <span>Borrador</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {fechaRelativa(doc.fecha_envio ?? doc.updated_at)}
                        </span>
                      )}
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
