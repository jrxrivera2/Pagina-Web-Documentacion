import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fechaRelativa } from "@/lib/formato";
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
} from "@/lib/queries/notificaciones";
import type { Notificacion } from "@/lib/types";

interface Props {
  notificaciones: Notificacion[];
  userId: string | undefined;
}

export function BandejaNotificacionesAlert({ notificaciones, userId }: Props) {
  const marcarLeida = useMarcarLeida(userId);
  const marcarTodas = useMarcarTodasLeidas(userId);

  if (notificaciones.length === 0) return null;

  const handleMarcarTodas = async () => {
    try {
      await marcarTodas.mutateAsync();
      toast.success("Notificaciones marcadas como leidas");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudieron marcar",
      );
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                Tienes {notificaciones.length} notificacion
                {notificaciones.length === 1 ? "" : "es"} nueva
                {notificaciones.length === 1 ? "" : "s"}
              </CardTitle>
              <CardDescription>
                Documentos recibidos, respuestas o cambios de estado de caso.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarcarTodas}
            disabled={marcarTodas.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas leidas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {notificaciones.slice(0, 8).map((n) => (
            <li key={n.id}>
              <NotificacionItem
                notificacion={n}
                onMarcarLeida={() => marcarLeida.mutateAsync(n.id)}
              />
            </li>
          ))}
        </ul>
        {notificaciones.length > 8 && (
          <p className="mt-2 text-xs text-muted-foreground">
            y {notificaciones.length - 8} mas en la campana del menu superior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NotificacionItem({
  notificacion: n,
  onMarcarLeida,
}: {
  notificacion: Notificacion;
  onMarcarLeida: () => Promise<void>;
}) {
  const contenido = (
    <>
      <p className="text-sm font-medium">{n.mensaje}</p>
      <p className="text-xs text-muted-foreground">
        {fechaRelativa(n.created_at)}
      </p>
    </>
  );

  if (n.documento_id) {
    return (
      <Link
        to={`/documentos/${n.documento_id}`}
        onClick={() => onMarcarLeida().catch(() => {})}
        className="block rounded-md border bg-background p-3 transition-colors hover:bg-accent"
      >
        {contenido}
      </Link>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3">{contenido}</div>
  );
}
