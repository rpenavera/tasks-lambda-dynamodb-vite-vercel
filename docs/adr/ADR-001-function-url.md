# ADR-001: Exponer la Lambda con Function URL pública

- **Estado:** Aceptada
- **Fecha:** 2026-10-28

## Contexto

El enunciado exige una Lambda accesible públicamente sin autenticación para una lista de
tareas. Necesitamos HTTPS, CORS y bajo coste operativo, con infraestructura reproducible en
Terraform.

## Decisión

Usar `aws_lambda_function_url` con `authorization_type = "NONE"`, CORS declarado en Terraform
y `aws_lambda_permission` para invocación pública.

## Consecuencias

- **Positivas:** configuración mínima, HTTPS gestionado, sin coste por request de gateway,
  menos recursos Terraform.
- **Negativas:** no hay throttling, WAF, API keys ni auth integrada; la URL es pública.
- **Mitigación:** CORS restringible por variable; en producción se migraría a API Gateway
  HTTP API o se añadiría auth. El handler desacopla HTTP de la lógica, lo que facilita la
  migración.
