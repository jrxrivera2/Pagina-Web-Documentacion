import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/hooks/useAuth";
import {
  useCrearComentario,
  useDocumentoComentarios,
} from "@/lib/queries/documentos";
import { fechaRelativa, formatoFecha } from "@/lib/formato";

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function SeccionComentarios({ documentoId }: { documentoId: string }) {
  const { user } = useAuth();
  const { data: comentarios = [], isLoading, error } =
    useDocumentoComentarios(documentoId);
  const crearMutation = useCrearComentario(documentoId);
  const [texto, setTexto] = useState("");

  const handleEnviar = async () => {
    if (!user || texto.trim().length === 0) return;
    try {
      await crearMutation.mutateAsync({
        contenido: texto,
        usuarioId: user.profile.id,
      });
      setTexto("");
      toast.success("Comentario publicado");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo publicar el comentario";
      toast.error(mensaje);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Comentarios</CardTitle>
            <CardDescription>
              {comentarios.length}{" "}
              {comentarios.length === 1 ? "comentario" : "comentarios"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aun no hay comentarios. Se el primero en aportar contexto.
          </p>
        ) : (
          <ul className="space-y-4">
            {comentarios.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {c.usuario?.avatar_url && (
                    <AvatarImage src={c.usuario.avatar_url} />
                  )}
                  <AvatarFallback className="text-xs">
                    {iniciales(c.usuario?.nombre_completo ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {c.usuario?.nombre_completo ?? "Usuario eliminado"}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={formatoFecha(c.created_at)}
                    >
                      {fechaRelativa(c.created_at)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {c.contenido}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-4">
          <Textarea
            placeholder="Escribe un comentario..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={texto.trim().length === 0 || crearMutation.isPending}
              onClick={handleEnviar}
            >
              {crearMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Comentar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
