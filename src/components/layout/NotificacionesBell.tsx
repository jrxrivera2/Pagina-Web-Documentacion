import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Placeholder: el contenido real (lista + realtime) llega en la Fase 5.
 * Por ahora solo muestra la campanita sin contador.
 */
export function NotificacionesBell() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Notificaciones"
      title="Notificaciones (proximamente)"
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}
