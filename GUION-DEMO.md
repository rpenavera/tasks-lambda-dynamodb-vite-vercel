# Speech de entrega — Tasks (~6:50)

> Léelo despacio. Está calculado para unos 7 minutos. Los textos entre corchetes son
> indicaciones de pantalla: no se leen.

## 0:00–0:30 · Presentación

Hola, me llamo Ricardo Peña y voy a presentar Tasks, una aplicación web para organizar tareas. La idea es muy sencilla: apuntar lo que tengo que hacer, ponerle una prioridad y una fecha, y poder marcarlo como hecho desde cualquier dispositivo. La web está publicada en tasks-web-azure.vercel.app y la API funciona en AWS. En los próximos minutos voy a explicar el problema, la arquitectura, cómo se usa y las decisiones más importantes.

## 0:30–1:15 · Problema que se resuelve

Hoy muchas personas apuntan sus tareas en papel, en una nota del móvil o directamente en la cabeza. Eso falla por tres motivos: se pierden, no se ve qué es urgente y no se puede consultar desde otro sitio. Tasks resuelve eso con una lista única guardada en la nube. El usuario puede crear tareas, editarlas, marcarlas como completadas, borrarlas, filtrar por estado, buscar por texto y ordenar por prioridad o fecha. No hace falta instalar nada: se abre en el navegador. Y los datos no se pierden al cerrar la pestaña, porque viven en una base de datos y no en la memoria del navegador.

## 1:15–2:30 · Diagrama de Arquitectura

[En pantalla: diagrama de arquitectura]

En el diagrama vemos tres zonas. A la izquierda está el usuario con el navegador. En el centro está la web, hecha con Vite y React y publicada en Vercel. Esa web no guarda las tareas: solo muestra la pantalla y llama a la API. La API está en AWS. El navegador llama a una URL pública de AWS, que ejecuta una función Lambda. Esa función está dividida en tres capas. El handler recibe la petición y valida los datos. El service aplica las reglas, como crear el identificador y las fechas. Y el repository es el único que habla con DynamoDB. DynamoDB es la base de datos donde se guardan las tareas. CloudWatch guarda los logs para revisar errores. Todo esto lo crea Terraform con código, no a mano. Y GitHub Actions ejecuta las pruebas en cada push. La ventaja de esta separación es que cada pieza tiene una responsabilidad clara.

## 2:30–3:30 · Diagrama de Secuencia

[En pantalla: diagrama de secuencia]

El diagrama de secuencia muestra el caso más importante: crear una tarea. El usuario rellena el formulario y pulsa añadir. La web envía un POST a /tasks con los datos en JSON. La URL pública de AWS recibe la llamada y la pasa al handler. El handler lee el cuerpo y valida que el título no esté vacío y que la prioridad sea válida. Si algo falla, devuelve un error 400 antes de tocar la base de datos. Si todo está bien, llama al service. El service crea la tarea con un identificador único y las fechas. Después llama al repository, y el repository hace un PutItem en DynamoDB. Cuando DynamoDB confirma, la respuesta sube otra vez: repository, service, handler y, por último, la web recibe un 201 con la tarea creada. Entonces React la añade a la lista y muestra un aviso. Ese es el camino completo; la rama de error se ve abajo, separada.

## 3:30–5:30 · Demostración de la Aplicación

[En pantalla: web desplegada]

Ahora la demostración. Estoy en la URL pública. Voy a crear una tarea: «Preparar entrega», prioridad alta y fecha para mañana. Pulso añadir y aparece arriba. Creo una segunda tarea sin prioridad para ver que también se guarda. Marco la primera como completada; el contador cambia. Uso el filtro de completadas y la búsqueda para encontrar una tarea. Edito el título de la segunda. Y borro una tarea: la app pide confirmación antes de borrar, para evitar errores. Ahora pruebo un caso límite: intento crear una tarea con el título vacío. La app no llama a la API y muestra «El título es obligatorio». Si la llamada llegara al servidor, el servidor también respondería 400. Recargo la página para comprobar la persistencia: las tareas siguen ahí porque están en DynamoDB. Por último, enseño la verificación. Ejecuto los tests del backend, los del frontend, el build y el smoke test contra la API real. Todo pasa. El smoke test crea, lista, actualiza, valida y borra una tarea.

## 5:30–6:20 · Decisión de Arquitectura

[En pantalla: lambda/src/handler.mjs, tasks-service.mjs y tasks-repository.mjs]

La decisión de arquitectura más importante fue separar la Lambda en capas y no meterlo todo en un solo archivo. Al principio es más cómodo tener un index con todo, pero mezcla tres cosas: HTTP, reglas de negocio y acceso a datos. Al separar, el handler solo entiende peticiones y respuestas; el service solo entiende tareas; y el repository es el único que conoce DynamoDB. Eso me dio dos ventajas. La primera es que puedo probar la lógica sin AWS: los tests usan un repository en memoria y no necesitan credenciales. La segunda es que si mañana cambio la base de datos, solo toco una capa. El coste es que hay más archivos, pero para este tamaño merece la pena. También elegí una Function URL pública en lugar de API Gateway porque la API es sencilla y pública; así ahorro configuración y coste.

## 6:20–6:50 · Aprendizaje y cierre

Lo que más he aprendido con este proyecto es a separar responsabilidades y a probar sin la nube. Al principio quería un solo archivo; cuando lo separé, los tests empezaron a correr sin credenciales y encontré errores antes de desplegar. También aprendí que los permisos de AWS son parte del diseño: si no están bien, la aplicación no arranca. Para el futuro mejoraría tres cosas: añadir autenticación para que cada usuario tenga sus tareas, paginar la lista con un índice en vez de leer toda la tabla y mover el estado de Terraform a un backend remoto. Con esto cierro. Gracias.
