# Diagramas a Realizar — RutaExpress GT
## Guía detallada para el equipo

Sistema: Gestión de pedidos y distribución mayorista de abarrotes, Guatemala.
Herramienta sugerida: draw.io, Lucidchart o StarUML.

---

## DIAGRAMA 1 — Casos de Uso

**Qué es:** Muestra qué puede hacer cada actor (tipo de usuario) en el sistema. No muestra cómo, solo qué.

**Actores a incluir:**
- Vendedor de ruta
- Repartidor
- Supervisor
- Administrador (hereda todo del Supervisor)
- Sistema (para acciones automáticas como sincronización)

**Casos de uso por actor:**

| Actor | Casos de uso |
|---|---|
| Vendedor | Iniciar sesión, Capturar pedido, Ver catálogo de productos, Consultar mis pedidos, Guardar pedido offline, Sincronizar pedidos pendientes |
| Repartidor | Iniciar sesión, Ver ruta diaria, Ver detalle de entrega, Ver mapa de ruta, Marcar entrega como completada |
| Supervisor | Iniciar sesión, Ver dashboard, Gestionar productos (CRUD), Gestionar clientes (CRUD), Gestionar proveedores (CRUD), Ver y asignar pedidos, Enviar notificaciones WhatsApp, Gestionar usuarios |
| Administrador | Todo lo del Supervisor + Ver bitácora de auditoría, Ingresar como cualquier usuario (impersonación) |
| Sistema | Sincronizar pedidos automáticamente al recuperar conexión, Registrar bitácora por cada petición HTTP |

**Relaciones a incluir:**
- El Administrador usa `<<extend>>` del Supervisor (hereda todas sus funciones)
- "Sincronizar pedidos" usa `<<include>>` de "Guardar pedido offline"
- "Capturar pedido" usa `<<include>>` de "Verificar stock"

---

## DIAGRAMA 2 — Diagrama de Actividades: Captura de Pedido (Vendedor)

**Qué es:** Muestra el flujo paso a paso de una actividad, incluyendo decisiones, bifurcaciones y estados paralelos. Es el equivalente a un flujograma pero en notación UML.

**Proceso a modelar:** Flujo completo del vendedor al capturar un pedido.

**Pasos a incluir (en orden):**

```
INICIO
  ↓
El vendedor abre la app
  ↓
¿Hay sesión activa? ──NO──→ Pantalla de Login → Autenticar con email y contraseña
  ↓ SÍ                                              ↓
  ←──────────────────────────────────────────────────
  ↓
Pantalla "Nuevo pedido" — Paso 1: Seleccionar cliente
  ↓
¿Seleccionó cliente? ──NO──→ Mostrar alerta "Selecciona un cliente"
  ↓ SÍ                              ↓ (vuelve)
  ↓
Paso 2: Agregar productos al carrito
  ↓
[Para cada producto]
  ↓
¿Cantidad solicitada ≤ stock disponible?
  ├─ SÍ → Agregar al carrito, actualizar subtotal
  └─ NO → Mostrar alerta "Stock insuficiente", bloquear botón "+"
  ↓
¿Carrito tiene al menos 1 producto? ──NO──→ Mostrar alerta "Agrega productos"
  ↓ SÍ
  ↓
Paso 3: Revisar resumen (cliente + productos + total)
  ↓
¿Hay conexión a internet?
  ├─ SÍ → Guardar en SQLite + Enviar a servidor (POST /api/pedidos)
  │         ↓
  │         ¿Respuesta exitosa del servidor?
  │           ├─ SÍ → Marcar como "sincronizado" en SQLite
  │           └─ NO → Mantener como "pendiente" en SQLite
  │
  └─ NO → Guardar solo en SQLite con estado "pendiente"
  ↓
Mostrar pantalla de confirmación (con estado: enviado / guardado offline)
  ↓
¿Volver a capturar? ──SÍ──→ Reiniciar formulario → Paso 1
  ↓ NO
FIN
```

**Nota para el diagrama:** Usar carriles (swimlanes) separando: App Móvil | Backend | Base de Datos PostgreSQL | SQLite Local.

---

## DIAGRAMA 3 — Diagrama de Actividades: Sincronización Automática Offline

**Qué es:** Muestra el proceso en segundo plano que ejecuta la app cuando recupera la conexión a internet.

**Proceso a modelar:**

```
INICIO (evento: cambio de estado de red → online)
  ↓
Consultar SQLite: ¿hay pedidos con estado "pendiente"?
  ├─ NO → FIN (nada que sincronizar)
  └─ SÍ ↓
  ↓
[Para cada pedido pendiente]
  ↓
Construir payload: { cliente_id, vendedor_id, items }
  ↓
Enviar POST /api/pedidos al servidor
  ↓
¿Respuesta HTTP 201?
  ├─ SÍ → Actualizar SQLite: estado = "sincronizado", guardar server_id
  └─ NO → Mantener como "pendiente" (se reintentará en próxima conexión)
  ↓
¿Quedan más pedidos pendientes?
  ├─ SÍ → Siguiente pedido
  └─ NO → FIN
```

---

## DIAGRAMA 4 — Diagrama de Secuencia: Login y Navegación por Rol

**Qué es:** Muestra la interacción entre objetos/componentes a lo largo del tiempo para un escenario específico.

**Escenario:** Usuario ingresa credenciales y la app lo redirige según su rol.

**Participantes (columnas):**
- Usuario (actor)
- LoginScreen (app)
- apiService (app)
- Backend Express
- authController
- Base de Datos PostgreSQL

**Secuencia de mensajes:**

```
Usuario       →  LoginScreen:       ingresa email y contraseña, toca "Ingresar"
LoginScreen   →  LoginScreen:       valida formato de email (regex local)
LoginScreen   →  apiService:        loginApi(email, password)
apiService    →  Backend Express:   POST /api/auth/login { email, password }
Backend       →  authController:    procesar petición
authController → authController:   validar formato email (regex backend)
authController → PostgreSQL:        SELECT * FROM usuarios WHERE email = $1
PostgreSQL    →  authController:    retorna fila del usuario (con password)
authController → authController:   comparar password recibido con BD
  [si no coincide]
authController → Backend:          HTTP 401 { error: "Credenciales incorrectas" }
Backend       →  apiService:        401
apiService    →  LoginScreen:       lanza Error("Credenciales incorrectas")
LoginScreen   →  Usuario:           muestra mensaje de error
  [si sí coincide]
authController → authController:   generar token de sesión
authController → Backend:          HTTP 200 { token, usuario: { id, nombre, rol } }
Backend       →  apiService:        200 + datos
apiService    →  apiService:        guardarToken(token)
apiService    →  LoginScreen:       retorna { token, usuario }
LoginScreen   →  AppContext:        setUsuario(usuario)
AppContext     →  AppNavigator:     re-renderizar con usuario.rol
AppNavigator  →  Usuario:           navega a pantalla inicial según rol
                                    (vendedor → CapturaPedido)
                                    (supervisor/admin → AdminDashboard)
                                    (repartidor → RutaDiaria)
```

---

## DIAGRAMA 5 — Diagrama de Secuencia: Crear Pedido (Online)

**Escenario:** Vendedor confirma pedido con conexión. El backend verifica stock, crea el pedido y descuenta inventario.

**Participantes:**
- Vendedor (actor)
- CapturaPedidoScreen (app)
- syncService (app)
- Backend Express
- pedidoController
- pedidoService
- inventarioService
- Base de Datos PostgreSQL

**Secuencia:**

```
Vendedor           → CapturaPedidoScreen:  toca "Confirmar y enviar pedido"
CapturaPedidoScreen → pedidosQueries:      guardarPedido() en SQLite (estado: "pendiente")
CapturaPedidoScreen → syncService:         sincronizarPedidoInmediato(localId, payload)
syncService        → Backend:              POST /api/pedidos { cliente_id, vendedor_id, items }
Backend            → pedidoController:     procesar petición
pedidoController   → pedidoController:     validar campos obligatorios (cliente_id, items no vacío)
pedidoController   → pedidoService:        crearPedido(datos)
pedidoService      → inventarioService:    verificarStock(items)
inventarioService  → PostgreSQL:           SELECT stock FROM productos WHERE id = $1 (por cada item)
PostgreSQL         → inventarioService:    stock actual
  [si stock insuficiente]
inventarioService  → pedidoService:        { ok: false, mensaje: "Stock insuficiente: Producto X" }
pedidoService      → pedidoController:     lanza Error STOCK_INSUFICIENTE
pedidoController   → Backend:             HTTP 409 { error: "Stock insuficiente" }
Backend            → syncService:          409
syncService        → CapturaPedidoScreen:  retorna null (falló)
CapturaPedidoScreen → Vendedor:            muestra error
  [si stock suficiente]
inventarioService  → pedidoService:        { ok: true }
pedidoService      → PostgreSQL:           BEGIN
pedidoService      → PostgreSQL:           verificar que cliente existe
pedidoService      → PostgreSQL:           verificar que vendedor existe
pedidoService      → PostgreSQL:           SELECT precio FROM productos WHERE id = $1
pedidoService      → PostgreSQL:           INSERT INTO pedidos → retorna pedido con id y total
pedidoService      → PostgreSQL:           INSERT INTO items_pedido
pedidoService      → inventarioService:    descontarStock(items, client)
inventarioService  → PostgreSQL:           SELECT lotes WHERE producto_id ORDER BY fecha ASC (PEPS)
inventarioService  → PostgreSQL:           UPDATE lotes SET cantidad = cantidad - $1
inventarioService  → PostgreSQL:           UPDATE productos SET stock = (SELECT SUM FROM lotes)
pedidoService      → PostgreSQL:           COMMIT
pedidoService      → pedidoController:     retorna pedido { id, estado, total }
pedidoController   → Backend:             HTTP 201 { pedido, mensaje: "Pedido creado exitosamente" }
Backend            → syncService:          201 + pedido
syncService        → pedidosQueries:       marcarSincronizado(localId, serverId)
syncService        → CapturaPedidoScreen:  retorna serverId
CapturaPedidoScreen → Vendedor:            muestra confirmación con número de pedido
```

---

## DIAGRAMA 6 — Diagrama de Secuencia: Impersonación de Usuario (Admin)

**Escenario:** El admin entra al panel de un vendedor sin cerrar su sesión.

**Participantes:**
- Administrador (actor)
- UsuariosAdminScreen (app)
- AppContext (app)
- AppNavigator (app)
- Vendedor UI

**Secuencia:**

```
Administrador     → UsuariosAdminScreen:  toca "Ingresar como" en la fila de Carlos
UsuariosAdminScreen → AppContext:         setAdminOrigen(adminActual)
                                          setUsuario(usuarioSeleccionado)
AppContext         → AppNavigator:        re-renderizar (usuario.rol = "vendedor")
AppNavigator       → Administrador:       muestra pantalla "Nuevo pedido" de Carlos
AppNavigator       → Administrador:       muestra banner rojo "Vista de: Carlos Revolorio"

[El admin navega por las pantallas del vendedor]

Administrador     → AppNavigator:         toca "Salir" en el banner rojo
AppNavigator      → AppContext:           setUsuario(adminOrigen), setAdminOrigen(null)
AppContext         → AppNavigator:        re-renderizar (usuario.rol = "admin")
AppNavigator       → Administrador:       muestra "Panel de Administración" del admin
                                          banner rojo desaparece
```

---

## DIAGRAMA 7 — Diagrama de Clases

**Qué es:** Muestra las entidades del dominio, sus atributos, métodos y relaciones. Corresponde tanto al modelo de datos como a los servicios del backend.

**Clases a incluir:**

```
┌─────────────────────┐
│       Usuario       │
├─────────────────────┤
│ - id: number        │
│ - nombre: string    │
│ - email: string     │
│ - rol: RolUsuario   │
│ - password: string  │
│ - activo: boolean   │
│ - creado_en: Date   │
├─────────────────────┤
│ + validarEmail()    │
│ + validarNombre()   │
└─────────────────────┘
         │
         │ 1..*         1..*
         │ realiza            ┌──────────────────┐
         ▼                   │     Proveedor    │
┌─────────────────────┐      ├──────────────────┤
│       Pedido        │      │ - id: number     │
├─────────────────────┤      │ - nombre: string │
│ - id: number        │      │ - contacto: str  │
│ - cliente_id: number│      │ - telefono: str  │
│ - vendedor_id: num  │      │ - email: string  │
│ - estado: EstadoPed │      └──────────────────┘
│ - total: number     │
│ - creado_en: Date   │
├─────────────────────┤
│ + calcularTotal()   │
└─────────────────────┘
    │ 1          │ 1..*
    │            │
    ▼            ▼
┌──────────┐  ┌───────────────────┐
│ Cliente  │  │    ItemPedido     │
├──────────┤  ├───────────────────┤
│ - id     │  │ - id: number      │
│ - nombre │  │ - pedido_id: num  │
│ - tel    │  │ - producto_id:num │
│ - zona   │  │ - cantidad: num   │
│ - dir    │  │ - precio_unit:num │
│ - lat    │  │ - subtotal: num   │
│ - lng    │  └───────────────────┘
└──────────┘          │ *
                       │
                       ▼
               ┌──────────────────┐
               │    Producto      │
               ├──────────────────┤
               │ - id: number     │
               │ - nombre: string │
               │ - descripcion    │
               │ - precio: number │
               │ - stock: number  │
               │ - unidad: string │
               │ - categoria: str │
               │ - activo: bool   │
               ├──────────────────┤
               │ + verificarStock │
               └──────────────────┘
                       │ 1
                       │ tiene
                       ▼
               ┌──────────────────┐
               │      Lote        │
               ├──────────────────┤
               │ - id: number     │
               │ - producto_id    │
               │ - cantidad_disp  │
               │ - fecha_ingreso  │
               │ - proveedor_id   │
               └──────────────────┘

┌──────────────────────┐
│      Bitacora        │
├──────────────────────┤
│ - id: number         │
│ - timestamp: Date    │
│ - metodo: string     │
│ - ruta: string       │
│ - usuario_id: number │
│ - estado: number     │
│ - duracion_ms: num   │
│ - ip: string         │
└──────────────────────┘
```

**Tipos enumerados a incluir:**
- `RolUsuario`: `vendedor | repartidor | supervisor | admin`
- `EstadoPedido`: `pendiente | confirmado | despachado | entregado | cancelado`

---

## DIAGRAMA 8 — Diagrama Entidad-Relación (Base de Datos)

**Qué es:** Muestra las tablas de la base de datos, sus columnas y las relaciones (llaves foráneas) entre ellas.

**Tablas a incluir:**

| Tabla | Columnas principales | Relaciones |
|---|---|---|
| `usuarios` | id (PK), nombre, email (UNIQUE), rol, password, activo, creado_en | — |
| `clientes` | id (PK), nombre, telefono, zona, direccion, lat, lng | — |
| `proveedores` | id (PK), nombre, contacto, telefono, email, direccion | — |
| `productos` | id (PK), nombre, descripcion, precio, stock, unidad, categoria, activo, proveedor_id (FK) | → proveedores |
| `lotes` | id (PK), producto_id (FK), cantidad_disponible, fecha_ingreso, proveedor_id (FK) | → productos, → proveedores |
| `pedidos` | id (PK), cliente_id (FK), vendedor_id (FK), estado, total, creado_en | → clientes, → usuarios |
| `items_pedido` | id (PK), pedido_id (FK), producto_id (FK), cantidad, precio_unitario, subtotal | → pedidos, → productos |
| `notificaciones` | id (PK), pedido_id (FK), cliente_id (FK), tipo, mensaje, enviado_en | → pedidos, → clientes |
| `bitacora` | id (PK), timestamp, metodo, ruta, usuario_id (FK nullable), estado, duracion_ms, ip | → usuarios |

**Cardinalidades clave:**
- Un `usuario` (vendedor) crea muchos `pedidos` (1:N)
- Un `cliente` tiene muchos `pedidos` (1:N)
- Un `pedido` tiene muchos `items_pedido` (1:N)
- Un `producto` aparece en muchos `items_pedido` (1:N)
- Un `producto` puede tener muchos `lotes` (1:N, para PEPS)
- Un `proveedor` suministra muchos `productos` (1:N)

---

## DIAGRAMA 9 — Diagrama de Arquitectura / Componentes

**Qué es:** Muestra los grandes bloques del sistema y cómo se comunican entre sí.

**Componentes a incluir:**

```
┌─────────────────────────────────────────────────────┐
│                  Dispositivo Móvil                  │
│  ┌─────────────────────────────────────────────┐   │
│  │           App React Native (Expo)           │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐ │   │
│  │  │ Screens  │  │ AppContext │  │Navigator │ │   │
│  │  └────┬─────┘  └─────┬─────┘  └──────────┘ │   │
│  │       │              │                       │   │
│  │  ┌────▼─────────────▼──────────────────┐   │   │
│  │  │         Services Layer              │   │   │
│  │  │  apiService  │  adminApiService     │   │   │
│  │  │  syncService │  sesionService       │   │   │
│  │  └────┬─────────────────────┬──────────┘   │   │
│  │       │                     │               │   │
│  │  ┌────▼──────┐        ┌─────▼────────┐     │   │
│  │  │  SQLite   │        │  HTTP/REST   │     │   │
│  │  │  (local)  │        │  Fetch API   │     │   │
│  │  └───────────┘        └─────┬────────┘     │   │
│  └─────────────────────────────┼───────────── ┘   │
└────────────────────────────────┼────────────────── ┘
                                 │ HTTPS / red local
                                 ▼
┌─────────────────────────────────────────────────────┐
│              Docker Compose (Servidor)              │
│  ┌─────────────────────────────────────────────┐   │
│  │         Backend Node.js + Express           │   │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐  │   │
│  │  │  Routes  │ │Middleware  │ │Controllers│  │   │
│  │  │ /auth    │ │ sesion.js  │ │productos │  │   │
│  │  │ /pedidos │ │ auditoria  │ │pedidos   │  │   │
│  │  │ /clientes│ │ (bitácora) │ │usuarios  │  │   │
│  │  │ /usuarios│ └────────────┘ │clientes  │  │   │
│  │  │ /bitacora│                └──────────┘  │   │
│  │  └──────────┘                              │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │           Services Layer             │  │   │
│  │  │  pedidoService  │  inventarioService │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────── ┘   │
│                       │                            │
│  ┌────────────────────▼────────────────────────┐  │
│  │          PostgreSQL (puerto 5432)           │  │
│  │  tablas: usuarios, productos, pedidos,      │  │
│  │          clientes, lotes, bitacora, ...     │  │
│  └─────────────────────────────────────────── ┘   │
└─────────────────────────────────────────────────── ┘
```

---

## DIAGRAMA 10 — Diagrama de Flujo: Doble Capa de Protección SQL Injection

**Qué es:** Flujograma que muestra cómo un dato del usuario pasa por dos capas de validación antes de persistirse en la base de datos.

**Campo de ejemplo: `email` en `POST /api/usuarios`**

```
INICIO: Cliente envía { nombre, email, rol }
  ↓
CAPA 1A — Validación en el frontend (app)
¿Email tiene formato válido? (regex local)
  ├─ NO → Mostrar error al usuario, no enviar petición
  └─ SÍ ↓

CAPA 1B — Validación en el backend (controlador)
¿Email tiene formato válido? (regex en Node.js)
  ├─ NO → Retornar HTTP 400 { error: "formato de email inválido" }
  └─ SÍ ↓

¿Rol es uno de: vendedor, supervisor, repartidor, admin?
  ├─ NO → Retornar HTTP 400 { error: "rol inválido" }
  └─ SÍ ↓

¿Nombre tiene al menos 2 caracteres?
  ├─ NO → Retornar HTTP 400 { error: "mínimo 2 caracteres" }
  └─ SÍ ↓

CAPA 2 — Query parametrizada (node-postgres)
Construir: INSERT INTO usuarios (nombre, email, rol) VALUES ($1, $2, $3)
Parámetros: ['Juan López', 'juan@empresa.gt', 'vendedor']
  ↓
El driver pg envía: query_text + params por separado al motor PostgreSQL
PostgreSQL ejecuta el INSERT de forma segura (params nunca se concatenan al SQL)
  ↓
¿Error de duplicado (código 23505)?
  ├─ SÍ → Retornar HTTP 409 { error: "email ya está registrado" }
  └─ NO ↓

Retornar HTTP 201 con el usuario creado
FIN
```

**Nota importante a incluir en el diagrama:**
> Un payload como `'; DROP TABLE usuarios; --` falla en la Capa 1B (no es un email válido).
> Un payload numérico como `1; DELETE FROM...` pasa parseFloat → 1 (número válido), pero en la Capa 2 el driver lo envía como parámetro entero, nunca como texto SQL. La base de datos lo trata como el número 1, no como una instrucción.

---

## Resumen de todos los diagramas

| # | Tipo | Proceso que modela | Prioridad |
|---|---|---|---|
| 1 | Casos de uso | Qué puede hacer cada rol en el sistema | Alta |
| 2 | Actividades | Flujo completo de captura de pedido (vendedor) | Alta |
| 3 | Actividades | Sincronización automática offline → online | Media |
| 4 | Secuencia | Login y redirección por rol | Alta |
| 5 | Secuencia | Crear pedido online (verificación de stock + PEPS) | Alta |
| 6 | Secuencia | Impersonación de usuario por admin | Media |
| 7 | Clases | Entidades del dominio y sus relaciones | Alta |
| 8 | Entidad-Relación | Estructura de la base de datos PostgreSQL | Alta |
| 9 | Arquitectura/Componentes | Bloques del sistema y comunicación | Media |
| 10 | Flujo | Doble capa de protección SQL injection | Media |
