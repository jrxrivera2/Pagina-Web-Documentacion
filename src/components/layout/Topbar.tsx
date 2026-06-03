import { FileText } from "lucide-react";

import { NotificacionesBell } from "@/components/layout/NotificacionesBell";
import { UserMenu } from "@/components/layout/UserMenu";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <FileText className="h-5 w-5 text-primary" />
        <span className="font-semibold">Intercambio Doc.</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <NotificacionesBell />
        <UserMenu />
      </div>
    </header>
  );
}
