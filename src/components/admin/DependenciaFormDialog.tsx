import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";

import {
  useActualizarDependencia,
  useCrearDependencia,
} from "@/lib/queries/admin/dependencias";
import type { Dependencia } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependencia?: Dependencia | null;
}

export function DependenciaFormDialog({
  open,
  onOpenChange,
  dependencia,
}: Props) {
  const crearMutation = useCrearDependencia();
  const actualizarMutation = useActualizarDependencia();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  const editando = Boolean(dependencia);

  useEffect(() => {
    if (open) {
      setNombre(dependencia?.nombre ?? "");
      setDescripcion(dependencia?.descripcion ?? "");
      setErrorNombre(null);
    }
  }, [open, dependencia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio.length < 2) {
      setErrorNombre("Minimo 2 caracteres");
      return;
    }
    try {
      if (editando && dependencia) {
        await actualizarMutation.mutateAsync({
          id: dependencia.id,
          nombre: limpio,
          descripcion,
        });
        toast.success("Dependencia actualizada");
      } else {
        await crearMutation.mutateAsync({ nombre: limpio, descripcion });
        toast.success("Dependencia creada");
      }
      onOpenChange(false);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(mensaje);
    }
  };

  const enviando = crearMutation.isPending || actualizarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar dependencia" : "Nueva dependencia"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Modifica los datos de la dependencia."
                : "Crea una nueva dependencia para que pueda recibir documentos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-dep">Nombre *</Label>
              <Input
                id="nombre-dep"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errorNombre) setErrorNombre(null);
                }}
                placeholder="Ej. Gerencia Financiera"
              />
              {errorNombre && (
                <p className="text-xs text-destructive">{errorNombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc-dep">Descripcion</Label>
              <Textarea
                id="desc-dep"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripcion del area..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
