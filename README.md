# Plataforma de Intercambio Documental

Plataforma web para que la dependencia de Nómina envíe informes y documentos a Gerencia y otras dependencias, con trazabilidad completa, comentarios y notificaciones en tiempo real.

## Stack

- **Frontend**: Vite + React 19 + TypeScript + TailwindCSS + shadcn/ui (base)
- **Routing**: React Router v6
- **Estado servidor**: TanStack Query (React Query)
- **Formularios**: React Hook Form + Zod
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Realtime)
- **Notificaciones UI**: Sonner (toasts)

## Estado del proyecto

> Terminadas las fases **0 (Setup)**, **1 (Auth + layout)**, **2 (Modelo de datos)** y **3 (Documentos)**.

Roadmap:

- [x] Fase 0 — Setup inicial del proyecto
- [x] Fase 1 — Autenticación + perfiles + layout
- [x] Fase 2 — Modelo de datos en Supabase (migraciones, RLS, triggers)
- [x] Fase 3 — Documentos: subir, listar, ver detalle, descargar
- [ ] Fase 4 — Trazabilidad y respuestas (comentarios, aprobaciones, versiones)
- [ ] Fase 5 — Notificaciones in-app con Realtime
- [ ] Fase 6 — Panel admin (dependencias, usuarios, auditoría)
- [ ] Fase 7 — Pulido, responsive y despliegue

## Requisitos

- Node.js 20+ (probado con Node 22)
- npm 10+
- Cuenta gratuita en [Supabase](https://supabase.com)

## Instalación

```bash
git clone <url-del-repo>
cd Pagina-Web-Documentacion
npm install
```

## Configuración de Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. En el panel del proyecto ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public key`
3. Copia el archivo de ejemplo y completa los valores:

```bash
copy .env.example .env.local   # Windows
# o en macOS/Linux: cp .env.example .env.local
```

4. Edita `.env.local`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Crear el esquema en Supabase (Fase 2)

En el dashboard de Supabase ve a **SQL Editor → New query** y ejecuta en este orden:

### Paso 1 — Esquema base

Copia y pega el contenido completo de [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) y dale **Run**.

Esto crea:

- **12 tablas**: `profiles`, `dependencias`, `roles`, `permisos`, `roles_permisos`, `usuarios_dependencias`, `documentos`, `documento_archivos`, `documento_destinatarios`, `documento_eventos`, `documento_comentarios`, `notificaciones`.
- **Funciones SQL** para chequeo de permisos (`tiene_permiso`, `es_admin`, `puede_ver_documento`) y operaciones críticas (`enviar_documento`, `marcar_visto`, `responder_documento`).
- **Triggers** que crean automáticamente el `profile` al registrarse un usuario, mantienen `updated_at`, y registran el evento `creado` cuando se inserta un documento.
- **Row Level Security (RLS)** en todas las tablas con políticas por rol/dependencia.
- **Bucket `documentos`** privado en Storage con políticas que respetan los permisos del usuario.
- **Realtime** habilitado en `notificaciones`.
- **Seed** de los 3 roles (`administrador`, `emisor`, `receptor`) y los 9 permisos iniciales con sus asignaciones.

### Paso 2 — Crear tu primer usuario

Ve a **Authentication → Users → Add user → Create new user**. Marca _Auto Confirm User_ para no esperar correo de verificación. El trigger creará automáticamente la fila en `public.profiles`.

### Paso 3 — Asignar ese usuario como administrador

Abre [supabase/migrations/0002_bootstrap_admin.sql](supabase/migrations/0002_bootstrap_admin.sql), cambia las dos variables del bloque (`v_email` y `v_dependencia_nombre`) por las tuyas, pégalo en SQL Editor y ejecútalo. Esto:

- Asegura que exista la dependencia inicial (ej. *Gerencia General*).
- Asigna al usuario el rol `administrador` en esa dependencia.

### Reset (opcional, solo desarrollo)

Si necesitas borrar todo el esquema y empezar de cero, ejecuta [supabase/migrations/reset.sql](supabase/migrations/reset.sql) y luego vuelve a correr `0001_initial_schema.sql`.

## Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo (http://localhost:5173)
npm run build     # Build de producción
npm run preview   # Previsualiza el build
npm run lint      # Lint del código
```

## Estructura de carpetas

```
.
├── public/
├── src/
│   ├── components/
│   │   ├── ui/            # Componentes shadcn/ui
│   │   ├── layout/        # Sidebar, Topbar, Bell de notificaciones
│   │   ├── documentos/    # Formularios y vistas de documentos
│   │   └── admin/         # Vistas del panel de administrador
│   ├── hooks/             # useAuth, usePermiso, useNotificaciones, ...
│   ├── lib/
│   │   ├── queries/       # Hooks de TanStack Query por entidad
│   │   ├── supabase.ts    # Cliente Supabase único
│   │   └── utils.ts       # Helper cn() de shadcn
│   ├── pages/             # Páginas por ruta
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/        # SQL versionado (tablas, RLS, triggers, seed)
├── .env.example
├── components.json        # Configuración de shadcn/ui
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

## Convenciones

- Alias `@/` apunta a `src/`. Ejemplo: `import { supabase } from "@/lib/supabase";`
- Todo el SQL del backend vive en `supabase/migrations/` y debe poder reproducirse desde cero.
- Las variables que empiezan con `VITE_` son las únicas expuestas al frontend.
- **Nunca** se commitea la `service_role` key ni el archivo `.env.local`.
