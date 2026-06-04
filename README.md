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

> Terminadas las fases **0 → 6**. Solo queda la fase 7 (pulido y despliegue).

Roadmap:

- [x] Fase 0 — Setup inicial del proyecto
- [x] Fase 1 — Autenticación + perfiles + layout
- [x] Fase 2 — Modelo de datos en Supabase (migraciones, RLS, triggers)
- [x] Fase 3 — Documentos: subir, listar, ver detalle, descargar
- [x] Fase 4 — Trazabilidad y respuestas (comentarios, aprobaciones, versiones)
- [x] Fase 5 — Notificaciones in-app con Realtime
- [x] Fase 6 — Panel admin (dependencias, usuarios, auditoría)
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

### Paso 3 — Dependencias iniciales (Gerencia y Nomina)

Copia y pega [supabase/migrations/0005_seed_dependencias.sql](supabase/migrations/0005_seed_dependencias.sql) en el SQL Editor y dale **Run**. Crea las dos dependencias del sistema:

| Nombre   | Uso principal                                          |
| -------- | ------------------------------------------------------ |
| Gerencia | Recibe y aprueba informes                              |
| Nomina   | Crea y envia documentos hacia Gerencia y otras areas   |

### Paso 4 — Usuario administrador (acceso total)

Abre [supabase/migrations/0007_bootstrap_usuario_admin.sql](supabase/migrations/0007_bootstrap_usuario_admin.sql), edita `v_email`, `v_password` y `v_nombre_completo` si lo deseas, y ejecútalo en el SQL Editor. Esto:

- Crea el usuario en **Authentication** (si no existe).
- Lo asigna a **Gerencia** con rol **administrador** (todos los permisos del sistema).

Valores por defecto:

| Campo        | Valor por defecto    |
| ------------ | -------------------- |
| Email        | `admin@ejemplo.com`  |
| Contraseña   | `Admin2026!`         |
| Dependencia  | Gerencia             |
| Rol          | administrador        |

**Permisos incluidos** (vía rol administrador):

- **Dependencias**: crear, editar y activar/desactivar (`/admin/dependencias`)
- **Usuarios**: listar, activar/desactivar, editar perfil y asignar roles por dependencia (`/admin/usuarios`)
- **Auditoría**: ver todos los eventos del sistema (`/admin/auditoria`)
- **Documentos**: crear, ver todos, enviar, aprobar y archivar

> Para dar de alta usuarios nuevos desde la app: créalos en Supabase (**Authentication → Users → Add user**) y luego asígnales dependencia y rol desde **Administración → Usuarios**. Si el usuario ya existe en Auth, puedes usar [0002_bootstrap_admin.sql](supabase/migrations/0002_bootstrap_admin.sql) solo para asignarle el rol.

> Cambia la contraseña después del primer inicio de sesión.

### Paso 5 — Función de nueva versión (Fase 4)

Copia y pega [supabase/migrations/0003_funciones_fase4.sql](supabase/migrations/0003_funciones_fase4.sql) en el SQL Editor y dale **Run**. Esto agrega la función `nueva_version_documento(uuid)` que permite al creador reabrir un documento aprobado o rechazado en una nueva versión.

### Paso 6 — Email en profiles (Fase 6)

Copia y pega [supabase/migrations/0004_admin_email_profile.sql](supabase/migrations/0004_admin_email_profile.sql) en el SQL Editor y dale **Run**. Agrega la columna `email` a `profiles`, actualiza el trigger `handle_new_user` para guardarla y hace backfill de los usuarios existentes. Sin esto, el panel de administración mostrará "—" en lugar del correo.

### Paso 14 — Estado de caso manual y notificaciones en bandeja

Ejecuta [supabase/migrations/0013_estado_caso_manual.sql](supabase/migrations/0013_estado_caso_manual.sql). Permite marcar cada documento como **Abierto**, **En seguimiento** o **Cerrado** desde el detalle, y muestra notificaciones nuevas en **Bandeja** (campana del menu y alerta en la pagina).

### Paso 11 — Fix: usuario Nomina puede crear documentos

Si al enviar un documento aparece error de permisos o RLS, ejecuta **en este orden** en el SQL Editor:

1. [0011_fix_rls_documentos_emisor.sql](supabase/migrations/0011_fix_rls_documentos_emisor.sql)
2. [0012_crear_documento_rpc.sql](supabase/migrations/0012_crear_documento_rpc.sql) — **obligatorio** para que Nomina pueda crear y adjuntar archivos

Verifica en **Administracion → Usuarios** que el usuario tenga rol **emisor** en **Nomina**, y en el formulario **dependencia origen = Nomina** (Tesoreria u otras solo como destinatarios).

Despues: **cerrar sesion y volver a entrar** con el usuario de Nomina.

### Paso 10 — Trazabilidad de caso y descargas

Copia y pega [supabase/migrations/0010_trazabilidad_caso.sql](supabase/migrations/0010_trazabilidad_caso.sql) en el SQL Editor y dale **Run**. Registra cada descarga en la bitacora, sincroniza estados del documento (abierto/en revision/cerrado) y mejora las respuestas de destinatarios.

### Paso 9 — Eliminar dependencias desde la app

Copia y pega [supabase/migrations/0009_admin_eliminar_dependencia.sql](supabase/migrations/0009_admin_eliminar_dependencia.sql) en el SQL Editor y dale **Run**. Permite borrar dependencias desde **Administracion → Dependencias** (con confirmacion). No permite eliminar si hay documentos vinculados.

### Paso 8 — Panel admin: crear usuarios desde la app

Copia y pega [supabase/migrations/0008_admin_usuarios_ui.sql](supabase/migrations/0008_admin_usuarios_ui.sql) en el SQL Editor y dale **Run**. Habilita:

- Crear usuarios visualmente (Administracion → Usuarios → Nuevo usuario)
- Asignar permisos **Emisor**, **Receptor** o ambos (rol `emisor_receptor`)
- Ver usuarios por dependencia (clic en el contador en Administracion → Dependencias)
- Eliminar usuarios desde la app

### Paso 7 — Usuario de Nomina (opcional)

Abre [supabase/migrations/0006_bootstrap_usuario_nomina.sql](supabase/migrations/0006_bootstrap_usuario_nomina.sql), edita `v_email`, `v_password` y `v_nombre_completo` si lo deseas, y ejecútalo en el SQL Editor. Esto:

- Crea el usuario en **Authentication** (si no existe).
- Lo asigna a la dependencia **Nomina** con rol **emisor** (puede crear y enviar documentos).

Valores por defecto del script:

| Campo    | Valor por defecto     |
| -------- | --------------------- |
| Email    | `nomina@ejemplo.com`  |
| Contraseña | `Nomina2026!`       |
| Rol      | `emisor` en Nomina    |

> Cambia la contraseña después del primer inicio de sesión.

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
