import {
  Building2,
  FileText,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {user.profile.nombre_completo.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Bienvenido a la plataforma de intercambio documental.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado cuenta</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.profile.activo ? "Activa" : "Inactiva"}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.profile.cargo ?? "Sin cargo asignado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependencias</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.dependencias.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.dependencias.length === 0
                ? "Sin asignacion"
                : user.dependencias.map((d) => d.dependencia.nombre).join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permisos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.esAdmin ? "Todos" : user.permisos.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.esAdmin
                ? "Administrador del sistema"
                : "Permisos granulares"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proxima fase</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Documentos</div>
            <p className="text-xs text-muted-foreground">
              Fase 3: subir, listar y descargar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tus dependencias y roles</CardTitle>
          <CardDescription>
            Asignaciones actuales y rol que tienes en cada una.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.dependencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes dependencias asignadas. Pide al administrador que te
              asigne al menos una para poder operar.
            </p>
          ) : (
            <ul className="divide-y">
              {user.dependencias.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">{d.dependencia.nombre}</p>
                    {d.es_principal && (
                      <p className="text-xs text-muted-foreground">
                        Dependencia principal
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {d.rol.nombre}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!user.esAdmin && user.permisos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tus permisos</CardTitle>
            <CardDescription>
              Acciones que puedes realizar en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.permisos.map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
