# Casos de Prueba de Aceptacion — RutaExpress GT
## Sprint 1 — Flujo del Vendedor de Ruta

Estos casos pueden ejecutarse manualmente con la app corriendo via Expo y el backend levantado con `docker-compose up`.

---

## CP-01 — Login / Seleccion de usuario

**Objetivo:** Verificar que el vendedor puede seleccionar su perfil y acceder a la pantalla de captura de pedido.

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Abrir la app | Aparece la pantalla de Login con el titulo "RutaExpress GT" y la lista de vendedores |
| 2 | Verificar que la lista muestra "Carlos Revolorio" y "Maria Garcia" | Ambos nombres visibles con icono de persona |
| 3 | Tocar "Carlos Revolorio" | La app navega a la pantalla "Nuevo pedido" |
| 4 | Verificar que el nombre del vendedor aparece en el header | "Carlos Revolorio" visible debajo del titulo |

**Criterio de exito:** El vendedor llega a la pantalla de captura en menos de 2 toques.

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

## CP-07 — Pruebas del backend (API)

Ejecutar desde terminal: `cd backend && npm test`

| # | Prueba | Resultado esperado |
|---|--------|--------------------|
| 1 | `npm run test:unit` | Todas las pruebas unitarias pasan (verificarStock, descontarStock, crearPedido) |
| 2 | `npm run test:integration` | Todas las pruebas de integracion pasan (endpoints /health, /api/productos, /api/pedidos, /api/auth/login) |
| 3 | `curl -X POST http://localhost:3000/api/pedidos -H "Content-Type: application/json" -d '{"cliente_id":1,"vendedor_id":1,"items":[{"producto_id":1,"cantidad":999}]}'` | Respuesta 409 con mensaje de stock insuficiente |
| 4 | `curl http://localhost:3000/api/productos` | Lista de 10 productos con stock |

---

## Resumen de cobertura

| Modulo | Cubierto por |
|--------|-------------|
| Login | CP-01 |
| Catalogo | CP-02 |
| Captura de pedido (online) | CP-03 |
| Captura de pedido (offline) | CP-04 |
| Validacion de stock | CP-05 |
| Indicador offline/online | CP-06 |
| Backend API | CP-07 |
