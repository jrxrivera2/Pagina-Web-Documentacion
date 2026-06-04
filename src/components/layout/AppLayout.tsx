import { Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useNotificacionesRealtime } from "@/lib/queries/notificaciones";

/** Mantiene una unica suscripcion Realtime de notificaciones por sesion. */
function NotificacionesRealtimeBridge() {
  const { user } = useAuth();
  useNotificacionesRealtime(user?.profile.id);
  return null;
}

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <NotificacionesRealtimeBridge />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
