import { useState } from "react";
import { FileUp, Loader2, Paperclip, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";

import { useSubirArchivos } from "@/lib/queries/documentos";
import { formatoTamano } from "@/lib/formato";

const MAX_TAMANO = 25 * 1024 * 1024;

interface Props {
  documentoId: string;
  version: number;
  usuarioId: string;
  trigger: React.ReactNode;
  titulo?: string;
}

export function SubirArchivosDialog({
  documentoId,
  version,
  usuarioId,
  trigger,
  titulo = "Subir archivos",
}: Props) {
  const subirMutation = useSubirArchivos();
  const [open, setOpen] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const lista = Array.from(files);
    const grandes = lista.filter((f) => f.size > MAX_TAMANO);
    if (grandes.length > 0) {
      setError(
        `Superan 25 MB: ${grandes.map((f) => f.name).join(", ")}`,
      );
      return;
    }
    setError(null);
    setArchivos((prev) => [...prev, ...lista]);
  };

  const quitar = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmar = async () => {
    if (archivos.length === 0) return;
    try {
      await subirMutation.mutateAsync({
        documentoId,
        version,
        archivos,
        usuarioId,
      });
      toast.success(
        `${archivos.length} ${archivos.length === 1 ? "archivo subido" : "archivos subidos"}`,
      );
      setArchivos([]);
      setOpen(false);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudieron subir los archivos";
      toast.error(mensaje);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setArchivos([]);
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            Se adjuntaran a la version actual (v{version}). Maximo 25 MB por archivo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label
            htmlFor={`upload-${documentoId}`}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition hover:border-primary"
          >
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              Click para seleccionar archivos
            </span>
            <input
              id={`upload-${documentoId}`}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {archivos.length > 0 && (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {archivos.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 rounded-md border p-2 text-sm"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatoTamano(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => quitar(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmar}
            disabled={archivos.length === 0 || subirMutation.isPending}
          >
            {subirMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Subir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
