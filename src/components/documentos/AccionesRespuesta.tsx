import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useResponderDocumento } from "@/lib/queries/documentos";

interface Props {
  documentoId: string;
  /** Estado actual del destinatario; ocultamos si ya respondio. */
  miEstadoRecepcion?: "pendiente" | "recibido" | "visto" | "aprobado" | "rechazado";
}

type Accion = "aprobar" | "rechazar" | null;

export function AccionesRespuesta({ documentoId, miEstadoRecepcion }: Props) {
  const responder = useResponderDocumento(documentoId);
  const [accion, setAccion] = useState<Accion>(null);
  const [comentario, setComentario] = useState("");

  const yaRespondido =
    miEstadoRecepcion === "aprobado" || miEstadoRecepcion === "rechazado";

  if (yaRespondido) {
    return (
      <p className="text-sm text-muted-foreground">
        Ya respondiste este documento ({miEstadoRecepcion}).
      </p>
    );
  }

  const handleConfirmar = async () => {
    if (!accion) return;
    try {
      await responder.mutateAsync({
        aprobar: accion === "aprobar",
        comentario,
      });
      toast.success(
        accion === "aprobar" ? "Documento aprobado" : "Documento rechazado",
      );
      setAccion(null);
      setComentario("");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo registrar la respuesta";
      toast.error(mensaje);
    }
  };

  return (
    <AlertDialog
      open={accion !== null}
      onOpenChange={(open) => {
        if (!open) {
          setAccion(null);
          setComentario("");
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setAccion("aprobar")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-red-600 text-red-700 hover:bg-red-50"
            onClick={() => setAccion("rechazar")}
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
        </AlertDialogTrigger>
      </div>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {accion === "aprobar"
              ? "Aprobar documento"
              : "Rechazar documento"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {accion === "aprobar"
              ? "El creador recibira una notificacion y el documento quedara como aprobado."
              : "El creador podra ver el motivo y subir una nueva version si lo desea."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="comentario-respuesta">
            Comentario {accion === "rechazar" ? "(recomendado)" : "(opcional)"}
          </Label>
          <Textarea
            id="comentario-respuesta"
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={
              accion === "rechazar"
                ? "Explica el motivo del rechazo..."
                : "Comentario para el creador..."
            }
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmar}
            disabled={responder.isPending}
            className={
              accion === "rechazar"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {responder.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
