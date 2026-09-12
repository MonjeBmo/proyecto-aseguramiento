# RutaExpress GT

Sistema de gestion de pedidos movil y georreferenciacion para distribucion mayorista de abarrotes en Guatemala.

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Node.js 20+](https://nodejs.org/) — solo para la app movil
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- App Expo Go en tu dispositivo movil (o emulador Android/iOS)

---

## Levantar el entorno local

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url>
cd rutaexpress-gt
cp .env.example .env
# Edita .env si necesitas cambiar puertos o contrasenas
```

### 2. Levantar backend + base de datos con Docker

```bash
docker-compose up --build
```

Esto levanta:
- **PostgreSQL** en `localhost:5432`
- **Backend (API)** en `localhost:3000`

El backend crea las tablas automaticamente y carga datos de prueba en el primer inicio.

### 3. Verificar que la API responde

```bash
curl http://localhost:3000/health
# Respuesta esperada: {"status":"ok","timestamp":"..."}
```

### 4. Instalar dependencias de la app movil

```bash
cd app
npm install
```

### 5. Configurar la URL del backend para la app

Edita `app/src/services/apiService.ts` y ajusta `API_URL` con tu IP local:

```bash
# En Linux/Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# En Windows
ipconfig
```

O crea `app/.env` con:
```
API_URL=http://192.168.1.TU_IP:3000
```

### 6. Iniciar la app movil

```bash
cd app
npx expo start
```

Escanea el QR con Expo Go (Android) o la camara (iOS).

---

## Puertos utilizados

| Servicio    | Puerto |
|-------------|--------|
| Backend API | 3000   |
| PostgreSQL  | 5432   |

---

## Comandos utiles

```bash
# Ver logs del backend
docker-compose logs -f backend

# Detener contenedores
docker-compose down

# Eliminar contenedores y volumen de datos (reset completo)
docker-compose down -v

# Correr pruebas del backend
cd backend && npm test

# Solo pruebas unitarias
cd backend && npm run test:unit

# Solo pruebas de integracion
cd backend && npm run test:integration
```

---

## Estructura del proyecto

```
rutaexpress-gt/
├── app/                  # App movil (React Native + Expo)
│   └── src/
│       ├── screens/      # Login, CapturaPedido, Catalogo, Confirmacion
│       ├── components/   # OfflineBanner, ProductCard, PrimaryButton
│       ├── database/     # SQLite (offline-first)
│       ├── services/     # API calls + sincronizacion
│       ├── context/      # Estado global (usuario, conexion)
│       └── navigation/   # Stack navigator
├── backend/              # API REST (Node.js + Express)
│   ├── src/
│   │   ├── routes/       # /auth, /productos, /pedidos
│   │   ├── controllers/
│   │   ├── services/     # Logica de negocio
│   │   ├── models/       # Schema PostgreSQL
│   │   └── config/       # DB connection, seed data
│   └── tests/
│       ├── unit/
│       └── integration/
├── docs/                 # Casos de prueba, matriz ISO 25010
├── docker-compose.yml
└── .env.example
```

---

## Actores del sistema (este prototipo)

- **Vendedor de ruta** — captura pedidos con o sin conexion; sincroniza automaticamente al recuperar senial.

Fuera del alcance de esta iteracion: panel del Supervisor, vista del Repartidor con mapa, integracion real con WhatsApp.
