# Tasks — Vite + AWS Lambda + DynamoDB

[![CI](https://github.com/rpenavera/tasks-lambda-dynamodb-vite-vercel/actions/workflows/ci.yml/badge.svg)](https://github.com/rpenavera/tasks-lambda-dynamodb-vite-vercel/actions/workflows/ci.yml)
[![Web](https://img.shields.io/badge/web-tasks--web--azure.vercel.app-4f46e5)](https://tasks-web-azure.vercel.app)

Aplicación profesional de lista de tareas: SPA en **Vite + React + TypeScript** desplegada en
**Vercel**, contra una **API serverless** (AWS **Lambda** + **Function URL** pública) que
persiste en **DynamoDB**. Toda la infraestructura se aprovisiona con **Terraform**.

## Contenido

- [Arquitectura](#arquitectura)
- [Diagramas](#diagramas)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Arranque local](#arranque-local)
- [API](#api)
- [Tests y verificación](#tests-y-verificación)
- [Despliegue](#despliegue)
- [Decisiones](#decisiones-documentadas)
- [Estructura](#estructura)

## Arquitectura

```
Navegador ──HTTPS──► Vercel (SPA Vite) ──JSON──► Lambda Function URL (pública)
                                                        │
                                                        ▼
                                              DynamoDB (on-demand)
                                              tabla tasks-1-5-50-dev
```

La Lambda está separada en capas `handler → service → repository`; solo el repository habla
con DynamoDB. Detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Diagramas

- [Arquitectura interactiva](docs/diagrams/tasks-architecture.html) — componentes, capas y límites de AWS.
- [Secuencia de creación de tarea](docs/diagrams/tasks-sequence.html) — `POST /tasks` hasta DynamoDB y la rama de validación `400`.
- Diagramas Mermaid de soporte en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Los HTML son autónomos: se abren en el navegador y permiten mover el tiempo (Live/Still), cambiar tema y exportar.

## Requisitos

- Node.js 20+ y npm
- Terraform >= 1.5
- AWS CLI v2 con el profile `default` configurado (cuenta `244546636406`, región `us-east-2`)
- Una cuenta de Vercel (solo para el despliegue del frontend)

## Instalación

```bash
# Frontend
cd frontend
npm ci

# Backend (sin dependencias externas: AWS SDK v3 viene en el runtime de Lambda)
cd ../lambda
npm test

# Infraestructura
cd ..
terraform init
```

## Arranque local

La SPA necesita una API desplegada. Con la infraestructura aplicada:

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local y pon la URL de la API:
# VITE_API_URL=https://<id>.lambda-url.us-east-2.on.aws
npm run dev
```

Abre `http://localhost:5173`. Si `VITE_API_URL` no está definida, la app arranca pero muestra
un error claro al consultar la API.

## API

Base: `terraform output -raw api_url` (Function URL con `AuthType=NONE`).
Todas las respuestas son JSON. Errores: `{ "error": "..." }` (y `details` en validaciones).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio |
| `GET` | `/tasks` | Lista tareas (`{ items, count }`) |
| `GET` | `/tasks/{id}` | Obtiene una tarea |
| `POST` | `/tasks` | Crea tarea (`201`) |
| `PATCH` | `/tasks/{id}` | Actualiza campos (parcial) |
| `DELETE` | `/tasks/{id}` | Elimina tarea (`204`) |

Ejemplo de uso real:

```bash
API_URL="$(terraform output -raw api_url)"

curl -sS -X POST "$API_URL/tasks" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Preparar demo","priority":"high","dueDate":"2026-11-05"}'
# → 201 {"id":"...","title":"Preparar demo","completed":false,"priority":"high",...}

curl -sS "$API_URL/tasks"
# → 200 {"items":[...],"count":1}
```

### Modelo de la tarea

```json
{
  "id": "uuid",
  "title": "Preparar demo",
  "description": "",
  "completed": false,
  "priority": "low | medium | high",
  "dueDate": "YYYY-MM-DD | null",
  "createdAt": "2026-01-01T10:00:00.000Z",
  "updatedAt": "2026-01-01T10:00:00.000Z"
}
```

## Tests y verificación

```bash
# Backend: 18 tests unitarios (validación, servicio y handler)
cd lambda && npm test

# Frontend: lint, tipos, tests y build
cd ../frontend
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run preview   # http://localhost:4173

# Infraestructura
cd ..
terraform fmt -check
terraform validate
terraform plan
```

Smoke test end-to-end contra la API desplegada (crear → listar → actualizar → validar → borrar):

```bash
./scripts/smoke-test.sh "$(terraform output -raw api_url)"
```

### Cobertura

Cobertura del frontend con Vitest + V8 (`npm run coverage`); en CI se publica como artifact.

| Área | Líneas |
|---|---|
| Global | **76.5%** |
| `App.tsx` | 90.8% |
| `hooks/useTasks.ts` | 89.9% |
| `services/api.ts` | 95.1% |

El código de dominio (UI principal, hooks y cliente HTTP) supera el 60% exigido; el global supera el 40%.
El reporte HTML se genera en `frontend/coverage/` (no versionado).

## Despliegue

### 1. Infraestructura AWS

```bash
cp terraform.tfvars.example terraform.tfvars   # opcional: ajusta CORS/entorno
terraform init
terraform apply -auto-approve
terraform output api_url
```

> **Estado actual (2026-10-29):** API y frontend desplegados.
> - Web: **https://tasks-web-azure.vercel.app**
> - API: `https://bqvre5fduqfngpfuiv4xmhfdye0bqocm.lambda-url.us-east-2.on.aws`
> - Smoke test y flujo CRUD con CORS verificado.
> - El usuario `rpenavera` tiene adjunta la política gestionada `TerraformTasksLabPolicy`
>   (definida en [`iam/terraform-deploy-policy.json`](iam/terraform-deploy-policy.json)).
> - Repositorio: https://github.com/rpenavera/tasks-lambda-dynamodb-vite-vercel
> - Vercel conectado al repo (Root Directory `frontend`): cada push a `main` redespliega.

### 2. Frontend en Vercel

1. Sube el repo a GitHub (`https://github.com/rpenavera/<repo>`).
2. En Vercel: **Add New → Project → Import Git Repository**.
3. Configura:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variable:** `VITE_API_URL = <api_url de terraform output>`
4. Deploy. URL pública actual: **https://tasks-web-azure.vercel.app**.

### 3. CORS

Añade la URL de Vercel a `cors_allow_origins` y reaplica:

```bash
terraform apply -auto-approve -var='cors_allow_origins=["https://<proyecto>.vercel.app"]'
```

El valor por defecto es `["*"]`, válido para la demo; en producción conviene restringirlo.

### 4. Limpieza

```bash
terraform destroy -auto-approve
```

## Decisiones documentadas

- [`docs/DECISIONS.md`](docs/DECISIONS.md) — trade-offs (Function URL vs API Gateway,
  DynamoDB on-demand vs provisioned, `Scan` vs GSI).
- [`docs/adr/`](docs/adr/) — ADRs con contexto/decisión/consecuencias.
- [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) — estimación de coste y latencia con números.
- [`docs/AI_CHANGES.md`](docs/AI_CHANGES.md) — uso de IA y revisión crítica.
- [`GUION-DEMO.md`](GUION-DEMO.md) — guion del video demo (~7 min).

## Estructura

```
.
├── lambda/            # API por capas + tests (node --test)
├── frontend/          # SPA Vite + React + TypeScript
├── scripts/           # smoke test de la API
├── docs/              # arquitectura, decisiones, ADRs, benchmarks y diagramas HTML
├── iam/               # política mínima para desplegar con Terraform
├── .env.example       # plantilla de variables (frontend + Terraform)
├── *.tf               # infraestructura Terraform
└── .github/workflows/ # CI (lint, tipos, tests, cobertura, build, terraform validate)
```

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `VITE_API_URL` | Vercel / `.env.local` | URL base de la API Lambda |
| `TF_VAR_aws_region` | local (opcional) | Región AWS (por defecto `us-east-2`) |
| `TF_VAR_environment` | local (opcional) | Entorno (`dev`) |
| `TF_VAR_cors_allow_origins` | local (opcional) | Orígenes CORS permitidos |

No hay secretos en el repositorio. `terraform.tfstate`, `terraform.tfvars` y `.env*` están
excluidos por `.gitignore`.
