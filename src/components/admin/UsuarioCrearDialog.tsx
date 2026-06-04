import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PermisosRolCheckboxes } from "@/components/admin/PermisosRolCheckboxes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  flagsTienenAlgunPermiso,
  validarFlagsRol,
  type FlagsRolUsuario,
} from "@/lib/admin-roles";
import { useDependencias } from "@/lib/queries/dependencias";
import { useCrearUsuarioAdmin } from "@/lib/queries/admin/usuarios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const flagsIniciales: FlagsRolUsuario = {
  esAdministrador: false,
  esEmisor: true,
  esReceptor: false,
};

export function UsuarioCrearDialog({ open, onOpenChange }: Props) {
  const { data: dependencias = [] } = useDependencias();
  const crear = useCrearUsuarioAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [cargo, setCargo] = useState("");
  const [dependenciaId, setDependenciaId] = useState("");
  const [flags, setFlags] = useState<FlagsRolUsuario>(flagsIniciales);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setNombre("");
      setCedula("");
      setCargo("");
      setDependenciaId("");
      setFlags(flagsIniciales);
    }
  }, [open]);

  const depsActivas = dependencias.filter((d) => d.activo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errFlags = validarFlagsRol(flags);
    if (errFlags) {
      toast.error(errFlags);
      return;
    }
    if (!email.trim() || !password || !nombre.trim() || !dependenciaId) {
      toast.error("Completa correo, contrasena, nombre y dependencia");
      return;
    }
    if (password.length < 8) {
      toast.error("La contrasena debe tener al menos 8 caracteres");
      return;
    }

    try {
      await crear.mutateAsync({
        email: email.trim(),
        password,
        nombre_completo: nombre.trim(),
        dependencia_id: dependenciaId,
        cedula: cedula.trim() || undefined,
        cargo: cargo.trim() || undefined,
        ...flags,
      });
      toast.success("Usuario creado correctamente");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el usuario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Crea la cuenta y asignala a una dependencia con los permisos
              indicados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="crear-email">Correo</Label>
              <Input
                id="crear-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="crear-password">Contrasena inicial</Label>
              <Input
                id="crear-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="crear-nombre">Nombre completo</Label>
              <Input
                id="crear-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="crear-cedula">Cedula (opcional)</Label>
                <Input
                  id="crear-cedula"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crear-cargo">Cargo (opcional)</Label>
                <Input
                  id="crear-cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dependencia</Label>
              <Select value={dependenciaId} onValueChange={setDependenciaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona dependencia..." />
                </SelectTrigger>
                <SelectContent>
                  {depsActivas.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PermisosRolCheckboxes
              value={flags}
              onChange={setFlags}
              disabled={crear.isPending}
            />
            {!flagsTienenAlgunPermiso(flags) && (
              <p className="text-xs text-destructive">
                Selecciona al menos un permiso.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
