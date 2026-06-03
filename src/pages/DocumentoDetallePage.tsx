import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FileText,
  Loader2,
  Send,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  EstadoDocumentoBadge,
  EstadoRecepcionBadge,
} from "@/components/documentos/EstadoBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  getUrlDescarga,
  useDocumento,
  useEnviarDocumento,
} from "@/lib/queries/documentos";
import { formatoFecha, formatoTamano } from "@/lib/formato";

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: doc, isLoading, error } = useDocumento(id);
  const enviarMutation = useEnviarDocumento();
  const [descargando, setDescargando] = useState<string | null>(null);

  const handleDescargar = async (storagePath: string, nombre: string) => {
    setDescargando(storagePath);
    try {
      const url = await getUrlDescarga(storagePath);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombre;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo descargar el archivo";
      toast.error(mensaje);
    } finally {
      setDescargando(null);
    }
  };

  const handleEnviar = async () => {
    if (!doc) return;
    try {
      await enviarMutation.mutateAsync(doc.id);
      toast.success("Documento enviado");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo enviar";
      toast.error(mensaje);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-destructive">
          {error
            ? (error as Error).message
            : "No se encontro el documento o no tienes acceso"}
        </p>
        <Button asChild variant="outline">
          <Link to="/documentos">Volver</Link>
        </Button>
      </div>
    );
  }

  const esCreador = user?.profile.id === doc.creado_por;
  const puedeEnviar = esCreador && doc.estado === "borrador";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{doc.titulo}</h1>
              <EstadoDocumentoBadge estado={doc.estado} />
            </div>
            <p className="text-sm capitalize text-muted-foreground">
              {doc.tipo} - version {doc.version}
            </p>
          </div>
        </div>

        {puedeEnviar && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4" /> Enviar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enviar documento</AlertDialogTitle>
                <AlertDialogDescription>
                  Una vez enviado, los destinatarios podran verlo y recibiran
                  notificaciones. El documento ya no podra borrarse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEnviar}
                  disabled={enviarMutation.isPending}
                >
                  {enviarMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Enviar ahora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {doc.descripcion ? (
              <p className="whitespace-pre-wrap text-sm">{doc.descripcion}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin descripcion.</p>
            )}

            <Separator />

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Origen</dt>
                  <dd>{doc.dependencia_origen?.nombre ?? "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Creado por</dt>
                  <dd>{doc.creador?.nombre_completo ?? "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Creado</dt>
                  <dd>{formatoFecha(doc.created_at)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Send className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Enviado</dt>
                  <dd>{doc.fecha_envio ? formatoFecha(doc.fecha_envio) : "No enviado"}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destinatarios</CardTitle>
            <CardDescription>
              {doc.destinatarios.length}{" "}
              {doc.destinatarios.length === 1 ? "destinatario" : "destinatarios"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {doc.destinatarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin destinatarios asignados.
              </p>
            ) : (
              <ul className="space-y-3">
                {doc.destinatarios.map((d) => (
                  <li key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {d.dependencia?.nombre ?? "—"}
                      </p>
                      <EstadoRecepcionBadge estado={d.estado_recepcion} />
                    </div>
                    {d.usuario && (
                      <p className="text-xs text-muted-foreground">
                        {d.usuario.nombre_completo}
                      </p>
                    )}
                    {d.fecha_visto && (
                      <p className="text-xs text-muted-foreground">
                        Visto: {formatoFecha(d.fecha_visto)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archivos adjuntos</CardTitle>
          <CardDescription>
            {doc.archivos.length}{" "}
            {doc.archivos.length === 1 ? "archivo" : "archivos"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doc.archivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este documento no tiene archivos adjuntos.
            </p>
          ) : (
            <ul className="divide-y">
              {doc.archivos.map((archivo) => (
                <li
                  key={archivo.id}
                  className="flex items-center gap-3 py-3"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {archivo.nombre_archivo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatoTamano(archivo.tamano)} - v{archivo.version} -{" "}
                      {formatoFecha(archivo.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDescargar(archivo.storage_path, archivo.nombre_archivo)
                    }
                    disabled={descargando === archivo.storage_path}
                  >
                    {descargando === archivo.storage_path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Descargar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad</CardTitle>
          <CardDescription>
            Historial de eventos del documento (proximamente en Fase 4).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La linea de tiempo con todos los eventos, comentarios y aprobaciones
            llega en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
