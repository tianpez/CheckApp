APLICACION PARA GESTION DE TAREAS DIARIAS, SEMANALES, MENSUALES Y EVENTUALES, Y CONTENIDO ESTILO BIBLIOTECA (LIBRERIA) CON CONTENIDO DE COMO MONTAR UNA MESA DE DESAYUNO, COMIDA, CENA
COMO MONTAR ESTILO BUFFET, COMO SERVIR DIFERENTES BEBIDAS , PLATOS , ETC DEBE DE IR ACOMPAÑADO DE UN TEXTO Y FOTOS EXPLICATIVAS
ESTA APLICACION DEBE SER UNA COPIA FIEL Y MAS SENCILLA A LA APLICACION
ANDYAPP.IO DE LA WEB. Realizar esta aplicacion teniendo en cuenta que se va ser utilizada en dispositivos moviles y tambien web

## Calendario y desarrollo

La vista Calendario, disponible solo para administradores, permite navegar entre meses, seleccionar un día y administrar tareas con fecha, hora y pasos de checklist. Las tareas se pueden configurar como diarias, semanales, mensuales o eventuales. Las diarias se repiten cada día, las semanales cada siete días desde su fecha inicial, las mensuales el mismo día del mes (o el último día si ese día no existe) y las eventuales una sola vez. Cada fecha de repetición tiene su propio avance de checklist. La vista Tareas muestra las tareas del día y su progreso. Los cambios se guardan en la base de datos compartida del servidor y se actualizan en los otros dispositivos conectados.

Desde la raíz del repositorio, instala dependencias con `npm install`, inicia la aplicación y su API con `npm run dev` y ejecuta las pruebas con `npm test`. `npm run build` comprueba los tipos y genera la versión de producción.

## Estructura del código

La interfaz separa la plantilla HTML inicial (`src/app-shell.ts`), el arranque y la coordinación de la aplicación (`src/main.ts`) y la representación de Biblioteca y Stock (`src/catalog-views.ts`). El escape de texto HTML compartido está en `src/html.ts`. La lógica del dominio se mantiene en módulos independientes (`auth`, `calendar`, `library` y `stock`), mientras que `src/api.ts` centraliza las solicitudes HTTP. El servidor organiza la API y el acceso a SQLite en `server/app.ts` y `server/database.ts`. Las pruebas se encuentran junto a los módulos que verifican.

## Base de datos compartida

La fuente de datos de la aplicación es SQLite en el servidor Node.js, no el almacenamiento del navegador. La base se crea automáticamente en `data/checkapp.sqlite` e incluye usuarios y roles, tareas y checklists, productos de stock e información de la Biblioteca. La aplicación carga esas secciones desde la API y guarda los cambios allí; al volver a primer plano y periódicamente mientras está abierta, actualiza los datos compartidos. Las categorías y unidades son valores controlados por la aplicación; los registros editables se guardan en SQLite.

En desarrollo, `npm run dev` inicia la interfaz Vite en el puerto `5174` y la API en el `3001`. Para acceder desde un móvil en la misma red, abre `http://<IP-del-equipo-servidor>:5174`; el equipo que ejecuta CheckApp debe permanecer encendido. Para producción, ejecuta `npm run build` y después `npm start`; la aplicación y la API se sirven en el puerto `3001`. Por defecto el servidor escucha en todas las interfaces de red. `CHECKAPP_DATABASE` permite establecer la ruta del archivo SQLite y `PORT` cambiar el puerto de la aplicación/API. No expongas SQLite directamente a la red.

Al crear una base nueva se cargan las guías de Biblioteca, tareas de ejemplo, el catálogo inicial de stock y las cuentas de demostración (`123456` administrador y `000000` usuario). Los PIN se guardan como hashes en el servidor; el navegador solo recibe nombre y rol. La autenticación usa sesiones HTTP-only y limita intentos de acceso. Cambia los PIN de demostración antes de usarla en un entorno real. SQLite es apropiado para una instancia central en un único equipo; para alojar CheckApp en varias instancias o en internet se debe migrar la API a un servicio con base de datos PostgreSQL y habilitar HTTPS.

Si el navegador tiene datos de la versión anterior, al iniciar sesión como administrador ofrece importarlos. La operación reemplaza en SQLite únicamente las secciones locales seleccionadas (cuentas, tareas o stock), dentro de una transacción; tras completarse, elimina esas copias locales para evitar datos divergentes. Haz antes una copia JSON de las tareas si quieres conservar un respaldo independiente. La migración requiere una cuenta administradora del servidor.

La migración heredada solo se ofrece una vez por base de datos. Si los datos están repartidos en varios navegadores, reúne primero en uno los datos que quieras conservar: una importación posterior de una sección sustituiría esa sección compartida.

Para hacer una copia de seguridad íntegra, detén el servidor de CheckApp para que SQLite cierre y consolide sus archivos y copia `data/checkapp.sqlite` (o el archivo indicado por `CHECKAPP_DATABASE`) a una ubicación segura. Restaura la copia con el servidor detenido. No copies solo el archivo principal mientras la aplicación esté escribiendo.

## Supervisión y checklist guiada

Cada tarea incluye una lista de pasos que orienta al equipo durante el servicio. Las tareas nuevas requieren al menos un paso, y la tarea solo se marca como completada al finalizar todos sus pasos. Al completar una tarea, la aplicación muestra un aviso inmediato; si el usuario concede permiso, también envía una notificación del navegador.

La vista **Tareas** muestra las tareas del día y una alerta de desviaciones para las tareas pendientes cuya fecha y hora ya pasaron. Las tareas de mañana (06:00–12:00) se identifican en amarillo, las de tarde (12:00–18:00) en naranja y las de noche (18:00–24:00) en azul; la leyenda aparece en Tareas y Calendario. Los avisos y confirmaciones de la interfaz utilizan SweetAlert2; las acciones destructivas y la importación de tareas requieren confirmación. Al completar una tarea, la aplicación también puede enviar una notificación del navegador si el usuario concede permiso. Las notificaciones del sistema no se generan cuando la aplicación está cerrada.

Las repeticiones no completadas se registran como tareas no realizadas. El historial de administración muestra solo las ejecuciones de los últimos siete días, sin mostrar ni permitir reabrir checklists de fechas pasadas; las ejecuciones completadas no se pueden cambiar a no realizadas desde el historial. La lista de desviaciones se actualiza cada minuto mientras la aplicación está abierta; los usuarios pueden abrir la checklist del día para revisar una tarea. Las tareas y sus checklists se guardan en el servidor; los clientes abiertos actualizan los datos compartidos cada 15 segundos y al recuperar el foco.

## Administración y copias de seguridad

El panel de administración organiza sus funciones en pestañas independientes: **Administración de tareas** —consultar, buscar, filtrar, crear, editar las que todavía no se han completado y eliminar tareas—, **Historial** —consultar y filtrar las ejecuciones de los últimos siete días—, **Accesos y empleados** —crear usuarios, editar su nombre y rol, y eliminar cuentas— y **Biblioteca**, que permite agregar tutoriales ilustrados compartidos con todo el equipo. Desde la pestaña de tareas también se puede descargar una copia JSON o importar una copia anterior; la importación valida el archivo y pide confirmación porque reemplaza la lista de tareas compartida.

En el panel de usuarios, el administrador asigna un número de empleado y un nombre visible a cada PIN, y puede actualizar el nombre de una cuenta existente. En la tabla de tareas, **Realizada por** muestra el número y el nombre del empleado que completó la checklist; esa atribución se conserva aunque el nombre de la cuenta cambie después. Las tareas completadas antes de habilitar este dato no tienen una instantánea histórica del nombre y muestran el identificador junto con el nombre que tenga asignado actualmente, si está disponible.

## Biblioteca de servicio

La sección **Biblioteca** reúne guías de sala, montaje de mesas, presentación y reposición del buffet, servicio de bebidas y recetas de cócteles. Se puede buscar por palabras clave en los títulos, categorías, pasos e índices, y filtrar por categoría. En la pestaña **Biblioteca** del panel de administración se pueden agregar tutoriales con categoría, título, resumen, palabras clave, pasos e imagen obligatoria; las imágenes se optimizan y se guardan en SQLite junto con el contenido. La biblioteca inicial incluye procedimientos de referencia; adapta las medidas, las recetas y los procedimientos de seguridad alimentaria a las normas vigentes y al protocolo del establecimiento.

## Control de stock

La sección **Control de stock** solo aparece para usuarios con rol de administrador. En una instalación nueva carga una selección representativa —no un ranking estadístico, ya que la oferta cambia según el hotel— de alimentos y bebidas habituales en desayunos y restaurantes, con ilustraciones SVG locales. Las cantidades parten de cero y quedan marcadas como pendientes de recuento; los mínimos iniciales son orientativos. El botón **Realizar control de stock** abre un formulario con todos los productos para introducir las cantidades contadas y guardar el recuento completo en una sola operación. La carga inicial solo ocurre cuando todavía no existe una lista guardada y no sustituye inventarios existentes.

El stock permite buscar por nombre o ubicación y filtrar por categoría, stock bajo, agotados o pendientes de recuento. La lista prioriza la foto, el nombre y la cantidad disponible con su unidad; los datos secundarios, como ubicación y mínimo, aparecen al desplegar «Gestionar». Las unidades disponibles incluyen unidades, kilos, gramos, litros y cajas. Cada producto admite una foto propia; los nuevos productos requieren foto y los del catálogo conservan su imagen ilustrativa hasta que se suba una. Los movimientos de entrada y salida solo se habilitan después de verificar las existencias, y una salida no puede dejar una cantidad negativa. Los datos y las fotos se guardan en SQLite en el servidor y se comparten entre dispositivos conectados.

La estructura toma como referencia prácticas de inventario de hostelería como mínimos/par levels, recuentos físicos y control de entradas y consumos descritas en la [guía de inventario para restaurantes de Supy](https://supy.io/blog/restaurant-inventory-management-complete-guide), además de la [guía de reducción de desperdicio de MarketMan](https://www.marketman.com/blog/how-to-reduce-food-waste). Esta versión es un registro operativo básico: no calcula mínimos automáticamente, no registra proveedores, caducidades ni auditorías de diferencias, y las cantidades deben contrastarse con el inventario físico y las pautas del establecimiento.

## Acceso y gestión de usuarios

Se quitó la portada de presentación. La aplicación abre en una pantalla de acceso y, al entrar, muestra directamente las tareas. El usuario normal puede consultar las tareas y actualizar las checklists; el calendario, la administración de tareas y cuentas quedan disponibles para usuarios con rol de administrador.

La aplicación se llama **CheckApp** y el acceso se realiza únicamente con un código numérico único de seis dígitos; no se pide nombre de usuario en la pantalla de inicio de sesión. Los códigos iniciales son `123456` para el administrador y `000000` para el usuario. El administrador puede crear cuentas asignándoles un nombre interno, un código único y un rol; puede cambiar los roles posteriormente. Debe quedar siempre al menos un administrador.

Al iniciar sesión, CheckApp carga cuentas, tareas, biblioteca y stock desde el servidor según el rol. Los cambios se conservan en la base de datos compartida al cerrar y abrir la aplicación desde otro dispositivo de la red.

**Importante:** la base central permite compartir los datos, pero el PIN inicial es de demostración y no debe mantenerse en uso. No expongas la aplicación por una red pública sin HTTPS, configuración segura de hosting y cambio de las credenciales iniciales.