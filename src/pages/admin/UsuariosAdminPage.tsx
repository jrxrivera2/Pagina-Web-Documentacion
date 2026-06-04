import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { UsuarioCrearDialog } from "@/components/admin/UsuarioCrearDialog";
import { UsuarioDetalleDialog } from "@/components/admin/UsuarioDetalleDialog";
import { etiquetaRol } from "@/lib/admin-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { useDependencias } from "@/lib/queries/dependencias";
import {
  useToggleUsuarioActivo,
  useUsuariosAdmin,
  type UsuarioAdminListItem,
} from "@/lib/queries/admin/usuarios";

const TODAS = "__todas__";

export function UsuariosAdminPage() {
  const { data: usuarios = [], isLoading, error } = useUsuariosAdmin();
  const { data: dependencias = [] } = useDependencias();
  const toggleActivo = useToggleUsuarioActivo();
  const [busqueda, setBusqueda] = useState("");
  const [filtroDependencia, setFiltroDependencia] = useState(TODAS);
  const [seleccionado, setSeleccionado] =
    useState<UsuarioAdminListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideDep =
        filtroDependencia === TODAS ||
        u.dependencias.some((d) => {
          const dep = dependencias.find((x) => x.id === filtroDependencia);
          return dep && d.dependencia_nombre === dep.nombre;
        });
      if (!coincideDep) return false;
      if (!q) return true;
      return (
        u.nombre_completo.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.cargo && u.cargo.toLowerCase().includes(q)) ||
        u.dependencias.some((d) =>
          d.dependencia_nombre.toLowerCase().includes(q),
        )
      );
    });
  }, [usuarios, busqueda, filtroDependencia, dependencias]);

  const abrirDetalle = (u: UsuarioAdminListItem) => {
    setSeleccionado(u);
    setDialogOpen(true);
  };

  const handleToggle = async (u: UsuarioAdminListItem) => {
    try {
      await toggleActivo.mutateAsync({ id: u.id, activo: !u.activo });
      toast.success(u.activo ? "Usuario desactivado" : "Usuario activado");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo cambiar el estado",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crea usuarios, asigna dependencias y define permisos de emisor y
            receptor.
          </p>
        </div>
        <Button onClick={() => setCrearOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Listado</CardTitle>
              <CardDescription>
                {filtrados.length} de {usuarios.length}{" "}
                {usuarios.length === 1 ? "usuario" : "usuarios"}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={filtroDependencia}
                onValueChange={setFiltroDependencia}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Dependencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas las dependencias</SelectItem>
                  {dependencias.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar nombre, correo..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {busqueda || filtroDependencia !== TODAS
                  ? "No hay coincidencias con los filtros."
                  : "No hay usuarios. Crea el primero con el boton Nuevo usuario."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Dependencias / permisos</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.nombre_completo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.cargo ?? "—"}
                    </TableCell>
                    <TableCell>
                      {u.dependencias.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sin asignacion
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.dependencias.map((d, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {d.dependencia_nombre}:{" "}
                              {etiquetaRol(d.rol_nombre)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.activo}
                        onCheckedChange={() => handleToggle(u)}
                        disabled={toggleActivo.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirDetalle(u)}
                      >
                        <Pencil className="h-4 w-4" />
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UsuarioCrearDialog open={crearOpen} onOpenChange={setCrearOpen} />
      <UsuarioDetalleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuario={seleccionado}
      />
    </div>
  );
}
