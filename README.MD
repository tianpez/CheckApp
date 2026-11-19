# CheckApp

**Gestión de tareas y operaciones para equipos de hostelería**

**Autor:** Sebastián López

CheckApp es una aplicación web adaptable a móviles y escritorio para organizar tareas operativas, consultar procedimientos de servicio y controlar el inventario de un establecimiento. Los datos se centralizan en una API Node.js con SQLite para compartirlos entre los dispositivos conectados.

## Contenido

- [Funciones principales](#funciones-principales)
- [Requisitos e instalación](#requisitos-e-instalación)
- [Ejecución](#ejecución)
- [Datos y copias de seguridad](#datos-y-copias-de-seguridad)
- [Exportación a MariaDB](#exportación-a-mariadb)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Seguridad](#seguridad)

## Funciones principales

### Tareas y seguimiento

- Programa tareas diarias, semanales, mensuales o eventuales.
- La vista de calendario para administradores está temporalmente oculta; las tareas del día siguen disponibles en **Tareas**.
- Guía su ejecución mediante listas de pasos; una tarea se completa cuando se terminan todos.
- Muestra avisos de tareas pendientes fuera de horario. La vista de administración permite consultar el historial de los últimos siete días.
- Identifica los turnos de mañana (06:00–12:00), tarde (12:00–18:00) y noche (18:00–24:00) con colores.
- Atribuye las tareas completadas al número y nombre del empleado.

Las tareas y su progreso se guardan en el servidor. Los clientes abiertos sincronizan los cambios periódicamente y al recuperar el foco. La aplicación puede mostrar avisos y, con permiso del usuario, enviar notificaciones del navegador mientras está abierta.

### Biblioteca de servicio

La Biblioteca permite buscar tutoriales por texto y categoría, consultar sus pasos e imágenes, y agregar contenido desde el panel de administración. Las categorías disponibles son **Sala**, **Montaje de mesas**, **Buffet**, **Bebidas**, **Alimentos**, **Cócteles**, **Quinta food**, **Rewards** y **Room service**.

Cada tutorial puede incluir de una a ocho imágenes optimizadas. El tamaño total de las imágenes guardadas por tutorial no puede superar 2,5 MB.

### Control de stock

Disponible para administradores, el inventario incluye las categorías **Vinos**, **Licores**, **Cervezas**, **Destilados**, **Refrescos**, **Alimentos**, **Menaje** y **Otros**, con subcategorías según corresponda. En una instalación nueva se carga un catálogo ilustrado de referencia, con cantidades en cero y pendientes de recuento.

Permite buscar por producto, subcategoría o ubicación; filtrar por categoría y estado; realizar recuentos completos; y registrar entradas y salidas. Los movimientos se habilitan tras el recuento, y una salida no puede dejar existencias negativas. Cada producto puede tener una fotografía propia. Las unidades disponibles son unidades, gramos, litros y cajas.

Al actualizar datos antiguos, la aplicación adapta las categorías previas de bebidas y limpieza y convierte kilos a gramos y mililitros a litros, manteniendo el valor de las cantidades.

### Administración y usuarios

El panel de administración reúne la gestión de tareas, el historial, los accesos de empleados y la Biblioteca. Los administradores pueden crear cuentas, asignar roles y actualizar nombres. Siempre debe quedar al menos un administrador.

## Requisitos e instalación

Se requiere Node.js y npm, además de las dependencias del proyecto.

```powershell
npm install
```

## Ejecución

### Desarrollo

```powershell
npm run dev
```

El comando inicia la interfaz de Vite en `http://localhost:5174` y la API en el puerto `3001`. Para acceder desde un móvil conectado a la misma red, abre `http://<IP-del-equipo-servidor>:5174`. El equipo que ejecuta CheckApp debe permanecer encendido.

### Pruebas y compilación

```powershell
npm test
npm run build
```

Las pruebas usan Vitest. La compilación comprueba los tipos de TypeScript y genera los archivos de producción.

### Producción

```powershell
npm run build
npm start
```

En producción, la aplicación y la API se sirven en el puerto `3001`. El servidor escucha en todas las interfaces de red por defecto.

### Acceso inicial

Una base nueva incluye cuentas de demostración:

| Código | Rol |
| --- | --- |
| `` | Administrador |
| `` | Usuario |

Cambia estos códigos antes de utilizar la aplicación en un entorno real.

## Datos y copias de seguridad

La fuente de datos es SQLite en el servidor, no el almacenamiento del navegador. La base se crea automáticamente en `data/checkapp.sqlite` y almacena cuentas, tareas, inventario y Biblioteca. La variable `CHECKAPP_DATABASE` permite cambiar su ubicación; `PORT` permite configurar el puerto de la aplicación y la API.

Si existen datos de una versión anterior en el navegador, al iniciar sesión como administrador se ofrece importarlos. Se pueden migrar cuentas, tareas y stock; las secciones seleccionadas reemplazan sus equivalentes en la base compartida dentro de una transacción. La importación se ofrece una sola vez por base de datos. Si los datos están repartidos entre varios navegadores, reúne primero en uno las secciones que quieras conservar.

Para hacer una copia de seguridad íntegra:

1. Detén el servidor para que SQLite cierre y consolide sus archivos.
2. Copia `data/checkapp.sqlite` —o el archivo indicado por `CHECKAPP_DATABASE`— a una ubicación segura.
3. Restaura la copia con el servidor detenido.

No copies únicamente el archivo principal mientras la base de datos esté en uso.

## Exportación a MariaDB

El exportador prepara un archivo SQL con el esquema y los datos de SQLite para importarlo en una base MariaDB vacía. Conserva primero una copia íntegra de SQLite y úsala como origen:

```powershell
npm run export:mariadb -- data\checkapp.sqlite.backup-20261114T120000Z data\checkapp-mariadb.sql
```

Sustituye el nombre de ejemplo por el de tu copia. El proceso comprueba la integridad de la base y las relaciones entre sus tablas. En HestiaCP, crea una base MariaDB vacía, selecciónala en phpMyAdmin e importa el archivo generado. El SQL no crea la base ni el usuario, y no debe importarse sobre tablas que ya contengan datos.

La exportación prepara el esquema y los registros, pero no reconfigura el servidor de CheckApp para utilizar MariaDB. El archivo incluye hashes de códigos de acceso y datos de sesión: mantenlo privado y fuera de carpetas públicas y del repositorio.

## Estructura del proyecto

```text
src/
  app-shell.ts       Plantilla HTML de la aplicación
  main.ts            Inicio y coordinación de la interfaz
  catalog-views.ts   Representación de Biblioteca y Stock
  api.ts             Solicitudes HTTP al servidor
  auth.ts            Autenticación y usuarios
  calendar.ts        Tareas, calendario y checklists
  library.ts         Biblioteca y validación de tutoriales
  library-options.ts Categorías de Biblioteca
  stock.ts           Inventario y operaciones de stock
  stock-options.ts   Categorías, subcategorías y unidades de stock
server/
  app.ts             Rutas y middleware de la API
  database.ts        Persistencia SQLite
```

Las pruebas se encuentran junto a los módulos que verifican. La interfaz utiliza `src/html.ts` para escapar el contenido que presenta.

## Seguridad

- Los códigos de acceso se guardan como hashes en el servidor; el navegador recibe únicamente los datos públicos de la cuenta.
- La autenticación utiliza sesiones HTTP-only y limita los intentos de acceso.
- No expongas SQLite directamente a la red.
- No publiques la aplicación en una red pública sin HTTPS y una configuración segura del servidor.
- SQLite está pensado para una instancia central en un solo equipo. Para varias instancias o un despliegue distribuido, migra la API a una base de datos de servidor, como PostgreSQL, y configura HTTPS.
