import { Link } from "react-router-dom";
import { Inbox, Paperclip } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EstadoDocumentoBadge } from "@/components/documentos/EstadoBadge";
import { useAuth } from "@/hooks/useAuth";
import { useBandeja } from "@/lib/queries/documentos";
import { fechaRelativa } from "@/lib/formato";

export function DocumentosBandejaPage() {
  const { user } = useAuth();
  const { data: documentos = [], isLoading, error } = useBandeja(
    user?.profile.id,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bandeja</h1>
        <p className="text-sm text-muted-foreground">
          Documentos que han enviado a tu dependencia o directamente a ti.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recibidos</CardTitle>
          <CardDescription>
            {documentos.length}{" "}
            {documentos.length === 1 ? "documento" : "documentos"} visibles
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
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No has recibido documentos todavia.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Archivos</TableHead>
                  <TableHead>Recibido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        to={`/documentos/${doc.id}`}
                        className="font-medium hover:underline"
                      >
                        {doc.titulo}
                      </Link>
                      {doc.descripcion && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {doc.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{doc.tipo}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {doc.dependencia_origen?.nombre ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.creador?.nombre_completo ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoDocumentoBadge estado={doc.estado} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        {doc.archivos_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fechaRelativa(doc.fecha_envio ?? doc.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
