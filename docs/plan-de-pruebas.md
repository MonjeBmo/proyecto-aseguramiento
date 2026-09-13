# Plan de Pruebas — RutaExpress GT
## ISO/IEC 25010:2023 · Versión final

**Sistema:** RutaExpress GT
**Repositorio:** https://github.com/MonjeBmo/proyecto-aseguramiento
**Fecha:** Septiembre 2026

---

## 1. Objetivos

- Verificar que el sistema cumple los criterios de calidad **Usabilidad**, **Adecuación funcional** y **Safety** definidos en ISO/IEC 25010:2023.
- Detectar defectos de validación, consistencia de datos e inyección SQL antes del cierre del proyecto.
- Demostrar cobertura automatizada mediante pruebas unitarias e integración ejecutables en CI.

---

## 2. Alcance

| En alcance | Fuera de alcance |
|---|---|
| Backend API REST (Node.js + Express) | App móvil (sin framework de pruebas E2E instalado) |
| Validaciones de campo en controladores | Rendimiento / carga (no es requisito del curso) |
| Lógica de negocio: pedidos, inventario PEPS | Integración real con WhatsApp |
| Protección SQL injection | Pruebas de seguridad de red (pentesting) |
| Flujos de aceptación (manuales) | |

---

## 3. Estrategia de pruebas

```
┌─────────────────────────────────────┐
│       Pruebas de Aceptación         │  ← Manuales, flujos completos por rol
├─────────────────────────────────────┤
│       Pruebas de Integración        │  ← Supertest, endpoints reales, DB mockeada
├─────────────────────────────────────┤
│       Pruebas Unitarias             │  ← Jest puro, sin HTTP ni base de datos
└─────────────────────────────────────┘
```

---

## 4. Pruebas Unitarias

**Framework:** Jest
**Comando:** `cd backend && npm run test:unit`
**Archivos:** `backend/tests/unit/`

### 4.1 `validaciones.test.js` — Validación de entradas

Verifica que las funciones de validación usadas en los controladores rechazan correctamente valores maliciosos o mal formados, **antes de que lleguen a la base de datos**.

| Suite | Casos | Qué verifica |
|---|---|---|
| Validación de Email | 14 casos | Acepta emails RFC válidos; rechaza sin arroba, sin dominio, con espacios, `null`, `undefined` |
| SQL Injection en email | 5 payloads | `'; DROP TABLE usuarios; --`, `' OR '1'='1`, `UNION SELECT *`, etc. → todos rechazados por regex |
| Validación de Teléfono GT | 11 casos | Acepta formato `5555-1234`, `+502 5555-1234`; rechaza cortos, con letras, `0000-0000`, `+1-800` |
| SQL Injection en teléfono | 3 payloads | Rechazados por regex de teléfono guatemalteco |
| Validación de Precio | 11 casos | Acepta `0`, `0.01`, `'28.50'`; rechaza negativos, `null`, `undefined`, `''`, payloads SQL |
| Validación de Stock | 7 casos | Acepta enteros `>= 0`; rechaza negativos, `null`, strings no numéricos |
| Protección SQL genérica | 12 casos (4 payloads × 3 campos) | Ningún payload clásico pasa email, teléfono ni precio |

**Total: ~64 casos de prueba unitarios**

### 4.2 `pedidoService.test.js` — Lógica de negocio

Verifica que el servicio de pedidos e inventario maneja correctamente los escenarios de negocio sin necesidad de una base de datos real (pg pool mockeado con Jest).

| Suite | Casos | Qué verifica |
|---|---|---|
| `verificarStock` | 6 casos | Stock suficiente → ok:true; stock insuficiente → ok:false + mensaje; producto inexistente; producto inactivo; lista vacía; cantidad cero/negativa |
| `descontarStock` | 3 casos | PEPS con lotes disponibles; fallback sin lotes; ROLLBACK en race condition |
| `crearPedido` | 5 casos | Datos incompletos (sin cliente_id, sin items); stock insuficiente → STOCK_INSUFICIENTE; creación exitosa con COMMIT; error interno → ROLLBACK |

**Total: ~14 casos de prueba unitarios**

---

## 5. Pruebas de Integración

**Framework:** Jest + Supertest
**Comando:** `cd backend && npm run test:integration`
**Archivos:** `backend/tests/integration/`
**Estrategia:** La app Express se levanta sin puerto real. El pool de PostgreSQL se mockea con `jest.mock`. Se prueban los endpoints HTTP completos (routing → middleware → controller → respuesta).

### 5.1 `pedidos.test.js` — Endpoints principales

| Suite | Endpoint | Casos |
|---|---|---|
| Health check | `GET /health` | Devuelve `{status: "ok", timestamp}` |
| Productos | `GET /api/productos` | Lista activos; lista vacía; filtro por categoría |
| Pedidos | `POST /api/pedidos` | Creación exitosa → 201; stock insuficiente → 409; campos faltantes → 400; items vacíos → 400 |
| Login | `POST /api/auth/login` | Credenciales válidas → 200 + token (sin password en respuesta); password incorrecta → 401; email faltante → 400; email inválido → 400 |

**Total: ~11 casos de integración**

### 5.2 `usuarios.test.js` — Validaciones de campo y SQL injection

| Suite | Endpoint | Casos |
|---|---|---|
| Crear usuario | `POST /api/usuarios` | Falta nombre → 400; email inválido → 400; rol no válido → 400; nombre < 2 chars → 400; datos válidos → 201; email duplicado → 409 |
| SQL injection en email | `POST /api/usuarios` | 3 payloads SQL → 400 por regex |
| Nombre con chars SQL | `POST /api/usuarios` | `O'Brien Comercial` → 201 (query parametrizada, no injection) |
| Reset password | `PATCH /api/usuarios/:id/reset-password` | Contraseña < 4 chars → 400; actualización exitosa → 200; usuario inexistente → 404 |
| Crear cliente | `POST /api/clientes` | Nombre vacío → 400; teléfono inválido → 400; sin teléfono (opcional) → 201; datos completos → 201 |
| SQL injection en teléfono | `POST /api/clientes` | 3 payloads SQL → 400 por regex |
| Crear producto | `POST /api/productos` | Precio negativo → 400; stock negativo → 400; nombre < 2 chars → 400; datos válidos → 201 |
| SQL injection en precio | `POST /api/productos` | 2 payloads no numéricos → 400 |

**Total: ~24 casos de integración**

---

## 6. Pruebas de Aceptación (Manuales)

**Documento completo:** `docs/casos-de-prueba-aceptacion.md`
**Herramienta:** Ejecución manual con la app en Expo Go + backend en Docker.
**Comando para levantar entorno:**
```bash
docker-compose up --build   # backend + PostgreSQL
cd app && npx expo start    # app móvil
```

### Resumen de casos

| ID | Nombre | Rol | Característica ISO 25010 |
|---|---|---|---|
| CP-01 | Login con credenciales reales | Todos | Adecuación funcional |
| CP-02 | Catálogo con búsqueda y filtros | Vendedor | Usabilidad |
| CP-03 | Captura de pedido online | Vendedor | Adecuación funcional |
| CP-04 | Captura de pedido offline + sincronización | Vendedor | Safety (no pérdida de datos) |
| CP-05 | Validación de stock en app | Vendedor | Safety |
| CP-06 | Indicador offline/online en tiempo real | Todos | Usabilidad |
| CP-07 | Dashboard y navegación del supervisor | Supervisor | Adecuación funcional |
| CP-08 | Gestión de usuarios (CRUD) | Supervisor/Admin | Adecuación funcional |
| CP-09 | Impersonación de usuario por admin | Admin | Usabilidad · Adecuación funcional |
| CP-10 | Logout bloqueado durante impersonación | Admin | Usabilidad · Safety |
| CP-11 | Bitácora de auditoría con filtros | Admin | Adecuación funcional |
| CP-12 | Ruta diaria del repartidor | Repartidor | Adecuación funcional |

---

## 7. Ejecución y resultados esperados

### Ejecutar todas las pruebas automatizadas

```bash
cd backend
npm test                    # todas (unitarias + integración)
npm run test:unit           # solo unitarias
npm run test:integration    # solo integración
```

### Resultado esperado

```
Test Suites: 4 passed, 4 total
Tests:       ~138 passed, 0 failed
Snapshots:   0 total
Time:        ~5s
```

### Criterio de aceptación global

| Criterio | Meta | Estado |
|---|---|---|
| Pruebas unitarias pasando | 100% | ✅ |
| Pruebas de integración pasando | 100% | ✅ |
| Endpoints con validación de campo | 100% de controladores | ✅ |
| Endpoints con queries parametrizadas | 100% de controladores | ✅ |
| Casos de aceptación manuales aprobados | 12/12 | Verificar en demo |
| Stock nunca negativo bajo carga concurrente | 0 sobreventas | ✅ (demostrado por transacción atómica) |

---

## 8. Trazabilidad prueba → requisito ISO 25010

| Prueba | Archivo | Característica ISO 25010 | Sub-característica |
|---|---|---|---|
| Email regex rechaza payloads SQL | `validaciones.test.js` | Safety | Protección contra corrupción de datos |
| Teléfono GT rechaza payloads SQL | `validaciones.test.js` | Safety | Protección contra corrupción de datos |
| `verificarStock` → ok:false si stock insuficiente | `pedidoService.test.js` | Safety | Integridad de datos |
| ROLLBACK en error de transacción | `pedidoService.test.js` | Safety | Atomicidad |
| POST /api/pedidos → 409 si stock insuficiente | `pedidos.test.js` | Safety | Integridad de datos |
| POST /api/usuarios → 400 si email inválido | `usuarios.test.js` | Usabilidad | Protección de errores del usuario |
| POST /api/usuarios → 400 si nombre < 2 chars | `usuarios.test.js` | Usabilidad | Protección de errores del usuario |
| POST /api/clientes → 400 si teléfono inválido | `usuarios.test.js` | Usabilidad | Protección de errores del usuario |
| POST /api/auth/login → 200 + token sin password | `pedidos.test.js` | Adecuación funcional | Correctitud funcional |
| GET /api/productos filtra por categoría | `pedidos.test.js` | Adecuación funcional | Completitud funcional |
| CP-04 — sincronización automática offline | Manual | Adecuación funcional | Completitud funcional |
| CP-09 — impersonación de usuario | Manual | Usabilidad | Operabilidad |
| CP-11 — bitácora con filtros | Manual | Adecuación funcional | Trazabilidad |

---

## 9. Herramientas utilizadas

| Herramienta | Versión | Propósito |
|---|---|---|
| Jest | 29.x | Framework de pruebas unitarias e integración |
| Supertest | 6.x | HTTP assertions sobre Express sin levantar puerto |
| node-postgres (pg) | 8.x | Driver con queries parametrizadas (anti SQL injection) |
| Docker Compose | 2.x | Entorno reproducible para pruebas manuales |
| Expo Go | Latest | Ejecución de app móvil para pruebas de aceptación |
