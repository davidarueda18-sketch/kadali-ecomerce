# Kadali

Tienda en Next.js con Neon/PostgreSQL, Mercado Pago y autenticación con Google o correo.

## Desarrollo

Configura `.env.local` y ejecuta `pnpm dev`.

Variables principales: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`NEXT_PUBLIC_BASE_URL`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. Para el acceso configura también Google
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) o correo (`BREVO_API_KEY`, `EMAIL_FROM`).

En local usa `http://localhost:3000` para ambas URLs. Las variables existentes del
proceso tienen prioridad; en desarrollo `.env.development.local` precede a `.env.local`.
El servidor local utiliza la base indicada en `DATABASE_URL`: no es una base aislada.

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Desarrollo local |
| `pnpm build` | Compilar y comprobar tipos |
| `pnpm start` | Ejecutar la compilación |
| `pnpm lint` | Revisar el código |
| `pnpm test` | Pruebas de permisos, pedidos y pagos sin servicios externos |
| `pnpm db:studio` | Inspeccionar la base |
| `pnpm db:push` | Sincronizar el esquema directamente; revisar los cambios propuestos |

## Administración

El acceso a `/admin` requiere correo verificado y un rol activo en `admin_access`.
Se comprueba en el servidor en cada página y acción; no se concede por el correo
ni desde el perfil. Las asignaciones y revocaciones quedan en `access_events`.

Para preparar una base nueva o gestionar permisos, usa las herramientas de operador:

```bash
pnpm exec tsx scripts/migrate-admin.ts --apply
pnpm exec tsx scripts/manage-admin-access.ts migrate --apply
pnpm exec tsx scripts/manage-admin-access.ts grant --email=correo@ejemplo.com --apply
pnpm exec tsx scripts/manage-admin-access.ts revoke --email=correo@ejemplo.com --apply
```

Estos comandos utilizan la base configurada en `.env.local` o en el proceso.
Las migraciones anteriores son aditivas y no asignan roles automáticamente.
Los scripts de carga y sincronización de catálogo se conservan en `scripts/`
para mantenimiento puntual; no forman parte del arranque ni del despliegue.

## Pagos y producción

Configura las variables en Vercel y despliega después de modificarlas.
`NEXT_PUBLIC_BASE_URL` y `BETTER_AUTH_URL` deben ser el origen HTTPS público,
por ejemplo `https://www.kadalicandle.com`.

En Mercado Pago, configura el evento **Pagos (legacy)** de la aplicación productiva
con `https://www.kadalicandle.com/api/mercadopago/webhook`. Guarda su secreto en
`MP_WEBHOOK_SECRET`. El retorno del navegador es complementario: el webhook
verifica el pago con la API antes de confirmar el pedido.

Los intentos pendientes se conservan para el negocio. El cliente ve compras
confirmadas y su seguimiento. El inventario se descuenta una sola vez al confirmar
un pago nuevo; faltantes se registran en el historial. Las devoluciones y los pagos
históricos no ajustan existencias automáticamente.

La prueba integrada de base y rutas se ejecuta solo cuando se necesita:
`pnpm exec tsx tests/admin.integration.ts`. Requiere Node 24 y un servidor con la
compilación actual en el puerto 3109 (`pnpm exec next start --port 3109`). Crea y
elimina datos temporales en la base configurada; no ejecuta cobros.
