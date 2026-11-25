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
| `pnpm test:ui` | Describe la validación de navegador con administrador temporal |
| `pnpm emails:process` | Procesar una tanda de correos pendientes |
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

### Estados de pago y entrega

La primera entrega separa `paymentStatus` de `fulfillmentStatus`. `status` se
conserva como proyección compatible con la versión anterior; las decisiones del
panel usan los campos separados. Se registran origen, referencia del pago y
procedencia de la fecha de aprobación. Los cancelados históricos sin causa
conocida se identifican como tales.

Antes de desplegar esta versión, aplicar la migración aditiva en la base de
destino, después de verificar su conexión y respaldo:

```bash
pnpm exec tsx scripts/migrate-order-state.ts
pnpm exec tsx scripts/migrate-order-state.ts --apply
```

Sin `--apply` el comando solo describe la migración. Requiere haber aplicado
`scripts/admin-migration.sql`. La migración se prueba con PostgreSQL en memoria
mediante PGlite al ejecutar `pnpm test`, sin leer credenciales ni escribir en Neon.
Es repetible y conserva un trigger para compatibilidad durante el despliegue.
Para revertir la aplicación, volver a la versión anterior y dejar las columnas
y el trigger: no borrar datos financieros. La interfaz anterior conserva sus
limitaciones para distinguir estados de posventa.

El procedimiento y el avance están en [el plan administrativo](docs/plan-administracion.md).

### Comisión por pedido

En `/admin/configuracion` se administra la tarifa de Mercado Pago, inicialmente
2,79 % + $800 COP. Se calcula sobre el total cobrado, incluido el envío, y se
guarda con el pedido en su primera confirmación, usando la tarifa vigente en ese
momento. Se conservan importe, base, porcentaje, cargo fijo, versión y fecha.
Los cambios de tarifa no modifican pedidos ya confirmados. Los pedidos históricos
sin comisión registrada siguen mostrando información desconocida.

Aplicar esta migración después de la de estados y antes de ejecutar la segunda
entrega sobre la base de destino:

```bash
pnpm exec tsx scripts/migrate-commission.ts
pnpm exec tsx scripts/migrate-commission.ts --apply
```

Sin `--apply` no se abre conexión ni se escribe en la base. La migración es
aditiva, repetible y no reemplaza una tarifa configurada previamente. Para volver
a la aplicación anterior, conservar columnas y configuración; las confirmaciones
procesadas por esa versión pueden quedar sin comisión, sin inventar importes al
consultarlas después. Ambas migraciones se validan en PostgreSQL aislado con
`pnpm test`.

El detalle administrativo separa productos, envío, total, comisión estimada y neto
después de comisión. Esta estimación no modifica el cobro de Mercado Pago ni es
una liquidación real del proveedor o un cálculo de utilidad. El helper de ventas
manuales registra comisión cero.

### Ventas manuales

En `/admin/pedidos/nuevo` se registran ventas ya pagadas en efectivo o transferencia.
El precio se precarga desde el catálogo y es editable por venta; no modifica el
precio público. Una fecha vacía usa el día de Colombia. Correo y envío son
opcionales; las ventas sin envío se registran como entregadas, sin dirección ni
correos ficticios. Cuando hay envío se requieren nombre, dirección y ciudad.

Desde el detalle de una venta manual se puede corregir con un motivo. Se conserva
la versión anterior, la nueva y el responsable. Las compras web no se pueden
modificar mediante ese formulario. El guardado usa una clave única por formulario
y una revisión para impedir ventas duplicadas o correcciones desde una versión
desactualizada.

Aplicar la migración después de las de estados y comisiones, antes de ejecutar
esta versión sobre la base de destino:

```bash
pnpm exec tsx scripts/migrate-manual-sales.ts
pnpm exec tsx scripts/migrate-manual-sales.ts --apply
```

La migración permite valores nulos en correo, dirección y ciudad, y agrega los
datos propios de ventas externas. Los pedidos web siguen validando sus datos de
checkout. No cambia pedidos existentes ni elimina información. Para revertir la
aplicación, conservar las columnas y su información; no reimponer `NOT NULL` sin
resolver antes las ventas sin contacto o envío. La versión anterior no ofrece
gestión completa de estos registros.

El stock se descuenta sin bajar de cero. Corregir precios o contacto no descuenta
otra vez; aumentar cantidades solo procesa unidades adicionales. Antes de iniciar
la preparación, una reducción libera únicamente el exceso realmente descontado.
Después de iniciada la entrega, las reducciones no reponen stock. Se conserva un
registro interno por venta para que quitar y volver a añadir el mismo producto no
duplique descuentos. No se añade una interfaz de inventario avanzada.

Estas operaciones, incluida su reversión completa ante errores de auditoría, se
prueban con PostgreSQL aislado mediante `pnpm test`. El módulo no genera cobros en
Mercado Pago. Las ventas con correo generan una notificación de compra; las que
requieren envío y fabricación conservan también el plazo informado.

### Administración completa

Rutas para revisar la funcionalidad y comenzar ajustes visuales:

| Ruta | Función |
| --- | --- |
| `/admin` | Resumen, comparación por fechas y pendientes operativos |
| `/admin/pedidos` | Búsqueda, filtros, notas, preparación y envío |
| `/admin/pedidos/nuevo` | Venta manual |
| `/admin/promociones` | Precio especial por producto o descuento por categoría |
| `/admin/clientes` | Compradores invitados y con cuenta, historial y notas |
| `/admin/reportes` | Evolución, productos, compradores, comisiones y neto |
| `/admin/correos` | Estado y reintento de correos transaccionales |
| `/admin/configuracion` | Tarifa de Mercado Pago |

La última migración se aplica después de las tres anteriores:

```bash
pnpm exec tsx scripts/migrate-admin-completion.ts --apply
```

Es aditiva y no crea promociones, compras ni notificaciones retroactivas. Conservar
las columnas y tablas al volver a una versión anterior; no eliminar datos para
revertir la aplicación. Los precios promocionales se calculan en cada consulta;
portada y catálogo usan datos dinámicos para respetar vigencias.

### Procesamiento de correos

Configurar `BREVO_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_BASE_URL` y `CRON_SECRET`.
Las compras confirmadas y los cambios de entrega guardan primero el evento en la
base y lo procesan después de responder. Un fallo de correo no revierte el pago.
Los errores de autenticación distinguen la restricción de IP. Si Brevo bloquea el
servidor, autorizar su IP desde Seguridad → IP autorizadas en la cuenta correspondiente.
[Guía de IP de Brevo](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security).

Hay hasta cinco intentos con espera creciente y recuperación de procesos
interrumpidos. La clave de idempotencia UUID se conserva por evento. Brevo limita
su deduplicación a una ventana de 30 minutos; un fallo después de enviar y antes
de registrar el resultado puede producir duplicados fuera de esa ventana.
[Idempotencia de Brevo](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).

Para procesar o reintentar localmente:

```bash
pnpm emails:process
pnpm exec tsx scripts/process-emails.ts --watch
```

`vercel.json` incluye un respaldo diario mediante `/api/cron/emails`, protegido con
`Authorization: Bearer CRON_SECRET`. Configurar el mismo secreto en el alojamiento
al publicar. El envío habitual se intenta después de cada evento; el cron es un
respaldo. En Vercel Hobby los cron tradicionales admiten frecuencia diaria; para
reintentos más frecuentes se puede usar el trabajador local o un plan/programador
que permita otra frecuencia. [Límites de Vercel](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

### Validación en navegador

```bash
pnpm exec playwright install chromium
pnpm test:ui --temporary-admin --base-url=http://localhost:3000
```

Requiere el servidor local con la compilación actual y la base migrada. Crea solo
un usuario, permiso y sesión temporales de QA, los elimina al finalizar y conserva
los eventos de asignación y revocación en la auditoría. Verifica páginas protegidas,
formulario manual, catálogo, carrito, checkout y móvil. No registra compras ni
envía correos. Los errores de formulario se prueban con datos inválidos que no se
guardan. Las capturas quedan en `output/*-review*.png`.

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
