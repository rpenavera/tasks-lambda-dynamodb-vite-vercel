# Guion del video demo (~7 minutos)

Objetivo: demostrar el flujo end-to-end, la arquitectura, una decisión técnica y la
verificación en vivo. Duración objetivo 7:00 (ventana aceptable 6–8 min).

## 0:00–0:45 · Presentación y problema

- "Esta es **Tasks**, una lista de tareas profesional."
- Problema: organizar tareas con prioridad y fecha límite sin gestionar servidores.
- Stack en una frase: Vite + React en Vercel, Lambda + DynamoDB en AWS, Terraform.

## 0:45–1:45 · Arquitectura y stack

- Mostrar el diagrama de `docs/ARCHITECTURE.md` (o `README.md`).
- Recorrer: navegador → Vercel → Function URL → handler → service → repository → DynamoDB.
- Mencionar: API pública con CORS, IAM de mínimo privilegio, tabla on-demand.

## 1:45–4:30 · Demo del flujo principal

1. Abrir la URL de Vercel.
2. Crear una tarea con título, prioridad alta y fecha límite.
3. Crear una segunda tarea sin descripción.
4. Marcar una como completada (mostrar contador actualizado).
5. Editar el título de la otra.
6. Usar filtros (Todas / Pendientes / Completadas), búsqueda y orden por prioridad.
7. Eliminar una tarea con confirmación.
8. Caso límite: intentar crear con título vacío → mensaje de validación.

## 4:30–5:45 · Decisión técnica clave en código

- Abrir `lambda/src/handler.mjs`, `tasks-service.mjs` y `tasks-repository.mjs`.
- Explicar la regla `handler → service → repository`:
  - handler no conoce DynamoDB;
  - service no conoce HTTP;
  - repository es el único que usa el SDK.
- Por qué: tests sin AWS, cambios localizados, menos acoplamiento.

## 5:45–6:30 · Verificación en vivo

- Ejecutar `cd lambda && npm test` (18 tests) y `cd frontend && npm test` (12 tests).
- Mostrar `npm run coverage` (76.5% líneas) y `npm run build`.
- Ejecutar `./scripts/smoke-test.sh "$(terraform output -raw api_url)"`
  (crear → listar → actualizar → validar → borrar).
- Opcional: mostrar logs en CloudWatch y que la tarea persiste tras recargar la página.

## 6:30–7:00 · Cierre

- Logros: CRUD completo, infraestructura reproducible, CI y documentación.
- Reflexión honesta: la API es pública sin auth; `Scan` no escala a millones de items;
  el state de Terraform es local.
- Próximos pasos: auth/API key, GSI por fecha, backend remoto de state, dominio propio.

## Checklist antes de grabar

- [ ] `terraform apply` aplicado y `api_url` configurada en Vercel.
- [ ] App accesible en la URL de Vercel.
- [ ] `npm test` y `npm run build` en verde.
- [ ] `scripts/smoke-test.sh` funcionando.
- [ ] Audio comprobado y resolución legible.
