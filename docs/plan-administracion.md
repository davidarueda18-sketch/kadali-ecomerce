# Plan de construcción del administrador de Kadali

Estado: planificación, sin funcionalidades implementadas. Contexto obligatorio: [reglas del negocio](contexto-negocio.md). Las reglas de promociones, tarifa, ventas manuales y despacho ya están definidas. La gestión de reembolsos y devoluciones queda aplazada y no bloquea estas nueve entregas.

## Método de entrega

Construir en el orden indicado. Cada entrega debe dejar una función utilizable, incorporar sus propios cambios de datos y poder validarse antes de pasar a la siguiente. No ejecutar todas las etapas como una sola implementación.

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

Todas las entregas están pendientes. Al terminar cada una, registrar aquí fecha, alcance completado, comprobaciones realizadas y pendientes que afecten a la siguiente. No marcar una entrega completa por haber terminado solo su interfaz.
