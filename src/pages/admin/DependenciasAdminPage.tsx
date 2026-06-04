import { useState } from "react";
import { Building2, Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DependenciaFormDialog } from "@/components/admin/DependenciaFormDialog";
import { DependenciaUsuariosDialog } from "@/components/admin/DependenciaUsuariosDialog";
import {
  useDependenciasAdmin,
  useEliminarDependencia,
  useToggleDependenciaActiva,
  type DependenciaConContadores,
} from "@/lib/queries/admin/dependencias";
import { formatoFecha } from "@/lib/formato";

export function DependenciasAdminPage() {
  const { data: dependencias = [], isLoading, error } = useDependenciasAdmin();
  const toggleMutation = useToggleDependenciaActiva();
  const eliminarMutation = useEliminarDependencia();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuariosDialogOpen, setUsuariosDialogOpen] = useState(false);
  const [editando, setEditando] = useState<DependenciaConContadores | null>(null);
  const [verUsuariosDe, setVerUsuariosDe] =
    useState<DependenciaConContadores | null>(null);

  const abrirCrear = () => {
    setEditando(null);
    setDialogOpen(true);
  };

  const abrirEditar = (d: DependenciaConContadores) => {
    setEditando(d);
    setDialogOpen(true);
  };

  const abrirUsuarios = (d: DependenciaConContadores) => {
    setVerUsuariosDe(d);
    setUsuariosDialogOpen(true);
  };

  const handleEliminar = async (d: DependenciaConContadores) => {
    try {
      await eliminarMutation.mutateAsync(d.id);
      toast.success(`Dependencia "${d.nombre}" eliminada`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar la dependencia",
      );
    }
  };

  const handleToggle = async (d: DependenciaConContadores) => {
    try {
      await toggleMutation.mutateAsync({ id: d.id, activo: !d.activo });
      toast.success(
        d.activo ? "Dependencia desactivada" : "Dependencia activada",
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo cambiar el estado";
      toast.error(mensaje);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dependencias</h1>
          <p className="text-sm text-muted-foreground">
            Administra las dependencias del sistema.
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="h-4 w-4" />
          Nueva dependencia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            {dependencias.length}{" "}
            {dependencias.length === 1 ? "dependencia" : "dependencias"} en
            total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : dependencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay dependencias creadas.
              </p>
              <Button size="sm" onClick={abrirCrear}>
                <Plus className="h-4 w-4" />
                Crear la primera
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencias.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nombre}</TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground">
                      <p className="line-clamp-2">
                        {d.descripcion ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex items-center gap-1"
                        onClick={() => abrirUsuarios(d)}
                        title="Ver usuarios de esta dependencia"
                      >
                        <Users className="h-3 w-3" />
                        {d.usuarios_count}
                        <Eye className="h-3 w-3 opacity-60" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={d.activo}
                          onCheckedChange={() => handleToggle(d)}
                          disabled={toggleMutation.isPending}
                        />
                        {d.activo ? (
                          <Badge variant="success">Activa</Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatoFecha(d.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditar(d)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={eliminarMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar {d.nombre}?
                              </AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  <p>
                                    Esta accion no se puede deshacer. Se borrara
                                    la dependencia del sistema.
                                  </p>
                                  {d.usuarios_count > 0 && (
                                    <p>
                                      Se quitaran{" "}
                                      <strong>{d.usuarios_count}</strong>{" "}
                                      asignacion(es) de usuario en esta
                                      dependencia.
                                    </p>
                                  )}
                                  <p>
                                    Si hay documentos enviados desde o hacia esta
                                    dependencia, la eliminacion sera bloqueada
                                    hasta que esos documentos se eliminen o
                                    archiven.
                                  </p>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleEliminar(d)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DependenciaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dependencia={editando}
      />

      <DependenciaUsuariosDialog
        open={usuariosDialogOpen}
        onOpenChange={setUsuariosDialogOpen}
        dependencia={verUsuariosDe}
      />
    </div>
  );
}
