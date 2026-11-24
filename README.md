This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Mercado Pago

### Validar localmente antes de desplegar

1. Configura `.env.local` con `MP_ACCESS_TOKEN` de la cuenta **vendedora de prueba**,
   `NEXT_PUBLIC_BASE_URL=http://localhost:3000`, `BETTER_AUTH_URL=http://localhost:3000`,
   `DATABASE_URL` y `BETTER_AUTH_SECRET`. Next prioriza `.env.development.local` sobre
   `.env.local` durante desarrollo; revisa que no tenga valores que sobrescriban tu prueba.
2. Ejecuta `pnpm checkout:check`. Comprueba variables, esquema de Neon, producto de
   prueba y autenticación del token con Mercado Pago, sin escribir pedidos ni cobrar.
3. Ejecuta `pnpm dev` y, en otra terminal, `pnpm checkout:test`. Prueba el POST real
   del checkout para carrito vacío, correo inválido y cantidades negativas.
4. Ejecuta `pnpm checkout:test --create-order` para probar el flujo completo. Este
   comando **crea un pedido pendiente de $2.000 en la base configurada y una preferencia**;
   nunca ejecuta un cobro. El pedido usa `checkout-test@example.invalid` como correo.
5. Para probar el pago, abre `/productos/prueba-pago`, agrégalo al carrito y paga
   en incógnito con una cuenta **compradora de prueba distinta de la vendedora** y
   los medios de pago de prueba de Mercado Pago. La creación del enlace por sí sola
   no valida que un pago haya sido aprobado.

Para reproducir el comportamiento del build de producción localmente, detén `pnpm dev`,
ejecuta `pnpm build` y `pnpm start`, y luego `pnpm checkout:test --production-build`.
Puedes agregar `--create-order` para generar otro pedido de diagnóstico.

Mercado Pago no puede enviar webhooks a `localhost`. Para validar confirmaciones sin
el regreso del comprador necesitas un túnel HTTPS público hacia el servidor local,
configurar su URL en `NEXT_PUBLIC_BASE_URL` y en los Webhooks de Mercado Pago, configurar
`MP_WEBHOOK_SECRET` y reiniciar Next. Sin túnel se puede comprobar el checkout y el
retorno al navegador local, pero no la entrega del webhook.

### Diagnosticar errores

El checkout devuelve errores controlados con una referencia. Busca esa referencia en
los logs del servidor: `Checkout failed` incluye la etapa (`configuration`, `catalog`,
`session`, `order` o `mercado_pago_preference`), código y estado disponibles, sin imprimir
credenciales ni parámetros con datos del comprador.

`PA_UNAUTHORIZED_RESULT_FROM_POLICIES` / `PolicyAgent` con estado 403 es un rechazo
de autorización de Mercado Pago. Revisa el Access Token del **entorno del despliegue**,
su cuenta y la habilitación de la aplicación; no permite deducir por sí solo cuál
política falló. Si persiste con credenciales vigentes, consulta a soporte de Mercado Pago.
Cambiar variables en Vercel requiere un nuevo despliegue para que tengan efecto.

Para investigar `SignatureMismatch` sin cambiar claves a ciegas:

```bash
pnpm payments:diagnose-webhook
```

Si local usa claves de prueba y Vercel claves productivas, es normal que las
huellas difieran: esa comparación no demuestra que la clave productiva esté mal.
Para comprobar producción de forma aislada, crea `.env.production.local` (ignorado
por Git) con `MP_WEBHOOK_SECRET` copiado de Webhooks > Modo productivo de la
aplicación correcta, y ejecuta `pnpm payments:diagnose-webhook --production-env`.
El comando no carga las claves de desarrollo con esa opción y no modifica sus archivos.

El comando valida una solicitud con el SDK y el handler locales y envía la misma
solicitud al despliegue público como evento `diagnostic`, que se ignora después de
validar la firma. No consulta pagos, no modifica pedidos y no cobra. Usa la hora
remota para descartar diferencias de reloj. Puedes indicar otro destino con
`--url=https://tu-dominio.com/api/mercadopago/webhook`.

Si local responde 200 y producción 401, busca el Request ID impreso en Vercel.
Después de desplegar el código de diagnóstico, compara `secretFingerprint` con
la huella local impresa: si difieren, el despliegue está usando otra clave. Si
coinciden, compara `requestId`, `paymentId`, `dataIdOccurrences` y
`signatureTimestamp` para detectar diferencias en los datos firmados. Los logs
también identifican entorno y commit. No imprimas ni compartas el secreto o
la cabecera de firma completa. Un 200 en este diagnóstico solo valida la
compatibilidad de firma local/despliegue; todavía se debe comprobar una
notificación auténtica de Mercado Pago.

### Producción

El cobro público requiere `MP_WEBHOOK_SECRET` antes de crear un pedido o una
preferencia. En Vercel Production también se rechaza una URL de retorno local.
El retorno del navegador es complementario: la confirmación del pedido debe
funcionar cuando el comprador cierra Mercado Pago sin volver a la tienda.

1. En Mercado Pago Developers, abre la aplicación de la cuenta vendedora real,
   Webhooks > Configurar notificaciones > Modo productivo.
2. Configura `https://www.kadalicandle.com/api/mercadopago/webhook`, activa **Pagos**
   y guarda. Copia la clave secreta de esa aplicación a `MP_WEBHOOK_SECRET` en
   Vercel, entorno **Production**. No es el Access Token ni la Public Key.
3. Configura `NEXT_PUBLIC_BASE_URL=https://www.kadalicandle.com` y realiza un nuevo
   despliegue. Comprueba también `BETTER_AUTH_URL` con el mismo origen público.
4. Ejecuta `pnpm checkout:check --webhook-url=https://www.kadalicandle.com/api/mercadopago/webhook`.
   Esta comprobación no cobra ni modifica pedidos. Un POST sin firma debe recibir
   **401**, no **503**. El 401 solo confirma que existe configuración y se exige firma;
   no acredita que la clave coincida ni que se actualicen pedidos.
5. En el historial de notificaciones de Mercado Pago, reenvía un evento **Pagos**
   de un pago auténtico de la tienda. Comprueba **200** y el pedido `paid` en Neon.
   Un ID ficticio del simulador no tiene un pedido asociado y no confirma este flujo.
6. Prueba un pago controlado, cierra Mercado Pago sin volver a la tienda y confirma
   que el webhook actualiza el pedido. Reenvía el mismo evento y verifica que
   conserva su estado. Solo después considera validado el cierre de la compra.

`pnpm payments:test` prueba la confirmación sin retorno del navegador, duplicados,
firmas inválidas, fallos temporales de API/BD, importes/monedas/referencias incorrectos
y el bloqueo de cobros públicos sin secreto. Usa dobles de API y repositorio: no
reemplaza la validación de una entrega real en el despliegue.

Los logs del webhook incluyen `requestId`, `paymentId`, resultado y motivos de rechazo.
No se devuelve 200 hasta que termina la conciliación. Ante un fallo se devuelve 500
para permitir los reintentos de Mercado Pago. Un reintento de pago rechazado no
cancela una orden que ya está pagada.

Para cobrar en producción configura estas variables en el entorno desplegado:

```dotenv
MP_ACCESS_TOKEN=tu_access_token
MP_WEBHOOK_SECRET=la_clave_secreta_de_webhooks
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

En Mercado Pago activa el evento **Pagos** con la URL
`https://tu-dominio.com/api/mercadopago/webhook`. La URL debe ser HTTPS. El producto interno de
prueba está oculto del catálogo y se abre directamente en `/productos/prueba-pago`.

Para sincronizar en Neon el precio de las velas y el producto de prueba:

```bash
npm run db:sync-payment-catalog
npm run db:sync-payment-catalog -- --apply
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
