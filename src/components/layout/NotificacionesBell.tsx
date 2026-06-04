import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FilePlus2,
  MessageSquare,
  PencilLine,
  Send,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { fechaRelativa, formatoFecha } from "@/lib/formato";
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
  useNotificacionesRealtime,
} from "@/lib/queries/notificaciones";
import type { Notificacion } from "@/lib/types";

interface TipoConfig {
  icon: LucideIcon;
  color: string;
}

const TIPOS: Record<string, TipoConfig> = {
  documento_recibido: { icon: Send, color: "text-blue-600" },
  documento_respondido: { icon: CheckCheck, color: "text-emerald-600" },
  documento_comentado: { icon: MessageSquare, color: "text-violet-600" },
  documento_aprobado: { icon: CheckCircle2, color: "text-emerald-600" },
  documento_rechazado: { icon: XCircle, color: "text-red-600" },
  documento_version: { icon: FilePlus2, color: "text-indigo-600" },
  estado_caso_actualizado: { icon: PencilLine, color: "text-amber-600" },
};

function configDe(tipo: string): TipoConfig {
  return TIPOS[tipo] ?? { icon: Bell, color: "text-muted-foreground" };
}

export function NotificacionesBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.profile.id;

  const [abierto, setAbierto] = useState(false);

  const { data: notificaciones = [], isLoading } = useNotificaciones(userId);
  const marcarLeida = useMarcarLeida(userId);
  const marcarTodas = useMarcarTodasLeidas(userId);

  const handleNueva = useCallback((n: Notificacion) => {
    toast.info(n.mensaje, {
      description: "Nueva notificacion",
      action: n.documento_id
        ? {
            label: "Ver",
            onClick: () => navigate(`/documentos/${n.documento_id}`),
          }
        : undefined,
    });
  }, [navigate]);

  useNotificacionesRealtime(userId, handleNueva);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  const irANotificacion = async (n: Notificacion) => {
    setAbierto(false);
    if (!n.leida) {
      try {
        await marcarLeida.mutateAsync(n.id);
      } catch (err) {
        // Silencioso: no bloqueamos navegacion por un fallo de marcar leida
        console.warn("No se pudo marcar como leida:", err);
      }
    }
    if (n.documento_id) {
      navigate(`/documentos/${n.documento_id}`);
    }
  };

  const handleMarcarTodas = async () => {
    if (noLeidas === 0) return;
    try {
      await marcarTodas.mutateAsync();
      toast.success("Todas las notificaciones marcadas como leidas");
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : "No se pudieron marcar como leidas";
      toast.error(mensaje);
    }
  };

  if (!userId) return null;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              {noLeidas === 0
                ? "Sin notificaciones nuevas"
                : `${noLeidas} sin leer`}
            </p>
          </div>
          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodas}
              disabled={marcarTodas.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas
            </Button>
          )}
        </div>
        <Separator />

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Cargando...
            </p>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes notificaciones por ahora.
              </p>
            </div>
          ) : (
            <ul>
              {notificaciones.map((n) => {
                const cfg = configDe(n.tipo);
                const Icon = cfg.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => irANotificacion(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-accent",
                        !n.leida && "bg-accent/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
                          cfg.color,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm",
                            !n.leida && "font-medium",
                          )}
                        >
                          {n.mensaje}
                        </p>
                        <p
                          className="mt-0.5 text-xs text-muted-foreground"
                          title={formatoFecha(n.created_at)}
                        >
                          {fechaRelativa(n.created_at)}
                        </p>
                      </div>
                      {!n.leida && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
