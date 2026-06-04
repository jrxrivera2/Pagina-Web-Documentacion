import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { etiquetaRol } from "@/lib/admin-roles";
import { useUsuariosPorDependencia } from "@/lib/queries/admin/usuarios";
import type { Dependencia } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependencia: Dependencia | null;
}

export function DependenciaUsuariosDialog({
  open,
  onOpenChange,
  dependencia,
}: Props) {
  const { data: usuarios = [], isLoading, error } = useUsuariosPorDependencia(
    open ? dependencia?.id : undefined,
  );

  if (!dependencia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios en {dependencia.nombre}
          </DialogTitle>
          <DialogDescription>
            Personas asignadas a esta dependencia y sus permisos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : usuarios.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay usuarios asignados a esta dependencia.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.asignacion_id}>
                  <TableCell className="font-medium">
                    {u.nombre_completo}
                    {u.es_principal && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (principal)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{etiquetaRol(u.rol_nombre)}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.activo ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="outline">Inactivo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
