import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

function inicialesDe(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Sesion cerrada");
      navigate("/login", { replace: true });
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al cerrar sesion";
      toast.error(mensaje);
    }
  };

  const rolesPrincipales = Array.from(
    new Set(user.dependencias.map((d) => d.rol.nombre)),
  ).join(", ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-10 items-center gap-2 px-2"
        >
          <Avatar className="h-8 w-8">
            {user.profile.avatar_url && (
              <AvatarImage src={user.profile.avatar_url} />
            )}
            <AvatarFallback>
              {inicialesDe(user.profile.nombre_completo) || (
                <User className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-none">
              {user.profile.nombre_completo}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {rolesPrincipales || "Sin rol"}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {user.profile.nombre_completo}
            </span>
            {user.profile.cargo && (
              <span className="text-xs text-muted-foreground">
                {user.profile.cargo}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
