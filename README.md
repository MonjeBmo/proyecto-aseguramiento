# RutaExpress GT

Sistema de gestión de pedidos móvil y georreferenciación para distribución mayorista de abarrotes en Guatemala.

Desarrollado con **React Native + Expo** (frontend móvil) y **Node.js + Express + PostgreSQL** (backend API REST), dockerizado para despliegue local y en producción.

---

## Roles del sistema

| Rol | Acceso |
|---|---|
| **Vendedor** | Captura pedidos online/offline, catálogo, historial |
| **Repartidor** | Ruta diaria, detalle de entrega, mapa de ruta |
| **Supervisor** | Dashboard, productos, clientes, pedidos, notificaciones, usuarios |
| **Admin** | Todo lo anterior + bitácora de auditoría + impersonación de usuarios |

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Node.js 20+](https://nodejs.org/) — solo para la app móvil
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- App **Expo Go** en tu dispositivo móvil (o emulador Android/iOS)

---

## Levantar el entorno local

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/MonjeBmo/proyecto-aseguramiento.git
cd proyecto-aseguramiento
cp .env.example .env
# Edita .env si necesitas cambiar puertos o contraseñas
```

### 2. Levantar backend + base de datos con Docker

```bash
docker-compose up --build
```

Levanta:
- **PostgreSQL** en `localhost:5432`
- **Backend (API)** en `localhost:3000`

Las tablas se crean automáticamente y se cargan datos de prueba en el primer inicio.

### 3. Verificar que la API responde

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### 4. Instalar dependencias de la app móvil

```bash
cd app
npm install
```

### 5. Configurar la URL del backend

Edita `app/src/services/apiService.ts` y ajusta `API_URL` con tu IP local:

```bash
# Linux/Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

O crea `app/.env`:
```
API_URL=http://192.168.1.TU_IP:3000
```

### 6. Iniciar la app móvil

```bash
cd app
npx expo start
```

Escanea el QR con Expo Go (Android) o la cámara (iOS).

---

## Usuarios de prueba

| Email | Contraseña | Rol |
|---|---|---|
| `superadmin@rutaexpress.gt` | `super1234` | admin |
| `carlos@rutaexpress.gt` | `1234` | vendedor |
| `ana@rutaexpress.gt` | `1234` | supervisor |
| `pedro@rutaexpress.gt` | `1234` | repartidor |

---

## Puertos utilizados

| Servicio    | Puerto |
|-------------|--------|
| Backend API | 3000   |
| PostgreSQL  | 5432   |

---

## Pruebas

```bash
# Todas las pruebas
cd backend && npm test

# Solo unitarias
cd backend && npm run test:unit

# Solo integración
cd backend && npm run test:integration
```

Las pruebas cubren los criterios de calidad **ISO/IEC 25010:2023**:
- **Adecuación funcional** — validaciones de campos y flujos de negocio
- **Safety** — protección contra SQL injection (regex + queries parametrizadas)
- **Usabilidad** — mensajes de error precisos por campo

---

## Comandos útiles

```bash
# Ver logs del backend
docker-compose logs -f backend

# Detener contenedores
docker-compose down

# Reset completo (borra datos)
docker-compose down -v
```

---

## Estructura del proyecto

```
rutaexpress-gt/
├── app/                        # App móvil (React Native + Expo)
│   └── src/
│       ├── screens/
│       │   ├── admin/          # Dashboard, Productos, Clientes, Pedidos,
│       │   │                   # Usuarios, Notificaciones, Bitácora
│       │   ├── LoginScreen
│       │   ├── CapturaPedidoScreen
│       │   ├── CatalogoScreen
│       │   ├── RutaDiariaScreen
│       │   └── DetalleEntregaScreen
│       ├── components/         # OfflineBanner, LocationPicker
│       ├── services/           # adminApiService, apiService, sincronización
│       ├── context/            # AppContext (usuario, adminOrigen, entregas)
│       └── navigation/         # AppNavigator con Stack por rol
├── backend/                    # API REST (Node.js + Express)
│   ├── src/
│   │   ├── routes/             # /auth, /productos, /pedidos, /clientes,
│   │   │                       # /usuarios, /proveedores, /bitacora
│   │   ├── controllers/        # Validaciones + lógica de endpoints
│   │   ├── middleware/         # sesion.js, auditoria.js
│   │   ├── services/           # pedidoService, inventarioService (PEPS)
│   │   ├── models/             # Schema PostgreSQL + migraciones
│   │   └── config/             # DB connection, seed data
│   └── tests/
│       ├── unit/               # validaciones.test.js, pedidoService.test.js
│       └── integration/        # pedidos.test.js, usuarios.test.js
├── docs/                       # Casos de prueba, matriz ISO 25010
├── docker-compose.yml
└── .env.example
```

---

## Características destacadas

- **Offline-first**: el vendedor captura pedidos sin conexión (SQLite local) y sincroniza al recuperar señal
- **Impersonación de usuarios**: el admin puede entrar al panel de cualquier usuario; logout bloqueado durante la vista impersonada
- **Bitácora de auditoría**: cada petición a la API queda registrada con método, ruta, usuario, estado HTTP y duración
- **Inventario PEPS**: el descuento de stock sigue orden FIFO por lotes registrados
- **Protección SQL injection**: validaciones de formato (email, teléfono GT, precio) + queries parametrizadas en todos los controladores
