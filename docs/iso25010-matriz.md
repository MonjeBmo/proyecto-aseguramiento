# Matriz ISO/IEC 25010:2023 — RutaExpress GT
## Versión final — Todos los sprints

**Sistema:** RutaExpress GT — Gestión de pedidos y distribución mayorista de abarrotes, Guatemala.
**Fecha:** Septiembre 2026
**Repositorio:** https://github.com/MonjeBmo/proyecto-aseguramiento

---

## Alcance del sistema implementado

| Rol | Módulos disponibles |
|---|---|
| **Vendedor** | Login, Captura de pedido (online/offline), Catálogo, Mis pedidos |
| **Repartidor** | Ruta diaria, Detalle de entrega, Mapa de ruta |
| **Supervisor** | Dashboard, Productos, Proveedores, Clientes, Pedidos, Notificaciones, Usuarios |
| **Admin** | Todo lo del supervisor + Bitácora de auditoría + Impersonación de usuarios |

---

## 1. Usabilidad

**Definición ISO 25010:2023:** Grado en que un producto puede ser utilizado por usuarios específicos para lograr objetivos con efectividad, eficiencia y satisfacción en un contexto de uso especificado.

### 1.1 Sub-características cubiertas

| Sub-característica | Evidencia | Archivo clave |
|---|---|---|
| **Reconocimiento de adecuación** | Iconografía Ionicons en cada pantalla y botón (tienda para clientes, cubo para productos, recibo para pedidos, ojo para impersonación). El usuario reconoce la acción sin leer el texto. | `LoginScreen.tsx`, `CapturaPedidoScreen.tsx`, `AdminDashboardScreen.tsx` |
| **Facilidad de aprendizaje** | Wizard de 3 pasos lineales con indicador visual de progreso para el vendedor. Navegación basada en roles: cada usuario ve solo las pantallas que le corresponden. | `CapturaPedidoScreen.tsx`, `AppNavigator.tsx` |
| **Operabilidad** | Botones mínimo 50dp de altura (`PrimaryButton.tsx`). Controles +/- con área táctil de 36x36dp. Modales de formulario con validación inmediata por campo. | `PrimaryButton.tsx`, `ProductCard.tsx`, `UsuariosAdminScreen.tsx` |
| **Protección de errores del usuario** | Validaciones activas en todos los formularios: email con regex RFC-5322 simplificado, teléfono formato guatemalteco, precio ≥ 0, stock entero ≥ 0, nombre mínimo 2 caracteres. Mensaje de error específico por campo. | `clientesController.js`, `usuariosController.js`, `productosController.js`, `ClientesAdminScreen.tsx` |
| **Estética de la interfaz** | Paleta de colores consistente en toda la app: azul marino `#0D2137`, teal `#1A7FC4`, naranja `#E8620A`. Panel admin con tarjetas con borde de color por módulo. | `src/constants/colors.ts` |
| **Accesibilidad** | Stock codificado en texto Y color (no solo color). Badges de rol con color y etiqueta. Botones con `accessibilityLabel`. | `ProductCard.tsx`, `UsuariosAdminScreen.tsx` |
| **Feedback de impersonación** | Banner rojo permanente en la parte inferior cuando el admin está en modo vista de otro usuario. Botón de logout oculto durante impersonación para evitar cierre accidental de sesión. | `AppNavigator.tsx`, 7 pantallas admin |

### 1.2 Métricas cuantificables

| Flujo | Pasos mínimos | Tiempo estimado |
|---|---|---|
| Login → captura de pedido completo | 4 toques | < 60 segundos |
| Admin → impersonar usuario | 2 toques | < 10 segundos |
| Admin → ver bitácora filtrada | 3 interacciones | < 15 segundos |
| Supervisor → asignar pedido a repartidor | 3 toques | < 20 segundos |

---

## 2. Adecuación Funcional

**Definición ISO 25010:2023:** Grado en que el producto provee funciones que satisfacen necesidades declaradas e implicadas cuando se usa en condiciones especificadas.

### 2.1 Sub-características cubiertas

| Sub-característica | Evidencia | Archivo clave |
|---|---|---|
| **Completitud funcional** | 4 roles implementados con navegación independiente. 7 módulos del panel admin/supervisor. API REST con 7 grupos de endpoints: `/auth`, `/productos`, `/pedidos`, `/clientes`, `/usuarios`, `/proveedores`, `/bitacora`. | `AppNavigator.tsx`, `backend/src/routes/` |
| **Correctitud funcional** | El total del pedido se calcula en el backend con precios reales de la BD (no del cliente). El inventario se descuenta con algoritmo PEPS (FIFO por lotes). El administrador puede crear/editar/eliminar usuarios, productos y clientes. | `pedidoService.js`, `inventarioService.js` |
| **Pertinencia funcional** | Cada rol accede solo a las rutas que le corresponden. El admin puede escalar a cualquier rol mediante impersonación. La bitácora solo es accesible para el rol `admin`. | `AppNavigator.tsx`, `sesion.js` middleware |
| **Trazabilidad al negocio** | Flujo offline-first → sincronización → validación central refleja el proceso real de distribución mayorista guatemalteca: el vendedor captura en campo sin señal y sincroniza al volver a zona con internet. | `syncService.ts`, `pedidosQueries.ts` |
| **Auditoría de operaciones** | Cada petición HTTP al backend queda registrada en la tabla `bitacora` con: método, ruta, usuario_id, estado HTTP, duración en ms e IP. El admin puede filtrar por fecha, método y ruta. | `auditoria.js` middleware, `bitacoraController.js`, `BitacoraAdminScreen.tsx` |

### 2.2 Módulos implementados vs. alcance

| Módulo | Sprint | Estado |
|---|---|---|
| Login con autenticación real (PostgreSQL) | 1 | ✅ Completo |
| Captura de pedido online/offline (SQLite + sync) | 1 | ✅ Completo |
| Catálogo con búsqueda y filtro por categoría | 1 | ✅ Completo |
| Panel supervisor: productos, clientes, pedidos | 2 | ✅ Completo |
| Panel repartidor: ruta diaria, detalle, mapa | 2 | ✅ Completo |
| Notificaciones WhatsApp (simuladas) | 2 | ✅ Completo |
| Gestión de proveedores | 2 | ✅ Completo |
| Gestión de usuarios | 3 | ✅ Completo |
| Rol admin con impersonación | 3 | ✅ Completo |
| Bitácora de auditoría | 3 | ✅ Completo |
| Validaciones de campo con protección SQL injection | 3 | ✅ Completo |

---

## 3. Seguridad de Funcionamiento (Safety)

**Definición ISO 25010:2023:** Grado en que el producto, bajo condiciones de operación definidas, no presenta estados de datos inconsistentes que puedan causar daños al sistema de información o al negocio.

> Nota: En ISO 25010:2023 esta sub-característica forma parte de **Fiabilidad** (Reliability). Se aplica aquí en el sentido de protección contra estados inconsistentes de datos y contra ataques de inyección, conforme al enunciado del curso.

### 3.1 Protección contra SQL Injection — Defensa en profundidad

RutaExpress GT implementa **dos capas independientes** de protección:

#### Capa 1 — Validación de formato (front de validación)

Los campos con formato definido son rechazados antes de llegar a la base de datos si no cumplen el patrón esperado.

| Campo | Validación | Rechaza payloads SQL porque |
|---|---|---|
| `email` | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` | Ningún payload SQL tiene formato `usuario@dominio.tld` |
| `telefono` | Regex GT `/^(\+502[\s-]?)?[2-9]\d{3}[-\s]?\d{4}$/` | Los payloads no tienen formato de teléfono guatemalteco |
| `precio` | `parseFloat()` + `>= 0` | Strings como `'; DROP TABLE'` resultan en `NaN` → rechazado |
| `stock` | `parseInt()` + `>= 0` + `Number.isInteger()` | Strings no numéricos resultan en `NaN` → rechazado |
| `nombre` | Longitud mínima 2 caracteres | No rechaza por SQL, pero la Capa 2 protege |
| `rol` | Lista blanca: `['vendedor','supervisor','repartidor','admin']` | Cualquier valor fuera de la lista es rechazado con 400 |

**Archivos:** `usuariosController.js`, `clientesController.js`, `productosController.js`, `authController.js`

#### Capa 2 — Queries parametrizadas (protección total)

Todos los controladores del backend usan la API paramétrica de `node-postgres` (`$1, $2, ...`). El driver nunca concatena valores del usuario en el texto SQL; los pasa como parámetros separados al motor de PostgreSQL.

```sql
-- Ejemplo: INSERT de usuario
INSERT INTO usuarios (nombre, email, rol, password)
VALUES ($1, $2, $3, $4)
-- $1 = 'O\'Brien Comercial' → insertado como string literal, nunca ejecutado
```

**Resultado:** Aunque un payload como `1; DELETE FROM usuarios WHERE 1=1` pasara la validación numérica (porque `parseInt("1; DELETE...", 10) = 1`), el valor `1` se pasa como parámetro entero al motor — nunca se ejecuta el `DELETE`.

**Archivos:** todos los controladores en `backend/src/controllers/`

#### Cobertura de pruebas de SQL Injection

| Tipo de prueba | Archivo | Casos cubiertos |
|---|---|---|
| Unitaria — validación regex email | `tests/unit/validaciones.test.js` | 5 payloads SQL rechazados por regex |
| Unitaria — validación teléfono GT | `tests/unit/validaciones.test.js` | 3 payloads SQL rechazados por regex |
| Unitaria — validación precio | `tests/unit/validaciones.test.js` | Payloads no numéricos → NaN → false |
| Unitaria — protección genérica | `tests/unit/validaciones.test.js` | 4 payloads clásicos vs. email, teléfono, precio |
| Integración — POST /api/usuarios | `tests/integration/usuarios.test.js` | 3 payloads en campo email → 400 |
| Integración — POST /api/clientes | `tests/integration/usuarios.test.js` | 3 payloads en campo teléfono → 400 |
| Integración — nombre con SQL chars | `tests/integration/usuarios.test.js` | `O'Brien Comercial` → 201, insertado literalmente |

### 3.2 Protección contra inconsistencias de inventario

| Mecanismo | Descripción | Capa | Archivo |
|---|---|---|---|
| **Validación en la app (Capa 1)** | `handleAgregarProducto` verifica `nuevaCantidad <= producto.stock` antes de actualizar el carrito. Alerta inmediata si se supera. | App | `CapturaPedidoScreen.tsx` |
| **Botón "+" deshabilitado (Capa 1)** | El botón se deshabilita visualmente cuando `cantidad >= stock` o `stock === 0`. | App | `ProductCard.tsx` |
| **Verificación pre-transacción (Capa 2)** | `inventarioService.verificarStock()` consulta stock real en PostgreSQL antes de iniciar la transacción. Retorna 409 si falla. | Backend | `inventarioService.js` |
| **Transacción atómica (Capa 3)** | `BEGIN / COMMIT / ROLLBACK`. Si cualquier paso falla, todo se revierte. No hay pedidos a medias. | BD | `pedidoService.js` |
| **Anti race condition (Capa 3)** | `UPDATE productos SET stock = stock - $1 WHERE id = $2 AND stock >= $1`. Si `rowCount = 0`, la transacción hace ROLLBACK. | BD | `inventarioService.js` |
| **Algoritmo PEPS (FIFO)** | El descuento de stock prioriza los lotes más antiguos. Si no hay lotes, descuenta directamente del producto. | BD | `inventarioService.js` |
| **SQLite offline garantizado** | El pedido se guarda localmente antes de intentar sincronizar. Nunca se pierde un pedido por fallo de red. | App | `CapturaPedidoScreen.tsx` |
| **Sincronización idempotente** | Los pedidos sincronizados se marcan `'sincronizado'` en SQLite. Solo se sincronizan los `'pendiente'`. | App | `pedidosQueries.ts` |

### 3.3 Escenario de sobreventa — prueba de Safety crítica

**Escenario:** Dos vendedores intentan comprar el último stock simultáneamente.

```
Vendedor A: POST /api/pedidos { producto_id: 1, cantidad: 1 }  ─┐
Vendedor B: POST /api/pedidos { producto_id: 1, cantidad: 1 }  ─┘ (casi simultáneos, stock = 1)

1. Ambos pasan verificarStock() → stock = 1 ≥ 1 ✓
2. Tx A: UPDATE productos SET stock = stock - 1 WHERE id = 1 AND stock >= 1
         → rowCount = 1, stock = 0. COMMIT. → Pedido creado.
3. Tx B: UPDATE productos SET stock = stock - 1 WHERE id = 1 AND stock >= 1
         → rowCount = 0 (stock ya es 0). ROLLBACK.
4. Vendedor B recibe HTTP 409 "Stock insuficiente en la validación final".

Resultado: stock nunca llega a valores negativos. Sobreventa imposible.
```

---

## 4. Resumen de la Matriz

| Característica ISO 25010 | Nivel | Mecanismos principales | Pruebas automatizadas |
|---|---|---|---|
| **Usabilidad** | ALTO | Wizard lineal, iconografía, validaciones con mensajes precisos, banner de impersonación, logout bloqueado | Pruebas de aceptación CP-01 a CP-12 |
| **Adecuación funcional** | ALTO | 4 roles, 11 módulos, 7 grupos de endpoints, autenticación real contra BD | Integración: `pedidos.test.js`, `usuarios.test.js` |
| **Safety (consistencia de datos)** | ALTO | 3 capas anti-sobreventa, 2 capas anti-SQL injection, transacción atómica, PEPS | Unitarias: `validaciones.test.js`, `pedidoService.test.js`; Integración: ambos archivos |

**Total de pruebas automatizadas:** 6 suites · ~138 tests · 0 fallos.
