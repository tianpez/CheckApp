APLICACION PARA GESTION DE TAREAS, DIARIAS , SEMANALES Y MENSUALES Y CONTENIDO ESTILO BIBLIOTECA  ( LIBRERIA)CON CONTENIDO DE COMO MONTAR UNA MESA DE DESAYUNO,COMIDA, CENA
COMO MONTAR ESTILO BUFFET, COMO SERVIR DIFERENTES BEBIDAS , PLATOS , ETC DEBE DE IR ACOMPAÑADO DE UN TEXTO Y FOTOS EXPLICATIVAS
ESTA APLICACION DEBE SER UNA COPIA FIEL Y MAS SENCILLA A LA APLICACION
ANDYAPP.IO DE LA WEB. Realizar esta aplicacion teniendo en cuenta que se va ser utilizada en dispositivos moviles y tambien web

## Calendario y desarrollo

La primera versión del calendario permite navegar entre meses, seleccionar un día, crear tareas con fecha y hora, marcarlas como completadas y eliminarlas. La agenda muestra el porcentaje de completado para cada grupo (diario, semanal y mensual) del día seleccionado. El botón «Tareas» abre un checklist en formato de tabla con columnas para tarea, hora, grupo y casilla de completado. Todas las tareas de hoy permanecen visibles; las casillas alineadas actualizan el porcentaje de culminación de la jornada. Las tareas se guardan en el almacenamiento local del navegador; por ahora no se sincronizan entre dispositivos.

Desde la carpeta `app`, instala dependencias con `npm install`, inicia la aplicación con `npm run dev` y ejecuta las pruebas unitarias con `npm test`. `npm run build` comprueba los tipos y genera la versión de producción.

## Supervisión y checklist guiada

Cada tarea incluye una lista de pasos que orienta al equipo durante el servicio. Las tareas nuevas requieren al menos un paso, y la tarea solo se marca como completada al finalizar todos sus pasos. Al completar una tarea, la aplicación muestra un aviso inmediato; si el usuario concede permiso, también envía una notificación del navegador.

La vista **Tareas** muestra las tareas del día y una alerta de desviaciones para las tareas pendientes cuya fecha y hora ya pasaron. La lista de desviaciones se actualiza cada minuto mientras la aplicación está abierta y permite abrir directamente la checklist para revisar la tarea. Las notificaciones del sistema dependen del permiso del navegador; no se generan alertas cuando la aplicación está cerrada y aún no existe sincronización entre usuarios o dispositivos.

## Administración y copias de seguridad

La sección **Administración** permite buscar y filtrar todas las tareas, crear nuevas, editar las que todavía no se han completado y eliminar tareas. Desde el mismo panel se puede descargar una copia JSON o importar una copia anterior; la importación valida el archivo y pide confirmación porque reemplaza la lista actual. Los datos siguen guardándose localmente en el navegador: exporta el archivo para conservar una copia o trasladar las tareas a otro dispositivo.

En la tabla de administración aparece **Realizada por** con el nombre interno del usuario que marcó como completada cada tarea. El registro se guarda junto con la tarea y se conserva después de cerrar y volver a abrir la app. Las tareas completadas antes de habilitar este dato aparecen como **Sin registro previo**.

## Acceso de usuarios (modo local de demostración)

Se quitó la portada de presentación. La aplicación abre en una pantalla de acceso y, al entrar, muestra directamente las tareas o el calendario. El usuario normal puede consultar las tareas y actualizar las checklists; la administración de tareas y cuentas queda disponible para usuarios con rol de administrador.

La aplicación se llama **CheckApp** y el acceso se realiza únicamente con un código numérico único de seis dígitos; no se pide nombre de usuario en la pantalla de inicio de sesión. Los códigos iniciales son `123456` para el administrador y `000000` para el usuario. El administrador puede crear cuentas asignándoles un nombre interno, un código único y un rol; puede cambiar los roles posteriormente. Debe quedar siempre al menos un administrador.

Al iniciar CheckApp, la lista de tareas y las cuentas se cargan automáticamente desde el almacenamiento local del navegador. Los cambios de tareas, códigos y roles se guardan en ese mismo almacenamiento y se mantienen al cerrar y volver a abrir la app en el mismo navegador y dispositivo. No es necesario importar el JSON en cada inicio; importar y exportar sirven solo para restaurar o transferir una copia.

**Importante:** este proyecto no tiene backend ni autenticación segura. Los PIN, roles y datos se guardan en el almacenamiento local del navegador y pueden ser inspeccionados o modificados por alguien con acceso al dispositivo. Las cuentas no se comparten entre navegadores ni dispositivos. No usar estos PIN de demostración ni este control de roles para proteger datos sensibles o un servicio en producción; para ello se necesita autenticación y autorización verificadas por un servidor.