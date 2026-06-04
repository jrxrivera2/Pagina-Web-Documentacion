import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  FileUp,
  Loader2,
  Paperclip,
  Save,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/hooks/useAuth";
import { usePermiso } from "@/hooks/usePermiso";
import { useDependencias } from "@/lib/queries/dependencias";
import { useCrearDocumento } from "@/lib/queries/documentos";
import { formatoTamano } from "@/lib/formato";

const TIPOS_DOCUMENTO = [
  { value: "informe", label: "Informe" },
  { value: "certificado", label: "Certificado" },
  { value: "oficio", label: "Oficio" },
  { value: "memo", label: "Memorando" },
  { value: "otro", label: "Otro" },
];

const MAX_TAMANO = 25 * 1024 * 1024; // 25 MB

const formSchema = z.object({
  titulo: z.string().min(3, "Minimo 3 caracteres").max(200),
  tipo: z.string().min(1, "Selecciona un tipo"),
  descripcion: z.string().max(2000),
  dependencia_origen_id: z.string().uuid("Selecciona tu dependencia"),
  destinatarios: z.array(z.string().uuid()).min(1, "Selecciona al menos un destinatario"),
});

type FormValues = z.infer<typeof formSchema>;

export function DocumentoNuevoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeCrear = usePermiso("documentos.crear");
  const { data: dependencias = [], isLoading: cargandoDeps } = useDependencias();
  const crearMutation = useCrearDocumento();

  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);

  const dependenciasUsuario = useMemo(
    () =>
      user?.dependencias
        .filter((ud) => ud.dependencia.activo)
        .map((d) => d.dependencia) ?? [],
    [user],
  );

  const dependenciaOrigenDefault = useMemo(() => {
    const activas = user?.dependencias.filter((d) => d.dependencia.activo) ?? [];
    const principal = activas.find((d) => d.es_principal);
    return (principal ?? activas[0])?.dependencia.id ?? "";
  }, [user]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      tipo: "informe",
      descripcion: "",
      dependencia_origen_id: dependenciaOrigenDefault,
      destinatarios: [],
    },
    values: {
      titulo: "",
      tipo: "informe",
      descripcion: "",
      dependencia_origen_id: dependenciaOrigenDefault,
      destinatarios: [],
    },
  });

  const destinatariosSel = watch("destinatarios");
  const dependenciaOrigen = watch("dependencia_origen_id");
  const tipo = watch("tipo");

  const toggleDestinatario = (id: string, checked: boolean) => {
    const actuales = destinatariosSel ?? [];
    setValue(
      "destinatarios",
      checked ? [...actuales, id] : actuales.filter((x) => x !== id),
      { shouldValidate: true },
    );
  };

  const handleArchivos = (files: FileList | null) => {
    if (!files) return;
    const lista = Array.from(files);
    const grandes = lista.filter((f) => f.size > MAX_TAMANO);
    if (grandes.length > 0) {
      setErrorArchivos(
        `Hay archivos que superan 25 MB: ${grandes.map((f) => f.name).join(", ")}`,
      );
      return;
    }
    setErrorArchivos(null);
    setArchivos((prev) => [...prev, ...lista]);
  };

  const quitarArchivo = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (values: FormValues, enviar: boolean) => {
    if (!user) return;

    if (!puedeCrear) {
      toast.error(
        "Tu usuario no tiene permiso para crear documentos. Pide al administrador que te asigne el rol emisor en tu dependencia.",
      );
      return;
    }

    const origenValida = dependenciasUsuario.some(
      (d) => d.id === values.dependencia_origen_id,
    );
    if (!origenValida) {
      toast.error(
        "Selecciona una dependencia origen donde estes asignado (ej. Nomina).",
      );
      return;
    }

    try {
      const res = await crearMutation.mutateAsync({
        titulo: values.titulo,
        descripcion: values.descripcion,
        tipo: values.tipo,
        dependencia_origen_id: values.dependencia_origen_id,
        creado_por: user.profile.id,
        destinatarios: values.destinatarios.map((id) => ({ dependencia_id: id })),
        archivos,
        enviar,
      });

      toast.success(
        enviar
          ? "Documento enviado correctamente"
          : "Borrador guardado correctamente",
      );
      reset();
      setArchivos([]);
      navigate(`/documentos/${res.documento.id}`);
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "No se pudo crear el documento";
      const mensaje = raw.includes("row-level security")
        ? "Error de permisos en Supabase. Ejecuta las migraciones 0011 y 0012 en el SQL Editor y vuelve a iniciar sesion."
        : raw.includes("No tienes permiso para crear")
          ? raw
          : raw;
      toast.error(mensaje);
    }
  };

  const dependenciasDestino = dependencias.filter(
    (d) => d.id !== dependenciaOrigen,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo documento</h1>
          <p className="text-sm text-muted-foreground">
            Llena los campos, adjunta los archivos y envialo a las dependencias.
          </p>
        </div>
      </div>

      {!puedeCrear && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Tu cuenta no tiene el permiso <strong>documentos.crear</strong>. El
          administrador debe asignarte el rol <strong>emisor</strong> en la
          dependencia Nomina desde Administracion → Usuarios.
        </div>
      )}

      {dependenciasUsuario.length === 0 && user && user.dependencias.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          Tu dependencia asignada esta <strong>inactiva</strong>. No puedes crear
          ni enviar documentos hasta que el administrador la reactive en
          Administracion → Dependencias.
        </div>
      )}

      {dependenciasUsuario.length === 0 && user && user.dependencias.length === 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          No tienes ninguna dependencia asignada. No podras crear documentos
          hasta que el administrador te asigne una (por ejemplo Nomina con rol
          emisor).
        </div>
      )}

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informacion del documento</CardTitle>
            <CardDescription>
              Estos datos quedaran visibles para los destinatarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Titulo *</Label>
                <Input
                  id="titulo"
                  placeholder="Ej. Informe de nomina - Octubre 2026"
                  {...register("titulo")}
                />
                {errors.titulo && (
                  <p className="text-xs text-destructive">{errors.titulo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setValue("tipo", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-xs text-destructive">{errors.tipo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="origen">Dependencia origen *</Label>
                <Select
                  value={dependenciaOrigen}
                  onValueChange={(v) =>
                    setValue("dependencia_origen_id", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="origen">
                    <SelectValue placeholder="Selecciona tu dependencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {dependenciasUsuario.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dependencia_origen_id && (
                  <p className="text-xs text-destructive">
                    {errors.dependencia_origen_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  rows={4}
                  placeholder="Detalle, contexto o notas para los destinatarios..."
                  {...register("descripcion")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinatarios *</CardTitle>
            <CardDescription>
              Selecciona las dependencias que recibiran el documento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargandoDeps ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : dependenciasDestino.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay otras dependencias disponibles. Pide al administrador que
                cree dependencias adicionales.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {dependenciasDestino.map((d) => {
                  const checked = destinatariosSel?.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          toggleDestinatario(d.id, Boolean(c))
                        }
                      />
                      <span className="text-sm font-medium">{d.nombre}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {errors.destinatarios && (
              <p className="mt-2 text-xs text-destructive">
                {errors.destinatarios.message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archivos adjuntos</CardTitle>
            <CardDescription>
              PDF, Word, Excel u otros. Maximo 25 MB por archivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="archivos"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition hover:border-primary"
            >
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                Click para seleccionar archivos
              </span>
              <span className="text-xs text-muted-foreground">
                o arrastralos aqui
              </span>
              <input
                id="archivos"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleArchivos(e.target.files)}
              />
            </label>

            {errorArchivos && (
              <p className="text-xs text-destructive">{errorArchivos}</p>
            )}

            {archivos.length > 0 && (
              <ul className="space-y-2">
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
                      onClick={() => quitarArchivo(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={crearMutation.isPending}
            onClick={handleSubmit((v) => onSubmit(v, false))}
          >
            {crearMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar borrador
          </Button>
          <Button
            type="button"
            disabled={crearMutation.isPending}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            {crearMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar ahora
          </Button>
        </div>
      </form>
    </div>
  );
}
