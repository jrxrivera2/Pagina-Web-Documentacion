import {
  Archive,
  CheckCircle2,
  Download,
  Eye,
  FilePlus,
  History,
  MessageSquare,
  PencilLine,
  RefreshCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fechaRelativa, formatoFecha } from "@/lib/formato";
import { useDocumentoEventos } from "@/lib/queries/documentos";
import type { TipoEventoDocumento } from "@/lib/types";

interface EventoConfig {
  icon: LucideIcon;
  texto: string;
  color: string;
  bg: string;
}

const CONFIG: Record<TipoEventoDocumento, EventoConfig> = {
  creado: {
    icon: FilePlus,
    texto: "creo el documento",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  enviado: {
    icon: Send,
    texto: "envio el documento",
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  visto: {
    icon: Eye,
    texto: "vio el documento",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  descargado: {
    icon: Download,
    texto: "descargo un archivo",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  aprobado: {
    icon: CheckCircle2,
    texto: "aprobo el documento",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  rechazado: {
    icon: XCircle,
    texto: "rechazo el documento",
    color: "text-red-600",
    bg: "bg-red-100",
  },
  comentado: {
    icon: MessageSquare,
    texto: "agrego un comentario",
    color: "text-violet-600",
    bg: "bg-violet-100",
  },
  editado: {
    icon: PencilLine,
    texto: "actualizo el estado del caso",
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  version_nueva: {
    icon: RefreshCcw,
    texto: "creo una nueva version",
    color: "text-indigo-600",
    bg: "bg-indigo-100",
  },
  archivado: {
    icon: Archive,
    texto: "archivo el documento",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
};

function descripcionExtra(
  tipo: TipoEventoDocumento,
  metadata: Record<string, unknown>,
): string | null {
  if (tipo === "version_nueva" && metadata.version_nueva) {
    return `v${metadata.version_anterior} -> v${metadata.version_nueva}`;
  }
  if (tipo === "enviado" && metadata.version) {
    return `version ${metadata.version}`;
  }
  if (
    (tipo === "aprobado" || tipo === "rechazado") &&
    typeof metadata.comentario === "string" &&
    metadata.comentario.length > 0
  ) {
    return `"${metadata.comentario}"`;
  }
  if (tipo === "descargado" && typeof metadata.nombre_archivo === "string") {
    return metadata.nombre_archivo;
  }
  if (tipo === "visto") {
    return "Documento abierto en la plataforma";
  }
  if (
    tipo === "editado" &&
    metadata.accion === "estado_caso" &&
    typeof metadata.estado_caso_nuevo === "string"
  ) {
    const labels: Record<string, string> = {
      abierto: "Abierto",
      cerrado: "Cerrado",
      en_seguimiento: "En seguimiento",
    };
    const nuevo = labels[metadata.estado_caso_nuevo as string] ?? metadata.estado_caso_nuevo;
    const anterior =
      typeof metadata.estado_caso_anterior === "string"
        ? labels[metadata.estado_caso_anterior] ?? metadata.estado_caso_anterior
        : null;
    return anterior ? `${anterior} → ${nuevo}` : nuevo;
  }
  return null;
}

export function LineaTrazabilidad({ documentoId }: { documentoId: string }) {
  const { data: eventos = [], isLoading, error } = useDocumentoEventos(documentoId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Trazabilidad</CardTitle>
            <CardDescription>
              Aperturas, descargas, comentarios y respuestas registradas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin eventos registrados.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-muted pl-6">
            {eventos.map((evento) => {
              const cfg = CONFIG[evento.tipo_evento];
              const Icon = cfg.icon;
              const extra = descripcionExtra(evento.tipo_evento, evento.metadata);
              return (
                <li key={evento.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full",
                      cfg.bg,
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                  </span>
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">
                        {evento.usuario?.nombre_completo ?? "Sistema"}
                      </span>{" "}
                      <span className="text-muted-foreground">{cfg.texto}</span>
                    </p>
                    {extra && (
                      <p className="text-xs italic text-muted-foreground">
                        {extra}
                      </p>
                    )}
                    <p
                      className="text-xs text-muted-foreground"
                      title={formatoFecha(evento.created_at)}
                    >
                      {fechaRelativa(evento.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
