# Decisiones y trade-offs

## 1. Lambda Function URL en lugar de API Gateway

**Contexto:** la API debe ser pública y sencilla (CRUD JSON), con bajo tráfico.

**Decisión:** exponer la Lambda con `aws_lambda_function_url` (`authorization_type = NONE`).

**Trade-offs**

| Aspecto | Function URL | API Gateway |
|---|---|---|
| Coste | Solo invocaciones Lambda | Coste por millón de requests + integración |
| Configuración | Terraform mínimo, HTTPS y CORS nativos | Más recursos (stage, routes, integraciones) |
| Control | Sin rate limiting/WAF/API keys propios | Throttling, WAF, API keys, usage plans |
| Auth | Ninguna (pública por diseño) | Cognito/IAM/JWT integrados |

Se elige Function URL porque el enunciado pide acceso público y el alcance no requiere
autorización. Si el proyecto creciera, migrar a API Gateway HTTP API es directo: el handler
ya separa HTTP de la lógica.

## 2. DynamoDB on-demand en lugar de capacity provisionada

**Contexto:** tráfico desconocido y muy bajo (demo/laboratorio), sin métricas previas.

**Decisión:** `billing_mode = "PAY_PER_REQUEST"`.

**Trade-offs**

- On-demand: coste por request, cero planificación, ideal para tráfico esporádico.
- Provisioned: más barato a alto volumen sostenido, pero exige estimar RCU/WCU y arriesga
  throttling si se infravalora.

Con 10.000 operaciones/mes el coste on-demand es de céntimos (ver `BENCHMARKS.md`), por lo que
la simplicidad pesa más que el ahorro potencial.

## 3. `Scan` en lugar de GSI para listar

**Contexto:** la UI lista todas las tareas del único usuario implícito.

**Decisión:** `Scan` de la tabla con paginación interna (no hay GSI).

**Trade-offs**

- `Scan` lee toda la tabla: aceptable para decenas/cientos de items; no escala a millones.
- Un GSI por `createdAt` permitiría `Query` ordenado y paginado, a cambio de escribir y
  mantener un índice adicional y consumir capacidad en cada escritura.

Para el alcance actual `Scan` evita un índice innecesario. Si hubiera múltiples usuarios, el
siguiente paso sería PK `userId` + GSI `userId/createdAt`.

## 4. Sin autenticación (API pública)

**Contexto:** requisito explícito de acceso público para el laboratorio.

**Decisión:** aceptar escritura anónima y documentar el riesgo.

**Consecuencias:** cualquiera con la URL puede crear/borrar tareas. En producción se añadiría
API Gateway con API key/JWT, WAF y rate limiting, o se limitaría la Function URL. Se documenta
en `PROMPT.md` (riesgos) y en el README.

## 5. State de Terraform local

**Contexto:** proyecto individual, sin equipo.

**Decisión:** state local (`terraform.tfstate`), excluido de Git.

**Consecuencias:** simple, pero no hay bloqueo ni colaboración. Para equipo se migraría a
S3 + DynamoDB lock.
