# ADR-003: Lambda organizada en capas

- **Estado:** Aceptada
- **Fecha:** 2026-10-28

## Contexto

Un único fichero `index.mjs` con routing, validación y acceso a DynamoDB mezcla
responsabilidades, dificulta los tests sin AWS y no permite razonar sobre dependencias.

## Decisión

Separar en `handler → service → repository`, con módulos de apoyo `http`, `validation` y
`config`. El repository es el único que importa el SDK de AWS y se inyecta en el service.
El handler recibe el service por parámetro (`createHandler`).

## Consecuencias

- **Positivas:** tests unitarios sin credenciales ni SDK; lógica de negocio aislada; cambios de
  persistencia o de transporte localizados; dependencias dirigidas hacia dentro.
- **Negativas:** más ficheros y algo de ceremonia para un CRUD pequeño.
- **Verificación:** `lambda/test/` cubre validación, servicio y handler con un repository en
  memoria (18 tests).
