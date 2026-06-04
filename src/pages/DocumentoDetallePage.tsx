import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCcw,
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

import { AccionesRespuesta } from "@/components/documentos/AccionesRespuesta";
import {
  EstadoDocumentoBadge,
  EstadoRecepcionBadge,
} from "@/components/documentos/EstadoBadge";
import { LineaTrazabilidad } from "@/components/documentos/LineaTrazabilidad";
import { ResumenCasoDocumento } from "@/components/documentos/ResumenCasoDocumento";
import { SeccionComentarios } from "@/components/documentos/SeccionComentarios";
import { SubirArchivosDialog } from "@/components/documentos/SubirArchivosDialog";

import { useAuth } from "@/hooks/useAuth";
import {
  getUrlDescarga,
  useDocumento,
  useEnviarDocumento,
  useMarcarVisto,
  useNuevaVersion,
  useRegistrarDescarga,
} from "@/lib/queries/documentos";
import { calcularResumenDestinatario } from "@/lib/estado-caso";
import { formatoFecha, formatoTamano } from "@/lib/formato";
import type { EstadoRecepcion } from "@/lib/types";

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: doc, isLoading, error } = useDocumento(id);
  const enviarMutation = useEnviarDocumento();
  const nuevaVersionMutation = useNuevaVersion(id ?? "");
  const marcarVistoMutation = useMarcarVisto(id);
  const registrarDescargaMutation = useRegistrarDescarga(id ?? "");
  const [descargando, setDescargando] = useState<string | null>(null);
  const vistoRegistrado = useRef<string | null>(null);

  const misDependenciasIds = useMemo(
    () => new Set(user?.dependencias.map((d) => d.dependencia.id) ?? []),
    [user],
  );

  const esCreador = user && doc ? user.profile.id === doc.creado_por : false;

  const miRecepcion = useMemo(() => {
    if (!doc || !user) return undefined;
    return doc.destinatarios.find(
      (d) =>
        d.usuario_id === user.profile.id ||
        (d.usuario_id === null && misDependenciasIds.has(d.dependencia_id)),
    );
  }, [doc, user, misDependenciasIds]);

  const soyDestinatario = Boolean(miRecepcion);

  useEffect(() => {
    if (!doc || !user) return;
    if (esCreador) return;
    if (!soyDestinatario) return;
    if (doc.estado === "borrador") return;
    if (vistoRegistrado.current === doc.id) return;
    vistoRegistrado.current = doc.id;
    marcarVistoMutation.mutate();
    // marcarVistoMutation reference is stable enough; only re-run when doc.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, user?.profile.id, esCreador, soyDestinatario, doc?.estado]);

  const handleDescargar = async (
    archivoId: string,
    storagePath: string,
    nombre: string,
  ) => {
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
      if (id) {
        await registrarDescargaMutation.mutateAsync({
          archivoId,
          nombreArchivo: nombre,
        });
      }
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
      const mensaje = err instanceof Error ? err.message : "No se pudo enviar";
      toast.error(mensaje);
    }
  };

  const handleNuevaVersion = async () => {
    try {
      const nueva = await nuevaVersionMutation.mutateAsync();
      toast.success(`Nueva version v${nueva}. Ahora sube los archivos y enviala.`);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo crear la nueva version";
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

  if (error || !doc || !user) {
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

  const puedeEnviar = esCreador && doc.estado === "borrador";
  const puedeNuevaVersion =
    esCreador && (doc.estado === "rechazado" || doc.estado === "aprobado");
  const puedeAgregarArchivos = esCreador && doc.estado === "borrador";
  const puedeResponder =
    soyDestinatario &&
    !esCreador &&
    (doc.estado === "enviado" || doc.estado === "en_revision");

  const puedeEditarEstadoCaso =
    doc.estado !== "borrador" &&
    (esCreador || soyDestinatario || user.esAdmin);

  const estadoCaso = doc.estado_caso ?? "abierto";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

        <div className="flex flex-wrap gap-2">
          {puedeAgregarArchivos && (
            <SubirArchivosDialog
              documentoId={doc.id}
              version={doc.version}
              usuarioId={user.profile.id}
              titulo="Agregar archivos al borrador"
              trigger={
                <Button variant="outline">
                  <FilePlus2 className="h-4 w-4" />
                  Agregar archivos
                </Button>
              }
            />
          )}

          {puedeNuevaVersion && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCcw className="h-4 w-4" />
                  Nueva version
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Crear nueva version</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se creara la version {doc.version + 1} y el documento
                    volvera a estado borrador. Los destinatarios deberan
                    revisar el documento nuevamente cuando lo envies.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleNuevaVersion}
                    disabled={nuevaVersionMutation.isPending}
                  >
                    {nuevaVersionMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Crear version {doc.version + 1}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

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
                    notificaciones.
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
      </div>

      <ResumenCasoDocumento
        documentoId={doc.id}
        estado={doc.estado}
        estadoCaso={estadoCaso}
        destinatarios={doc.destinatarios}
        puedeEditarEstadoCaso={puedeEditarEstadoCaso}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
                  <dd>
                    {doc.fecha_envio ? formatoFecha(doc.fecha_envio) : "No enviado"}
                  </dd>
                </div>
              </div>
            </dl>

            {puedeResponder && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tu respuesta</p>
                  <AccionesRespuesta
                    documentoId={doc.id}
                    miEstadoRecepcion={miRecepcion?.estado_recepcion as EstadoRecepcion | undefined}
                  />
                </div>
              </>
            )}
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
                {doc.destinatarios.map((d) => {
                  const resumenDest = calcularResumenDestinatario(
                    d.estado_recepcion,
                  );
                  return (
                  <li key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {d.dependencia?.nombre ?? "—"}
                      </p>
                      <EstadoRecepcionBadge estado={d.estado_recepcion} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {resumenDest.etiqueta}
                    </p>
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
                    {d.fecha_respuesta && (
                      <p className="text-xs text-muted-foreground">
                        Respondido: {formatoFecha(d.fecha_respuesta)}
                      </p>
                    )}
                  </li>
                  );
                })}
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
            {doc.archivos.length === 1 ? "archivo" : "archivos"} en total
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
                <li key={archivo.id} className="flex items-center gap-3 py-3">
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
                      handleDescargar(
                        archivo.id,
                        archivo.storage_path,
                        archivo.nombre_archivo,
                      )
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

      <div className="grid gap-6 lg:grid-cols-2">
        <LineaTrazabilidad documentoId={doc.id} />
        <SeccionComentarios documentoId={doc.id} />
      </div>
    </div>
  );
}
