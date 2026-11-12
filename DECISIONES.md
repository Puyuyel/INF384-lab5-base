# Decisiones · Laboratorio 5

## Equipo

Número de equipo: 2

| Código PUCP | Nombre | Rol | Usuario de GitHub |
|---|---|---|---|
| 20220293 | Jose Reyes | Moderador | Puyuyel |
| 20222232 | Matias Chavarria | Escriba | york55 |
| 20220666 | Angel Sanchez | Abogado del diablo | sheshe0529 |
| 20212662 | Giano Sebastian | Guardián del tiempo | giano-montano |
| 20220256 | Gandy Zinanyuca | Integrador | Gandy-Zinanyuca |

## A1 · Postmortem

### Resumen
El viernes 06/11 se cambió la configuración del bucket de comprobantes para que el proveedor de conciliación pudiera leerlo. El cambio quitó el bloqueo de acceso público y agregó una política con Principal = "*". Se aplicó con terraform apply desde una laptop, sin revisión, sin chequeos automáticos y sin monitoreo posterior. El bucket quedó abierto 63 h 25 min y un cliente accedió a un comprobante ajeno el lunes 09/11. No hay registros de acceso, por lo que no se sabe cuántos comprobantes se descargaron.

### Impacto
- 41 300 comprobantes expuestos (origen, destino, monto y fecha), con nombres correlativos adivinables.
- Se desconoce el alcance real de la descarga: el bucket no tenía registros de acceso.
- El proveedor de conciliación perdió el acceso el 09/11 a las 09:25 y sigue sin él, con penalidad contractual por cada día de retraso.
- El bloqueo se hizo a mano en la consola: el código de infra/ sigue describiendo el bucket público (deriva entre código y realidad).

### Línea de tiempo

| Fecha y hora | Hecho |
|---|---|
| Jue 05/11 15:10 | El área comercial informa que el proveedor debe leer los comprobantes desde el 06/11, con penalidad por día de retraso. |
| Vie 06/11 09:30 | La tarea se asigna a un desarrollador backend que no había modificado `infra/`. |
| Vie 06/11 16:20 | El desarrollador pide el identificador de cuenta AWS al proveedor y no recibe respuesta. |
| Vie 06/11 17:30 | Pide revisión por chat. El líder técnico, en reunión, responde que se verá el lunes. |
| Vie 06/11 17:42 | Commit directo a `main` con el cambio en `infra/` (sin pull request). |
| Vie 06/11 17:55 | `terraform apply` desde una laptop. El proveedor confirma acceso. El bucket queda público. |
| Sáb 07/11 y Dom 08/11 | Sin alertas: no hay monitoreo de la configuración del bucket. |
| Lun 09/11 08:15 | Un cliente publica el link de un comprobante ajeno, que halló cambiando el número final. |
| Lun 09/11 08:50 | Soporte escala a on-call. |
| Lun 09/11 09:20 | On-call activa el bloqueo de acceso público desde la consola. `infra/` no se modifica. |
| Lun 09/11 09:25 | El proveedor pierde el acceso. |
| Lun 09/11 11:00 | El equipo busca registros de acceso y descubre que el bucket no los tiene. |
| Mar 10/11 10:00 | Gerencia pide informe y plan de prevención. |

### Causas

Causas del sistema (ninguna es "error humano"):
 
1. **Proceso: sin segundo par de ojos obligatorio.** `main` no tiene branch protection, así que un commit directo llegó a producción sin revisión. La revisión dependía de una respuesta informal por chat, y el rol que aprueba estuvo en reuniones toda la semana.
2. **Proceso: urgencia contractual sin camino seguro.** La penalidad diaria creó presión de plazo, y no existía un procedimiento para accesos de terceros (por ejemplo, un cambio de emergencia con revisión posterior y plazo acotado).
3. **Pipeline: `ci` solo ejecuta pruebas unitarias.** No revisa `infra/` ni las dependencias. Un escáner de IaC habría detenido el cambio: Checkov marca los checks `CKV_AWS_53`, `CKV_AWS_54`, `CKV_AWS_55`, `CKV_AWS_56`, `CKV_AWS_70` y `CKV2_AWS_6` sobre el bucket.
4. **Plataforma: el despliegue es manual desde una laptop.** Quien cambia, aplica. No hay un punto único, auditable y con aprobación que aplique la infraestructura.
5. **Plataforma: sin observabilidad del bucket.** No hay registros de acceso (`CKV_AWS_18`) ni alerta sobre la configuración, por eso la exposición duró un fin de semana y no se puede medir el daño.
6. **Plataforma: diseño que favorece la enumeración.** Los comprobantes tienen nombre correlativo, así que un solo link permite adivinar los demás.
7. **Conocimiento concentrado.** Una sola persona del equipo había escrito Terraform y estaba de vacaciones; nadie más tenía el contexto para revisar un cambio en `infra/`.

### Qué funcionó y qué no funcionó

Funcionó:
- Soporte escaló a on-call en 35 minutos y on-call contuvo el incidente en 30 minutos más.
- El historial de git permitió identificar el commit exacto y el diff.
- El desarrollador buscó revisión antes de aplicar y dejó el motivo en el mensaje del commit.
No funcionó:
- Se aplicó el cambio antes de recibir la revisión.
- Sin registros de acceso, no se puede evaluar el alcance.
- La contención fue manual y no se reflejó en el código.
- Se cortó el acceso del proveedor en vez de darle un acceso correcto.
- Nadie detectó la exposición durante 63 horas; la detectó un cliente.

### Acciones

| Acción | Rol responsable | Fecha límite |
|---|---|---|
| Activaremos branch protection en `main`: pull request obligatorio y una aprobación. | Líder técnico | 2026-11-13 |
| Incorporaremos los jobs `iac` (Checkov) y `sca` (Trivy) al pipeline y los marcaremos como checks requeridos. | Desarrolladores backend | 2026-11-12 |
| Corregiremos el bucket en Terraform y le daremos acceso solo al rol `conciliacion-lectura` de la cuenta 111122223333. | Desarrolladores backend | 2026-11-12 |
| Restableceremos el acceso del proveedor con la política restringida, tras el merge. | On-call | 2026-11-12 |
| Activaremos registros de acceso al bucket y una alerta de cambios de configuración. | Ingeniera de plataforma | 2026-11-20 |
| Moveremos `terraform apply` a un pipeline con aprobación y sin credenciales en laptops. | Ingeniera de plataforma | 2026-12-04 |
| Definiremos un procedimiento de cambio urgente con revisor suplente cuando el líder técnico no esté disponible. | Líder técnico | 2026-11-20 |
| Haremos una sesión para que al menos dos desarrolladores puedan revisar Terraform. | Ingeniera de plataforma | 2026-12-04 |
| Cambiaremos los nombres de comprobante por identificadores no adivinables. | Desarrolladores backend | 2026-12-11 |
| Notificaremos a Legal y evaluaremos el aviso a los clientes afectados según la normativa de protección de datos. | Líder técnico | 2026-11-16 |

### Datos del repositorio

- SHA del commit que introdujo el cambio: `bd600fe3307d5aa35bb3acbff8df91e0e02fcf35` (abreviado `bd600fe`), archivo `infra/s3.tf`.
- Fecha y hora de ese commit: 2026-11-06 17:42:00 (UTC-05:00).
- Checks de Checkov que fallan sobre el bucket de comprobantes: `CKV_AWS_53`, `CKV_AWS_54`, `CKV_AWS_55`, `CKV_AWS_56` (`aws_s3_bucket_public_access_block.comprobantes`, `infra/s3.tf` líneas 5-12), `CKV_AWS_70` (`aws_s3_bucket_policy.conciliacion`, líneas 14-27) y `CKV2_AWS_6` (`aws_s3_bucket.comprobantes`). También fallan, de menor prioridad: `CKV_AWS_18`, `CKV_AWS_21`, `CKV_AWS_145`, `CKV_AWS_144`, `CKV2_AWS_61`, `CKV2_AWS_62`.

## A2 · Decisiones

### Decisión 1 · Qué bloquea y qué informa

- Decisión: Checkov bloquea solo los hallazgos que dejan datos expuestos a Internet: `CKV_AWS_53`, `CKV_AWS_54`, `CKV_AWS_55`, `CKV_AWS_56`, `CKV_AWS_70`, `CKV2_AWS_6` y `CKV_AWS_258`. El resto informa. Trivy bloquea las vulnerabilidades HIGH y CRITICAL que ya tienen versión corregida (`ignore-unfixed`) e informa todas las demás.
- Dato del repositorio que la sustenta: Checkov sobre `infra/` reporta 28 hallazgos, de los cuales 7 son los IDs que bloquean y 21 informan. Trivy sobre `package-lock.json` reporta 2 hallazgos HIGH que bloquean, ambos en `lodash` 4.17.20: CVE-2021-23337 (corregida en 4.17.21) y CVE-2026-4800 (corregida en 4.18.0).
- Alternativa descartada y por qué: Bloquear los 28 hallazgos de Checkov. Se descartó porque 21 son endurecimientos (KMS, VPC, DLQ, X-Ray, replicación) que no causaron el incidente, y con el pipeline siempre en rojo el equipo terminaría ignorándolo.
- Posición en minoría: El abogado del diablo propuso bloquear también `CKV_AWS_355` y `CKV_AWS_288`, porque el rol de la Lambda tiene `s3:*` sobre `Resource "*"` y podría leer cualquier bucket. Se descartó por ahora porque corregirlo exige rediseñar el IAM y no estaba en el origen del incidente.

### Decisión 2 · La vulnerabilidad sin versión corregida

- Decisión: Reemplazar la librería `ip` por `net.BlockList`, que viene con Node.
- Dato del repositorio que la sustenta: CVE-2024-29415, `ip` 2.0.1 (no tiene versión corregida). Se usa en `src/notificaciones.js`, función `validarUrlNotificacion()`. Con esa librería se aceptaban URLs internas como `https://[::ffff:127.0.0.1]/`.
- Alternativa descartada y por qué: La excepción, porque el fallo sí se podía explotar en nuestro código. Bloquear tampoco sirve, porque el fix podría no salir nunca.
- Posición en minoría: El abogado del diablo propuso una excepción corta para no tocar código justo después del incidente. Se descartó porque el cambio es pequeño y tiene pruebas.

### Decisión 3 · La Function URL sin autenticación

- Decisión: Abrimos una excepción temporal para CKV_AWS_258 y mantenemos authorization_type = "NONE", porque la app móvil consume la Function URL directamente y no firma peticiones con IAM. La excepción queda escrita en infra/lambda.tf con #checkov:skip=CKV_AWS_258 y sus cuatro datos. Responsable: Líder técnico. Vencimiento: 2026-12-12. Control compensatorio: limitamos la Lambda a 10 ejecuciones simultáneas (reserved_concurrent_executions = 10 en aws_lambda_function.api) para acotar el abuso mientras dura la excepción. Riesgo aceptado: cualquiera con la URL puede invocar la API sin autenticarse, incluido POST /transferir. Además, CKV_AWS_258 se agrega a hard-fail-on en .checkov.yaml: una Function URL nueva sin autenticación y sin excepción bloquea el pipeline.
- Dato del repositorio que la sustenta: CKV_AWS_258 sobre el recurso aws_lambda_function_url.api, en infra/lambda.tf líneas 31-40 (authorization_type = "NONE").
- Alternativa descartada y por qué: Corregir con authorization_type = "AWS_IAM". Se descartó porque deja sin servicio a la app móvil hasta que firme las peticiones, y ese cambio está fuera de este repositorio.
- Posición en minoría: El abogado del diablo propuso corregir ya, porque src/handler.js no valida ningún token y POST /transferir queda abierto a cualquiera, lo que es más grave que el bucket. Se aceptó como riesgo con una fecha de vencimiento corta y un límite de concurrencia.

## A3 · Dato nuevo

- Qué cambia en el postmortem: Al impacto se suma una penalidad de S/ 15 000 por cada día sin acceso del proveedor, desde el 09/11. Nueva causa: la presión del contrato apuró el cambio y no había un proceso de cambio urgente con revisión.
- Qué cambia en las decisiones: El acceso del proveedor se devuelve hoy dándole permiso solo al rol `conciliacion-lectura` de la cuenta 111122223333, sin reabrir el bucket al público. La Decisión 1 se mantiene: un bucket público sigue bloqueando el pipeline.
- Respuesta del equipo al pedido recibido: No damos nombres. El cambio salió sin revisión porque `main` no tiene branch protection, el pipeline no revisa `infra/` y la única persona que sabe Terraform estaba de vacaciones. Sancionar a alguien no arregla eso. A cambio entregamos hoy el acceso del proveedor y las acciones con responsable y fecha.

## Parte B · Evidencia

| Evidencia | Link |
|---|---|
| Run fallido: el gate detiene el bucket público | |
| Run en verde en `main` después de las correcciones | |
| Pull requests del equipo | |

## Declaración de uso de IA

Herramientas usadas y para qué se usó cada una:

- Claude (Anthropic): leer el enunciado, ejecutar Checkov y `npm audit` en local para obtener los datos del repositorio, identificar las dependencias vulnerables, proponer el reemplazo de `ip` por `net.BlockList` con sus pruebas, y redactar borradores de las secciones de `DECISIONES.md` y de los jobs `iac` y `sca`. El equipo revisó, discutió y ajustó cada decisión antes de registrarla.
