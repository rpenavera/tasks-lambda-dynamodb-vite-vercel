# Uso de IA y revisión crítica

Este proyecto se construyó con asistencia de IA (generación de borradores de código,
tests y documentación). Esta sección documenta qué se generó y qué se revisó/corrigió.

## Generado como borrador

- Estructura inicial de Terraform (DynamoDB, IAM, Lambda, Function URL).
- Esqueleto de la Lambda por capas y validadores.
- Componentes de React, estilos y tests de Vitest.
- Borradores de README y documentación.

## Revisado y corregido manualmente

1. **Permisos IAM:** el borrador no incluía `aws_lambda_permission` para invocación pública de
   la Function URL. Se añadieron los dos permisos (`InvokeFunctionUrl` e `InvokeFunction`).
2. **CORS:** se separó el origen permitido en variable (`cors_allow_origins`) y se configuró
   en la Function URL (gestionado por AWS). El handler no añade cabeceras CORS para evitar
   duplicados, y se documenta cómo restringir la URL de Vercel.
3. **Dependencias de la Lambda:** se evitó depender de `@aws-sdk/lib-dynamodb` (no garantizado
   en el runtime) y se usó solo `@aws-sdk/client-dynamodb`, que sí viene incluido en
   `nodejs20.x`. El ZIP no incluye `node_modules`.
4. **Tests sin AWS:** el handler se diseñó con inyección de dependencias y el repository se
   importa dinámicamente, de modo que los tests unitarios corren sin credenciales ni SDK.
5. **Build del frontend:** se ejecutaron `lint`, `typecheck`, `test`, `coverage` y `build`;
   se corrigieron tipos estrictos y se eliminó el uso de `any`.
6. **Accesibilidad:** se añadieron `aria-live`, `aria-pressed`, `aria-checked`, labels y foco
   visible; los tests cubren los flujos principales.
7. **Smoke test:** se validó el script con `bash -n` y se diseñó tolerante a errores HTTP.

## Qué NO se aceptó sin revisar

- No se aceptó un único `index.mjs` monolítico: se impuso la separación
  `handler → service → repository`.
- No se aceptó `terraform apply` sin `fmt`/`validate` previos.
- No se aceptó estado de Terraform versionado ni secretos en el repo.

## Incidencia resuelta

El despliegue quedó inicialmente bloqueado por permisos IAM del usuario `rpenavera`
(`dynamodb:CreateTable`, `iam:CreateRole`, `lambda:*`, `logs:CreateLogGroup` denegados).
Se documentó la política mínima en `iam/terraform-deploy-policy.json` y se adjuntó como
política gestionada `TerraformTasksLabPolicy` mediante una sesión administrativa. La
infraestructura quedó desplegada y el smoke test de la API pasó completo.
