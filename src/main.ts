import './style.css'
import {
  ACCOUNTS_STORAGE_KEY,
  INITIAL_ACCOUNTS,
  addAccount,
  authenticate,
  loadAccounts,
  removeAccount,
  saveAccounts,
  updateAccountRole,
  type AppAccount,
  type UserRole,
} from './auth'
import {
  TASKS_STORAGE_KEY,
  addTask,
  completionByPeriod,
  createChecklistSteps,
  createInitialTasks,
  createMonthGrid,
  dateKey,
  loadTasks,
  overdueTasks,
  parseTasksJson,
  parseDateKey,
  removeTask,
  saveTasks,
  tasksForDate,
  updateChecklistStep,
  updateTaskCompletion,
  updateTaskDetails,
  type CalendarTask,
  type Period,
} from './calendar'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
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
        <p class="demo-security-note">Modo local de demostración: las cuentas y permisos se guardan en este dispositivo y no ofrecen seguridad real ni sincronización.</p>
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
          <button class="nav-link" type="button" data-show-calendar>Calendario</button>
          <button class="nav-link" type="button" data-show-admin data-admin-only hidden>Administración</button>
        </nav>

        <div class="user-session">
          <span id="session-user"></span>
          <button class="logout-button" type="button" data-logout>Cerrar sesión</button>
        </div>
      </header>

      <main class="page">
        <p class="app-storage-note">CheckApp carga y guarda automáticamente tus tareas, códigos y roles en este dispositivo.</p>
        <p id="calendar-error" class="calendar-error" role="alert" hidden></p>
        <section id="daily-checklist-section" class="daily-checklist-section" aria-labelledby="daily-checklist-title">
          <div class="section-header">
            <div>
              <p class="eyebrow">Checklist de hoy</p>
              <h2 id="daily-checklist-title">Tareas del día</h2>
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
          <div id="deviation-panel" class="deviation-panel" hidden></div>
          <div id="daily-task-list" class="daily-task-list"></div>
        </section>

        <section id="task-admin-section" class="task-admin-section" aria-labelledby="task-admin-title" hidden>
          <div class="section-header">
            <div>
              <p class="eyebrow">Panel de control</p>
              <h2 id="task-admin-title">Administración de tareas</h2>
              <p class="section-copy">Crea, revisa y organiza las tareas guardadas en este dispositivo.</p>
            </div>
            <div class="admin-actions">
              <button class="calendar-today-btn" type="button" data-export-tasks>Exportar archivo</button>
              <button class="calendar-today-btn" type="button" data-import-tasks>Importar archivo</button>
              <input id="task-import-file" type="file" accept="application/json,.json" hidden />
              <button class="primary-action" type="button" data-add-task data-admin-only>Nueva tarea</button>
            </div>
          </div>
          <p class="admin-storage-note">Puedes descargar una copia JSON y restaurarla después o en otro dispositivo. Importar reemplaza las tareas actuales.</p>
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
              </select>
            </label>
            <label>
              Estado
              <select id="admin-status">
                <option value="">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="in-progress">En curso</option>
                <option value="completed">Completadas</option>
              </select>
            </label>
          </div>
          <div id="admin-task-list" class="admin-task-list"></div>
          <section class="user-admin-section" aria-labelledby="user-admin-title">
            <div class="section-header">
              <div>
                <p class="eyebrow">Accesos y permisos</p>
                <h3 id="user-admin-title">Usuarios del dispositivo</h3>
              </div>
              <p class="section-copy">Solo las cuentas asignadas como administrador verán este panel.</p>
            </div>
            <form id="user-form" class="user-create-form">
              <label>Usuario<input name="username" type="text" minlength="3" maxlength="24" pattern="[a-zA-Z0-9]{3,24}" autocomplete="off" required /></label>
              <label>PIN (6 números)<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required /></label>
              <label>Rol<select name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>
              <button class="primary-action" type="submit">Añadir usuario</button>
            </form>
            <div id="user-list" class="user-list"></div>
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

        <div id="task-notification" class="task-notification" role="status" aria-live="polite" hidden></div>

      </main>
    </div>
  `

  const loginScreen = document.querySelector<HTMLElement>('#login-screen')
  const loginForm = document.querySelector<HTMLFormElement>('#login-form')
  const loginError = document.querySelector<HTMLParagraphElement>('#login-error')
  const loginPin = document.querySelector<HTMLInputElement>('#login-pin')
  const pinDigits = document.querySelector<HTMLDivElement>('#pin-digits')
  const workspace = document.querySelector<HTMLDivElement>('#app-shell')
  const sessionUser = document.querySelector<HTMLSpanElement>('#session-user')
  const userForm = document.querySelector<HTMLFormElement>('#user-form')
  const userList = document.querySelector<HTMLDivElement>('#user-list')
  let accounts: AppAccount[] = []
  let currentUser: AppAccount | null = null
  let accountsReady = false

  const renderPinDigits = () => {
    if (!pinDigits || !loginPin) return
    pinDigits.querySelectorAll<HTMLElement>('[data-pin-digit]').forEach((digit, index) => {
      const value = loginPin.value[index]
      digit.textContent = value ? '•' : ''
      digit.classList.toggle('is-filled', Boolean(value))
    })
  }

  try {
    accounts = loadAccounts(window.localStorage, INITIAL_ACCOUNTS)
    if (window.localStorage.getItem(ACCOUNTS_STORAGE_KEY) === null) {
      saveAccounts(window.localStorage, accounts)
    }
    accountsReady = true
  } catch (error) {
    if (loginError) {
      loginError.textContent = error instanceof Error
        ? `No se pudieron cargar las cuentas: ${error.message}`
        : 'No se pudieron cargar las cuentas guardadas.'
      loginError.hidden = false
    }
  }

  const calendarGrid = document.querySelector<HTMLDivElement>('#calendar-grid')
  const dailyChecklistSection = document.querySelector<HTMLElement>('#daily-checklist-section')
  const adminSection = document.querySelector<HTMLElement>('#task-admin-section')
  const calendarSection = document.querySelector<HTMLElement>('#calendar-section')
  const adminTaskList = document.querySelector<HTMLDivElement>('#admin-task-list')
  const adminSearch = document.querySelector<HTMLInputElement>('#admin-search')
  const adminPeriod = document.querySelector<HTMLSelectElement>('#admin-period')
  const adminStatus = document.querySelector<HTMLSelectElement>('#admin-status')
  const importFile = document.querySelector<HTMLInputElement>('#task-import-file')
  const dailyTaskList = document.querySelector<HTMLDivElement>('#daily-task-list')
  const dailyProgressCount = document.querySelector<HTMLSpanElement>('#daily-progress-count')
  const dailyProgressPercent = document.querySelector<HTMLElement>('#daily-progress-percent')
  const dailyProgressTrack = document.querySelector<HTMLDivElement>('.daily-progress-track')
  const dailyProgressFill = document.querySelector<HTMLSpanElement>('#daily-progress-fill')
  const selectedTaskList = document.querySelector<HTMLDivElement>('#selected-task-list')
  const monthTitle = document.querySelector<HTMLHeadingElement>('#calendar-month')
  const selectedDateTitle = document.querySelector<HTMLHeadingElement>('#selected-date-title')
  const selectedTaskCount = document.querySelector<HTMLSpanElement>('#selected-task-count')
  const completionGroups = document.querySelector<HTMLDivElement>('#completion-groups')
  const calendarError = document.querySelector<HTMLParagraphElement>('#calendar-error')
  const dialog = document.querySelector<HTMLDialogElement>('#task-dialog')
  const form = document.querySelector<HTMLFormElement>('#task-form')
  const taskDialogTitle = document.querySelector<HTMLHeadingElement>('#task-dialog-title')
  const checklistDialog = document.querySelector<HTMLDialogElement>('#checklist-dialog')
  const checklistDialogContent = document.querySelector<HTMLDivElement>('#checklist-dialog-content')
  const deviationPanel = document.querySelector<HTMLDivElement>('#deviation-panel')
  const taskNotification = document.querySelector<HTMLDivElement>('#task-notification')
  const now = new Date()
  let visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  let selectedDate = dateKey(now)
  let tasks: CalendarTask[]
  let notificationTimeout: number | undefined
  let editingTaskId: number | null = null

  const showError = (message: string) => {
    if (!calendarError) return
    calendarError.textContent = message
    calendarError.hidden = false
  }

  const clearError = () => {
    if (!calendarError) return
    calendarError.textContent = ''
    calendarError.hidden = true
  }

  try {
    const seededTasks = createInitialTasks(now)
    tasks = loadTasks(window.localStorage, seededTasks)
    if (window.localStorage.getItem(TASKS_STORAGE_KEY) === null) {
      saveTasks(window.localStorage, tasks)
    }
  } catch (error) {
    tasks = createInitialTasks(now)
    showError(
      error instanceof Error
        ? `No se pudieron cargar o guardar las tareas: ${error.message}`
        : 'No se pudieron cargar las tareas guardadas.',
    )
  }

  const persistTasks = () => {
    try {
      saveTasks(window.localStorage, tasks)
      clearError()
      return true
    } catch (error) {
      showError(
        error instanceof Error
          ? `No se pudieron guardar los cambios: ${error.message}`
          : 'No se pudieron guardar los cambios en este dispositivo.',
      )
      return false
    }
  }

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }
      return entities[character]
    })

  const periodLabel = (period: Period) =>
    period === 'daily' ? 'Diaria' : period === 'weekly' ? 'Semanal' : 'Mensual'

  const isAdmin = () => currentUser?.role === 'admin'

  const persistAccounts = () => {
    try {
      saveAccounts(window.localStorage, accounts)
      accountsReady = true
      return true
    } catch (error) {
      showNotification(
        error instanceof Error ? `No se pudieron guardar los usuarios: ${error.message}` : 'No se pudieron guardar los usuarios.',
        'warning',
      )
      return false
    }
  }

  const renderUserList = () => {
    if (!userList || !isAdmin()) return
    userList.innerHTML = accounts.map((account) => `
      <article class="user-row">
        <div>
          <strong>${escapeHtml(account.username)}</strong>
          <span>${account.username === currentUser?.username ? 'Sesión actual' : 'Cuenta local'}</span>
        </div>
        <label>
          Rol
          <select data-user-role="${escapeHtml(account.username)}" aria-label="Rol de ${escapeHtml(account.username)}">
            <option value="user" ${account.role === 'user' ? 'selected' : ''}>Usuario</option>
            <option value="admin" ${account.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </label>
        ${account.username === currentUser?.username
          ? '<span class="user-current-label">Conectado</span>'
          : `<button type="button" class="admin-delete" data-remove-user="${escapeHtml(account.username)}">Eliminar</button>`}
      </article>
    `).join('')
  }

  const setActiveView = (view: 'tasks' | 'calendar' | 'admin') => {
    if (view === 'admin' && !isAdmin()) {
      showNotification('Solo un administrador puede acceder a esa sección.', 'warning')
      return
    }
    if (dailyChecklistSection) dailyChecklistSection.hidden = view !== 'tasks'
    if (calendarSection) calendarSection.hidden = view !== 'calendar'
    if (adminSection) adminSection.hidden = view !== 'admin'
    document.querySelectorAll<HTMLButtonElement>('.primary-nav .nav-link').forEach((button) => {
      const active = button.hasAttribute('data-show-daily-tasks') && view === 'tasks' ||
        button.hasAttribute('data-show-calendar') && view === 'calendar' ||
        button.hasAttribute('data-show-admin') && view === 'admin'
      button.classList.toggle('is-active', active)
      if (active) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const syncSessionUI = (showTasks = true) => {
    if (!workspace || !loginScreen || !currentUser) return
    workspace.hidden = false
    loginScreen.hidden = true
    if (sessionUser) {
      sessionUser.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuario'
    }
    document.querySelectorAll<HTMLElement>('[data-admin-only]').forEach((element) => {
      element.hidden = !isAdmin()
    })
    document.querySelectorAll<HTMLButtonElement>('[data-add-task]').forEach((button) => {
      button.hidden = !isAdmin()
    })
    renderCalendar()
    renderTaskAdmin()
    renderUserList()
    if (showTasks || !isAdmin()) setActiveView('tasks')
  }

  const showNotification = (message: string, kind: 'success' | 'warning' = 'success') => {
    if (!taskNotification) return
    taskNotification.textContent = message
    taskNotification.className = `task-notification ${kind}`
    taskNotification.hidden = false
    window.clearTimeout(notificationTimeout)
    notificationTimeout = window.setTimeout(() => {
      taskNotification.hidden = true
    }, 6000)

    if (kind === 'success' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('CheckApp · Tarea completada', { body: message })
    }
  }

  const notifyTaskCompleted = (task: CalendarTask) => {
    showNotification(`Tarea completada: ${task.title}`)
  }

  const renderDeviations = () => {
    if (!deviationPanel) return
    const lateTasks = overdueTasks(tasks, new Date())
    deviationPanel.hidden = lateTasks.length === 0
    deviationPanel.innerHTML = lateTasks.length
      ? `
        <div class="deviation-heading">
          <div>
            <p class="eyebrow">Revisión necesaria</p>
            <h3>${lateTasks.length} ${lateTasks.length === 1 ? 'tarea retrasada' : 'tareas retrasadas'}</h3>
            <p>Revisa cada checklist y confirma materiales, presentación y condiciones del servicio.</p>
          </div>
          <span class="deviation-indicator" aria-hidden="true">!</span>
        </div>
        <ul class="deviation-list">
          ${lateTasks
            .map(
              (task) => `
                <li>
                  <span><strong>${escapeHtml(task.title)}</strong><small>${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(parseDateKey(task.date))} · ${escapeHtml(task.time)}</small></span>
                  <button type="button" data-open-checklist="${task.id}">Revisar checklist</button>
                </li>
              `,
            )
            .join('')}
        </ul>
      `
      : ''
  }

  const renderTaskChecklist = (taskId: number) => {
    if (!checklistDialogContent) return
    const task = tasks.find((item) => item.id === taskId)
    if (!task) {
      showNotification('No se encontró la tarea para revisar.', 'warning')
      checklistDialog?.close()
      return
    }
    const completedSteps = task.checklist.filter((step) => step.completed).length
    const percentage = task.checklist.length
      ? Math.round((completedSteps / task.checklist.length) * 100)
      : 0
    checklistDialogContent.innerHTML = `
      <div class="task-form checklist-form">
        <div class="dialog-heading">
          <div>
            <p class="eyebrow">Guía paso a paso</p>
            <h2>${escapeHtml(task.title)}</h2>
            <p class="checklist-description">${escapeHtml(task.description)}</p>
          </div>
          <button class="dialog-close" type="button" data-close-checklist aria-label="Cerrar">×</button>
        </div>
        <div class="checklist-progress-copy">
          <span>${completedSteps} de ${task.checklist.length} pasos</span>
          <strong>${percentage}%</strong>
        </div>
        <div class="daily-progress-track" role="progressbar" aria-label="Pasos completados" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}">
          <span style="width: ${percentage}%"></span>
        </div>
        <ol class="guided-step-list">
          ${task.checklist
            .map(
              (step) => `
                <li class="${step.completed ? 'is-completed' : ''}">
                  <label>
                    <input type="checkbox" data-checklist-task="${task.id}" data-checklist-step="${step.id}" ${step.completed ? 'checked' : ''} ${task.completed ? 'disabled' : ''} />
                    <span class="guided-step-check" aria-hidden="true"></span>
                    <span>${escapeHtml(step.text)}</span>
                  </label>
                </li>
              `,
            )
            .join('')}
        </ol>
        <p class="checklist-completion-note" ${task.completed ? '' : 'hidden'}>Checklist finalizada. La tarea está marcada como completada.</p>
        <div class="dialog-actions">
          <button class="calendar-today-btn" type="button" data-close-checklist>Cerrar</button>
        </div>
      </div>
    `
  }

  const openTaskChecklist = (taskId: number) => {
    if (!checklistDialog) return
    renderTaskChecklist(taskId)
    if (!checklistDialog.open) checklistDialog.showModal()
  }

  const renderDailyChecklist = () => {
    if (!dailyTaskList || !dailyProgressCount || !dailyProgressPercent || !dailyProgressTrack || !dailyProgressFill) return

    const todayTasks = tasksForDate(tasks, dateKey(new Date()))
    const completedTasks = todayTasks.filter((task) => task.completed).length
    const percentage = todayTasks.length === 0 ? 0 : Math.round((completedTasks / todayTasks.length) * 100)
    dailyProgressCount.textContent = `${completedTasks} de ${todayTasks.length} tareas completadas`
    dailyProgressPercent.textContent = `${percentage}%`
    dailyProgressTrack.setAttribute('aria-valuenow', String(percentage))
    dailyProgressFill.style.width = `${percentage}%`
    renderDeviations()

    dailyTaskList.innerHTML = todayTasks.length
      ? `<div class="daily-task-table-wrap">
          <table class="daily-task-table">
            <thead>
              <tr>
                <th scope="col">Tarea</th>
                <th scope="col">Hora</th>
                <th scope="col">Grupo</th>
                <th scope="col">Guía</th>
                <th scope="col" class="daily-check-column">Check</th>
              </tr>
            </thead>
            <tbody>
              ${todayTasks
                .map(
                  (task) => `
                    <tr class="${task.completed ? 'is-completed' : ''}">
                      <td>
                        <span class="daily-task-title">${escapeHtml(task.title)}</span>
                        ${task.description ? `<span class="daily-task-description">${escapeHtml(task.description)}</span>` : ''}
                      </td>
                      <td class="daily-task-time">${escapeHtml(task.time)}</td>
                      <td><span class="label ${task.period}">${periodLabel(task.period)}</span></td>
                      <td><button type="button" class="guide-task-btn" data-open-checklist="${task.id}">Checklist</button></td>
                      <td class="daily-check-column">
                        <label class="daily-task-check-cell">
                          <input type="checkbox" data-daily-task="${task.id}" ${task.completed ? 'checked' : ''} aria-label="${task.completed ? 'Desmarcar' : 'Completar'} ${escapeHtml(task.title)}" />
                          <span class="daily-task-checkmark" aria-hidden="true"></span>
                        </label>
                      </td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : `<div class="daily-checklist-empty">
          <span class="empty-day-icon">✦</span>
          <h3>No hay tareas para hoy</h3>
          <p>Añade una tarea para empezar a organizar tu jornada.</p>
          <button type="button" data-add-task data-admin-only>Añadir tarea</button>
        </div>`
  }

  const renderTaskAdmin = () => {
    if (!adminTaskList) return
    if (!isAdmin()) {
      adminTaskList.replaceChildren()
      return
    }
    const query = adminSearch?.value.trim().toLocaleLowerCase('es') ?? ''
    const period = adminPeriod?.value ?? ''
    const status = adminStatus?.value ?? ''
    const filteredTasks = [...tasks]
      .filter((task) => !period || task.period === period)
      .filter((task) => !status ||
        (status === 'completed' ? task.completed : status === 'pending' ? task.status === 'Pendiente' : task.status === 'En curso'))
      .filter((task) => !query || `${task.title} ${task.description}`.toLocaleLowerCase('es').includes(query))
      .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))
    adminTaskList.innerHTML = filteredTasks.length
      ? `<div class="admin-table-wrap">
          <table class="admin-task-table">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Tarea</th><th>Periodo</th><th>Estado</th><th>Pasos</th><th>Realizada por</th><th>Acciones</th></tr></thead>
            <tbody>
              ${filteredTasks.map((task) => `
                <tr>
                  <td data-label="Fecha">${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(parseDateKey(task.date))}</td>
                  <td data-label="Hora">${escapeHtml(task.time)}</td>
                  <td data-label="Tarea"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description || 'Sin descripción')}</small></td>
                  <td data-label="Periodo"><span class="label ${task.period}">${periodLabel(task.period)}</span></td>
                  <td data-label="Estado">${escapeHtml(task.status)}</td>
                  <td data-label="Pasos">${task.checklist.filter((step) => step.completed).length}/${task.checklist.length}</td>
                  <td data-label="Realizada por">${task.completed ? escapeHtml(task.completedBy ?? 'Sin registro previo') : 'Pendiente'}</td>
                  <td data-label="Acciones" class="admin-row-actions">
                    ${task.completed ? '<span class="admin-locked">Finalizada</span>' : `<button type="button" data-edit-task="${task.id}">Editar</button>`}
                    <button type="button" class="admin-delete" data-admin-delete="${task.id}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`
      : '<p class="admin-empty">No hay tareas que coincidan con los filtros.</p>'
  }

  const renderSelectedTasks = () => {
    if (!selectedTaskList || !selectedDateTitle || !selectedTaskCount || !completionGroups) return

    const date = parseDateKey(selectedDate)
    selectedDateTitle.textContent = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
    const dayTasks = tasksForDate(tasks, selectedDate)
    selectedTaskCount.textContent = `${dayTasks.length} ${dayTasks.length === 1 ? 'tarea' : 'tareas'}`
    completionGroups.innerHTML = completionByPeriod(dayTasks)
      .map(
        (group) => `
          <article class="completion-card">
            <div class="completion-card-heading">
              <span>${periodLabel(group.period)}</span>
              <strong>${group.percentage}%</strong>
            </div>
            <div
              class="completion-track"
              role="progressbar"
              aria-label="Completado ${periodLabel(group.period)}"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="${group.percentage}"
            >
              <span style="width: ${group.percentage}%"></span>
            </div>
            <small>${group.completed} de ${group.total} completadas</small>
          </article>
        `,
      )
      .join('')

    selectedTaskList.innerHTML = dayTasks.length
      ? dayTasks
          .map(
            (task) => `
              <article class="task-card ${task.completed ? 'is-completed' : ''}">
                <div class="task-head">
                  <span class="label ${task.period}">${periodLabel(task.period)}</span>
                  <span class="status ${task.status.toLowerCase().replace(/\s+/g, '-')}">${task.status}</span>
                </div>
                <button class="guide-task-btn" type="button" data-open-checklist="${task.id}">Abrir checklist · ${task.checklist.filter((step) => step.completed).length}/${task.checklist.length}</button>
                <label class="task-check">
                  <input type="checkbox" data-toggle-completion="${task.id}" ${task.completed ? 'checked' : ''} aria-label="Marcar ${escapeHtml(task.title)} como completada" />
                  <span class="task-checkmark" aria-hidden="true"></span>
                  <span class="task-title">${escapeHtml(task.title)}</span>
                </label>
                <p>${escapeHtml(task.description)}</p>
                <div class="task-foot">
                  <span>${escapeHtml(task.time)}</span>
                  ${isAdmin() ? `<button class="delete-task-btn" type="button" data-delete-task="${task.id}" aria-label="Eliminar ${escapeHtml(task.title)}">Eliminar</button>` : ''}
                </div>
              </article>
            `,
          )
          .join('')
      : `<div class="empty-day"><span class="empty-day-icon">✦</span><p>No hay tareas para este día.</p>${isAdmin() ? '<button type="button" data-add-task>Añadir una tarea</button>' : ''}</div>`
  }

  const renderCalendar = () => {
    if (!calendarGrid || !monthTitle) return
    monthTitle.textContent = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(visibleMonth)

    const todayKey = dateKey(new Date())
    calendarGrid.innerHTML = createMonthGrid(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
    )
      .map((day) => {
        const events = tasksForDate(tasks, day.dateKey)
        const eventPreview = events
          .slice(0, 2)
          .map(
            (task) =>
              `<span class="calendar-event ${task.period}">${escapeHtml(task.time)} · ${escapeHtml(task.title)}</span>`,
          )
          .join('')
        const more = events.length > 2 ? `<span class="calendar-more">+${events.length - 2} más</span>` : ''
        const classes = [
          'calendar-day',
          day.isCurrentMonth ? '' : 'outside-month',
          day.dateKey === selectedDate ? 'selected' : '',
          day.dateKey === todayKey ? 'today' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return `
          <button class="${classes}" type="button" role="gridcell" data-date="${day.dateKey}" aria-pressed="${day.dateKey === selectedDate}" aria-label="${new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(day.date)}${events.length ? `, ${events.length} tareas` : ''}">
            <span class="day-number">${day.date.getDate()}</span>
            <span class="calendar-events">${eventPreview}${more}</span>
          </button>
        `
      })
      .join('')
    renderSelectedTasks()
    renderDailyChecklist()
    renderTaskAdmin()
    document.querySelectorAll<HTMLElement>('[data-admin-only]').forEach((element) => {
      element.hidden = !isAdmin()
    })
  }

  const openTaskDialog = (taskId?: number) => {
    if (!isAdmin()) {
      showNotification('Solo un administrador puede gestionar las tareas.', 'warning')
      return
    }
    if (!dialog || !form) return
    form.reset()
    editingTaskId = taskId ?? null
    const task = taskId === undefined ? undefined : tasks.find((item) => item.id === taskId)
    if (taskId !== undefined && (!task || task.completed)) {
      showNotification(task ? 'Las tareas completadas no se pueden editar.' : 'No se encontró la tarea.', 'warning')
      editingTaskId = null
      return
    }
    if (task) {
      ;(form.elements.namedItem('title') as HTMLInputElement).value = task.title
      ;(form.elements.namedItem('date') as HTMLInputElement).value = task.date
      ;(form.elements.namedItem('time') as HTMLInputElement).value = task.time
      ;(form.elements.namedItem('period') as HTMLSelectElement).value = task.period
      ;(form.elements.namedItem('status') as HTMLSelectElement).value = task.status
      ;(form.elements.namedItem('description') as HTMLTextAreaElement).value = task.description
      ;(form.elements.namedItem('checklist') as HTMLTextAreaElement).value = task.checklist.map((step) => step.text).join('\n')
    }
    if (taskDialogTitle) taskDialogTitle.textContent = task ? 'Editar tarea' : 'Nueva tarea'
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitButton) submitButton.textContent = task ? 'Guardar cambios' : 'Guardar tarea'
    const dateInput = form.elements.namedItem('date')
    if (!task && dateInput instanceof HTMLInputElement) dateInput.value = selectedDate
    dialog.showModal()
  }

  document.querySelectorAll<HTMLButtonElement>('[data-month-shift]').forEach((button) => {
    button.addEventListener('click', () => {
      const shift = Number(button.dataset.monthShift)
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + shift, 1)
      selectedDate = dateKey(visibleMonth)
      renderCalendar()
    })
  })

  document.querySelector<HTMLButtonElement>('[data-calendar-today]')?.addEventListener('click', () => {
    const today = new Date()
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    selectedDate = dateKey(today)
    renderCalendar()
  })

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!accountsReady || !loginForm) return
    const data = new FormData(loginForm)
    const authenticated = authenticate(accounts, String(data.get('pin')))
    if (!authenticated) {
      if (loginError) {
        loginError.textContent = 'Código incorrecto. Comprueba los seis dígitos.'
        loginError.hidden = false
      }
      const pinField = loginForm.elements.namedItem('pin')
      if (pinField instanceof HTMLInputElement) {
        pinField.value = ''
        renderPinDigits()
        pinField.focus()
      }
      return
    }
    currentUser = authenticated
    if (loginError) loginError.hidden = true
    loginForm.reset()
    syncSessionUI()
  })

  loginPin?.addEventListener('input', () => {
    loginPin.value = loginPin.value.replace(/\D/g, '').slice(0, 6)
    renderPinDigits()
    if (loginError) loginError.hidden = true
    if (loginPin.value.length === 6) loginForm?.requestSubmit()
  })

  document.querySelector<HTMLDivElement>('.pin-keypad')?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element) || !loginPin) return
    if (target.closest('[data-pin-delete]')) {
      loginPin.value = loginPin.value.slice(0, -1)
    } else {
      const key = target.closest<HTMLButtonElement>('[data-pin-key]')
      if (!key?.dataset.pinKey || loginPin.value.length >= 6) return
      loginPin.value += key.dataset.pinKey
    }
    renderPinDigits()
    if (loginError) loginError.hidden = true
    if (loginPin.value.length === 6) loginForm?.requestSubmit()
  })

  document.querySelector<HTMLButtonElement>('[data-logout]')?.addEventListener('click', () => {
    currentUser = null
    if (workspace) workspace.hidden = true
    if (loginScreen) loginScreen.hidden = false
    if (loginForm) loginForm.reset()
    if (loginError) loginError.hidden = true
    renderPinDigits()
    dialog?.close()
    checklistDialog?.close()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  userForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!isAdmin() || !userForm) return
    const data = new FormData(userForm)
    const previousAccounts = accounts
    try {
      accounts = addAccount(
        accounts,
        String(data.get('username')),
        String(data.get('pin')),
        String(data.get('role')) as UserRole,
      )
      if (!persistAccounts()) {
        accounts = previousAccounts
        return
      }
      userForm.reset()
      renderUserList()
      showNotification('Usuario añadido.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo añadir el usuario.', 'warning')
    }
  })

  userList?.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLSelectElement) || !target.dataset.userRole || !isAdmin()) return
    const previousAccounts = accounts
    try {
      accounts = updateAccountRole(accounts, target.dataset.userRole, target.value as UserRole)
      if (!persistAccounts()) {
        accounts = previousAccounts
        renderUserList()
        return
      }
      if (currentUser) {
        currentUser = accounts.find((account) => account.username === currentUser?.username) ?? null
      }
      renderUserList()
      syncSessionUI(false)
      showNotification('Rol de usuario actualizado.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo cambiar el rol.', 'warning')
      renderUserList()
    }
  })

  userList?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element) || !isAdmin()) return
    const button = target.closest<HTMLButtonElement>('[data-remove-user]')
    const username = button?.dataset.removeUser
    if (!username || !window.confirm(`¿Eliminar la cuenta "${username}" de este dispositivo?`)) return
    const previousAccounts = accounts
    try {
      accounts = removeAccount(accounts, username)
      if (!persistAccounts()) {
        accounts = previousAccounts
        return
      }
      renderUserList()
      showNotification(`Se eliminó el usuario ${username}.`)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo eliminar el usuario.', 'warning')
    }
  })

  dailyTaskList?.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.dailyTask) return
    const taskId = Number(target.dataset.dailyTask)
    const wasCompleted = tasks.find((task) => task.id === taskId)?.completed ?? false
    try {
      tasks = updateTaskCompletion(tasks, taskId, target.checked, currentUser?.username)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la tarea.', 'warning')
      renderDailyChecklist()
      return
    }
    persistTasks()
    renderCalendar()
    const completedTask = tasks.find((task) => task.id === taskId)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  dailyTaskList?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element) || !target.closest('[data-add-task]')) return
    openTaskDialog()
  })

  calendarGrid?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const dayButton = target.closest<HTMLButtonElement>('[data-date]')
    if (!dayButton?.dataset.date) return
    selectedDate = dayButton.dataset.date
    const date = parseDateKey(selectedDate)
    visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    renderCalendar()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-add-task]').forEach((button) => {
    button.addEventListener('click', () => openTaskDialog())
  })

  document.querySelector<HTMLButtonElement>('[data-show-daily-tasks]')?.addEventListener('click', () => setActiveView('tasks'))
  document.querySelector<HTMLButtonElement>('[data-show-calendar]')?.addEventListener('click', () => setActiveView('calendar'))
  document.querySelector<HTMLButtonElement>('[data-show-admin]')?.addEventListener('click', () => setActiveView('admin'))

  document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => dialog?.close())
  })

  document.querySelector<HTMLButtonElement>('[data-enable-notifications]')?.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') {
      showNotification('Este navegador no permite notificaciones del sistema.', 'warning')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      showNotification(
        permission === 'granted'
          ? 'Avisos del navegador activados.'
          : 'Los avisos del navegador no se activaron; seguirás viendo avisos dentro de la app.',
        permission === 'granted' ? 'success' : 'warning',
      )
    } catch (error) {
      showNotification(
        error instanceof Error
          ? `No se pudieron activar los avisos del navegador: ${error.message}`
          : 'No se pudieron activar los avisos del navegador.',
        'warning',
      )
    }
  })

  adminSearch?.addEventListener('input', renderTaskAdmin)
  adminPeriod?.addEventListener('change', renderTaskAdmin)
  adminStatus?.addEventListener('change', renderTaskAdmin)

  adminTaskList?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const editButton = target.closest<HTMLButtonElement>('[data-edit-task]')
    const deleteButton = target.closest<HTMLButtonElement>('[data-admin-delete]')
    if (editButton?.dataset.editTask) {
      if (!isAdmin()) return
      openTaskDialog(Number(editButton.dataset.editTask))
    } else if (deleteButton?.dataset.adminDelete) {
      if (!isAdmin()) return
      const taskId = Number(deleteButton.dataset.adminDelete)
      const task = tasks.find((item) => item.id === taskId)
      if (!task || !window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return
      tasks = removeTask(tasks, taskId)
      persistTasks()
      renderCalendar()
      showNotification('Tarea eliminada.')
    }
  })

  document.querySelector<HTMLButtonElement>('[data-export-tasks]')?.addEventListener('click', () => {
    if (!isAdmin()) return
    try {
      const content = JSON.stringify(tasks, null, 2)
      const file = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `andy-app-tareas-${dateKey(new Date())}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      showNotification('Copia de tareas descargada.')
    } catch (error) {
      showNotification(
        error instanceof Error ? `No se pudo exportar el archivo: ${error.message}` : 'No se pudo exportar el archivo.',
        'warning',
      )
    }
  })

  document.querySelector<HTMLButtonElement>('[data-import-tasks]')?.addEventListener('click', () => {
    if (isAdmin()) importFile?.click()
  })
  importFile?.addEventListener('change', async () => {
    if (!isAdmin()) return
    const file = importFile.files?.[0]
    if (!file) return
    try {
      const importedTasks = parseTasksJson(await file.text())
      if (!window.confirm(`El archivo contiene ${importedTasks.length} tareas. Reemplazará todas las tareas actuales. ¿Continuar?`)) return
      const previousTasks = tasks
      tasks = importedTasks
      if (!persistTasks()) {
        tasks = previousTasks
        return
      }
      renderCalendar()
      showNotification(`Se importaron ${tasks.length} tareas.`)
    } catch (error) {
      showNotification(
        error instanceof Error ? `No se pudo importar el archivo: ${error.message}` : 'No se pudo importar el archivo.',
        'warning',
      )
    } finally {
      importFile.value = ''
    }
  })

  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!isAdmin()) {
      showNotification('Solo un administrador puede gestionar las tareas.', 'warning')
      return
    }
    if (!form.reportValidity()) return
    const data = new FormData(form)
    const date = String(data.get('date'))
    parseDateKey(date)
    const newTask = {
      date,
      period: String(data.get('period')) as Period,
      title: String(data.get('title')).trim(),
      time: String(data.get('time')),
      status: String(data.get('status')) as CalendarTask['status'],
      completed: false,
      description: String(data.get('description')).trim(),
      checklist: createChecklistSteps(String(data.get('checklist'))),
    }

    if (!newTask.title) return
    if (newTask.checklist.length === 0) {
      showNotification('Añade al menos un paso a la checklist.', 'warning')
      return
    }
    if (editingTaskId === null) {
      tasks = addTask(tasks, newTask)
    } else {
      try {
        tasks = updateTaskDetails(tasks, editingTaskId, newTask)
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.', 'warning')
        return
      }
    }
    persistTasks()
    selectedDate = date
    const selected = parseDateKey(date)
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1)
    form.reset()
    dialog?.close()
    editingTaskId = null
    renderCalendar()
  })

  dialog?.addEventListener('close', () => {
    editingTaskId = null
    if (taskDialogTitle) taskDialogTitle.textContent = 'Nueva tarea'
    const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitButton) submitButton.textContent = 'Guardar tarea'
  })

  selectedTaskList?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const deleteButton = target.closest<HTMLButtonElement>('[data-delete-task]')
    const checklistButton = target.closest<HTMLButtonElement>('[data-open-checklist]')

    if (checklistButton?.dataset.openChecklist) {
      openTaskChecklist(Number(checklistButton.dataset.openChecklist))
    } else if (deleteButton?.dataset.deleteTask) {
      if (!isAdmin()) return
      tasks = removeTask(tasks, Number(deleteButton.dataset.deleteTask))
      persistTasks()
      renderCalendar()
    } else if (target.closest('[data-add-task]')) {
      openTaskDialog()
    }
  })

  selectedTaskList?.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.toggleCompletion) return
    const taskId = Number(target.dataset.toggleCompletion)
    const wasCompleted = tasks.find((task) => task.id === taskId)?.completed ?? false
    try {
      tasks = updateTaskCompletion(tasks, taskId, target.checked, currentUser?.username)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la tarea.', 'warning')
      renderCalendar()
      return
    }
    persistTasks()
    renderCalendar()
    const completedTask = tasks.find((task) => task.id === taskId)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  checklistDialogContent?.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.checklistTask || !target.dataset.checklistStep) return
    const taskId = Number(target.dataset.checklistTask)
    const wasCompleted = tasks.find((task) => task.id === taskId)?.completed ?? false
    try {
      tasks = updateChecklistStep(
        tasks,
        taskId,
        Number(target.dataset.checklistStep),
        target.checked,
        currentUser?.username,
      )
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo guardar el paso.', 'warning')
      return
    }
    persistTasks()
    renderCalendar()
    renderTaskChecklist(taskId)
    const completedTask = tasks.find((task) => task.id === taskId)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  checklistDialogContent?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-close-checklist]')) {
      checklistDialog?.close()
    } else {
      const button = target.closest<HTMLButtonElement>('[data-open-checklist]')
      if (button?.dataset.openChecklist) openTaskChecklist(Number(button.dataset.openChecklist))
    }
  })

  deviationPanel?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('[data-open-checklist]')
    if (button?.dataset.openChecklist) openTaskChecklist(Number(button.dataset.openChecklist))
  })

  window.setInterval(renderDailyChecklist, 60_000)

  renderCalendar()
}
