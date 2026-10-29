# PROMPT — Lista de tareas (AWS Lambda + DynamoDB + Terraform + Vite + Vercel)

## 0. Prompt original
> # Hacer una web en vite para acceder al api de la lambda
>
> # desplegar usando terraform:
> 1. una lambda con permisos de acceso publicos
> 2. una base de datos dynamodb que pueda ser accesible por la lambda
> 3. la base de datos dynamodb tendra el modelo para la lista de tareas
>
> # Testing
> 1. probar el sistema. Ejecutar terraform con —auto—approve
> 2. Probar el funcionamiento de la lambda
>
> # Hacer una web en vite para acceder al api de ta lambda
> 1. Hacer una web professional.
> 2. Presentar la lista de tareas y las operaciones sobre la lista
> 3. Subir la web a github y a vercel

## 1. Objetivo
Construir una aplicación completa de **gestión de tareas (to-do list)** con tres piezas:
una **API serverless** (AWS Lambda, Node.js) expuesta públicamente mediante **Function URL**,
una **tabla DynamoDB** para persistir las tareas, y un **frontend SPA en Vite + React + TypeScript**
desplegado en **Vercel**. Toda la infraestructura AWS se aprovisiona con **Terraform** de forma
reproducible, idempotente y declarativa.

## 2. Alcance
**Incluido**
- Lambda Node.js con CRUD completo de tareas y endpoint de salud.
- Function URL pública (`AuthType = NONE`) con CORS configurado.
- Tabla DynamoDB on-demand con el modelo de la lista de tareas.
- Rol IAM de mínimo privilegio (solo las acciones DynamoDB necesarias + logs).
- Terraform parametrizado, con outputs y tags.
- Smoke tests de la API (curl/script) y tests unitarios del frontend.
- Frontend Vite profesional, responsive y accesible.
- Repositorio en GitLab con espejo en GitHub y despliegue automático en Vercel.
- CI (GitHub Actions/GitLab CI) con lint, typecheck, tests y build.

**Excluido (fuera de alcance)**
- Autenticación de usuarios, cuentas o sesiones (la API es pública por requisito).
- Multi-usuario / aislamiento de datos por usuario.
- Adjuntos de ficheros, notificaciones, recordatorios o correo.
- Alta disponibilidad multi-región, WAF, API Gateway o dominio propio obligatorio.
- Backend remoto de Terraform (se usa state local; ver riesgos).

## 3. Entorno y credenciales
| Elemento | Valor |
|---|---|
| Cuenta AWS | `244546636406` |
| Usuario IAM | `arn:aws:iam::244546636406:user/rpenavera` |
| Profile AWS CLI | `default` (`~/.aws/credentials`) |
| Región | `us-east-2` (Ohio) — SCP de la organización restringe EC2 a esta región; usar la misma para todo el proyecto |
| Terraform | `>= 1.5` (provider `hashicorp/aws` ~> 5.x) |
| AWS CLI | v2 (para verificación manual) |
| Repositorio | GitLab principal + espejo en `https://github.com/rpenavera/` |
| Deploy frontend | Vercel conectado al repo de GitHub |

> **Nota SCP:** no cambiar la región fuera de `us-east-2` salvo verificación explícita de permisos.
> Si Lambda/DynamoDB estuvieran restringidos, documentarlo y ajustar la región de forma justificada.

## 4. Arquitectura objetivo
```
┌──────────────────────────────┐        HTTPS (JSON)        ┌──────────────────────────────┐
│  Navegador                   │  ───────────────────────►  │  Lambda Function URL (NONE)  │
│  Vite + React (Vercel)       │  ◄───────────────────────  │  CRUD /tasks, /health        │
└──────────────────────────────┘        CORS                 └──────────────┬───────────────┘
                                                                            │ AWS SDK v3
                                                                            ▼
                                                              ┌──────────────────────────────┐
                                                              │  DynamoDB (on-demand)        │
                                                              │  Tabla: tasks-<env>          │
                                                              │  PK: id (string, UUID)       │
                                                              └──────────────────────────────┘
```
Flujo: Vercel sirve la SPA estática → la SPA llama a la Function URL usando `VITE_API_URL`
→ la Lambda valida la petición y opera sobre DynamoDB → devuelve JSON.

## 5. Modelo de datos DynamoDB
Tabla `tasks-<environment>` (por defecto `tasks-dev`).

| Atributo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | S (PK) | sí | UUID v4 generado en la Lambda (`crypto.randomUUID()`) |
| `title` | S | sí | Título de la tarea (1–200 caracteres, sin solo espacios) |
| `description` | S | no | Detalle libre (máx. 1000 caracteres) |
| `completed` | BOOL | sí | `false` por defecto |
| `priority` | S | no | `low` \| `medium` \| `high` (por defecto `medium`) |
| `dueDate` | S | no | Fecha ISO 8601 (`YYYY-MM-DD`) o `null` |
| `createdAt` | S | sí | ISO 8601 UTC, generado en el servidor |
| `updatedAt` | S | sí | ISO 8601 UTC, actualizado en cada escritura |

- **Billing mode:** `PAY_PER_REQUEST` (on-demand). Sin GSIs (listado por `Scan`; suficiente para el alcance).
- **Point-in-time recovery:** opcional, desactivado por defecto para evitar coste.
- **Tags:** `Project`, `Environment`, `ManagedBy=Terraform`.

## 6. Contrato de la API
Base: `https://<random>.lambda-url.us-east-2.on.aws` (payload format **2.0**).
Todas las respuestas son `application/json`. Errores con la forma `{ "error": "<mensaje>" }`.

| Método | Ruta | Cuerpo | Éxito | Errores |
|---|---|---|---|---|
| GET | `/health` | — | `200 {"status":"ok"}` | — |
| GET | `/tasks` | — | `200 {"items":[…],"count":N}` | `500` |
| GET | `/tasks/{id}` | — | `200 {task}` | `404`, `500` |
| POST | `/tasks` | `{title, description?, priority?, dueDate?}` | `201 {task}` | `400`, `500` |
| PATCH | `/tasks/{id}` | `{title?, description?, completed?, priority?, dueDate?}` | `200 {task}` | `400`, `404`, `500` |
| DELETE | `/tasks/{id}` | — | `204` (sin cuerpo) | `404`, `500` |
| OPTIONS | `*` | — | `204` + cabeceras CORS | — |

**Reglas**
- Validar `title` (string, 1–200, no vacío tras `trim`) y `priority` (enum) → `400` con mensaje claro.
- `PATCH` con cuerpo vacío o campos desconocidos → `400`.
- Ruta o método no soportado → `404` / `405` con `{ "error": … }`.
- Sin `any` en TypeScript y sin `console.log` de datos sensibles; logs estructurados mínimos en CloudWatch.
- CORS: `AllowOrigins` desde variable (incluir `http://localhost:5173` y la URL de Vercel);
  `AllowMethods = GET,POST,PATCH,DELETE`; `AllowHeaders = content-type`.
  (`OPTIONS` lo gestiona AWS en el preflight y no se declara en `allow_methods`, que limita a 6 caracteres.)

## 7. Infraestructura Terraform
Estructura plana en la raíz del repo de infraestructura:

```
versions.tf     # required_version + provider hashicorp/aws
variables.tf    # región, proyecto, entorno, runtime, memoria, timeout, CORS, nombre tabla
main.tf         # DynamoDB, IAM role/policy, Lambda, Function URL, CORS, log group
outputs.tf      # api_url, function_url, function_name, table_name, aws_region
lambda/
  src/
    handler.mjs          # entrada: parseo de evento, routing, respuesta
    http.mjs             # helpers de respuesta, errores y CORS
    validation.mjs       # validación de payloads (400)
    tasks-service.mjs    # lógica de negocio (no conoce HTTP ni DynamoDB)
    tasks-repository.mjs # único módulo con AWS SDK / acceso a DynamoDB
    config.mjs           # lectura de variables de entorno
  package.json           # sin dependencias (AWS SDK v3 incluido en el runtime)
terraform.tfvars.example
```

**Arquitectura por capas (obligatoria)**
`handler → service → repository`. El handler **no** accede a DynamoDB directamente y el
repository **no** conoce HTTP. Dependencias dirigidas hacia dentro; sin imports cruzados.

**Requisitos**
- `archive_file` para empaquetar `lambda/` (incluyendo `src/`) en un ZIP; `source_code_hash = filebase64sha256(...)`.
- Runtime `nodejs20.x` (o `nodejs22.x`), handler `src/handler.handler`, timeout `10s`, memoria `256 MB`.
- IAM de mínimo privilegio sobre el ARN de la tabla: `dynamodb:GetItem`, `PutItem`,
  `UpdateItem`, `DeleteItem`, `Scan`, `Query` + `logs:CreateLogStream`/`PutLogEvents`.
- `aws_lambda_function_url` con `authorization_type = "NONE"` y bloque `cors`.
- `aws_cloudwatch_log_group` con retención (p. ej. 7 días).
- Variables con `default` razonable y `validation` donde aplique (p. ej. entorno).
- `terraform fmt`, `terraform validate` y `terraform plan` limpios; `terraform apply` idempotente.
- `.gitignore`: `.terraform/`, `*.tfstate*`, `.terraform.lock.hcl` puede versionarse,
  `*.zip`, `terraform.tfvars`, `lambda/node_modules/`, `.env*`.

## 8. Frontend Vite
**Stack:** Vite + React + TypeScript + CSS propio (sin framework UI pesado). Estado global
sencillo con hooks/context si aporta claridad; evitar prop drilling innecesario.

**Estructura**
```
frontend/
  index.html
  src/
    main.tsx
    App.tsx
    types.ts                 # Task, Priority, ApiError (sin any)
    services/api.ts          # cliente fetch tipado, manejo de errores HTTP
    hooks/useTasks.ts        # carga, mutaciones y estados
    components/              # TaskList, TaskItem, TaskForm, Filters, EmptyState, ...
    styles/                  # variables CSS (paleta) + estilos
  tests/                     # Vitest + Testing Library
  .env.example               # VITE_API_URL=...
  vercel.json                # (opcional) rewrites SPA
```

**Funcionalidad**
- Listar tareas con contador total/pendientes/completadas.
- Crear tarea (título obligatorio; descripción, prioridad y fecha opcionales).
- Marcar/desmarcar como completada.
- Editar título/descripción/prioridad/fecha.
- Eliminar con confirmación.
- Filtros: todas / pendientes / completadas y búsqueda por texto.
- Orden por fecha de creación o prioridad.
- Estados explícitos de **carga**, **vacío**, **error** (con reintento) y **éxito**.
- Accesibilidad: labels asociados, `aria-live` en feedback, foco visible, navegación por teclado.
- **Diseño obligatorio:** fondo claro/texto oscuro, estética limpia y moderna *customer-facing*,
  tipografía marcada, **una sola** paleta de acento, **sin imágenes** (placeholders CSS),
  layout **mobile-responsive**, CTAs claros.
- `VITE_API_URL` inyectada en build; nunca hardcodear la URL en el código.
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `coverage`.
- **Lockfile** `package-lock.json` commiteado y configuración de **ESLint + Prettier** versionada.
- Ejecutar `npm run build` antes de dar por terminada cualquier iteración.

## 9. Testing
1. **Infraestructura**
   - `terraform init && terraform fmt -check && terraform validate`.
   - `terraform apply -auto-approve` sin errores; `terraform output` expone `api_url`.
   - Reaplicar: sin cambios inesperados (idempotencia).
2. **API (Lambda)**
   - `curl -fsS "$API_URL/health"` → `{"status":"ok"}`.
   - Script `scripts/smoke-test.sh` que ejecute el ciclo completo:
     crear → listar → obtener → actualizar (incl. `completed=true`) → eliminar → verificar `404`.
   - Verificar validaciones (`400`) y rutas inexistentes (`404`).
   - Verificar persistencia: crear una tarea, invocar de nuevo (o esperar) y listarla.
   - Prueba directa opcional con `aws lambda invoke` + CloudWatch Logs.
3. **Frontend**
   - `npm run lint`, `npm run typecheck`, `npm run test` (Vitest + Testing Library).
   - Tests de `api.ts` (éxito/error HTTP), `useTasks` y componentes críticos.
   - `npm run coverage` con **cobertura mínima razonable** (objetivo: >60% en lógica de
     dominio, >40% global) y reporte/badge enlazado en el README.
   - `npm run build` OK; `npm run preview` sirve la SPA.
4. **Backend unitario (opcional recomendado)**
   - Tests del service/validation con `node --test` y un repository mockeado (sin AWS real).

## 10. Repositorio y despliegue
- **GitLab** como repositorio principal; commits claros y ramas para features/fixes con merge a `main`.
- **Espejo (mirror) a GitHub** en `https://github.com/rpenavera/<repo>` (Vercel construye desde GitHub).
- **Vercel**: importar el repo de GitHub, *Root Directory* `frontend/` (o raíz si el frontend
  está en la raíz), framework **Vite**, build `npm run build`, output `dist`, variable
  `VITE_API_URL` en Production y Preview. Documentar la URL pública en el README.
- **CI:** workflow que en push/PR a `main` ejecute `npm ci`, `lint`, `typecheck`, `test`
  y `build` del frontend; job separado de `terraform fmt/validate` (sin `apply` en CI).
- **Secretos:** ninguno en el repo. AWS se opera en local con el profile `default`; la única
  variable del frontend es la URL pública de la API. `.env*` en `.gitignore` + `.env.example`.

## 11. Variables de entorno
| Variable | Ámbito | Ejemplo | Uso |
|---|---|---|---|
| `VITE_API_URL` | frontend (Vercel) | `https://abc123.lambda-url.us-east-2.on.aws` | Base de la API |
| `TF_VAR_aws_region` | local (opcional) | `us-east-2` | Región Terraform |
| `TF_VAR_environment` | local (opcional) | `dev` | Sufijo de recursos |
| `TF_VAR_cors_allow_origins` | local (opcional) | `["http://localhost:5173","https://<app>.vercel.app"]` | Orígenes CORS |

`.env.example` del frontend solo contendrá `VITE_API_URL=` sin valor real.

## 12. Documentación y video demo
La entrega se evalúa también por documentación (15%) y **video demo (25%)**. Es obligatorio
incluir:

**README.md** (raíz) con:
- Qué hace el proyecto, stack y arquitectura (diagrama ASCII/mermaid).
- **Instalación** (`npm ci`), **arranque local** (`npm run dev`) y URL/puerto.
- **Endpoints** de la API con ejemplos reales de request/response (`curl`).
- **Sección de uso** con un flujo de ejemplo (crear → listar → completar → borrar).
- **Comandos exactos de verificación** (tests, lint, typecheck, build, smoke test).
- **Despliegue** verificable: pasos de Terraform y de Vercel + URL pública.
- Enlace a `docs/` y a los ADRs.

**docs/**
- `ARCHITECTURE.md`: capas (`handler → service → repository`), reglas de dependencia y
  diagrama de componentes/flujo.
- `DECISIONS.md`: al menos **2 trade-offs reales** (p. ej. Function URL vs API Gateway,
  DynamoDB on-demand vs provisioned, Scan vs GSI).
- `adr/`: **ADRs** con formato contexto/decisión/consecuencias para cada decisión clave.
- `BENCHMARKS.md`: al menos una decisión **justificada con números** (latencia medida de
  la Lambda, cold start, coste estimado mensual de DynamoDB/Lambda, o comparación).
- `AI_CHANGES.md` (si se usó IA): qué se generó como borrador y qué se revisó/corrigió.

**Video demo** (`GUION-DEMO.md` + grabación enlazada en el README), duración ~7 min
(ventana 6–8 min), con esta estructura:
1. `0:00–0:45` Presentación y problema que resuelve.
2. `0:45–1:45` Esquema visual de la arquitectura y stack.
3. `1:45–4:30` Demo E2E del CRUD + un caso límite (validación) y/o filtros.
4. `4:30–5:45` Decisión técnica clave mostrando el código (p. ej. separación service/repository).
5. `5:45–6:30` Verificación en vivo: tests, logs de CloudWatch y persistencia en DynamoDB.
6. `6:30–7:00` Cierre: logros, reflexión honesta y próximos pasos.

## 13. Estructura y entregables
```
.
├── PROMPT.md
├── README.md                     # qué hace, instalación, uso, URLs y verificación
├── .gitignore
├── versions.tf
├── variables.tf
├── main.tf
├── outputs.tf
├── terraform.tfvars.example
├── GUION-DEMO.md                 # guion del video (~7 min)
├── lambda/
│   ├── src/
│   │   ├── handler.mjs
│   │   ├── http.mjs
│   │   ├── validation.mjs
│   │   ├── tasks-service.mjs
│   │   ├── tasks-repository.mjs
│   │   └── config.mjs
│   ├── test/                     # tests unitarios (node --test)
│   └── package.json
├── scripts/
│   └── smoke-test.sh
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── BENCHMARKS.md
│   ├── AI_CHANGES.md             # si aplica
│   └── adr/                      # ADR-001…md
├── frontend/
│   ├── package.json / package-lock.json
│   ├── vite.config.ts
│   ├── eslint.config.js / .prettierrc
│   ├── tsconfig.json
│   ├── .env.example
│   ├── index.html
│   ├── src/…
│   └── tests/…
└── .github/workflows/ci.yml      # lint + typecheck + test + coverage + build
```

## 14. Criterios de aceptación
- [ ] `terraform apply -auto-approve` crea Lambda, Function URL pública y tabla DynamoDB.
- [ ] `terraform output api_url` devuelve una URL accesible por HTTPS sin autenticación.
- [ ] `GET /health` responde `200 {"status":"ok"}`.
- [ ] CRUD completo verificado con `curl`/`scripts/smoke-test.sh` (incluye `201`, `200`, `204`, `400`, `404`).
- [ ] Los datos persisten en DynamoDB (sobreviven a invocaciones y reinicios).
- [ ] La Lambda solo tiene permisos DynamoDB necesarios + CloudWatch Logs.
- [ ] `terraform fmt -check` y `terraform validate` limpios; reaplicar no rompe.
- [ ] Frontend Vite opera contra la API: listar, crear, editar, completar, eliminar, filtrar y buscar.
- [ ] UI con estados de carga/vacío/error, accesible, responsive y sin imágenes.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` pasan.
- [ ] Web desplegada en **Vercel** con URL pública documentada en el README.
- [ ] Código en **GitHub** (espejo desde GitLab) y Vercel conectado al repo.
- [ ] CI en verde y ningún secreto versionado.
- [ ] README permite instalar (`npm ci`), arrancar en local y verificar con comandos exactos.
- [ ] README incluye sección de uso con ejemplos reales de request/response.
- [ ] Backend separado en `handler/service/repository` sin accesos a DynamoDB fuera del repository.
- [ ] `package-lock.json` y configuración de ESLint/Prettier commiteados.
- [ ] Cobertura reportada (`npm run coverage`) y enlazada en el README.
- [ ] `docs/ARCHITECTURE.md` con diagrama y reglas de dependencia.
- [ ] `docs/DECISIONS.md` con ≥2 trade-offs reales y `docs/adr/` con ADRs.
- [ ] `docs/BENCHMARKS.md` con al menos una decisión justificada con números.
- [ ] `GUION-DEMO.md` y video demo (~7 min) enlazado en el README.

## 15. Convenciones
- Código y nombres de recursos en inglés; documentación y mensajes de UI en español.
- Recursos Terraform en `snake_case`, etiquetados con `Project`, `Environment`, `ManagedBy=Terraform`.
- TypeScript estricto, sin `any`; interfaces en `types.ts`.
- Errores de API siempre `{ "error": string }` con el status HTTP adecuado.
- Sin comentarios en el código salvo que aporten contexto no obvio.
- Commits descriptivos; nunca commitear claves, `.env` ni `terraform.tfstate`.

## 16. Riesgos y notas
1. **API pública sin autenticación:** cualquiera con la URL puede escribir. Aceptado por el
   enunciado; en producción se añadiría API Gateway/WAF, auth o rate limiting.
2. **Abuso/coste:** DynamoDB on-demand y Lambda escalan con el tráfico; vigilar el uso y
   considerar límites de concurrencia.
3. **CORS:** si la URL de Vercel no está en `AllowOrigins`, el navegador bloqueará las llamadas.
   Actualizar la variable y reaplicar tras el primer deploy.
4. **SCP de región:** mantener `us-east-2`; verificar permisos de Lambda/DynamoDB antes de `apply`.
5. **State local:** no versionar `terraform.tfstate` (contiene datos de recursos). Para trabajo en
   equipo, migrar a backend remoto (S3 + DynamoDB lock).
6. **Cold start:** aceptable para este alcance; no requiere provisioned concurrency.

## 17. Plan de ejecución
1. Implementar `lambda/src/` por capas (`handler → service → repository`) y probar con mock.
2. Escribir Terraform (`versions`, `variables`, `main`, `outputs`) y `terraform.tfvars.example`.
3. `terraform init` → `fmt` → `validate` → `plan` → `apply -auto-approve`.
4. Ejecutar `scripts/smoke-test.sh` contra `api_url` y corregir.
5. Construir el frontend Vite contra la API y verificar el flujo E2E en local.
6. Añadir tests, lint, typecheck, coverage y CI.
7. Subir a GitLab, espejar a GitHub, importar en Vercel y configurar `VITE_API_URL`.
8. Documentar en `README.md`, `docs/` (arquitectura, decisiones, ADRs, benchmarks) y `GUION-DEMO.md`.
9. Grabar el video demo (~7 min) y enlazarlo en el README.
