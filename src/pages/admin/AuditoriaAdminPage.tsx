import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FilePlus,
  Filter,
  MessageSquare,
  PencilLine,
  RefreshCcw,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatoFecha } from "@/lib/formato";
import { useDependencias } from "@/lib/queries/dependencias";
import {
  useAuditoria,
  type AuditoriaFiltros,
} from "@/lib/queries/admin/auditoria";
import type { TipoEventoDocumento } from "@/lib/types";

const TIPOS_EVENTO: {
  value: TipoEventoDocumento;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: "creado", label: "Creado", icon: FilePlus, color: "text-muted-foreground" },
  { value: "enviado", label: "Enviado", icon: Send, color: "text-blue-600" },
  { value: "visto", label: "Visto", icon: Eye, color: "text-slate-600" },
  { value: "descargado", label: "Descargado", icon: Download, color: "text-slate-600" },
  { value: "aprobado", label: "Aprobado", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "rechazado", label: "Rechazado", icon: XCircle, color: "text-red-600" },
  { value: "comentado", label: "Comentado", icon: MessageSquare, color: "text-violet-600" },
  { value: "editado", label: "Editado", icon: PencilLine, color: "text-amber-600" },
  { value: "version_nueva", label: "Nueva version", icon: RefreshCcw, color: "text-indigo-600" },
  { value: "archivado", label: "Archivado", icon: Archive, color: "text-slate-600" },
];

const TIPO_CONFIG = Object.fromEntries(
  TIPOS_EVENTO.map((t) => [t.value, t]),
) as Record<TipoEventoDocumento, (typeof TIPOS_EVENTO)[number]>;

export function AuditoriaAdminPage() {
  const { data: dependencias = [] } = useDependencias();
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({});

  const filtrosLimpios = useMemo<AuditoriaFiltros>(
    () => ({
      dependenciaId: filtros.dependenciaId || undefined,
      tipoEvento: filtros.tipoEvento || undefined,
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      limite: 200,
    }),
    [filtros],
  );

  const { data: eventos = [], isLoading, error, refetch } =
    useAuditoria(filtrosLimpios);

  const limpiarFiltros = () => setFiltros({});

  const hayFiltros = Boolean(
    filtros.dependenciaId || filtros.tipoEvento || filtros.desde || filtros.hasta,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Historial global de eventos del sistema (ultimos 200 registros con
            filtros).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="h-4 w-4" />
          Recargar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-2">
              <Label>Dependencia origen</Label>
              <Select
                value={filtros.dependenciaId ?? "todas"}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    dependenciaId: v === "todas" ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {dependencias.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de evento</Label>
              <Select
                value={filtros.tipoEvento ?? "todos"}
                onValueChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    tipoEvento:
                      v === "todos" ? undefined : (v as TipoEventoDocumento),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPOS_EVENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="datetime-local"
                value={filtros.desde ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, desde: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="datetime-local"
                value={filtros.hasta ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, hasta: e.target.value }))
                }
              />
            </div>

            <Button
              variant="outline"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>
            {eventos.length}{" "}
            {eventos.length === 1 ? "evento" : "eventos"} encontrados
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
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay eventos que coincidan con los filtros.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((e) => {
                  const cfg = TIPO_CONFIG[e.tipo_evento];
                  const Icon = cfg?.icon ?? ClipboardList;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatoFecha(e.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1"
                        >
                          <Icon
                            className={cn("h-3 w-3", cfg?.color ?? "")}
                          />
                          {cfg?.label ?? e.tipo_evento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.usuario?.nombre_completo ?? "Sistema"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.documento ? (
                          <Link
                            to={`/documentos/${e.documento.id}`}
                            className="hover:underline"
                          >
                            {e.documento.titulo}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {Object.keys(e.metadata).length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <code className="line-clamp-2 text-xs text-muted-foreground">
                            {JSON.stringify(e.metadata)}
                          </code>
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
