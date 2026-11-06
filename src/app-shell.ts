
import { LIBRARY_CATEGORIES } from './library'
import {
  STOCK_CATEGORIES,
  STOCK_UNIT_LABELS,
  STOCK_UNITS,
} from './stock'

export function renderAppShell(): string {
  const timeBandLegend = `
    <div class="time-band-legend" aria-label="Colores según la hora de la tarea">
      <span><i class="time-band-dot time-morning" aria-hidden="true"></i>Mañana · 06:00–12:00</span>
      <span><i class="time-band-dot time-afternoon" aria-hidden="true"></i>Tarde · 12:00–18:00</span>
      <span><i class="time-band-dot time-night" aria-hidden="true"></i>Noche · 18:00–24:00</span>
    </div>
  `
  return `
    <section id="login-screen" class="login-screen" aria-labelledby="login-title">
      <form id="login-form" class="login-card">
        <div class="brand-mark login-brand-mark">C</div>
        <p class="eyebrow">Acceso de usuarios</p>
        <h1 id="login-title">CheckApp</h1>
        <p class="login-copy">Introduce tu código personal para acceder a las tareas del equipo.</p>
        <input id="login-pin" name="pin" class="login-pin-input" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="current-password" aria-label="Código de acceso de seis dígitos" required />
        <div class="pin-entry" aria-label="Código de acceso">
          <div id="pin-digits" class="pin-digits" aria-hidden="true">
            ${Array.from({ length: 6 }, (_, index) => `<span class="pin-digit" data-pin-digit="${index}"></span>`).join('')}
          </div>
          <div class="pin-keypad" aria-label="Teclado numérico">
            ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) =>
              `<button type="button" class="pin-key" data-pin-key="${digit}" aria-label="Número ${digit}">${digit}</button>`,
            ).join('')}
            <span class="pin-key-spacer" aria-hidden="true"></span>
            <button type="button" class="pin-key" data-pin-key="0" aria-label="Número 0">0</button>
            <button type="button" class="pin-key pin-key-delete" data-pin-delete aria-label="Borrar último dígito">⌫</button>
          </div>
        </div>
        <p id="login-error" class="login-error" role="alert" hidden></p>
        <button class="primary-action" type="submit">Acceder</button>
        <p class="demo-account-note">Códigos iniciales: Administrador <strong>123456</strong> · Usuario <strong>000000</strong>.</p>
        <p class="demo-security-note">Los códigos iniciales son de demostración; cámbialos antes de usar CheckApp con el equipo.</p>
      </form>
    </section>

    <div id="app-shell" class="app-shell" hidden>
      <header class="topbar">
        <div class="brand-wrap">
          <div class="brand-mark">A</div>
          <div>
            <p class="brand-title">CheckApp</p>
            <p class="brand-subtitle">Gestión de tareas</p>
          </div>
        </div>

        <nav class="primary-nav" aria-label="Menú principal">
          <button class="nav-link is-active" type="button" data-show-daily-tasks aria-current="page">Tareas</button>
          <button class="nav-link" type="button" data-show-calendar data-admin-only hidden>Calendario</button>
          <button class="nav-link" type="button" data-show-library>Biblioteca</button>
          <button class="nav-link" type="button" data-show-stock data-admin-only hidden>Stock</button>
          <button class="nav-link" type="button" data-show-admin data-admin-only hidden>Administración</button>
        </nav>

        <div class="user-session">
          <span id="session-user"></span>
          <button class="logout-button" type="button" data-logout>Cerrar sesión</button>
        </div>
      </header>

      <main class="page">
        
        <section id="daily-checklist-section" class="daily-checklist-section" aria-labelledby="daily-checklist-title">
          <div class="section-header">
            <div>
              
              <h2 id="daily-checklist-title">Tareas del día</h2><span class="eyebrow"></span>
            </div>
            <div class="daily-header-actions">
              <button class="calendar-today-btn" type="button" data-enable-notifications>Activar avisos</button>
              <button class="primary-action" type="button" data-add-task data-admin-only>Añadir tarea</button>
            </div>
          </div>
          <div class="daily-progress-card">
            <div class="daily-progress-copy">
              <span id="daily-progress-count">0 de 0 tareas completadas</span>
              <strong id="daily-progress-percent">0%</strong>
            </div>
            <div class="daily-progress-track" role="progressbar" aria-label="Completado de las tareas de hoy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span id="daily-progress-fill"></span>
            </div>
          </div>
          ${timeBandLegend}
          <div id="deviation-panel" class="deviation-panel" hidden></div>
          <div id="daily-task-list" class="daily-task-list"></div>
        </section>

        <section id="library-section" class="library-section" aria-labelledby="library-title" hidden>
          <div class="section-header">
            <div>
              <p class="eyebrow">Guías del equipo</p>
              <h2 id="library-title">Biblioteca de servicio</h2>
              <p class="section-copy">Consulta procedimientos, presentaciones y recetas del equipo.</p>
            </div>
          </div>
          <div class="library-search-panel">
            <label for="library-search">
              Buscar en la biblioteca
              <input id="library-search" type="search" placeholder="Ej.: presentación de buffet, mojito, mesa de desayuno" autocomplete="off" />
            </label>
            <label for="library-category">
              Categoría
              <select id="library-category">
                <option value="">Todas las categorías</option>
                ${LIBRARY_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
              </select>
            </label>
          </div>
          <p id="library-result-count" class="library-result-count" aria-live="polite"></p>
          <div id="library-articles" class="library-articles"></div>
        </section>

        <section id="stock-section" class="stock-section" aria-labelledby="stock-title" hidden>
          <div class="section-header">
            <div>
              <p class="eyebrow">Inventario del establecimiento</p>
              <h2 id="stock-title">Control de stock</h2>
              <p class="section-copy">Busca productos y consulta sus existencias y ubicación.</p>
            </div>
            <div class="stock-section-actions">
              <button class="calendar-today-btn" type="button" data-stock-count>Realizar control de stock</button>
              <button class="primary-action" type="button" data-add-stock>Nuevo producto</button>
            </div>
          </div>
          <p id="stock-error" class="calendar-error" role="alert" hidden></p>
          <p id="stock-initial-note" class="stock-initial-note" hidden></p>
          <div class="stock-summary" aria-label="Resumen del inventario">
            <article class="stock-summary-card">
              <span>Pend. recuento</span>
              <strong id="stock-uncounted-count">0</strong>
            </article>
            <article class="stock-summary-card low">
              <span>Stock bajo</span>
              <strong id="stock-low-count">0</strong>
            </article>
            <article class="stock-summary-card out">
              <span>Agotados</span>
              <strong id="stock-out-count">0</strong>
            </article>
          </div>
          <div class="stock-filters" aria-label="Buscar y filtrar productos">
            <label>
              Buscar producto o ubicación
              <input id="stock-search" type="search" placeholder="Ej.: café, bebidas, cámara fría" autocomplete="off" />
            </label>
            <label>
              Categoría
              <select id="stock-category">
                <option value="">Todas</option>
                ${STOCK_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
              </select>
            </label>
          
            <label>
              Estado del stock
              <select id="stock-status-filter">
                <option value="all">Todos</option>
                <option value="low">Stock bajo</option>
                <option value="out">Agotados</option>
                <option value="uncounted">Pendientes de recuento</option>
              </select>
            </label>
            
          </div>
          <p id="stock-result-count" class="stock-result-count" aria-live="polite"></p>
          <div id="stock-list" class="stock-list"></div>
        </section>

        <section id="task-admin-section" class="task-admin-section" aria-labelledby="task-admin-title" hidden>
          <div class="section-header">
            <div>
              <p class="eyebrow">Panel de control</p>
              <h2 id="task-admin-title">Panel de administración</h2>
              <p class="section-copy">Gestiona tareas, accesos de empleados y tutoriales de la Biblioteca.</p>
            </div>
          </div>

          <div class="admin-tabs" role="tablist" aria-label="Secciones de administración">
            <button class="admin-tab is-active" id="admin-tab-tasks" type="button" role="tab" aria-selected="true" aria-controls="admin-panel-tasks" tabindex="0" data-admin-tab="tasks">Administración de tareas</button>
            <button class="admin-tab" id="admin-tab-history" type="button" role="tab" aria-selected="false" aria-controls="admin-panel-history" tabindex="-1" data-admin-tab="history">Historial</button>
            <button class="admin-tab" id="admin-tab-users" type="button" role="tab" aria-selected="false" aria-controls="admin-panel-users" tabindex="-1" data-admin-tab="users">Accesos y empleados</button>
            <button class="admin-tab" id="admin-tab-library" type="button" role="tab" aria-selected="false" aria-controls="admin-panel-library" tabindex="-1" data-admin-tab="library">Biblioteca</button>
          </div>

          <section class="admin-management-card task-management-card" id="admin-panel-tasks" role="tabpanel" aria-labelledby="admin-tab-tasks" tabindex="0">
            <div class="admin-management-heading">
              <div>
                <p class="eyebrow">Planificación y seguimiento</p>
                <h3 id="task-management-title">Administración de tareas</h3>
                <p class="section-copy">Aquí puedes consultar, crear, editar y eliminar tareas del equipo.</p>
              </div>
              <div class="admin-actions">
                <button class="calendar-today-btn" type="button" hidden data-export-tasks>Exportar archivo</button>
                <button class="calendar-today-btn" type="button" hidden data-import-tasks>Importar archivo</button>
                <input id="task-import-file" type="file" accept="application/json,.json" hidden />
                <button class="primary-action" type="button" data-add-task data-admin-only>Nueva tarea</button>
              </div>
            </div>

            <div class="admin-filters" aria-label="Filtros de tareas">
              <label>
                Buscar
                <input id="admin-search" type="search" placeholder="Título o descripción" />
              </label>
              <label>
                Periodo
                <select id="admin-period">
                  <option value="">Todos</option>
                  <option value="daily">Diarias</option>
                  <option value="weekly">Semanales</option>
                  <option value="monthly">Mensuales</option>
                  <option value="eventual">Eventuales</option>
                </select>
              </label>
            </div>
            <div id="admin-task-list" class="admin-task-list"></div>
          </section>

          <section class="admin-management-card admin-history-section" id="admin-panel-history" role="tabpanel" aria-labelledby="admin-tab-history" tabindex="0" hidden>
            <div class="admin-management-heading">
              <div>
                <p class="eyebrow">Ejecuciones por fecha</p>
                <h3>Historial de tareas</h3>
                <p class="section-copy">El historial muestra las ejecuciones de los últimos siete días.</p>
              </div>
            </div>
            <div class="admin-filters" aria-label="Filtros del historial">
              <label>
                Buscar
                <input id="history-search" type="search" placeholder="Título o descripción" />
              </label>
              <label>
                Periodo
                <select id="history-period">
                  <option value="">Todos</option>
                  <option value="daily">Diarias</option>
                  <option value="weekly">Semanales</option>
                  <option value="monthly">Mensuales</option>
                  <option value="eventual">Eventuales</option>
                </select>
              </label>
              <label>
                Estado
                <select id="admin-status">
                  <option value="">Todos</option>
                  <option value="pending">Tarea no realizada</option>
                  <option value="completed">Completadas</option>
                </select>
              </label>
            </div>
            <div id="admin-history-list" class="admin-task-list"></div>
          </section>

          <section class="admin-management-card user-admin-section" id="admin-panel-users" role="tabpanel" aria-labelledby="admin-tab-users" tabindex="0" hidden>
            <div class="admin-management-heading">
              <div>
                <p class="eyebrow">Accesos y permisos</p>
                <h3 id="user-admin-title">Accesos y empleados</h3>
                <p class="section-copy">Aquí puedes consultar, crear, editar el nombre y el rol, y eliminar usuarios.</p>
              </div>
            </div>
            <div class="user-create-panel">
              <h4>Crear usuario</h4>
              <form id="user-form" class="user-create-form">
                <label>Número de empleado<input name="username" type="text" minlength="3" maxlength="24" pattern="[a-zA-Z0-9]{3,24}" autocomplete="off" required /></label>
                <label>Nombre del empleado<input name="employeeName" type="text" maxlength="80" autocomplete="name" required /></label>
                <label>PIN (6 números)<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required /></label>
                <label>Rol<select name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>
                <button class="primary-action" type="submit">Crear usuario</button>
              </form>
            </div>
            <div id="user-list" class="user-list"></div>
          </section>

          <section class="admin-management-card library-admin-section" id="admin-panel-library" role="tabpanel" aria-labelledby="admin-tab-library" tabindex="0" hidden>
            <div class="admin-management-heading">
              <div>
                <p class="eyebrow">Contenido de servicio</p>
                <h3>Agregar tutorial a la Biblioteca</h3>
                <p class="section-copy">Crea una guía con pasos, palabras clave e imagen. El tutorial aparecerá en Biblioteca para todo el equipo.</p>
              </div>
            </div>
            <form id="library-tutorial-form" class="library-tutorial-form">
              <div class="form-row">
                <label>
                  Categoría
                  <select name="category" required>
                    ${LIBRARY_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
                  </select>
                </label>
                <label>
                  Título
                  <input name="title" type="text" maxlength="90" required />
                </label>
              </div>
              <label>
                Resumen
                <textarea name="summary" rows="2" maxlength="280" required></textarea>
              </label>
              <label>
                Palabras clave
                <textarea name="keywords" rows="2" maxlength="500" placeholder="Separadas por coma o una por línea" required></textarea>
                <span class="form-help">Se utilizan para encontrar el tutorial en las búsquedas.</span>
              </label>
              <label>
                Pasos del tutorial
                <textarea name="steps" rows="6" maxlength="5000" placeholder="Escribe un paso por línea" required></textarea>
              </label>
              <div class="library-tutorial-image-field">
                <label>
                  Imagen del tutorial (JPG, PNG o WebP)
                  <input id="library-tutorial-image" name="image" type="file" accept="image/*" required />
                  <span class="form-help">La imagen se optimiza antes de guardarse en la Biblioteca.</span>
                </label>
                <div id="library-tutorial-image-preview" class="library-tutorial-image-preview" aria-live="polite">
                  <span>Vista previa de la imagen</span>
                </div>
              </div>
              <div class="dialog-actions">
                <button class="primary-action" type="submit">Guardar tutorial</button>
              </div>
            </form>
          </section>
        </section>

        <section id="calendar-section" class="planner-section" hidden>
          <div class="section-header">
            <div>
              <p class="eyebrow">Agenda</p>
              <h2>Listas por periodo</h2>
            </div>
            <p class="section-copy">Organiza la operación diaria y mantén un flujo ordenado.</p>
          </div>

          <div class="calendar-toolbar">
            <div class="calendar-navigation">
              <button class="calendar-nav-btn" type="button" data-month-shift="-1" aria-label="Mes anterior">‹</button>
              <button class="calendar-today-btn" type="button" data-calendar-today>Hoy</button>
              <button class="calendar-nav-btn" type="button" data-month-shift="1" aria-label="Mes siguiente">›</button>
              <h3 id="calendar-month" aria-live="polite"></h3>
            </div>
            <button class="primary-action" type="button" data-add-task data-admin-only>Añadir tarea</button>
          </div>

          <div class="calendar-weekdays" aria-hidden="true">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
          <div id="calendar-grid" class="calendar-grid" role="grid" aria-label="Calendario mensual"></div>

          <section class="selected-day-section" aria-live="polite">
            <div class="selected-day-heading">
              <div>
                <p class="eyebrow">Agenda del día</p>
                <h3 id="selected-date-title"></h3>
              </div>
              <span id="selected-task-count" class="selected-task-count"></span>
            </div>
            ${timeBandLegend}
            <div id="completion-groups" class="completion-groups" aria-label="Porcentaje de tareas completadas por grupo"></div>
            <div id="selected-task-list" class="task-list"></div>
          </section>
        </section>

        <dialog id="task-dialog" class="task-dialog">
          <form id="task-form" class="task-form">
            <div class="dialog-heading">
              <div>
                <p class="eyebrow">Calendario</p>
                <h2 id="task-dialog-title">Nueva tarea</h2>
              </div>
              <button class="dialog-close" type="button" data-close-dialog aria-label="Cerrar">×</button>
            </div>
            <label>
              Título
              <input name="title" type="text" maxlength="90" required />
            </label>
            <div class="form-row">
              <label>
                Fecha
                <input name="date" type="date" required />
              </label>
              <label>
                Hora
                <input name="time" type="time" required />
              </label>
            </div>
            <div class="form-row">
              <label>
                Periodicidad
                <select name="period">
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="eventual">Eventual (una vez)</option>
                </select>
              </label>
              <label>
                Estado
                <select name="status">
                  <option value="Pendiente">Pendiente</option>
                  <option value="En curso">En curso</option>
                </select>
              </label>
            </div>
            <label>
              Descripción
              <textarea name="description" rows="3" maxlength="280"></textarea>
            </label>
            <label>
              Pasos de la checklist
              <textarea name="checklist" rows="4" placeholder="Un paso por línea&#10;Ejemplo: Revisar materiales y utensilios" required></textarea>
              <span class="form-help">Añade los pasos necesarios. La tarea se completa al marcarlos todos.</span>
            </label>
            <div class="dialog-actions">
              <button class="calendar-today-btn" type="button" data-close-dialog>Cancelar</button>
              <button class="primary-action" type="submit">Guardar tarea</button>
            </div>
          </form>
        </dialog>

        <dialog id="checklist-dialog" class="task-dialog checklist-dialog">
          <div id="checklist-dialog-content"></div>
        </dialog>

        <dialog id="stock-dialog" class="task-dialog stock-dialog">
          <form id="stock-form" class="task-form stock-form">
            <div class="dialog-heading">
              <div>
                <p class="eyebrow">Inventario</p>
                <h2 id="stock-dialog-title">Nuevo producto</h2>
              </div>
              <button class="dialog-close" type="button" data-close-stock-dialog aria-label="Cerrar">×</button>
            </div>
            <label>
              Nombre del producto
              <input name="name" type="text" maxlength="80" required />
            </label>
            <div class="form-row">
              <label>
                Categoría
                <select name="category" required>
                  ${STOCK_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
                </select>
              </label>
              <label>
                Ubicación
                <input name="location" type="text" maxlength="80" placeholder="Ej.: Cámara de bebidas" />
              </label>
            </div>
            <div class="form-row stock-quantity-fields">
              <label>
                Cantidad disponible
                <input name="quantity" type="number" min="0" step="0.001" required />
              </label>
              <label>
                Unidad
                <select name="unit" required>
                  ${STOCK_UNITS.map((unit) => `<option value="${unit}">${STOCK_UNIT_LABELS[unit]}</option>`).join('')}
                </select>
              </label>
              <label>
                Stock mínimo
                <input name="minimumQuantity" type="number" min="0" step="0.001" required />
              </label>
            </div>
            <label class="stock-counted-field">
              <input name="counted" type="checkbox" />
              Recuento físico realizado
            </label>
            <div class="stock-photo-field">
              <label for="stock-photo">Foto del producto</label>
              <div id="stock-photo-preview" class="stock-photo-preview" aria-live="polite"></div>
              <input id="stock-photo" name="photo" type="file" accept="image/*" capture="environment" />
              <span class="form-help">Obligatoria para productos nuevos. El catálogo incluye imágenes ilustrativas predeterminadas.</span>
            </div>
            <div class="dialog-actions">
              <button class="calendar-today-btn" type="button" data-close-stock-dialog>Cancelar</button>
              <button class="primary-action" type="submit">Guardar producto</button>
            </div>
          </form>
        </dialog>

        <dialog id="stock-count-dialog" class="task-dialog stock-count-dialog">
          <form id="stock-count-form" class="task-form">
            <div class="dialog-heading">
              <div>
                <p class="eyebrow">Inventario físico</p>
                <h2>Realizar control de stock</h2>
                <p class="section-copy">Actualiza las existencias de todos los productos. Los cambios se guardarán juntos.</p>
              </div>
              <button class="dialog-close" type="button" data-close-stock-count aria-label="Cerrar">×</button>
            </div>
            <div id="stock-count-list" class="stock-count-list"></div>
            <div class="dialog-actions">
              <button class="calendar-today-btn" type="button" data-close-stock-count>Cancelar</button>
              <button class="primary-action" type="submit">Guardar control</button>
            </div>
          </form>
        </dialog>


      </main>
    </div>
  `
}
