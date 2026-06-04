import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { etiquetaEstadoCaso } from "@/lib/estado-caso";
import { useActualizarEstadoCaso } from "@/lib/queries/documentos";
import type { EstadoCasoManual } from "@/lib/types";

const OPCIONES: EstadoCasoManual[] = ["abierto", "cerrado", "en_seguimiento"];

interface Props {
  documentoId: string;
  estadoCaso: EstadoCasoManual;
  puedeEditar: boolean;
}

export function SelectorEstadoCaso({
  documentoId,
  estadoCaso,
  puedeEditar,
}: Props) {
  const actualizar = useActualizarEstadoCaso(documentoId);

  const handleChange = async (valor: string) => {
    const nuevo = valor as EstadoCasoManual;
    if (nuevo === estadoCaso) return;
    try {
      await actualizar.mutateAsync(nuevo);
      toast.success(`Estado del caso: ${etiquetaEstadoCaso(nuevo)}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo actualizar el estado",
      );
    }
  };

  if (!puedeEditar) {
    return (
      <p className="text-sm text-muted-foreground">
        Estado actual: <strong>{etiquetaEstadoCaso(estadoCaso)}</strong>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="estado-caso">Estado del caso</Label>
      <Select
        value={estadoCaso}
        onValueChange={handleChange}
        disabled={actualizar.isPending}
      >
        <SelectTrigger id="estado-caso" className="w-full sm:w-64">
          <SelectValue />
          {actualizar.isPending && (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          )}
        </SelectTrigger>
        <SelectContent>
          {OPCIONES.map((op) => (
            <SelectItem key={op} value={op}>
              {etiquetaEstadoCaso(op)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Tu eliges si el expediente esta abierto, cerrado o en seguimiento. Se
        notifica a las demas partes.
      </p>
    </div>
  );
}
