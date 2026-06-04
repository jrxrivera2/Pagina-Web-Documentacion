import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PermisosRolCheckboxes } from "@/components/admin/PermisosRolCheckboxes";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
  etiquetaRol,
  rolNombreAFlags,
  validarFlagsRol,
  type FlagsRolUsuario,
} from "@/lib/admin-roles";
import { useDependencias } from "@/lib/queries/dependencias";
import {
  useAsignacionesUsuario,
  useAsignarRolEnDependencia,
  useActualizarRolAsignacion,
  useEliminarUsuarioAdmin,
  useQuitarAsignacion,
  type UsuarioAdminListItem,
} from "@/lib/queries/admin/usuarios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: UsuarioAdminListItem | null;
}

const flagsVacios: FlagsRolUsuario = {
  esAdministrador: false,
  esEmisor: false,
  esReceptor: false,
};

export function UsuarioDetalleDialog({ open, onOpenChange, usuario }: Props) {
  const { data: dependencias = [] } = useDependencias();
  const { data: asignaciones = [], isLoading } = useAsignacionesUsuario(
    usuario?.id,
  );
  const asignar = useAsignarRolEnDependencia();
  const actualizarRol = useActualizarRolAsignacion();
  const quitar = useQuitarAsignacion();
  const eliminarUsuario = useEliminarUsuarioAdmin();

  const [depIdNueva, setDepIdNueva] = useState("");
  const [flagsNueva, setFlagsNueva] = useState<FlagsRolUsuario>({
    ...flagsVacios,
    esEmisor: true,
  });
  const [flagsPorAsignacion, setFlagsPorAsignacion] = useState<
    Record<string, FlagsRolUsuario>
  >({});

  useEffect(() => {
    if (!asignaciones.length) return;
    const next: Record<string, FlagsRolUsuario> = {};
    for (const a of asignaciones) {
      next[a.id] = rolNombreAFlags(a.rol.nombre);
    }
    setFlagsPorAsignacion(next);
  }, [asignaciones]);

  if (!usuario) return null;

  const dependenciasYaAsignadasIds = new Set(
    asignaciones.map((a) => a.dependencia_id),
  );
  const dependenciasDisponibles = dependencias.filter(
    (d) => d.activo && !dependenciasYaAsignadasIds.has(d.id),
  );

  const handleAsignar = async () => {
    const err = validarFlagsRol(flagsNueva);
    if (!depIdNueva || err) {
      toast.error(err ?? "Selecciona dependencia y permisos");
      return;
    }
    try {
      await asignar.mutateAsync({
        usuario_id: usuario.id,
        dependencia_id: depIdNueva,
        es_principal: asignaciones.length === 0,
        ...flagsNueva,
      });
      toast.success("Asignacion creada");
      setDepIdNueva("");
      setFlagsNueva({ ...flagsVacios, esEmisor: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar");
    }
  };

  const handleGuardarRol = async (asignacionId: string, dependenciaId: string) => {
    const flags = flagsPorAsignacion[asignacionId];
    const err = validarFlagsRol(flags);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      await actualizarRol.mutateAsync({
        asignacion_id: asignacionId,
        usuario_id: usuario.id,
        dependencia_id: dependenciaId,
        ...flags,
      });
      toast.success("Permisos actualizados");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudieron actualizar los permisos",
      );
    }
  };

  const handleQuitar = async (asignacionId: string) => {
    try {
      await quitar.mutateAsync({ id: asignacionId, usuario_id: usuario.id });
      toast.success("Asignacion eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar");
    }
  };

  const handleEliminarUsuario = async () => {
    try {
      await eliminarUsuario.mutateAsync(usuario.id);
      toast.success("Usuario eliminado");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar el usuario",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usuario.nombre_completo}</DialogTitle>
          <DialogDescription>
            {usuario.email ?? "Sin correo"}{" "}
            {usuario.cargo && <span>- {usuario.cargo}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Asignaciones por dependencia</h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : asignaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este usuario aun no tiene dependencias asignadas.
              </p>
            ) : (
              <ul className="space-y-4">
                {asignaciones.map((a) => {
                  const flags =
                    flagsPorAsignacion[a.id] ?? rolNombreAFlags(a.rol.nombre);
                  return (
                    <li
                      key={a.id}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {a.dependencia.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Actual: {etiquetaRol(a.rol.nombre)}
                              {a.es_principal && " · Principal"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuitar(a.id)}
                          disabled={quitar.isPending}
                          title="Quitar de esta dependencia"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <PermisosRolCheckboxes
                        value={flags}
                        onChange={(f) =>
                          setFlagsPorAsignacion((prev) => ({
                            ...prev,
                            [a.id]: f,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleGuardarRol(a.id, a.dependencia_id)
                        }
                        disabled={actualizarRol.isPending}
                      >
                        {actualizarRol.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Guardar permisos
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Agregar a otra dependencia</h3>
            {dependenciasDisponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ya esta asignado a todas las dependencias activas.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Dependencia</Label>
                  <Select value={depIdNueva} onValueChange={setDepIdNueva}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dependenciasDisponibles.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PermisosRolCheckboxes value={flagsNueva} onChange={setFlagsNueva} />
                <Button
                  onClick={handleAsignar}
                  disabled={asignar.isPending || !depIdNueva}
                >
                  {asignar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Asignar
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Eliminar usuario del sistema
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrara la cuenta de {usuario.nombre_completo} (
                    {usuario.email ?? "sin correo"}) y todas sus asignaciones.
                    Esta accion no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleEliminarUsuario}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
