# ADR-002: DynamoDB on-demand con PK `id`

- **Estado:** Aceptada
- **Fecha:** 2026-10-28

## Contexto

La aplicación gestiona tareas de un único usuario implícito. El tráfico es bajo y
desconocido, y no hay métricas históricas para dimensionar capacidad.

## Decisión

Crear una tabla DynamoDB con `billing_mode = "PAY_PER_REQUEST"`, `hash_key = "id"` (string UUID)
y sin índices secundarios. El listado se resuelve con `Scan` paginado.

## Consecuencias

- **Positivas:** sin planificación de RCU/WCU, coste proporcional al uso (céntimos/mes),
  escrituras y lecturas simples por clave.
- **Negativas:** `Scan` no escala a grandes volúmenes; sin `userId` no hay aislamiento
  multi-usuario.
- **Evolución:** añadir PK `userId` y GSI `userId/createdAt` si el producto crece; cambiar a
  provisioned si el tráfico sostenido lo justifica.
