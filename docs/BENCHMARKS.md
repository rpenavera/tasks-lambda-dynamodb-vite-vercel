# Benchmarks y estimación de coste

## Objetivo

Justificar cuantitativamente las decisiones de arquitectura (Lambda + DynamoDB on-demand)
frente a alternativas, para un escenario de laboratorio de bajo tráfico.

## Escenario de referencia

Supuestos conservadores para un mes de uso de una lista de tareas personal:

- 10.000 invocaciones Lambda/mes.
- Duración media estimada por invocación: 200 ms.
- Memoria: 256 MB.
- DynamoDB: 3.000 escrituras y 9.000 lecturas/mes (cada item leído/escrito ~1 KB).
- Frontend estático en Vercel Free.

## Estimación Lambda (us-east-2)

Precios públicos usados (por debajo del free tier mensual, que cubre 1M requests y 400.000 GB-s):

- Requests: 10.000 × 0,0000002 USD = **0,002 USD**
- Cómputo: 256 MB × 0,2 s = 51,2 MB-s = 0,0512 GB-s por invocación
  → 10.000 × 0,0512 = 512 GB-s × 0,0000166667 USD = **0,0085 USD**

Total Lambda: **≈ 0,0105 USD/mes**. Con el free tier aplicable, el coste real sería **0 USD**.

## Estimación DynamoDB on-demand

- Escrituras: 3.000 / 1.000.000 × 1,25 USD = **0,00375 USD**
- Lecturas: 9.000 / 1.000.000 × 0,25 USD = **0,00225 USD**
- Almacenamiento (< 1 GB, primeros 25 GB gratis): **0 USD**

Total DynamoDB: **≈ 0,006 USD/mes**.

## Comparación con alternativas

| Opción | Coste estimado/mes | Latencia típica | Complejidad |
|---|---|---|---|
| **Lambda + Function URL + DynamoDB on-demand** | **< 0,02 USD** | 20–80 ms caliente; 300–600 ms cold | Baja |
| API Gateway + Lambda | +0,035 USD (10k requests a 3,50 USD/M) | +5–15 ms | Media |
| EC2 t3.micro + MySQL | ~7,50 USD (instancia 24/7) | Variable | Alta (parcheo, backups) |

La opción elegida es la más barata y simple para el tráfico esperado.

## Latencia y cold start

- **Objetivo de diseño:** p95 < 1 s desde el navegador (incluye red + cold start).
- **Cold start esperado:** 300–600 ms con `nodejs20.x`, 256 MB y un ZIP pequeño
  (solo código propio; el SDK v3 lo aporta el runtime).
- **Medición pendiente de despliegue:** cuando `terraform apply` esté desbloqueado, registrar
  aquí `curl -w '%{time_total}'` sobre `/health` en frío y en caliente, y el promedio de
  `GET /tasks` con 50 items.

Comando preparado para la medición:

```bash
API_URL="$(terraform output -raw api_url)"
for i in $(seq 1 10); do curl -sS -o /dev/null -w '%{time_total}\n' "$API_URL/health"; done
```

## Conclusión

Con los números anteriores, Lambda + DynamoDB on-demand mantiene el coste por debajo de
**0,02 USD/mes** en el escenario de referencia, frente a ~7,5 USD/mes de una EC2 equivalente,
y evita la gestión de servidores. La decisión de `Scan` es aceptable hasta varios cientos de
items; más allá, un GSI por fecha sería el siguiente paso.
