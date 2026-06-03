import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { session, signIn, isLoadingSession } = useAuth();
  const location = useLocation();
  const [enviando, setEnviando] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (!isLoadingSession && session) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setEnviando(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Sesion iniciada");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo iniciar sesion";
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Intercambio Documental
            </span>
          </div>
          <CardTitle>Iniciar sesion</CardTitle>
          <CardDescription>
            Ingresa con tu correo institucional y contrasena.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@dominio.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
