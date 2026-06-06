# Manual de usuario de Empire Nutrition

Este manual explica cómo usar la tienda Empire Nutrition desde dos puntos de vista:

- Cliente: personas que visitan la tienda, compran productos y consultan sus pedidos.
- Administrador: personas del equipo que gestionan productos, pedidos, cupones, contenido y configuración del sitio.

El lenguaje está pensado para usuarios con poca experiencia técnica. No es necesario conocer programación para seguirlo.

## 1. Acceso general al sitio

La tienda tiene un menú principal en la parte superior. Desde ahí se puede entrar a:

- Tienda: catálogo completo de productos.
- Women's Nutrition: categoría de productos para mujer.
- Men's Nutrition: categoría de productos para hombre.
- Nuestras Ofertas: productos con descuento.
- Envíos Seguros: información sobre envíos.
- Quiénes Somos: información de la marca.
- Blog: artículos publicados.
- Contacto: formulario para enviar mensajes.
- Mi pedido: consulta de pedidos.
- Carrito: productos seleccionados para comprar.
- Buscar: búsqueda de productos.

En celular, el menú aparece como un botón de tres líneas. Al tocarlo se despliegan las mismas opciones.

## 2. Flujo del cliente

### 2.1 Explorar productos

El cliente puede encontrar productos de varias formas:

1. Entrar a `Tienda` para ver todos los productos disponibles.
2. Entrar a una categoría, como `Women's Nutrition` o `Men's Nutrition`.
3. Entrar a `Nuestras Ofertas` para ver productos con descuento.
4. Usar el icono de búsqueda para escribir el nombre o palabras relacionadas con el producto.

Cada producto muestra información como nombre, imagen, precio, categoría y disponibilidad. Si un producto tiene descuento, se muestra el precio regular y el precio de oferta.

### 2.2 Ver el detalle de un producto

Al abrir un producto, el cliente puede revisar:

- Imágenes y videos del producto.
- Nombre del producto.
- Categoría.
- Precio.
- Descripción.
- Disponibilidad.
- Opciones, si el producto las tiene, por ejemplo sabor, presentación o variante.
- Botón para agregar al carrito.
- Enlace de WhatsApp para pedir ayuda sobre ese producto.

Si el producto tiene opciones obligatorias, el cliente debe seleccionarlas antes de agregarlo al carrito.

### 2.3 Agregar productos al carrito

Para comprar:

1. Abrir el producto deseado.
2. Elegir opciones, si aparecen.
3. Elegir la cantidad.
4. Presionar `Agregar al carrito`.

El carrito se abre desde el icono de bolsa en la parte superior. Dentro del carrito, el cliente puede:

- Ver los productos agregados.
- Cambiar cantidades con los botones `+` y `-`.
- Eliminar productos.
- Ver subtotal, envío y total.
- Continuar comprando.
- Ir a finalizar compra.

También existe una página completa de carrito en `/carrito`, donde se puede revisar el resumen con más espacio.

### 2.4 Usar cupones

En la página del carrito aparece la sección `¿Tienes un cupón?`.

Para aplicar un cupón:

1. Escribir el código en mayúsculas o minúsculas.
2. Presionar `Aplicar`.
3. Revisar que el descuento aparezca en el resumen.

Los cupones pueden ser de tres tipos:

- Porcentaje de descuento.
- Monto fijo de descuento.
- Envío gratis.

Si el cupón no funciona, puede deberse a que está vencido, agotado, desactivado o no cumple la compra mínima.

### 2.5 Finalizar compra

Al presionar `Finalizar compra` o `Proceder al pago`, el cliente entra al checkout.

En el checkout se solicitan datos de contacto, dirección y tarjeta:

- Nombre y apellido.
- Correo electrónico.
- Teléfono.
- Calle.
- Número exterior o referencias claras.
- Número interior, si aplica.
- Colonia.
- Municipio.
- Estado.
- Código postal.
- Datos de tarjeta.
- Aceptación de términos y condiciones.

El pago se procesa con Openpay. La tienda valida que los campos estén completos antes de continuar. Si falta información, aparece un mensaje explicando qué debe corregirse.

Después del pago, el cliente puede ver una página de confirmación del pedido.

### 2.6 Consultar un pedido sin cuenta

Si el cliente compró sin iniciar sesión, puede consultar su pedido desde `Mi pedido`.

Pasos:

1. Entrar a `Mi pedido`.
2. Escribir el correo usado durante la compra.
3. Escribir el número de orden recibido por correo o mostrado al finalizar la compra.
4. Presionar `Buscar pedido`.

Si los datos coinciden, el sistema abre el detalle del pedido. Si no coinciden, se muestra un mensaje de ayuda. Es importante usar el mismo correo que se escribió en el checkout.

### 2.7 Consultar pedidos con cuenta

Si el cliente inició sesión, `Mi pedido` lleva a `Mis pedidos`.

Ahí puede ver:

- Historial de compras.
- Fecha del pedido.
- Número corto del pedido.
- Estado: pendiente, pagado, enviado, entregado o cancelado.
- Total pagado.
- Número de guía, cuando ya fue asignado.

Al tocar un pedido se abre el detalle.

### 2.8 Estados de pedido para clientes

Los estados principales son:

- Pendiente: el pago o la confirmación todavía no se completan.
- Pagado: el pago fue recibido.
- Enviado: el pedido ya fue enviado y puede tener número de guía.
- Entregado: el pedido fue marcado como entregado.
- Cancelado: el pedido fue cancelado.

### 2.9 Contactar a la tienda

En la sección `Contacto`, el cliente puede enviar un mensaje llenando:

- Nombre.
- Apellido.
- Email.
- WhatsApp o Telegram, opcional.
- Mensaje.

Estos mensajes llegan al panel de administración en la sección `Mensajes`.

## 3. Acceso al panel de administración

El panel administrativo se usa para operar la tienda. Se entra desde `/login` con correo y contraseña de administrador.

Después de iniciar sesión, los administradores ven la opción `Admin` en el menú superior. También pueden entrar directamente a `/admin`.

El panel tiene estas secciones:

- Dashboard.
- Productos.
- Órdenes.
- Categorías.
- Clientes.
- Cupones.
- Galería.
- Blog.
- Mensajes.
- Reseñas.
- Usuarios.
- Configuración.

## 4. Dashboard

El Dashboard es la vista principal del administrador. Sirve para revisar rápidamente el estado de la tienda.

Muestra:

- Total de productos activos.
- Total de órdenes.
- Ingresos de órdenes pagadas.
- Productos con stock bajo.
- Lista de órdenes recientes.
- Acceso rápido para crear un nuevo producto.

Uso recomendado:

1. Revisar primero si hay pedidos nuevos.
2. Revisar si hay productos con poco stock.
3. Entrar a órdenes o productos según lo que se necesite atender.

## 5. Productos

La sección `Productos` sirve para crear, editar, ocultar y revisar productos de la tienda.

### 5.1 Crear un producto

Pasos:

1. Entrar a `Admin > Productos`.
2. Presionar `Nuevo producto`.
3. Llenar la información básica.
4. Agregar imágenes.
5. Agregar videos si aplica.
6. Definir precio.
7. Elegir categoría.
8. Configurar stock si se desea controlar inventario.
9. Activar o desactivar `Mostrar en la tienda`.
10. Presionar `Crear`.

### 5.2 Información básica del producto

Campos principales:

- Nombre: nombre visible del producto.
- Descripción: texto que explica beneficios, uso o detalles.
- URL o slug: parte de la dirección del producto. Normalmente se genera desde el nombre.
- Categoría: grupo donde aparecerá el producto.
- Etiquetas: palabras separadas por coma para organizar o encontrar productos.

Ejemplo de etiquetas:

`proteína, mujer, ganancia, creatina`

### 5.3 Imágenes del producto

Las imágenes son muy importantes porque son lo primero que ve el cliente.

En el formulario se puede:

- Añadir imágenes desde la computadora.
- Elegir imágenes desde la galería.
- Reemplazar una imagen.
- Eliminar una imagen.
- Marcar una imagen como principal.

La primera imagen es la imagen principal del producto. Es la que suele mostrarse en listados y tarjetas.

Recomendación: usar imágenes claras, bien iluminadas y donde el producto se vea completo.

### 5.4 Videos del producto

El producto también puede tener videos. Se agregan desde la galería.

Los videos sirven para mostrar:

- Presentación del producto.
- Cómo se ve el envase.
- Promociones.
- Demostraciones.

Si no hay video, el producto funciona normalmente.

### 5.5 Precios y ofertas

El producto puede tener precio normal o precio de oferta.

Precio normal:

- Se llena solamente `Precio`.

Oferta o descuento:

1. Activar `Oferta / Descuento`.
2. Llenar `Precio regular`, que se mostrará tachado.
3. Llenar `Precio de oferta`, que será el precio final.

También existe `Costo de la mercancía`. Este dato ayuda al equipo a ver ganancia y margen, pero no es visible para el cliente.

### 5.6 Costo de envío por producto

Cada producto puede tener un costo de envío propio. Si se deja vacío, se usa el costo de envío global definido en `Configuración`.

Uso recomendado:

- Dejar vacío si todos los productos usan la misma tarifa.
- Llenarlo solo si ese producto necesita un envío especial.

### 5.7 Stock

Si se activa el control de stock, se puede escribir cuántas unidades hay.

Cuando el stock está bajo, el Dashboard puede mostrarlo como alerta. Esto ayuda a saber qué productos necesitan resurtirse.

### 5.8 Mostrar u ocultar productos

El campo `Mostrar en la tienda` define si el producto aparece para los clientes.

- Activado: el producto aparece en la tienda.
- Desactivado: el producto queda oculto.

Esto es útil para preparar productos antes de publicarlos o quitar productos temporalmente sin borrarlos.

### 5.9 Variantes u opciones

Algunos productos pueden tener opciones como sabor, color o presentación. Estas opciones aparecen en el detalle del producto y el cliente debe elegirlas antes de agregar al carrito.

Ejemplos:

- Sabor: Chocolate, Vainilla, Fresa.
- Tamaño: 500 g, 1 kg.
- Presentación: Kit básico, Kit completo.

## 6. Órdenes

La sección `Órdenes` muestra todos los pedidos recibidos.

### 6.1 Lista de órdenes

La lista muestra:

- Número de pedido.
- Fecha de creación.
- Cliente.
- Estado del pago.
- Estado de cumplimiento o envío.
- Total.
- Ítems del pedido.
- Acción para ver el detalle.

También se puede filtrar por:

- Todos.
- Pendientes.
- Pagados.
- Enviados.
- Entregados.
- Cancelados.

### 6.2 Revisar una orden

Al abrir una orden se ve:

- Productos comprados.
- Cantidades.
- Precio por producto.
- Subtotal.
- Envío.
- Descuento aplicado, si hubo cupón.
- Total.
- Datos del cliente.
- Dirección de envío.
- Estado del pedido.
- Actividad del pedido.
- Notas internas.
- Número de guía, si aplica.

### 6.3 Cambiar estado de una orden

Los estados avanzan de forma ordenada:

- Pendiente puede cambiar a Pagado o Cancelado.
- Pagado puede cambiar a Enviado o Cancelado.
- Enviado puede cambiar a Entregado.
- Entregado ya no necesita cambios.
- Cancelado ya no necesita cambios.

Uso recomendado:

1. Cuando se confirme el pago, marcar como `Pagado`.
2. Cuando se envíe el paquete, marcar como `Enviado`.
3. Cuando se confirme entrega, marcar como `Entregado`.

### 6.4 Agregar número de guía

En órdenes pagadas, enviadas o entregadas aparece el campo para guía de rastreo.

Pasos:

1. Abrir la orden.
2. Buscar la sección de productos a enviar.
3. Escribir el número de guía.
4. Guardar.

El cliente puede ver la guía desde su pedido.

### 6.5 Notas internas

Las notas internas sirven para dejar información para el equipo. No están pensadas como mensaje público al cliente.

Ejemplos:

- Cliente pidió llamar antes de entregar.
- Paquete preparado por almacén.
- Validar dirección antes de enviar.

### 6.6 Reembolso

En algunas órdenes pagadas o enviadas aparece la opción de reembolso. Usarla con cuidado y solo cuando corresponda, ya que afecta el pago.

## 7. Categorías

Las categorías organizan los productos para que el cliente pueda navegar más fácil.

### 7.1 Crear o editar categoría

Campos principales:

- Nombre de la categoría.
- Imagen de la categoría.
- URL de la categoría.
- Descripción.
- Productos asignados.

### 7.2 Agregar productos a una categoría

Pasos:

1. Entrar a `Admin > Categorías`.
2. Crear o abrir una categoría.
3. Presionar `Agregar productos`.
4. Seleccionar los productos.
5. Guardar.

Si un producto estaba en otra categoría, el sistema puede mostrar de qué categoría viene.

### 7.3 Quitar productos de una categoría

Dentro de la categoría, usar el botón de eliminar junto al producto. Esto lo quita de esa categoría, pero no borra el producto de la tienda.

## 8. Clientes

La sección `Clientes` muestra contactos importados del CRM anterior.

Se puede ver:

- Nombre.
- Email.
- Teléfono.
- Etiquetas.
- Fuente.
- Fecha de creación en Wix.

También se puede buscar por:

- Nombre.
- Email.
- Teléfono.

Esta sección sirve principalmente para consulta. No es la sección para crear administradores; para eso se usa `Usuarios`.

## 9. Cupones

Los cupones permiten ofrecer descuentos a clientes.

### 9.1 Crear un cupón

Pasos:

1. Entrar a `Admin > Cupones`.
2. Presionar `Nuevo cupón`.
3. Escribir el código.
4. Elegir tipo de descuento.
5. Llenar el valor, si aplica.
6. Definir compra mínima, si aplica.
7. Definir límite de usos, si aplica.
8. Definir fecha de expiración, si aplica.
9. Confirmar que esté activo.
10. Guardar.

### 9.2 Tipos de cupón

- Porcentaje: descuenta un porcentaje del subtotal.
- Monto fijo: descuenta una cantidad fija en pesos.
- Envío gratis: quita el costo de envío.

### 9.3 Estado de cupones

Un cupón puede aparecer como:

- Activo: se puede usar.
- Inactivo: está apagado.
- Expirado: ya pasó su fecha de vencimiento.
- Agotado: llegó a su límite de usos.

### 9.4 Editar o eliminar cupones

En la lista de cupones se puede:

- Editar con el icono de lápiz.
- Eliminar con el icono de basura.

Antes de eliminar, el sistema pide confirmación.

## 10. Galería

La `Galería` guarda imágenes y videos para reutilizarlos en productos, categorías, blog o videos de inicio.

### 10.1 Subir archivos

Pasos:

1. Entrar a `Admin > Galería`.
2. Presionar `Subir archivos`.
3. Elegir imágenes o videos desde la computadora.
4. Esperar a que termine la carga.

### 10.2 Filtrar archivos

La galería permite ver:

- Todos.
- Imágenes.
- Videos.

### 10.3 Copiar URL o eliminar

Al pasar el cursor sobre un archivo aparecen acciones:

- Copiar URL: copia la liga del archivo.
- Eliminar: borra el archivo de la galería.

Precaución: si se elimina un archivo que todavía se usa en algún producto o página, puede dejar de verse.

## 11. Blog

La sección `Blog` permite publicar artículos.

### 11.1 Crear artículo

Pasos:

1. Entrar a `Admin > Blog`.
2. Presionar para crear un artículo nuevo.
3. Escribir el título.
4. Revisar o editar el slug.
5. Escribir un extracto corto.
6. Agregar imagen de portada.
7. Abrir el editor de contenido.
8. Escribir el artículo.
9. Marcar `Publicado` si debe verse en el sitio.
10. Guardar.

### 11.2 Borrador o publicado

- Si `Publicado` está desactivado, el artículo queda guardado pero no visible para los clientes.
- Si `Publicado` está activado, aparece en el blog público.

Uso recomendado: escribir primero como borrador, revisar, y publicar al final.

## 12. Mensajes

La sección `Mensajes` muestra los mensajes enviados desde el formulario de contacto.

Se puede filtrar por:

- Todos.
- Sin leer.

Cada mensaje muestra:

- Nombre.
- Email.
- WhatsApp o Telegram, si el cliente lo escribió.
- Mensaje.
- Fecha.
- Estado de lectura.

Cuando un mensaje ya fue atendido, se puede marcar como leído.

## 13. Reseñas

La sección `Reseñas` permite revisar opiniones de clientes.

Se puede ver:

- Producto relacionado.
- Autor.
- Correo del autor.
- Título o comentario.
- Calificación en estrellas.
- Estado: pendiente o aprobada.
- Fecha.

### 13.1 Aprobar reseñas

Las reseñas pendientes deben revisarse antes de mostrarse públicamente.

Uso recomendado:

1. Entrar a `Admin > Reseñas`.
2. Filtrar por `Pendientes`.
3. Leer la reseña.
4. Aprobar si es adecuada.
5. Rechazar o eliminar si no corresponde.

## 14. Usuarios administradores

La sección `Usuarios` sirve para controlar quién puede entrar al panel.

### 14.1 Agregar administrador

Pasos:

1. Entrar a `Admin > Usuarios`.
2. Escribir correo electrónico.
3. Escribir contraseña de mínimo 6 caracteres.
4. Presionar `Agregar usuario`.

El nuevo administrador podrá iniciar sesión en `/login`.

### 14.2 Cambiar contraseña

En la lista de administradores, usar el icono de llave para asignar una nueva contraseña.

### 14.3 Eliminar administrador

Usar el icono de basura junto al usuario. El sistema pide confirmación. No se puede eliminar el usuario propio desde esa misma cuenta.

Recomendación: mantener acceso solo para personas que realmente operan la tienda.

## 15. Configuración

La sección `Configuración` contiene ajustes generales.

### 15.1 Notificaciones de ventas

Permite definir hasta dos correos para recibir avisos cuando un cliente paga.

Campos:

- Correo 1.
- Correo 2, opcional.

También existe un botón para enviar correo de prueba.

Importante: si el servicio de correo no tiene dominio verificado, los correos pueden llegar solo al correo configurado en la cuenta del proveedor. Si no llega el correo, revisar spam y validar la configuración del servicio.

### 15.2 Costo de envío global

Define la tarifa plana de envío en pesos mexicanos.

Pasos:

1. Entrar a `Admin > Configuración`.
2. Buscar `Costo de envío`.
3. Escribir el monto.
4. Presionar `Guardar`.

El cambio aplica a pedidos nuevos. Si un cupón de envío gratis se aplica, el envío se descuenta automáticamente.

### 15.3 Videos de inicio

Se pueden actualizar dos videos de la página principal:

- Video de portada, también llamado hero.
- Video promocional de la sección `Alcanza tu Máximo Potencial`.

Pasos:

1. Entrar a `Admin > Configuración`.
2. Buscar la sección del video.
3. Subir el archivo.
4. Esperar confirmación de guardado.

Recomendación: usar videos comprimidos y de buena calidad para que la página cargue bien.

### 15.4 Información del sitio

La configuración muestra datos generales:

- Nombre: Empire Nutrition.
- Dominio: casaempire.net.
- País: México.
- Moneda: MXN.
- Gateway de pago: Openpay.

También hay un acceso a Supabase Dashboard. Este acceso es técnico y normalmente debe usarlo una persona con conocimiento de base de datos.

## 16. Recomendaciones de uso diario

### 16.1 Rutina diaria para administradores

1. Entrar al Dashboard.
2. Revisar pedidos recientes.
3. Abrir pedidos pagados.
4. Preparar productos.
5. Agregar número de guía cuando se envíen.
6. Marcar pedidos como enviados.
7. Revisar mensajes sin leer.
8. Revisar reseñas pendientes.
9. Revisar stock bajo.

### 16.2 Antes de publicar un producto

Verificar:

- Nombre correcto.
- Precio correcto.
- Categoría correcta.
- Imagen principal clara.
- Descripción suficiente.
- Stock correcto, si se controla inventario.
- Producto visible en tienda.
- Oferta bien configurada, si aplica.

### 16.3 Antes de crear un cupón

Verificar:

- Código fácil de escribir.
- Tipo de descuento correcto.
- Valor correcto.
- Compra mínima, si se requiere.
- Fecha de expiración.
- Límite de usos.
- Estado activo.

### 16.4 Antes de marcar un pedido como enviado

Verificar:

- Pago confirmado.
- Productos correctos.
- Dirección completa.
- Paquete preparado.
- Guía de rastreo disponible.

## 17. Problemas comunes y solución

### El cliente no encuentra su pedido

Revisar:

- Que use el mismo correo del checkout.
- Que escriba bien el número de orden.
- Que no agregue espacios extra.
- Que el pedido exista en `Admin > Órdenes`.

### El cupón no aplica

Puede pasar si:

- El cupón está inactivo.
- Ya expiró.
- Llegó al límite de usos.
- No cumple compra mínima.
- El código fue escrito con caracteres incorrectos.

### Un producto no aparece en la tienda

Revisar:

- Que `Mostrar en la tienda` esté activado.
- Que tenga categoría, si se espera verlo por categoría.
- Que el producto esté guardado.
- Que no esté agotado, si el diseño lo oculta o lo muestra como sin stock.

### No llegan correos de venta

Revisar:

- Correos configurados en `Configuración`.
- Carpeta de spam.
- Configuración del proveedor de email.
- Que el servicio de correo esté correctamente conectado.

### Una imagen no se ve

Revisar:

- Que el archivo siga existiendo en Galería.
- Que la URL no haya sido eliminada.
- Que el producto tenga una imagen principal.
- Que el archivo sea una imagen válida.

## 18. Glosario sencillo

- Admin: panel privado para gestionar la tienda.
- Carrito: lugar donde el cliente guarda productos antes de pagar.
- Checkout: pantalla donde el cliente escribe datos y paga.
- Cupón: código de descuento.
- Galería: biblioteca de imágenes y videos.
- Guía: número de rastreo del envío.
- Orden: pedido hecho por un cliente.
- Producto activo: producto visible en tienda.
- Producto oculto: producto guardado pero no visible.
- Slug: texto corto que aparece en la URL, por ejemplo `glow-protein`.
- Stock: cantidad disponible de un producto.

## 19. Buenas prácticas

- No borrar productos si solo se quieren ocultar; es mejor desactivar `Mostrar en la tienda`.
- No eliminar imágenes de la galería si no se sabe dónde se usan.
- Revisar dos veces precios y cupones antes de publicar.
- Mantener pocos administradores y cambiar contraseñas cuando alguien deje de operar la tienda.
- Atender mensajes y reseñas con frecuencia para mantener confianza con los clientes.
- Actualizar números de guía lo antes posible para reducir dudas de clientes.

