# Contexto de negocio de Kadali

Actualizado el 24 de noviembre de 2026. Estas definiciones guían la construcción del administrador y los cambios relacionados en la tienda. Leer junto con [el plan de construcción](plan-administracion.md).

## Decisiones confirmadas

### Negocio y administración

Kadali vende velas en Colombia, mantiene pocas unidades disponibles y también fabrica bajo pedido. Opera en COP y utiliza America/Bogota para fechas, agrupaciones y comparaciones.

El administrador será utilizado por el propietario y su pareja. Ambos tienen permiso completo para consultar y modificar. Mantener cuentas individuales y trazabilidad del responsable; no construir roles por función ni una interfaz de gestión de permisos en este alcance.

La imagen de referencia sirve para identificar funciones. La interfaz conservará el lenguaje visual de Kadali y deberá funcionar en móvil y escritorio.

### Alcance administrativo

- Resumen con filtros de fechas y comparación con el período anterior.
- Pendientes operativos y mejoras de búsqueda, filtros, notas e historial de pedidos.
- Registro y corrección de ventas realizadas fuera de la web, con precio de venta definido por el administrador.
- Clientes con contacto, historial de compras, gasto acumulado, última compra, recurrencia y notas internas.
- Reportes básicos dentro del panel, sin exportaciones.
- Promociones simples por producto o categoría, reflejadas en la tienda y en el cobro.
- Comisión de Mercado Pago por pedido, separada de las ventas y de los cobros de envío.
- Correos transaccionales de compra y seguimiento para compradores registrados e invitados.

### Inventario y fabricación bajo pedido

Conservar la edición del número de existencias por producto. No añadir reservas, materias primas, variantes, entradas y salidas avanzadas, compras a proveedores ni reglas nuevas de reposición.

Un pago confirmado descuenta stock una sola vez y no lo lleva por debajo de cero. Las ventas manuales también descuentan existencias con esta regla. Conservar este comportamiento sin ampliar el módulo de inventario. Las correcciones deben ajustar solo la diferencia de cantidades de manera trazable, sin duplicar el descuento original ni reponer automáticamente unidades que ya se fabricaron o entregaron.

Permitir comprar productos publicados aunque no haya unidades suficientes. Si falta stock para completar cualquier parte del pedido, informar antes del pago: «El tiempo de preparación de tu pedido es de 2 a 5 días calendario». El plazo es de preparación; no presentarlo como tiempo total de transporte. Como criterio operativo del plan, contar desde la confirmación del pago.

Realizar un único envío por pedido: esperar a tener todos los productos listos. No ofrecer envíos parciales. Guardar en el pedido la condición de preparación informada al comprar, para que posteriores cambios de stock no cambien la promesa histórica. No publicar ni vender productos archivados por permitir fabricación bajo pedido.

### Ventas externas

El administrador debe poder registrar ventas pagadas en efectivo o por transferencia, como dos velas a un precio por unidad distinto del catálogo. El precio unitario se precarga con el precio base del producto en la base de datos y es editable; si no se modifica, conservar ese valor. El precio elegido solo afecta esa venta, sin cambiar el precio público ni sus promociones y sin aplicar promociones automáticamente.

La fecha de venta es opcional: si no se indica, usar el día actual en America/Bogota. Conservar por separado el momento de registro. El correo y el envío son opcionales; no exigir dirección para una venta sin envío ni crear correos ficticios.

Registrar el origen externo y el medio de pago de forma independiente. Una venta externa no debe generar cobros ni preferencias de Mercado Pago. Las ventas manuales en efectivo o transferencia tienen comisión de Mercado Pago igual a cero. Si una venta presencial ya se entregó, registrarla como entregada para que no aparezca como pendiente de preparación.

Permitir corregir ventas externas con motivo y registro de antes y después, conservando fecha de la venta y fecha de registro. No convertir esta función en un editor libre de importes de compras ya pagadas en la web.

### Promociones

Administrar promociones por producto y por categoría. Mantener el precio base y calcular un precio efectivo; conservar en cada compra el precio y descuento aplicados. Cambiar una promoción no altera pedidos ya creados.

La tienda debe usar el precio efectivo en listados, destacados, detalle, carrito, checkout y Mercado Pago, así como en filtros y ordenación por precio. El servidor determina el importe válido; no confiar en precios persistidos en el navegador.

Reglas confirmadas: precio especial fijo por producto y descuento porcentual por categoría; activación y desactivación manuales, con fechas de inicio y fin opcionales. Si coinciden promociones, aplicar el menor precio válido, sin acumular descuentos.

### Clientes y comunicación

Una compra invitada no obliga a crear una cuenta. Explicar que, al crearla o acceder con el mismo correo verificado, el comprador podrá consultar sus compras y el detalle del envío.

La comunicación de compra debe agradecer, mostrar referencia, productos, importes, condición de preparación y canal de contacto. Enviarla cuando se confirme el pago; un intento pendiente no es una compra confirmada.

Para un comprador con cuenta, incluir un botón hacia sus pedidos. Para un invitado, el correo será su canal de comunicación y ofrecerá acceso o registro con ese mismo correo. Enviar también los cambios relevantes de preparación y despacho, con guía cuando exista. No exponer pedidos mediante un identificador público sin verificación.

Conservar las compras históricas de invitados al acceder con el mismo correo verificado. Usar identificadores estables y normalización coherente del correo; no fusionar clientes solo por nombre o teléfono ni eliminar alias del correo automáticamente.

Los correos son transaccionales. No incorporar campañas de marketing ni tratar una compra como consentimiento de publicidad.

### Comisión y métricas

Presentar por separado ventas de productos después de descuentos, cobros de envío, cobro total y comisión de Mercado Pago. La tarifa definida por el propietario es 2,79 % más $800 COP por pedido pagado mediante Mercado Pago.

Como criterio de cálculo del plan, aplicar `total cobrado × 0,0279 + 800`, incluido el envío, con redondeo a dos decimales y aritmética monetaria consistente. Ejemplo: un cobro de $90.000 COP tiene una comisión estimada de $3.311 COP y un neto de $86.689 COP. Esta configuración reproduce la tarifa indicada; no presupone impuestos o cargos adicionales ni sustituye una liquidación real de Mercado Pago.

Guardar la comisión aplicada o estimada en cada pedido con su regla y origen. Cambiar la configuración no debe recalcular el pasado. Una comisión estimada debe identificarse como tal; no presentarla como liquidación real del proveedor. Los datos históricos sin comisión conocida deben mostrarse como desconocidos, sin asumir cero.

Mostrar el neto después de comisión sin llamarlo utilidad: faltan costos de producción, empaque, impuestos y logística para calcular rentabilidad.

Los indicadores deben incluir compras confirmadas de la web y ventas manuales, distinguirlas por canal y excluir intentos sin pago y el producto interno de pruebas. Un comprador no equivale a una cuenta registrada ni a cada intento de pago.

## Decisiones aplazadas y preparación técnica

Los reembolsos, devoluciones y su módulo de gestión se revisarán después. No construir ahora flujos, formularios, automatizaciones ni una política nueva de posventa; tampoco hacer depender el resumen o los reportes de ese módulo. Conservar el manejo de eventos del proveedor ya existente sin presentarlo como una solución completa de posventa.

Antes de migraciones o pruebas con escritura, verificar que existe una base de pruebas separada. La configuración local puede apuntar a datos reales. Esta comprobación técnica no reabre las reglas de negocio ya acordadas.

## Posventa y reducción de riesgo

Tema aplazado por el propietario. Las siguientes referencias se conservan para una futura definición de la política, fuera de las entregas actuales. Son recomendaciones, no decisiones comerciales ya aprobadas. Diferenciar cancelación antes del despacho, retracto, garantía, reembolso y contracargo. Una solicitud no modifica por sí sola el pago ni el inventario.

Propuesta operativa: verificar el pago con Mercado Pago antes de despachar; conservar pedido y comunicaciones, guía y comprobante de entrega; revisar solicitudes manualmente; registrar importes y referencias de reembolsos realmente ejecutados. Gestionar disputas en Mercado Pago inicialmente y registrar su seguimiento en Kadali, atendiendo los plazos del proveedor. No prometer que un pago aprobado impide un contracargo: el proveedor explica que puede retener fondos y retirar el importe si la disputa prospera. [Mercado Pago sobre contracargos](https://www.mercadopago.com.co/developers/es/docs/checkout-api-payments/payment-management/chargebacks/introduction).

En Colombia, el artículo 47 prevé retracto en ventas a distancia dentro de cinco días hábiles desde la entrega, con excepciones como bienes claramente personalizados. Fabricar después del pedido no demuestra por sí solo que el bien sea personalizado. El artículo 51 regula la reversión por fraude, compra no solicitada, no recepción, producto distinto o defectuoso. No publicar una prohibición general de devoluciones después del envío. [Ley 1480 vigente, artículos 47 y 51](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm).

Para retracto en comercio electrónico, el artículo 47 modificado establece devolución de dinero en hasta quince días calendario desde el ejercicio del derecho y cumplimiento de las obligaciones previstas, incluida la devolución del producto. La política debe distinguir ese trámite de garantías y contracargos, sujetos a sus propias reglas. Validar la política final para los productos y operación de Kadali antes de publicarla. [Texto vigente de la Ley 1480](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm).

## Base técnica actual

- Next.js, Drizzle y PostgreSQL/Neon; autenticación con Better Auth; pagos mediante Mercado Pago.
- `app/admin/`: resumen acumulado, pedidos, productos e inventario y categorías. `lib/admin.ts` exige correo verificado y acceso administrativo activo en servidor.
- `lib/db/schema.ts`: pedidos, líneas con precio histórico, `paidAt`, entrega y eventos de auditoría. `status` mezcla pago y entrega; ya existe `fulfillmentStatus`.
- `app/actions/checkout.ts` y `ui/product/add-to-cart-button.tsx` bloquean hoy compras sin stock suficiente. El carrito conserva precios en el navegador y requiere reconciliación con el servidor para promociones.
- `lib/mercado-pago.ts`: conciliación, descuento de stock y registro de eventos. Revisar de forma conjunta con webhook y retorno al cambiar confirmaciones.
- `lib/email.ts`: Brevo disponible para códigos de acceso, todavía sin notificaciones de compra.
- `lib/auth.ts` y `app/cuenta/pedidos/page.tsx`: base para recuperar compras invitadas mediante el correo. Verificar también cuentas preexistentes y variantes de mayúsculas al implementarlo.
- `app/legal/devoluciones/page.tsx`: contenido introductorio; falta una política operativa completa.

## Fuera del alcance actual

Inventario avanzado, reservas, materias primas, segregación de permisos, exportaciones, cupones, acumulación de descuentos, campañas de correo, atribución publicitaria, contabilidad, facturación electrónica y cálculo de utilidad. También queda aplazada la construcción de gestión de reembolsos, devoluciones y disputas. Tampoco se asume integración con transportadoras ni envíos parciales.
