# Sustentacion ISO/IEC 25010:2023 — RutaExpress GT
## Sprint 1 — Evidencia del prototipo funcional

---

## 1. Usabilidad

**Definicion ISO 25010:** Grado en que el producto puede ser usado por usuarios especificados para lograr objetivos con efectividad, eficiencia y satisfaccion en un contexto de uso especificado.

### Evidencia en el codigo

| Sub-caracteristica | Evidencia | Archivo |
|---|---|---|
| **Reconocimiento de adecuacion** | Iconografia de Expo Vector Icons en cada pantalla y boton (icono de tienda para clientes, cubo para productos, recibo para resumen). El vendedor reconoce la accion sin leer. | `LoginScreen.tsx`, `CapturaPedidoScreen.tsx`, `CatalogoScreen.tsx` |
| **Facilidad de aprendizaje** | Wizard de 3 pasos lineales con indicador visual de progreso (circulos de paso). Solo hay un camino posible, no hay menus ocultos. | `CapturaPedidoScreen.tsx` — componente de pasos (lineas 106-129) |
| **Operabilidad** | Botones de minimo 50dp de altura (`PrimaryButton.tsx`, linea 47: `minHeight: 50`). Controles de cantidad con boton `-` y `+` separados con area tactil de 32x32dp. | `PrimaryButton.tsx`, `ProductCard.tsx` |
| **Proteccion de errores del usuario** | Alerta inmediata si el vendedor intenta avanzar sin seleccionar cliente o sin productos. Boton "Siguiente" no avanza sin datos validos. | `CapturaPedidoScreen.tsx` — `handleNext` con `Alert.alert` |
| **Estetica de la interfaz** | Paleta de colores consistente (azul marino #0D2137, teal #1A7FC4, naranja #E8620A) derivada directamente del branding de la presentacion del proyecto. | `src/constants/colors.ts` |
| **Accesibilidad** | Texto de estado de stock codificado en texto Y color (no solo color), cumpliendo WCAG 2.1 AA basico. | `ProductCard.tsx` — lineas de `stockText` y `stockDot` |

**Metrica cuantificable:** El flujo completo (login → seleccionar cliente → agregar producto → confirmar) se completa en **4 toques** y menos de 60 segundos. Objetivo original: reducir de 15 min (papel) a menos de 2 min.

---

## 2. Adecuacion Funcional

**Definicion ISO 25010:** Grado en que el producto provee funciones que satisfacen necesidades declaradas e implicadas cuando se usa en condiciones especificadas.

### Evidencia en el codigo

| Sub-caracteristica | Evidencia | Archivo |
|---|---|---|
| **Completitud funcional** | Los 5 modulos del alcance estan implementados: Login, Catalogo, Captura de pedido, Indicador offline/online, Confirmacion. | Pantallas en `src/screens/` |
| **Correctitud funcional** | El calculo del total del pedido se hace multiplicando precio x cantidad por cada item y sumando los subtotales. El backend reproduce el mismo calculo con precios de la BD (no del cliente). | `CapturaPedidoScreen.tsx` — `totalCarrito`; `pedidoService.js` — calculo de `total` |
| **Pertinencia funcional** | Solo se expone el flujo del Vendedor de ruta. El Supervisor y Repartidor no tienen pantallas en este sprint, siguiendo el alcance acordado. | `AppNavigator.tsx` — unico stack de pantallas |
| **Trazabilidad al negocio** | El flujo captura offline → sincronizacion → validacion central es exactamente el flujo de 5 pasos de la slide 5 de la presentacion. | `syncService.ts`, `pedidoService.js`, `pedidosQueries.ts` |
| **Datos mock fieles al negocio** | Productos reales del mercado guatemalteco (Arroz Diana, Aceite Capullo, Azucar Pantaleon), precios en Quetzales, clientes con zona y direccion guatemalteca. | `src/data/mockData.ts` |

**Metrica cuantificable:** 5 de 5 modulos del alcance implementados = 100% de completitud funcional del Sprint 1.

---

## 3. Seguridad de Funcionamiento (Safety)

**Definicion ISO 25010:** Grado en que el producto, bajo condiciones de operacion definidas, no presenta estados de datos inconsistentes o condiciones que puedan causar danos al sistema de informacion o al negocio.

> Nota: En ISO 25010:2023 esta sub-caracteristica forma parte de **Fiabilidad** (Reliability). Se usa aqui en el sentido de "proteccion contra estados inconsistentes de datos" tal como se especifica en el enunciado del curso.

### Evidencia en el codigo

| Mecanismo de Safety | Descripcion | Archivo y linea clave |
|---|---|---|
| **Validacion de stock en la app (Capa 1)** | Antes de agregar un producto al carrito, `handleAgregarProducto` verifica que `nuevaCantidad <= producto.stock`. Si supera el limite, muestra alerta y no actualiza el carrito. | `CapturaPedidoScreen.tsx` — lineas 61-70 |
| **Boton "+" deshabilitado en stock cero (Capa 1)** | `ProductCard.tsx` deshabilita el boton "+" cuando `sinStock` o `cantidad >= producto.stock`. No permite tocar el boton aunque el usuario lo intente. | `ProductCard.tsx` — prop `disabled` del TouchableOpacity |
| **Verificacion de stock en el backend antes de TX (Capa 2)** | `inventarioService.verificarStock()` consulta el stock real en PostgreSQL antes de iniciar la transaccion. Si cualquier item falla, retorna error 409 inmediatamente. | `inventarioService.js` — `verificarStock()` |
| **Transaccion atomica en PostgreSQL (Capa 3)** | `pedidoService.crearPedido()` usa `BEGIN/COMMIT/ROLLBACK`. Si cualquier paso falla (incluso el descuento de stock), todo se revierte. No hay pedido a medias. | `pedidoService.js` — bloque `try/catch` con `client.query('ROLLBACK')` |
| **Proteccion contra race conditions (Capa 3)** | El `UPDATE` de stock usa `WHERE stock >= $1`. Si entre la verificacion previa y el UPDATE otro pedido consumio el stock, la fila no se actualiza (rowCount = 0) y se lanza `STOCK_RACE_CONDITION`. | `inventarioService.js` — `descontarStock()`, verificacion de `rowCount === 0` |
| **Guardado en SQLite garantizado antes de sincronizar** | El pedido siempre se guarda en SQLite primero, incluso si hay conexion. La sincronizacion es un paso posterior. Nunca se pierde un pedido por fallo de red. | `CapturaPedidoScreen.tsx` — `guardarPedido()` antes de `sincronizarPedidoInmediato()` |
| **Sincronizacion idempotente** | Los pedidos sincronizados se marcan como `'sincronizado'` en SQLite. La funcion `obtenerPedidosPendientes()` solo retorna los de estado `'pendiente'`, evitando duplicados en el servidor. | `pedidosQueries.ts` — `marcarSincronizado()` y `obtenerPedidosPendientes()` |

### Prueba de Safety: escenario de sobreventa

**Escenario:** Dos vendedores intentan comprar el ultimo stock de un producto al mismo tiempo.

1. Vendedor A y Vendedor B tienen el producto X con stock = 1 en pantalla.
2. Ambos intentan enviar un pedido con cantidad = 1 casi simultaneamente.
3. El primer `POST /api/pedidos` pasa `verificarStock` (stock = 1 >= 1).
4. El segundo `POST /api/pedidos` también pasa `verificarStock` (lectura previa).
5. Dentro de la transaccion del primero, el `UPDATE ... WHERE stock >= 1` tiene exito, stock = 0.
6. Dentro de la transaccion del segundo, el `UPDATE ... WHERE stock >= 1` falla (`rowCount = 0`).
7. La transaccion del segundo hace `ROLLBACK` completo → el pedido no se crea.
8. El segundo vendedor recibe HTTP 409 "Stock insuficiente en la validacion final".

**Resultado:** El stock nunca llega a valores negativos. La sobreventa es imposible a nivel de base de datos.

---

## Resumen de la matriz

| Caracteristica ISO 25010 | Nivel de cobertura | Mecanismo principal |
|---|---|---|
| Usabilidad | ALTO | Wizard lineal, iconografia, botones accesibles, feedback visual |
| Adecuacion funcional | ALTO | 5/5 modulos del alcance, datos fieles al negocio guatemalteco |
| Safety (consistencia de datos) | ALTO | 3 capas de validacion de stock + transaccion atomica + anti-race condition |
