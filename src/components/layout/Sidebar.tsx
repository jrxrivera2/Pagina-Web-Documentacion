import { NavLink } from "react-router-dom";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  Send,
  Settings,
  Users,
  Building2,
  ClipboardList,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Can } from "@/components/auth/Can";
import { useAuth } from "@/hooks/useAuth";
import { useNotificacionesNoLeidas } from "@/lib/queries/notificaciones";
import type { ClavePermiso } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof FileText;
  permiso?: ClavePermiso | ClavePermiso[];
  end?: boolean;
  badge?: number;
}

const navPrincipal: NavItem[] = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/documentos", label: "Mis documentos", icon: FileText },
  { to: "/documentos/bandeja", label: "Bandeja", icon: Inbox },
  {
    to: "/documentos/nuevo",
    label: "Nuevo documento",
    icon: Send,
    permiso: "documentos.crear",
  },
];

const navAdmin: NavItem[] = [
  {
    to: "/admin/usuarios",
    label: "Usuarios",
    icon: Users,
    permiso: "usuarios.gestionar",
  },
  {
    to: "/admin/dependencias",
    label: "Dependencias",
    icon: Building2,
    permiso: "dependencias.gestionar",
  },
  {
    to: "/admin/auditoria",
    label: "Auditoria",
    icon: ClipboardList,
    permiso: "auditoria.ver",
  },
];

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { count: notifNoLeidas } = useNotificacionesNoLeidas(user?.profile.id);

  const navConBadges = navPrincipal.map((item) =>
    item.to === "/documentos/bandeja"
      ? { ...item, badge: notifNoLeidas }
      : item,
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <FileText className="h-5 w-5 text-primary" />
        <span className="font-semibold">Intercambio Doc.</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </h3>
          {navConBadges.map((item) =>
            item.permiso ? (
              <Can key={item.to} permiso={item.permiso}>
                <NavItemLink item={item} />
              </Can>
            ) : (
              <NavItemLink key={item.to} item={item} />
            ),
          )}
        </div>

        <div className="space-y-1">
          <Can
            permiso={[
              "usuarios.gestionar",
              "dependencias.gestionar",
              "auditoria.ver",
            ]}
          >
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Administracion
            </h3>
          </Can>
          {navAdmin.map((item) => (
            <Can key={item.to} permiso={item.permiso!}>
              <NavItemLink item={item} />
            </Can>
          ))}
        </div>
      </nav>

      <div className="border-t p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Settings className="h-3 w-3" />
          <span>v0.1</span>
        </div>
      </div>
    </aside>
  );
}
