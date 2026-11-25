# Plan de construcción del administrador de Kadali

Estado: entregas 1 a 9 implementadas; migraciones aplicadas a la base configurada de la tienda. Validación integrada y de navegador completada: 57 pruebas, lint y compilación aprobados. Versión disponible en `http://localhost:3000/admin` para revisión visual y de UX/UI. El envío real de correos sigue pendiente por la restricción de IP de Brevo descrita al cierre. El despliegue público sigue separado de la ejecución local. Contexto obligatorio: [reglas del negocio](contexto-negocio.md). La gestión de reembolsos y devoluciones continúa aplazada.

## Método de entrega

El propietario autorizó completar todas las entregas restantes en una sola ejecución para comenzar la revisión visual y de UX/UI. Se mantienen comprobaciones por módulo, migraciones verificadas en PostgreSQL aislado y una validación integrada antes de cerrar la ejecución.

Para cerrar cada entrega: comprobar criterios de aceptación, ejecutar las pruebas necesarias para el riesgo del cambio, lint y compilación cuando cambie código; documentar resultado, limitaciones, migración y reversión. Corregir fallos antes de avanzar. Mantener los cambios y datos existentes; no hacer refactorizaciones ajenas al objetivo.

Las migraciones deben ser aditivas y compatibles con datos históricos. Prepararlas y probarlas en una base aislada; verificar destino antes de cualquier escritura. No ejecutar las pruebas integradas actuales sobre datos reales por asumir que el entorno local está aislado. Desplegar es una acción distinta de implementar y validar.

No hay una estimación de calendario todavía. Se prioriza cerrar entregas completas sobre iniciar varias simultáneamente.

## Entrega 1 Estados de pago y trazabilidad

**Resultado:** un pedido conserva su situación financiera aunque cambie la entrega, y viceversa.

Definir un estado de pago independiente de la entrega, identificador del pago y origen de la venta. Distinguir pendientes, confirmados y rechazados o cancelados sin cobro, conservando la información de eventos del proveedor ya existente. No construir ahora el modelo completo ni los flujos de reembolsos, devoluciones o disputas. El nivel de detalle debe corresponder a datos verificables, no a inferencias sobre el estado antiguo.

Actualizar conciliación, webhook, retorno del comprador, gestión de envíos, consultas y etiquetas en conjunto. Conservar el funcionamiento actual durante la migración. Usar fecha de aprobación del proveedor para nuevas confirmaciones y distinguir fechas históricas observadas o desconocidas. Un despacho no cambia la fecha del pago.

**Validación:** una compra sigue pagada al despacharla; rechazar otro intento no anula un pago aprobado; notificaciones repetidas o concurrentes no duplican confirmaciones ni descuentos de stock; eventos tardíos no borran un reembolso confirmado. Migrar registros históricos sin asignar causas inexistentes a los cancelados. Los permisos se comprueban en servidor.

## Entrega 2 Comisión de Mercado Pago por pedido

**Resultado:** consultar el cobro y el costo de procesamiento de cada venta.

Agregar configuración simple con tarifa inicial de 2,79 % más $800 COP por pedido confirmado en Mercado Pago. Criterio operativo: calcular sobre el total cobrado, incluido envío, con aritmética monetaria y redondeo a dos decimales. Guardar regla e importe en el pedido al confirmar el pago. Mostrar subtotal de productos, envío, total, comisión y neto después de comisión. Distinguir estimación de importe real si posteriormente se obtiene del proveedor.

**Validación:** efectivo y transferencia manual tienen comisión cero; una venta web aplica una sola comisión por pago confirmado. Un cobro de $90.000 COP produce una comisión estimada de $3.311 COP y un neto de $86.689 COP. Cambiar la tasa solo afecta nuevas ventas. Los históricos sin información muestran dato desconocido. No descontar nuevamente una comisión del importe enviado a Mercado Pago ni cobrarla al comprador. El neto no se etiqueta como utilidad.

## Entrega 3 Ventas manuales

**Resultado:** registrar y corregir ventas externas desde el administrador.

Formulario con productos, cantidades y precio unitario editable, precargado con el precio base del producto en la base de datos. Si no se modifica, usar ese precio. Registrar efectivo o transferencia, con origen y medio de pago separados. Fecha efectiva opcional: si se omite, usar el día actual en America/Bogota. Correo y envío opcionales; conservar el momento de registro por separado. Registrar una venta cobrada y su historial sin llamar a Mercado Pago. El precio manual no modifica catálogo ni aplica promociones automáticamente.

Permitir correcciones con motivo, versiones anteriores y responsable. Los totales se calculan en servidor y el guardado es transaccional. Descontar stock una sola vez, sin bajar de cero. Las correcciones de cantidades deben tratar solo la diferencia y dejar evidencia; no repetir el descuento original ni reponer automáticamente productos fabricados o entregados. Prevenir duplicados por doble envío del formulario. No permitir modificar importes de compras web pagadas mediante esta función.

**Validación:** dos velas en efectivo a un precio distinto del catálogo aparecen correctamente en pedidos, con comisión cero. Omitir fecha usa el día local; omitir una edición de precio conserva el valor precargado de la base de datos. Efectivo y transferencia descuentan stock una sola vez, sin valores negativos. Una corrección deja evidencia y no genera cobros ni descuentos duplicados. Una venta sin envío no exige dirección y una venta sin correo no crea un cliente ficticio.

## Entrega 4 Compra con fabricación bajo pedido

**Resultado:** poder comprar un producto publicado con stock cero o insuficiente y conocer su plazo de preparación.

Actualizar detalle, botones de compra, carrito y validación de checkout. Si falta stock para completar el pedido, mostrar «El tiempo de preparación de tu pedido es de 2 a 5 días calendario» y guardar el plazo comunicado. Como criterio operativo, contar desde la confirmación del pago. Realizar un único envío cuando todo esté listo; no prometer entregas parciales. Mostrar la condición también en el detalle administrativo y del cliente, diferenciando preparación y transporte.

Conservar la edición de stock y el descuento existente, con suelo cero. Tratar la fabricación prevista como condición de preparación, sin generar una falsa incidencia de inventario por cada venta bajo pedido. No construir reservas ni calendario de producción.

**Validación:** stock cero permite pagar; stock uno y compra de tres muestra preparación de 2 a 5 días calendario para el pedido completo. Un carrito con varios productos y un faltante muestra el mismo aviso y un único envío. Los productos archivados siguen excluidos. La advertencia es visible antes de pagar y el límite de cantidad sigue vigente. En un pago demorado, revalidar disponibilidad y conservar evidencia de la condición informada, sin prometer despacho inmediato si el stock cambió.

## Entrega 5 Promociones simples

**Resultado:** crear, activar y desactivar una promoción por producto o categoría y cobrar el precio correcto en toda la tienda.

Construir la administración de promociones y una única función de precio efectivo utilizada por servidor y consultas del catálogo. Precio especial fijo por producto y descuento porcentual por categoría; activación y desactivación manuales, con fechas opcionales. Ante coincidencias, aplicar el menor precio válido sin acumular descuentos. Conservar precio base y precio vendido.

Actualizar listados, destacados, detalle, filtros, ordenación, carrito y checkout; mostrar precio anterior y promocional cuando aplique. Reconciliar carritos persistidos con el precio vigente y comunicar cambios antes de crear el pago. Una preferencia de pago ya creada conserva el importe de su pedido: no recalcularla por un cambio posterior de promoción.

**Validación:** producto y categoría aplican su descuento; coincidencias respetan la regla acordada; vencimiento y desactivación actualizan la tienda; categorías sin descuento mantienen su precio. El total mostrado coincide con el pedido y el cobro de Mercado Pago. Rechazar descuentos inválidos y precios no positivos. Una venta manual conserva el precio definido por el administrador.

## Entrega 6 Correos de compra y seguimiento

**Resultado:** el comprador recibe agradecimiento y seguimiento aunque compre como invitado.

Reutilizar Brevo con plantillas de confirmación y despacho. Separar confirmación de pago de intento pendiente. Para cuentas existentes, botón hacia pedidos; para invitados, explicación de acceso con el mismo correo verificado y contacto de soporte. La condición depende de si existe una cuenta, no solo de haber comprado sin sesión.

Guardar el evento a notificar en la misma transacción que confirma el pago o el despacho; entregar mediante una cola persistente simple, con estados, reintentos y deduplicación. Definir el mecanismo de ejecución compatible con el hosting y su configuración, sin depender de una tarea en memoria después de responder al webhook. Un fallo de correo no revierte una compra ni provoca otro cobro. Incluir seguimiento y plazo bajo pedido cuando aplique.

**Validación:** un pago aprobado genera una notificación lógica; eventos repetidos no crean otra. Simular indisponibilidad de Brevo y reintentar. Probar el fallo entre envío y confirmación local, usando idempotencia del proveedor si está disponible; no prometer entrega exactamente una vez sin ese soporte. Una compra invitada se puede recuperar tras verificar el mismo correo, también con cuenta preexistente. Ningún correo concede acceso a pedidos ajenos. Ventas presenciales sin correo no quedan como notificaciones fallidas.

## Entrega 7 Clientes

**Resultado:** consultar la relación comercial con cada comprador.

Listado con búsqueda, última compra, número de compras confirmadas y gasto; ficha con contacto, pedidos y notas internas. Incluir invitados sin exigir registro. Usar la identidad y normalización definidas en el contexto, y conservar las direcciones y precios originales de cada pedido.

**Validación:** dos compras con el mismo correo normalizado se agrupan; clientes con igual nombre y distinto correo permanecen separados. Los pendientes no aumentan gasto ni recurrencia. Acceder después de comprar como invitado no duplica clientes. Las ventas sin identidad se muestran como no identificadas, sin contarlas como un único comprador real.

## Entrega 8 Pedidos y pendientes operativos

**Resultado:** identificar qué requiere atención y actuar desde cada registro.

Filtros independientes por pago, entrega, origen, fechas y comprador; notas internas e historial legible. Bandeja o bloques de pendientes para pagos por comprobar, pedidos pagados por preparar, fabricación pendiente y despachos. Los avisos de stock ya existentes pueden conservarse, sin añadir un módulo de inventario.

Los enlaces del resumen deben abrir exactamente el conjunto representado. Una venta presencial ya entregada no entra en preparación. Guardar evidencia o referencias de entrega en el pedido para apoyar la atención de reclamos.

**Validación:** filtros combinados y paginación conservan parámetros; cada contador coincide con sus resultados; el historial identifica responsable y fecha. No despachar pedidos no pagados. Verificar móvil, estados vacíos y errores de guardado sin perder los datos del formulario.

## Entrega 9 Resumen y reportes

**Resultado:** evaluar ventas y operación mediante cifras consistentes dentro del panel, sin exportaciones.

Incluir selector de fechas, comparación con período anterior de igual duración, evolución de ventas, productos más vendidos y compradores recurrentes. Permitir ver web y ventas externas juntas o por separado.

Contrato de métricas a implementar y probar:

| Indicador | Definición |
| --- | --- |
| Ventas de productos | Suma de líneas al precio realmente vendido, después de descuentos. |
| Envíos cobrados | Importe cobrado por envío; no es costo logístico ni utilidad. |
| Pedidos confirmados | Pedidos actualmente confirmados según los datos financieros disponibles, contados una vez. No inferir la causa de cancelaciones históricas. |
| Ticket promedio | Total cobrado de pedidos incluidos dividido por su número, con envío incluido y etiqueta explícita. |
| Compradores únicos | Identidades verificables con compra confirmada en el período; informar ventas sin comprador identificado por separado. |
| Comisión | Importe registrado en cada pedido; separar valores estimados y desconocidos. |
| Neto después de comisión | Cobros de los pedidos incluidos menos sus comisiones registradas. Indicar estimaciones y datos incompletos; no presentarlo como conciliación de reembolsos ni utilidad. |
| Productos más vendidos | Unidades e importe vendido de los pedidos incluidos. |

Agrupar cobros por fecha de aprobación o fecha efectiva de venta manual. Guardar fecha de registro por separado. Si faltan fechas históricas fiables, etiquetar la aproximación o excluirla del desglose con explicación. Explicar que los resultados reflejan los estados disponibles al consultar; el análisis histórico de reembolsos y disputas queda para la futura gestión de posventa y no es un requisito de esta entrega.

**Validación:** límites de día en America/Bogota, comparación con base cero, períodos vacíos, efectivo, transferencia manual, promociones y comisión desconocida. Contrastar cifras con un conjunto pequeño de pedidos de importes conocidos. Excluir pagos de prueba y pendientes. Los indicadores y sus detalles deben compartir filtros y reglas.

## Posventa aplazada

Por decisión del propietario, el módulo de reembolsos, devoluciones y disputas se definirá después. No construir formularios, ejecución de reembolsos, nuevas automatizaciones ni una política comercial de posventa en las entregas actuales. Conservar el procesamiento ya existente de eventos del proveedor. Esta decisión no bloquea el resumen ni los reportes básicos.

## Registro de avance

### Entrega 1

24 de noviembre de 2026. Implementada en código: estados financieros y de entrega separados; referencia del pago y origen; fecha del proveedor diferenciada de observada o histórica aproximada; conciliación con revisión financiera y bloqueo transaccional; stock y auditoría confirmados en la misma transacción. Actualizados administrador, filtros, historial del comprador, retorno y webhook. Se conservan los permisos en servidor y el inventario simple.

Migración aditiva en `scripts/order-state-migration.sql`, con ejecutor `scripts/migrate-order-state.ts`. Probada en PostgreSQL aislado mediante PGlite, incluyendo repetición y compatibilidad con escrituras de la versión anterior. No aplicada a la base configurada de la tienda. El despliegue requiere aplicar primero la migración; para volver a la aplicación anterior, conservar columnas y trigger, sin eliminar los datos nuevos.

Validación final: 35 pruebas aprobadas con `pnpm test`, incluyendo permisos y firma del webhook; migración histórica, aprobaciones concurrentes y repetidas, rechazo de otros intentos, eventos financieros después del despacho, rechazo de aprobación tardía, fecha del proveedor, stock sin doble descuento y reversión completa ante fallo de auditoría. `pnpm lint` y `pnpm build` aprobados. Verificados por HTTP con la compilación de producción local: redirección de anónimos en `/admin`, listado y detalle de pedidos y `/cuenta/pedidos`; permiso administrativo falso sin sesión y rechazo de la acción directa `saveShipment` sin sesión. No se crearon sesiones ni datos de prueba en Neon.

Pendiente para activación: migración de la base de destino y revisión de las rutas autenticadas con esa base ya migrada. La suite integrada anterior de rutas con Neon no se ejecutó porque puede escribir en la base real.

### Entrega 2

24 de noviembre de 2026. Implementada en código: configuración administrativa de comisión con tarifa inicial de 2,79 % + $800 COP; validación en servidor; protección frente a cambios de tarifa simultáneos e historial con responsable. Los pedidos guardan una única comisión estimada en la primera confirmación, con aritmética de centavos, base total incluido envío y versión de la tarifa. El registro ocurre en la misma transacción que el pago, stock y auditoría.

El detalle de pedido separa productos, envío, total, comisión y neto después de comisión con dos decimales. Se distinguen estimaciones, pedidos pendientes y datos históricos desconocidos. Una nueva consulta del proveedor no asigna una tarifa actual a una compra histórica ni modifica la comisión ya registrada. El cálculo compartido para las próximas ventas manuales produce comisión cero; no se ha iniciado su formulario.

Validación: 43 pruebas aprobadas con `pnpm test`; cálculo y redondeo, neto negativo, ventas manuales sin comisión, reglas inválidas, confirmaciones concurrentes y repetidas, tarifas cambiadas, históricos desconocidos, migración repetible y reversión transaccional ante fallo de auditoría. `pnpm lint` y `pnpm build` aprobados. El ejecutor de migración se comprobó sin `--apply`. Verificado por HTTP con compilación de producción local: acceso a `/admin/configuracion` y acción directa `saveCommissionSettings` denegados sin sesión, sin escribir datos en Neon.

Migración aditiva `scripts/commission-migration.sql` y ejecutor `scripts/migrate-commission.ts`, probados con PostgreSQL aislado, sin aplicar a Neon. Aplicar después de la migración de estados y antes de activar el código. Para revertir a la versión anterior de la aplicación, conservar columnas y configuración; sus confirmaciones sin comisión quedan como desconocidas. Sigue pendiente la revisión autenticada sobre una base de destino migrada.

### Entrega 3

24 de noviembre de 2026. Implementada en código: formulario de venta manual en `/admin/pedidos/nuevo`, acceso desde pedidos y corrección en `/admin/pedidos/[id]/editar`. Permite efectivo o transferencia; precios precargados del catálogo y editables; fecha opcional con día de Colombia por defecto; correo y envío opcionales. Las ventas sin envío se registran entregadas, sin dirección ni correo ficticio. Las ventas con envío exigen destinatario, dirección y ciudad y siguen el flujo de preparación existente.

Los importes se validan y calculan en centavos en el servidor; la comisión es cero y no se llama a Mercado Pago. Se impiden duplicados con clave de formulario y se rechazan correcciones desactualizadas o sobre pedidos web. Pago, líneas, stock y auditoría se guardan en una transacción. Cada corrección exige motivo y conserva versiones anterior y nueva, con responsable. El inventario sigue siendo un número editable: únicamente se mantiene contabilidad interna por venta para evitar descuentos repetidos y reposiciones de unidades que nunca se descontaron.

Validación final: 51 pruebas aprobadas con `pnpm test`, `pnpm lint` y `pnpm build` aprobados. Incluye fecha de Colombia, ventas sin contacto, precio por defecto, precio personalizado, transferencia, envío, importes decimales, doble envío concurrente, correcciones de precio, revisión desactualizada, rechazo de pedidos web, stock insuficiente, reducción y reingreso de productos y reversión transaccional ante fallos. Migración repetida y ejecutor sin `--apply` comprobados. Verificado por HTTP con compilación de producción local: páginas de creación y corrección y acción directa `saveManualSaleAction` denegadas sin sesión, sin escribir datos en Neon.

Migración `scripts/manual-sales-migration.sql` y ejecutor `scripts/migrate-manual-sales.ts`, probados en PostgreSQL aislado, sin aplicar a Neon. Aplicar después de estados y comisiones. Para volver a la aplicación anterior, conservar columnas y registros; no reimponer restricciones de contacto obligatorio sobre ventas sin esos datos. Pendientes: activación de las migraciones y revisión autenticada en una base migrada. Las entregas 4 a 9 no se han iniciado.

### Activación de las migraciones de las entregas 1 a 3

24 de noviembre de 2026. Corregido el error `42703: column paymentStatus does not exist`: el código del administrador se estaba ejecutando contra una base sin las migraciones de las tres entregas. Se comprobó que los entornos locales de desarrollo y producción no definen otra conexión que sustituya la de `.env.local`.

Aplicadas `order-state-migration.sql`, `commission-migration.sql` y `manual-sales-migration.sql`, en ese orden, dentro de una única transacción en la base configurada. Se verificó antes de confirmar que permanecieran intactos los 27 pedidos y sus campos anteriores, salvo `fulfillmentStatus`, cuya normalización histórica está prevista por la migración. También se verificó que las 28 líneas de pedido y los 6 productos con su stock permanecieran intactos.

Verificación posterior mediante Drizzle y el esquema actual: consulta de pedidos aprobada con 20 registros en la primera página y 7 en la segunda; configuración de comisión y catálogo disponibles. Las rutas del administrador en los servidores locales de los puertos 3000 y 3109 siguen exigiendo sesión. No se crearon ventas, sesiones ni pagos de prueba en esta base. No se modificaron importes ni se ejecutaron cobros.

Este registro sustituye el estado de migraciones pendientes indicado en los registros iniciales de cada entrega. Queda pendiente la revisión de la interfaz con una sesión administrativa real y el despliegue de la aplicación publicada; las entregas 4 a 9 continúan sin iniciarse.

### Entrega 4 Fabricación bajo pedido

24 de noviembre de 2026. Se permiten cantidades superiores al stock y productos publicados con stock cero, conservando el límite de 99 unidades por producto en la web. Producto, carrito y checkout informan preparación de 2 a 5 días calendario y un único envío. El checkout exige aceptar ese plazo cuando corresponde. Se conserva el mensaje y la cantidad a fabricar por línea; si el stock cambia mientras se confirma el pago, se registra la nueva necesidad de preparación sin repetir el descuento de existencias. Los archivados siguen excluidos de la compra pública.

### Entrega 5 Promociones

Administración en `/admin/promociones`: precio fijo por producto, porcentaje por categoría, activación, desactivación y vigencia opcional en horario de Colombia. Un cálculo común elige el menor precio válido, sin acumulación. Se integra con catálogo, filtros y ordenación por precio, destacados, portada, detalle, carrito y checkout. Se muestran precio base y promocional; al cambiar el precio de un carrito se exige revisar nuevamente el total antes de crear el pago. Los pedidos conservan su precio base, descuento y promoción originales. Las ventas manuales continúan usando precios independientes.

### Entrega 6 Correos transaccionales

Cola persistente `email_jobs`, registrada en la misma transacción que confirma la compra o actualiza el envío. Incluye agradecimiento, preparación, despacho y entrega; referencia, productos, importes y seguimiento. La plantilla diferencia compradores con cuenta e invitados, explica el acceso con el mismo correo verificado y escapa los datos para HTML. No expone pedidos con enlaces públicos sin verificación.

Procesamiento después de la respuesta mediante `after`, trabajadores concurrentes con bloqueo de fila, recuperación de ejecuciones interrumpidas, hasta cinco intentos y reintentos con espera creciente. Se usa una clave UUID determinista por evento para la deduplicación de Brevo; esa protección tiene una ventana limitada y no garantiza entrega exactamente una vez. Estado y reintento administrativo en `/admin/correos`. Respaldo programado diario en `vercel.json`, ruta protegida por `CRON_SECRET`, y ejecutor local `scripts/process-emails.ts --watch`. No se crean correos para ventas sin destinatario ni notificaciones retroactivas por migrar la base.

Validación del proveedor: inicialmente devolvió HTTP 401 por restricción de IP, no por una clave necesariamente inválida. Se identificó la IP reportada por Brevo y se solicitó su autorización al propietario. El estado definitivo de esta comprobación se registra al cerrar la ejecución.

### Entrega 7 Clientes

Listado con búsqueda y paginación en `/admin/clientes`; detalle con contacto, compras, gasto, última compra, tipo de cuenta y notas internas. Los compradores invitados se agrupan por correo normalizado sin fusionar nombres iguales. Los pendientes y el producto interno de pagos no inflan los indicadores. Las ventas sin correo se mantienen como no identificadas. El historial administrativo conserva la visibilidad de intentos y compras, y sus notas no alteran los datos históricos de cada pedido.

### Entrega 8 Operación de pedidos

Filtros combinables por pago, entrega, origen, fechas efectivas y pendientes. Contadores globales del resumen con enlaces al mismo conjunto de registros: pagos por comprobar, por preparar, por despachar y fabricación pendiente. Las ventas presenciales entregadas no entran en preparación. Se agregan notas internas como eventos y referencias de evidencia de entrega. Los cambios de guía de un envío se notifican con deduplicación; guardar datos idénticos no genera otro correo. Los formularios administrativos conservan los datos ingresados ante errores de validación.

### Entrega 9 Resumen y reportes

Resumen en `/admin` y reportes en `/admin/reportes`, con rango de fechas, comparación con un período anterior de igual duración y filtro de origen. Productos, envíos, total, pedidos, ticket promedio, compradores únicos, comisiones y neto se presentan por separado. Evolución de ventas, cifras de la gráfica, productos más vendidos y compradores recurrentes. Se usan precios históricos y fechas de Colombia; las ventas manuales conservan su fecha efectiva. Se señalan fechas aproximadas, comisiones desconocidas y ventas sin identidad. Los pagos de prueba y pendientes quedan excluidos. El neto no se presenta como utilidad ni como conciliación de devoluciones.

### Validación y activación de las entregas 4 a 9

La migración `scripts/admin-completion-migration.sql` se probó en PostgreSQL aislado y se aplicó transaccionalmente a la base configurada. Se verificó la conservación exacta de los 28 pedidos, 29 líneas, 6 productos y 1 categoría presentes al aplicarla; no se modificaron importes, stock ni estados anteriores ni se generaron correos retroactivos.

La suite integrada cuenta con 57 pruebas. Incluye promociones y fechas límite, aceptación del plazo, stock insuficiente al confirmar, una sola notificación por evento, fallos y recuperación de trabajadores, notas y agrupación de clientes, importes de ventas manuales, límites de día de Colombia y exclusión de pagos de prueba. La prueba de navegador se ejecuta con `scripts/check-admin-ui.ts`, usando un administrador temporal que se elimina al finalizar; registra la asignación y revocación del permiso en la auditoría de accesos. No registra compras ni genera cobros. Evidencia local en `output/*-review*.png`.

Cierre del 24 de noviembre de 2026: `pnpm test` (57 pruebas), `pnpm lint` y `pnpm build` aprobados. La prueba de navegador autenticada pasó en escritorio y móvil, incluidos detalle de cliente y pedido, compra bajo pedido sin confirmar un cobro, ausencia de errores de JavaScript y conservación del formulario ante errores de validación. Se comprobó la eliminación del usuario temporal; no quedaron promociones ni correos de prueba en la base. La compilación validada está activa en el servidor local del puerto 3000. No se realizó despliegue público.

Limitación externa pendiente: después de que el propietario informó haber actualizado Brevo, una nueva consulta de solo lectura a `GET /v3/senders` todavía devuelve HTTP 401 por IP no autorizada, identificada como `38.156.230.229`. Esto impide verificar remitentes y activar los envíos reales desde este entorno; no demuestra que el remitente esté ausente o inactivo. La cola y sus reintentos están implementados y probados con un proveedor simulado. No se enviaron mensajes reales a clientes durante la validación. Debe comprobarse nuevamente la autorización de esa IP en la cuenta de Brevo correspondiente a la clave configurada.

### Reorganización visual y de UX/UI

24 de noviembre de 2026. Propuesta aprobada e implementada sobre las nueve entregas: navegación lateral por Inicio, Operación, Catálogo, Análisis y Administración, sección activa, menú móvil con diálogo accesible, acceso a tienda y registro de venta desde la cabecera. Se conserva la identidad de Kadali con mayor contraste, superficies claras y componentes administrativos comunes, sin modificar el diseño de la tienda pública.

Resumen con tres pendientes operativos, fabricación como subconjunto informativo, cuatro indicadores principales, actividad reciente y evolución de ventas. Reportes conserva el desglose completo. Períodos rápidos y fechas personalizadas mantienen el filtro de origen; los campos visibles se sincronizan con la consulta actual. Pedidos incorpora vistas rápidas, filtros secundarios, búsqueda, tabla en escritorio y tarjetas en móvil, etiquetas separadas de pago y entrega y estados vacíos con salida. El detalle separa productos, historial, contacto, finanzas y próxima tarea; las acciones de envío solo ofrecen el estado actual y el siguiente permitido por la política existente.

Venta manual organizada en productos, pago, cliente y entrega, con resumen lateral de importes y campos de dirección condicionales. Promociones diferencia precio por producto y porcentaje por categoría, muestra una vista previa sobre el precio base y permite desplegar la programación de fechas. No se alteraron reglas de cobro, stock, comisiones, acceso ni devoluciones; no se requirieron migraciones.

Validación: 57 pruebas automatizadas, lint, TypeScript y compilación aprobados. Navegador autenticado con usuario temporal eliminado al finalizar: búsqueda y limpieza de filtros, vistas de pedidos, edición del total manual y campos de envío, error de promoción sin pérdida de datos, períodos rápidos y paso a reportes conservando origen. Revisión a 390, 768, 1024 y 1440 px sin desbordamientos de página ni errores de JavaScript; menú móvil probado con Escape, retorno de foco y selección de destino. Sin registrar ventas, modificar pedidos ni realizar cobros o envíos de correo reales. Capturas locales en `output/*-review*.png`. La versión validada queda disponible en `http://localhost:3000/admin`; sin despliegue público.
