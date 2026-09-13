# Casos de Prueba de Aceptación — RutaExpress GT
## Versión final — Todos los roles

**Precondición general:** Backend corriendo con `docker-compose up --build` y app iniciada con `npx expo start`.
**Usuarios de prueba disponibles:**

| Email | Contraseña | Rol |
|---|---|---|
| `carlos@rutaexpress.gt` | `1234` | vendedor |
| `pedro@rutaexpress.gt` | `1234` | repartidor |
| `ana@rutaexpress.gt` | `super1234` | supervisor |
| `superadmin@rutaexpress.gt` | `super1234` | admin |

---

## CP-01 — Login con autenticación real

**Objetivo:** Verificar que el login autentica contra la base de datos y redirige según el rol.
**Característica ISO 25010:** Adecuación funcional · Usabilidad

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Abrir la app | Pantalla de Login con formulario de email y contraseña |
| 2 | Ingresar `carlos@rutaexpress.gt` / `1234` y tocar "Ingresar" | Navega a "Nuevo pedido" (pantalla del vendedor) |
| 3 | Cerrar sesión y hacer login con `ana@rutaexpress.gt` / `super1234` | Navega a "Panel de Supervisión" |
| 4 | Cerrar sesión y hacer login con `superadmin@rutaexpress.gt` / `super1234` | Navega a "Panel de Administración" con tarjeta "Bitácora" visible |
| 5 | Ingresar contraseña incorrecta | Mensaje de error "Credenciales incorrectas" sin revelar detalles |
| 6 | Dejar email vacío y tocar "Ingresar" | Error "Email y contraseña son obligatorios" |
| 7 | Ingresar email sin formato válido (ej. `noesmail`) | Error "El correo electrónico no tiene un formato válido" |
| 8 | Tocar el acceso rápido "Admin" | Se llenan los campos automáticamente |

**Criterio de éxito:** Cada rol llega a su pantalla inicial correcta. Errores de validación son claros y específicos.

---

## CP-02 — Catalogo de productos con stock visible

**Objetivo:** Verificar que el catalogo muestra productos con stock actualizado y permite filtrar.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | En la pantalla de captura, tocar el boton "Catalogo" | Se abre la pantalla de catalogo |
| 2 | Verificar que la lista muestra al menos 10 productos | Lista completa con nombre, precio y stock |
| 3 | Verificar que cada producto muestra el stock en color | Verde si hay suficiente, amarillo si es bajo (<= 10), rojo si es 0 |
| 4 | Escribir "arroz" en el buscador | Solo se muestran productos que contienen "arroz" |
| 5 | Tocar el filtro "Granos" | Lista se filtra por esa categoria |
| 6 | Tocar "Todos" | Lista vuelve a mostrar todos los productos |
| 7 | Presionar atras | Regresa a la pantalla de captura |

**Criterio de exito:** El vendedor puede ver el stock antes de comprometerse con el cliente.

---

## CP-03 — Captura de pedido con conexion (online)

**Objetivo:** Verificar el flujo completo de captura y sincronizacion cuando hay internet.

**Precondiciones:** Backend corriendo en Docker, dispositivo con WiFi activo.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | En la pantalla de captura (Paso 1), tocar "Despensa Don Juanito" | La tarjeta se resalta con borde azul y check |
| 2 | Tocar "Siguiente — Agregar productos" | Navega al Paso 2 (productos) |
| 3 | Tocar "+" en "Arroz Diana 25 lb" dos veces | Cantidad = 2, subtotal = Q 170.00 visible |
| 4 | Tocar "+" en "Aceite Capullo 1L" una vez | Cantidad = 1, subtotal = Q 28.50 |
| 5 | Verificar el resumen mini en la parte superior | "2 producto(s) — Total: Q 198.50" |
| 6 | Tocar "Ver resumen del pedido" | Navega al Paso 3 con detalle completo |
| 7 | Verificar que el resumen muestra cliente, items y total correcto | Q 198.50 en el recuadro oscuro |
| 8 | Verificar el indicador de conexion | "Online — el pedido se enviara de inmediato" en verde |
| 9 | Tocar "Confirmar y enviar pedido" | Boton muestra indicador de carga, luego navega a Confirmacion |
| 10 | Pantalla de Confirmacion: verificar mensaje | "Pedido enviado" con icono verde y mensaje de exito |
| 11 | Tocar "Nuevo pedido" | Regresa a Paso 1 en blanco |

**Criterio de exito:** El pedido aparece en `GET /api/pedidos` y el stock de los productos se redujo.

---

## CP-04 — Captura de pedido sin conexion (offline)

**Objetivo:** Verificar que el flujo funciona sin internet y el pedido queda guardado para sincronizarse.

**Precondiciones:** Desactivar WiFi y datos moviles en el dispositivo antes de este caso.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Verificar que aparece el banner gris "Sin conexion — los pedidos se guardaran localmente" | Banner visible en la parte superior |
| 2 | Completar el flujo: cliente "Tienda La Esperanza", producto "Frijoles Negros 1 lb" x 3 | Items seleccionados correctamente |
| 3 | En el Paso 3 (resumen), verificar el indicador de conexion | Muestra "Offline — se guardara y enviara al recuperar senal" en amarillo |
| 4 | Tocar "Guardar pedido (offline)" | Boton de carga, luego navega a Confirmacion |
| 5 | Pantalla de Confirmacion: verificar mensaje | "Pedido guardado" con icono amarillo (nube con reloj) |
| 6 | Verificar que el mensaje indica sincronizacion automatica | "Sin conexion — el pedido quedo guardado en este dispositivo..." |
| 7 | Reactivar WiFi | El banner "Sin conexion" desaparece |
| 8 | Observar (sin hacer nada) que la sincronizacion se ejecuta automaticamente | En los logs de la app: "[Sync] Resultado: 1 sincronizados" |
| 9 | Verificar en el backend que el pedido llego | `GET http://localhost:3000/api/pedidos` muestra el pedido |

**Criterio de exito:** El pedido se sincroniza automaticamente al recuperar internet sin intervencion del usuario.

---

## CP-05 — Validacion de stock insuficiente (Safety)

**Objetivo:** Verificar que la app impide agregar mas unidades de las disponibles en stock.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | En el Paso 2 (productos), localizar "Harina Maseca 1 kg" (stock: 80) | Visible con stock en verde |
| 2 | Tocar "+" 80 veces (o tocar rapidamente) hasta llegar a 80 | Cantidad = 80 |
| 3 | Intentar tocar "+" una vez mas | El boton "+" queda deshabilitado (opacidad reducida) Y aparece alerta "Stock insuficiente" |
| 4 | Verificar que la cantidad no supero 80 | Cantidad permanece en 80 |

**Criterio de exito:** Nunca se puede capturar mas cantidad que el stock disponible. Imposible crear sobreventa desde la app.

---

## CP-06 — Indicador de estado offline/online

**Objetivo:** Verificar que el banner de conectividad responde en tiempo real.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Con WiFi activo, abrir cualquier pantalla | No se muestra el banner gris |
| 2 | Desactivar WiFi | El banner "Sin conexion..." aparece automaticamente (en ~2 segundos) |
| 3 | Reactivar WiFi | El banner desaparece automaticamente |

**Criterio de exito:** Cambio de estado visible en menos de 3 segundos sin recargar la app.

---

## CP-07 — Dashboard y navegación del supervisor

**Objetivo:** Verificar que el supervisor accede a todos los módulos disponibles y los datos vienen de la BD.
**Característica ISO 25010:** Adecuación funcional

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Login como `ana@rutaexpress.gt` / `super1234` | Panel de Supervisión con tarjetas de módulos |
| 2 | Verificar que NO aparece la tarjeta "Bitácora" | Solo admin tiene acceso a bitácora |
| 3 | Tocar "Productos" | Lista de productos cargada desde la BD |
| 4 | Tocar "Clientes" | Lista de clientes desde la BD |
| 5 | Tocar "Pedidos" | Lista de pedidos con estado y asignación de repartidor |
| 6 | Tocar "Usuarios" | Lista de usuarios del sistema |
| 7 | Verificar que el botón "Ingresar como" NO aparece junto a los usuarios | Solo el admin puede impersonar |

**Criterio de éxito:** El supervisor accede a todos sus módulos. No aparecen funciones de admin.

---

## CP-08 — Gestión de usuarios (CRUD con validaciones)

**Objetivo:** Verificar que el formulario de usuario aplica validaciones antes de guardar.
**Característica ISO 25010:** Usabilidad (protección de errores) · Adecuación funcional

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Login como admin o supervisor. Ir a "Usuarios" → tocar "+" | Modal de nuevo usuario |
| 2 | Guardar sin nombre | Error "El nombre es obligatorio" |
| 3 | Ingresar nombre de 1 caracter, guardar | Error "mínimo 2 caracteres" |
| 4 | Ingresar email sin formato válido, guardar | Error "formato de email inválido" |
| 5 | Ingresar email de usuario ya existente, guardar | Error "ya está registrado" |
| 6 | Llenar todos los campos correctamente, guardar | Usuario creado, aparece en la lista |
| 7 | Tocar el ícono de editar en un usuario | Modal pre-llenado con datos actuales |
| 8 | Cambiar el nombre y guardar | Lista actualizada con el nuevo nombre |

**Criterio de éxito:** Ningún dato inválido llega a la base de datos. Mensajes de error son claros.

---

## CP-09 — Impersonación de usuario por admin

**Objetivo:** Verificar que el admin puede entrar al panel de cualquier usuario y la app cambia de vista correctamente.
**Característica ISO 25010:** Usabilidad · Adecuación funcional

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Login como `superadmin@rutaexpress.gt` / `super1234` | Panel de Administración |
| 2 | Ir a "Usuarios" | Lista de usuarios con botón morado "Ingresar como" en cada fila |
| 3 | Tocar "Ingresar como" en el usuario `carlos@rutaexpress.gt` (vendedor) | La app navega a la pantalla "Nuevo pedido" del vendedor |
| 4 | Verificar el banner rojo en la parte inferior | "Vista de: Carlos Revolorio" con botón "Salir" |
| 5 | Intentar navegar por las pantallas del vendedor | Todo funciona normalmente |
| 6 | Tocar "Salir" en el banner rojo | Regresa al Panel de Administración del admin |
| 7 | Repetir con un repartidor | Muestra pantalla "Ruta diaria" con banner rojo |

**Criterio de éxito:** El admin puede ver la vista de cualquier usuario. Al salir vuelve a su sesión de admin.

---

## CP-10 — Logout bloqueado durante impersonación

**Objetivo:** Verificar que el botón de cerrar sesión no está disponible mientras se impersona a un usuario.
**Característica ISO 25010:** Usabilidad · Safety

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Mientras se impersona a un usuario (banner rojo visible), buscar el ícono de logout en el header | El ícono de logout NO aparece |
| 2 | Navegar a otras pantallas del usuario impersonado | El botón de logout tampoco aparece en ninguna pantalla |
| 3 | La única forma de salir es el botón "Salir" del banner rojo | Tocar "Salir" restaura la sesión del admin |

**Criterio de éxito:** Es imposible cerrar sesión accidentalmente durante la impersonación.

---

## CP-11 — Bitácora de auditoría con filtros

**Objetivo:** Verificar que la bitácora registra todas las peticiones y permite filtrarlas.
**Característica ISO 25010:** Adecuación funcional

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Login como admin, ir al dashboard | Tarjeta "Bitácora" visible |
| 2 | Tocar "Bitácora" | Lista de peticiones registradas con método, ruta, usuario, estado HTTP y duración |
| 3 | Filtrar por método "POST" | Solo aparecen peticiones POST |
| 4 | Filtrar por método "GET" | Solo aparecen peticiones GET |
| 5 | Escribir `/api/pedidos` en el filtro de ruta | Solo aparecen las peticiones a ese endpoint |
| 6 | Cambiar la fecha al día de hoy | Lista filtrada por fecha |
| 7 | Verificar colores de estado: verde para 2xx, amarillo para 4xx, rojo para 5xx | Colores correctos según el código HTTP |
| 8 | Verificar que cada entrada muestra el nombre del usuario que hizo la petición | Columna usuario_nombre visible |

**Criterio de éxito:** Toda actividad API es rastreable. Los filtros funcionan correctamente.

---

## CP-12 — Ruta diaria del repartidor

**Objetivo:** Verificar que el repartidor ve sus entregas asignadas y puede actualizar estados.
**Característica ISO 25010:** Adecuación funcional · Usabilidad

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Login como `pedro@rutaexpress.gt` / `1234` | Pantalla "Ruta de hoy" con lista de entregas |
| 2 | Verificar que aparece el contador de entregas pendientes | Badge con número visible |
| 3 | Tocar una entrega | Pantalla de detalle con cliente, productos y dirección |
| 4 | Tocar "Ver en mapa" | Pantalla de mapa con ubicación del cliente |
| 5 | Marcar entrega como completada | Estado cambia a "entregado" en la lista |

**Criterio de éxito:** El repartidor puede gestionar su ruta sin acceso a funciones de otros roles.

---

## CP-13 — Pruebas automatizadas del backend

Ejecutar desde terminal: `cd backend && npm test`

| # | Comando | Resultado esperado |
|---|--------|--------------------|
| 1 | `npm run test:unit` | ~78 pruebas pasando: validaciones, pedidoService, inventarioService |
| 2 | `npm run test:integration` | ~60 pruebas pasando: todos los endpoints principales |
| 3 | `curl -X POST http://localhost:3000/api/pedidos -d '{"cliente_id":1,"vendedor_id":1,"items":[{"producto_id":1,"cantidad":999}]}'` | HTTP 409 con mensaje de stock insuficiente |
| 4 | `curl -X POST http://localhost:3000/api/usuarios -d '{"nombre":"Test","email":"'; DROP TABLE usuarios; --","rol":"vendedor"}'` | HTTP 400 con error de formato de email |

---

## Resumen de cobertura

| Módulo | Caso(s) | Característica ISO 25010 |
|---|---|---|
| Login con autenticación real | CP-01 | Adecuación funcional, Usabilidad |
| Catálogo con búsqueda y filtros | CP-02 | Usabilidad |
| Captura de pedido online | CP-03 | Adecuación funcional |
| Captura de pedido offline + sync | CP-04 | Safety (no pérdida de datos) |
| Validación de stock en app | CP-05 | Safety |
| Indicador offline/online | CP-06 | Usabilidad |
| Dashboard del supervisor | CP-07 | Adecuación funcional |
| CRUD usuarios con validaciones | CP-08 | Usabilidad, Adecuación funcional |
| Impersonación de usuario | CP-09 | Usabilidad, Adecuación funcional |
| Logout bloqueado en impersonación | CP-10 | Usabilidad, Safety |
| Bitácora de auditoría | CP-11 | Adecuación funcional |
| Ruta diaria del repartidor | CP-12 | Adecuación funcional |
| Pruebas automatizadas backend | CP-13 | Safety, Adecuación funcional |
