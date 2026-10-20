import './style.css'
import { renderAppShell } from './app-shell'
import { renderLibraryView, renderStockView } from './catalog-views'
import { escapeHtml } from './html'
import {
  ACCOUNTS_STORAGE_KEY,
  parseAccountsJson,
  type UserRole,
} from './auth'
import {
  TASKS_STORAGE_KEY,
  completionByPeriod,
  createChecklistSteps,
  createMonthGrid,
  dateKey,
  overdueTasks,
  parseTasksJson,
  parseDateKey,
  tasksForDate,
  type CalendarTask,
  type Period,
} from './calendar'
import {
  STOCK_CATEGORIES,
  STOCK_CATEGORY_IMAGE,
  STOCK_STORAGE_KEY,
  STOCK_UNITS,
  parseStockJson,
  type StockCategory,
  type StockProduct,
  type StockProductInput,
} from './stock'
import { apiRequest, type BootstrapData, type PublicAccount, type SessionUser } from './api'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = renderAppShell()

  const loginScreen = document.querySelector<HTMLElement>('#login-screen')
  const loginForm = document.querySelector<HTMLFormElement>('#login-form')
  const loginError = document.querySelector<HTMLParagraphElement>('#login-error')
  const loginPin = document.querySelector<HTMLInputElement>('#login-pin')
  const pinDigits = document.querySelector<HTMLDivElement>('#pin-digits')
  const workspace = document.querySelector<HTMLDivElement>('#app-shell')
  const sessionUser = document.querySelector<HTMLSpanElement>('#session-user')
  const userForm = document.querySelector<HTMLFormElement>('#user-form')
  const userList = document.querySelector<HTMLDivElement>('#user-list')
  let accounts: PublicAccount[] = []
  let currentUser: SessionUser | null = null

  const renderPinDigits = () => {
    if (!pinDigits || !loginPin) return
    pinDigits.querySelectorAll<HTMLElement>('[data-pin-digit]').forEach((digit, index) => {
      const value = loginPin.value[index]
      digit.textContent = value ? '•' : ''
      digit.classList.toggle('is-filled', Boolean(value))
    })
  }

  const calendarGrid = document.querySelector<HTMLDivElement>('#calendar-grid')
  const dailyChecklistSection = document.querySelector<HTMLElement>('#daily-checklist-section')
  const adminSection = document.querySelector<HTMLElement>('#task-admin-section')
  const calendarSection = document.querySelector<HTMLElement>('#calendar-section')
  const librarySection = document.querySelector<HTMLElement>('#library-section')
  const librarySearch = document.querySelector<HTMLInputElement>('#library-search')
  const libraryCategory = document.querySelector<HTMLSelectElement>('#library-category')
  const libraryResultCount = document.querySelector<HTMLParagraphElement>('#library-result-count')
  const libraryArticles = document.querySelector<HTMLDivElement>('#library-articles')
  const stockSection = document.querySelector<HTMLElement>('#stock-section')
  const stockSearch = document.querySelector<HTMLInputElement>('#stock-search')
  const stockCategory = document.querySelector<HTMLSelectElement>('#stock-category')
  const stockStatusFilter = document.querySelector<HTMLSelectElement>('#stock-status-filter')
  const stockList = document.querySelector<HTMLDivElement>('#stock-list')
  const stockResultCount = document.querySelector<HTMLParagraphElement>('#stock-result-count')
  const stockUncountedCount = document.querySelector<HTMLElement>('#stock-uncounted-count')
  const stockLowCount = document.querySelector<HTMLElement>('#stock-low-count')
  const stockOutCount = document.querySelector<HTMLElement>('#stock-out-count')
  const stockInitialNote = document.querySelector<HTMLParagraphElement>('#stock-initial-note')
  const stockDialog = document.querySelector<HTMLDialogElement>('#stock-dialog')
  const stockForm = document.querySelector<HTMLFormElement>('#stock-form')
  const stockDialogTitle = document.querySelector<HTMLHeadingElement>('#stock-dialog-title')
  const stockPhotoInput = document.querySelector<HTMLInputElement>('#stock-photo')
  const stockPhotoPreview = document.querySelector<HTMLDivElement>('#stock-photo-preview')
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
  let tasks: CalendarTask[] = []
  let taskOccurrences: CalendarTask[] = []
  let taskHistory: CalendarTask[] = []
  let stock: StockProduct[] = []
  let libraryData: BootstrapData['library'] = []
  let notificationTimeout: number | undefined
  let occurrenceLoadId = 0
  let editingTaskId: number | null = null
  let editingStockId: number | null = null
  let pendingStockPhoto: string | undefined

  const periodLabel = (period: Period) =>
    period === 'daily' ? 'Diaria' :
      period === 'weekly' ? 'Semanal' :
        period === 'monthly' ? 'Mensual' : 'Eventual'

  const isOccurrenceOverdue = (task: CalendarTask, now = new Date()) => {
    if (task.completed) return false
    const dueDate = parseDateKey(task.date)
    const [hours, minutes] = task.time.split(':').map(Number)
    dueDate.setHours(hours, minutes, 0, 0)
    return dueDate < now
  }

  const mergeOccurrences = (...groups: CalendarTask[][]) => {
    const merged = new Map<string, CalendarTask>()
    for (const occurrence of groups.flat()) {
      merged.set(`${occurrence.id}:${occurrence.date}`, occurrence)
    }
    return [...merged.values()].sort((first, second) =>
      first.date.localeCompare(second.date) || first.time.localeCompare(second.time) || first.id - second.id,
    )
  }

  const currentCalendarRange = () => {
    const days = createMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth())
    return { from: days[0].dateKey, to: days[days.length - 1].dateKey }
  }

  const isAdmin = () => currentUser?.role === 'admin'

  const renderUserList = () => {
    if (!userList || !isAdmin()) return
    userList.innerHTML = accounts.map((account) => `
      <article class="user-row">
        <div>
          <strong>${escapeHtml(account.employeeName)}</strong>
          <span>Número: ${escapeHtml(account.username)}${account.username === currentUser?.username ? ' · Sesión actual' : ''}</span>
        </div>
        <label>
          Nombre del empleado
          <input data-employee-name="${escapeHtml(account.username)}" type="text" maxlength="80" value="${escapeHtml(account.employeeName)}" aria-label="Nombre del empleado ${escapeHtml(account.username)}" required />
        </label>
        <button class="calendar-today-btn" type="button" data-save-employee-name="${escapeHtml(account.username)}">Guardar nombre</button>
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

  const setActiveView = (view: 'tasks' | 'calendar' | 'library' | 'stock' | 'admin') => {
    if ((view === 'admin' || view === 'stock' || view === 'calendar') && !isAdmin()) {
      showNotification('Solo un administrador puede acceder a esa sección.', 'warning')
      return
    }
    if (dailyChecklistSection) dailyChecklistSection.hidden = view !== 'tasks'
    if (calendarSection) calendarSection.hidden = view !== 'calendar'
    if (librarySection) librarySection.hidden = view !== 'library'
    if (stockSection) stockSection.hidden = view !== 'stock'
    if (adminSection) adminSection.hidden = view !== 'admin'
    document.querySelectorAll<HTMLButtonElement>('.primary-nav .nav-link').forEach((button) => {
      const active = button.hasAttribute('data-show-daily-tasks') && view === 'tasks' ||
        button.hasAttribute('data-show-calendar') && view === 'calendar' ||
        button.hasAttribute('data-show-library') && view === 'library' ||
        button.hasAttribute('data-show-stock') && view === 'stock' ||
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
      sessionUser.textContent = `${currentUser.employeeName} · ${currentUser.role === 'admin' ? 'Administrador' : 'Usuario'}`
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
    renderStock()
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

  const renderLibrary = () => renderLibraryView(libraryData, {
    articles: libraryArticles,
    search: librarySearch,
    category: libraryCategory,
    resultCount: libraryResultCount,
  })

  const renderStock = () => renderStockView(stock, isAdmin(), {
    list: stockList,
    search: stockSearch,
    category: stockCategory,
    statusFilter: stockStatusFilter,
    resultCount: stockResultCount,
    uncountedCount: stockUncountedCount,
    lowCount: stockLowCount,
    outCount: stockOutCount,
    initialNote: stockInitialNote,
  })

  const loadDatabaseData = async (showTasks = true) => {
    const data = await apiRequest<BootstrapData>('/bootstrap')
    currentUser = data.user
    tasks = data.tasks
    libraryData = data.library
    stock = data.stock ?? []
    accounts = data.accounts ?? []
    await loadTaskOccurrences()
    renderLibrary()
    syncSessionUI(showTasks)
    if (!isAdmin()) setActiveView('tasks')
  }

  const loadTaskOccurrences = async () => {
    const loadId = ++occurrenceLoadId
    const { from, to } = currentCalendarRange()
    const today = dateKey(new Date())
    const [calendarResponse, todayResponse, historyResponse] = await Promise.all([
      apiRequest<{ tasks: CalendarTask[] }>(`/tasks/occurrences?from=${from}&to=${to}`),
      today >= from && today <= to
        ? Promise.resolve({ tasks: [] as CalendarTask[] })
        : apiRequest<{ tasks: CalendarTask[] }>(`/tasks/occurrences?from=${today}&to=${today}`),
      isAdmin()
        ? apiRequest<{ tasks: CalendarTask[] }>('/tasks/history')
        : Promise.resolve({ tasks: [] as CalendarTask[] }),
    ])
    if (loadId !== occurrenceLoadId) return
    taskHistory = historyResponse.tasks
    taskOccurrences = mergeOccurrences(calendarResponse.tasks, todayResponse.tasks, taskHistory)
    renderDailyChecklist()
    renderCalendar()
    renderTaskAdmin()
  }

  const migrateLocalData = async () => {
    if (!isAdmin()) return
    const status = await apiRequest<{ pending: boolean }>('/migration/status')
    if (!status.pending) return
    const localAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    const localTasks = window.localStorage.getItem(TASKS_STORAGE_KEY)
    const localStock = window.localStorage.getItem(STOCK_STORAGE_KEY)
    if (!localAccounts && !localTasks && !localStock) return
    const imported: { accounts?: ReturnType<typeof parseAccountsJson>; tasks?: CalendarTask[]; stock?: StockProduct[] } = {}
    const sections: string[] = []
    if (localAccounts) {
      imported.accounts = parseAccountsJson(localAccounts)
      sections.push('cuentas')
    }
    if (localTasks) {
      imported.tasks = parseTasksJson(localTasks)
      sections.push('tareas')
    }
    if (localStock) {
      imported.stock = parseStockJson(localStock)
      sections.push('stock')
    }

    const confirmed = window.confirm(
      `Se encontraron ${sections.join(', ')} guardados en este navegador. ¿Quieres importarlos a SQLite? Las secciones seleccionadas reemplazarán los datos compartidos equivalentes para todos los dispositivos.`,
    )
    if (!confirmed) return

    await apiRequest('/migration/local', 'POST', imported)
    if (localAccounts) window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
    if (localTasks) window.localStorage.removeItem(TASKS_STORAGE_KEY)
    if (localStock) window.localStorage.removeItem(STOCK_STORAGE_KEY)
    showNotification(`Se migraron ${sections.join(', ')} a la base de datos compartida.`)
  }

  const setStockPhotoPreview = (
    photo?: string,
    category: StockCategory = 'Otros',
    defaultImage = STOCK_CATEGORY_IMAGE[category],
  ) => {
    if (!stockPhotoPreview) return
    stockPhotoPreview.innerHTML = photo
      ? `<img src="${escapeHtml(photo)}" alt="Vista previa de la foto del producto" />`
      : `<img src="/${escapeHtml(defaultImage)}" alt="" /><small>Imagen ilustrativa</small>`
  }

  const readStockPhoto = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.')
    if (file.size > 8 * 1024 * 1024) throw new Error('La foto original no puede superar 8 MB.')

    const bitmap = await createImageBitmap(file)
    if (bitmap.width * bitmap.height > 40_000_000) {
      bitmap.close()
      throw new Error('La resolución de la imagen es demasiado grande.')
    }
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      throw new Error('No se pudo preparar la foto en este navegador.')
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('No se pudo optimizar la foto seleccionada.'))
      }, 'image/jpeg', 0.76)
    })
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('No se pudo leer la foto optimizada.'))
      }, { once: true })
      reader.addEventListener('error', () => reject(new Error('No se pudo leer la foto seleccionada.')), { once: true })
      reader.readAsDataURL(blob)
    })
  }

  const openStockDialog = (productId?: number) => {
    if (!isAdmin()) {
      showNotification('Solo un administrador puede gestionar el stock.', 'warning')
      return
    }
    if (!stockDialog || !stockForm) return

    stockForm.reset()
    editingStockId = productId ?? null
    const product = productId === undefined ? undefined : stock.find((item) => item.id === productId)
    if (productId !== undefined && !product) {
      showNotification('No se encontró el producto.', 'warning')
      editingStockId = null
      return
    }
    pendingStockPhoto = product?.photo
    if (stockPhotoInput) stockPhotoInput.required = !product
    if (product) {
      const name = stockForm.elements.namedItem('name')
      const category = stockForm.elements.namedItem('category')
      const location = stockForm.elements.namedItem('location')
      const quantity = stockForm.elements.namedItem('quantity')
      const unit = stockForm.elements.namedItem('unit')
      const minimumQuantity = stockForm.elements.namedItem('minimumQuantity')
      const counted = stockForm.elements.namedItem('counted')
      if (name instanceof HTMLInputElement) name.value = product.name
      if (category instanceof HTMLSelectElement) category.value = product.category
      if (location instanceof HTMLInputElement) location.value = product.location
      if (quantity instanceof HTMLInputElement) quantity.value = String(product.quantity)
      if (unit instanceof HTMLSelectElement) unit.value = product.unit
      if (minimumQuantity instanceof HTMLInputElement) minimumQuantity.value = String(product.minimumQuantity)
      if (counted instanceof HTMLInputElement) counted.checked = product.counted
    } else {
      const counted = stockForm.elements.namedItem('counted')
      if (counted instanceof HTMLInputElement) counted.checked = true
    }
    if (stockDialogTitle) stockDialogTitle.textContent = product ? 'Editar producto' : 'Nuevo producto'
    const submitButton = stockForm.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitButton) submitButton.textContent = product ? 'Guardar cambios' : 'Guardar producto'
    setStockPhotoPreview(product?.photo, product?.category, product?.defaultImage)
    stockDialog.showModal()
  }

  const notifyTaskCompleted = (task: CalendarTask) => {
    showNotification(`Tarea completada: ${task.title}`)
  }

  const renderDeviations = () => {
    if (!deviationPanel) return
    const today = dateKey(new Date())
    const overdueCandidates = isAdmin()
      ? taskHistory
      : taskOccurrences.filter((task) => task.date === today)
    const lateTasks = overdueTasks(overdueCandidates, new Date()).slice(-10).reverse()
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
                  <button type="button" data-open-checklist="${task.id}" data-occurrence-date="${task.date}">${isAdmin() ? 'Reabrir checklist' : 'Revisar checklist'}</button>
                </li>
              `,
            )
            .join('')}
        </ul>
      `
      : ''
  }

  const renderTaskChecklist = (taskId: number, occurrenceDate: string) => {
    if (!checklistDialogContent) return
    const task = taskOccurrences.find((item) => item.id === taskId && item.date === occurrenceDate)
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
                    <input type="checkbox" data-checklist-task="${task.id}" data-checklist-date="${task.date}" data-checklist-step="${step.id}" ${step.completed ? 'checked' : ''} ${task.completed ? 'disabled' : ''} />
                    <span class="guided-step-check" aria-hidden="true"></span>
                    <span>${escapeHtml(step.text)}</span>
                  </label>
                </li>
              `,
            )
            .join('')}
        </ol>
        <p class="checklist-completion-note" ${task.completed || isOccurrenceOverdue(task) ? '' : 'hidden'}>${isOccurrenceOverdue(task) ? 'Ejecución vencida. El administrador puede reabrir su checklist original.' : 'Checklist finalizada. La tarea está marcada como completada.'}</p>
        <div class="dialog-actions">
          <button class="calendar-today-btn" type="button" data-close-checklist>Cerrar</button>
        </div>
      </div>
    `
  }

  const openTaskChecklist = (taskId: number, occurrenceDate: string) => {
    if (!checklistDialog) return
    renderTaskChecklist(taskId, occurrenceDate)
    if (!checklistDialog.open) checklistDialog.showModal()
  }

  const renderDailyChecklist = () => {
    if (!dailyTaskList || !dailyProgressCount || !dailyProgressPercent || !dailyProgressTrack || !dailyProgressFill) return

    const todayTasks = tasksForDate(taskOccurrences, dateKey(new Date()))
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
                      <td><button type="button" class="guide-task-btn" data-open-checklist="${task.id}" data-occurrence-date="${task.date}">Checklist</button></td>
                      <td class="daily-check-column">
                        <label class="daily-task-check-cell">
                          <input type="checkbox" data-daily-task="${task.id}" data-occurrence-date="${task.date}" ${task.completed ? 'checked' : ''} aria-label="${task.completed ? 'Desmarcar' : 'Completar'} ${escapeHtml(task.title)}" />
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
      .filter((task) => !query || `${task.title} ${task.description}`.toLocaleLowerCase('es').includes(query))
      .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))
    const filteredHistory = taskHistory
      .filter((task) => !period || task.period === period)
      .filter((task) => !status ||
        (status === 'completed' ? task.completed : status === 'pending' ? !task.completed : task.status === 'En curso'))
      .filter((task) => !query || `${task.title} ${task.description}`.toLocaleLowerCase('es').includes(query))
      .sort((first, second) => second.date.localeCompare(first.date) || second.time.localeCompare(first.time))
    const historyRows = filteredHistory.length
      ? `<div class="admin-table-wrap">
          <table class="admin-task-table">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Tarea</th><th>Periodicidad</th><th>Estado</th><th>Pasos</th><th>Realizada por</th><th>Acción</th></tr></thead>
            <tbody>
              ${filteredHistory.map((task) => {
                const overdue = isOccurrenceOverdue(task)
                const employeeName = task.completedByName ?? accounts.find(
                  (account) => account.username.toLocaleLowerCase() === task.completedBy?.toLocaleLowerCase(),
                )?.employeeName
                const completedBy = task.completedBy
                  ? `${task.completedBy}${employeeName ? ` · ${employeeName}` : ''}`
                  : '—'
                return `
                  <tr>
                    <td data-label="Fecha">${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(parseDateKey(task.date))}</td>
                    <td data-label="Hora">${escapeHtml(task.time)}</td>
                    <td data-label="Tarea"><strong>${escapeHtml(task.title)}</strong></td>
                    <td data-label="Periodicidad">${periodLabel(task.period)}</td>
                    <td data-label="Estado">${overdue ? 'Vencida' : task.completed ? 'Completada' : task.status}</td>
                    <td data-label="Pasos">${task.checklist.filter((step) => step.completed).length}/${task.checklist.length}</td>
                    <td data-label="Realizada por">${escapeHtml(completedBy)}</td>
                    <td data-label="Acción" class="admin-row-actions">
                      <button type="button" data-open-checklist="${task.id}" data-occurrence-date="${task.date}">${overdue ? 'Reabrir checklist' : 'Ver checklist'}</button>
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>`
      : '<p class="admin-empty">Todavía no hay ejecuciones en el historial.</p>'
    adminTaskList.innerHTML = filteredTasks.length
      ? `<div class="admin-table-wrap">
          <table class="admin-task-table">
            <thead><tr><th>Fecha de inicio</th><th>Hora</th><th>Tarea</th><th>Periodicidad</th><th>Checklist</th><th>Acciones</th></tr></thead>
            <tbody>
              ${filteredTasks.map((task) => `
                <tr>
                  <td data-label="Fecha de inicio">${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(parseDateKey(task.date))}</td>
                  <td data-label="Hora">${escapeHtml(task.time)}</td>
                  <td data-label="Tarea"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description || 'Sin descripción')}</small></td>
                  <td data-label="Periodicidad"><span class="label ${task.period}">${periodLabel(task.period)}</span></td>
                  <td data-label="Checklist">${task.checklist.length} pasos</td>
                  <td data-label="Acciones" class="admin-row-actions">
                    <button type="button" data-edit-task="${task.id}">Editar</button>
                    <button type="button" class="admin-delete" data-admin-delete="${task.id}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`
      : '<p class="admin-empty">No hay tareas que coincidan con los filtros.</p>'
    adminTaskList.insertAdjacentHTML('beforeend', `
      <section class="task-history-section">
        <div class="section-header">
          <div>
            <p class="eyebrow">Ejecuciones por fecha</p>
            <h3>Historial de tareas</h3>
          </div>
          <p class="section-copy">Las tareas no realizadas quedan vencidas y se conservan aquí.</p>
        </div>
        ${historyRows}
      </section>
    `)
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
    const dayTasks = tasksForDate(taskOccurrences, selectedDate)
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
                <button class="guide-task-btn" type="button" data-open-checklist="${task.id}" data-occurrence-date="${task.date}">${isOccurrenceOverdue(task) && isAdmin() ? 'Reabrir tarea vencida' : 'Abrir checklist'} · ${task.checklist.filter((step) => step.completed).length}/${task.checklist.length}</button>
                <label class="task-check">
                  <input type="checkbox" data-toggle-completion="${task.id}" data-occurrence-date="${task.date}" ${task.completed ? 'checked' : ''} aria-label="Marcar ${escapeHtml(task.title)} como completada" />
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
        const events = tasksForDate(taskOccurrences, day.dateKey)
        const eventPreview = events
          .slice(0, 2)
          .map(
            (task) =>
              `<span class="calendar-event ${task.period}">${isOccurrenceOverdue(task) ? 'Vencida · ' : ''}${escapeHtml(task.time)} · ${escapeHtml(task.title)}</span>`,
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
      void loadTaskOccurrences().catch((error: unknown) => {
        showNotification(error instanceof Error ? error.message : 'No se pudieron cargar las tareas del mes.', 'warning')
      })
    })
  })

  document.querySelector<HTMLButtonElement>('[data-calendar-today]')?.addEventListener('click', () => {
    const today = new Date()
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    selectedDate = dateKey(today)
    renderCalendar()
    void loadTaskOccurrences().catch((error: unknown) => {
      showNotification(error instanceof Error ? error.message : 'No se pudieron cargar las tareas de hoy.', 'warning')
    })
  })

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!loginForm) return
    const data = new FormData(loginForm)
    try {
      const { user } = await apiRequest<{ user: SessionUser }>('/auth/login', 'POST', {
        pin: String(data.get('pin')),
      })
      currentUser = user
      if (loginError) loginError.hidden = true
      try {
        await migrateLocalData()
      } catch (error) {
        showNotification(
          error instanceof Error ? `No se pudo migrar la copia local: ${error.message}` : 'No se pudo migrar la copia local.',
          'warning',
        )
      }
      await loadDatabaseData()
      loginForm.reset()
    } catch (error) {
      if (loginError) {
        loginError.textContent = error instanceof Error
          ? error.message
          : 'No se pudo conectar con la base de datos.'
        loginError.hidden = false
      }
      const pinField = loginForm.elements.namedItem('pin')
      if (pinField instanceof HTMLInputElement) {
        pinField.value = ''
        renderPinDigits()
        pinField.focus()
      }
    }
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

  document.querySelector<HTMLButtonElement>('[data-logout]')?.addEventListener('click', async () => {
    try {
      await apiRequest<void>('/auth/logout', 'POST', {})
    } catch (error) {
      showNotification(
        error instanceof Error ? `No se pudo cerrar la sesión en el servidor: ${error.message}` : 'No se pudo cerrar la sesión.',
        'warning',
      )
    }
    currentUser = null
    accounts = []
    tasks = []
    stock = []
    libraryData = []
    if (workspace) workspace.hidden = true
    if (loginScreen) loginScreen.hidden = false
    if (loginForm) loginForm.reset()
    if (loginError) loginError.hidden = true
    renderPinDigits()
    dialog?.close()
    checklistDialog?.close()
    stockDialog?.close()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  userForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!isAdmin() || !userForm) return
    const data = new FormData(userForm)
    try {
      const result = await apiRequest<{ accounts: PublicAccount[] }>('/accounts', 'POST', {
        username: String(data.get('username')),
        employeeName: String(data.get('employeeName')),
        pin: String(data.get('pin')),
        role: String(data.get('role')) as UserRole,
      })
      accounts = result.accounts
      userForm.reset()
      renderUserList()
      showNotification('Usuario añadido.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo añadir el usuario.', 'warning')
    }
  })

  userList?.addEventListener('change', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLSelectElement) || !target.dataset.userRole || !isAdmin()) return
    try {
      const result = await apiRequest<{ accounts: PublicAccount[] }>(
        `/accounts/${encodeURIComponent(target.dataset.userRole)}/role`,
        'PATCH',
        { role: target.value },
      )
      accounts = result.accounts
      if (currentUser) {
        currentUser = accounts.find((account) => account.username === currentUser?.username) ?? null
      }
      if (!isAdmin()) taskHistory = []
      renderUserList()
      syncSessionUI(false)
      await loadTaskOccurrences()
      showNotification('Rol de usuario actualizado.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo cambiar el rol.', 'warning')
      renderUserList()
    }
  })

  userList?.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element) || !isAdmin()) return
    const saveNameButton = target.closest<HTMLButtonElement>('[data-save-employee-name]')
    if (saveNameButton?.dataset.saveEmployeeName) {
      const username = saveNameButton.dataset.saveEmployeeName
      const nameInput = userList.querySelector<HTMLInputElement>(
        `[data-employee-name="${CSS.escape(username)}"]`,
      )
      if (!nameInput || !nameInput.reportValidity()) return
      try {
        const result = await apiRequest<{ accounts: PublicAccount[] }>(
          `/accounts/${encodeURIComponent(username)}/name`,
          'PATCH',
          { employeeName: nameInput.value },
        )
        accounts = result.accounts
        currentUser = accounts.find((account) => account.username === currentUser?.username) ?? null
        renderUserList()
        syncSessionUI(false)
        showNotification('Nombre del empleado actualizado.')
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudo actualizar el nombre.', 'warning')
      }
      return
    }
    const button = target.closest<HTMLButtonElement>('[data-remove-user]')
    const username = button?.dataset.removeUser
    if (!username || !window.confirm(`¿Eliminar la cuenta "${username}"?`)) return
    try {
      const result = await apiRequest<{ accounts: PublicAccount[] }>(
        `/accounts/${encodeURIComponent(username)}`,
        'DELETE',
      )
      accounts = result.accounts
      renderUserList()
      showNotification(`Se eliminó el usuario ${username}.`)
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo eliminar el usuario.', 'warning')
    }
  })

  dailyTaskList?.addEventListener('change', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.dailyTask) return
    const taskId = Number(target.dataset.dailyTask)
    const occurrenceDate = target.dataset.occurrenceDate
    if (!occurrenceDate) return
    const wasCompleted = taskOccurrences.find((task) =>
      task.id === taskId && task.date === occurrenceDate)?.completed ?? false
    try {
      await apiRequest<{ occurrences: CalendarTask[] }>(
        `/tasks/${taskId}/occurrences/${occurrenceDate}/completion`,
        'PATCH',
        { completed: target.checked },
      )
      await loadTaskOccurrences()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la tarea.', 'warning')
      renderDailyChecklist()
      return
    }
    const completedTask = taskOccurrences.find((task) => task.id === taskId && task.date === occurrenceDate)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  dailyTaskList?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const checklistButton = target.closest<HTMLButtonElement>('[data-open-checklist]')
    if (checklistButton?.dataset.openChecklist) {
      const occurrenceDate = checklistButton.dataset.occurrenceDate
      if (occurrenceDate) openTaskChecklist(Number(checklistButton.dataset.openChecklist), occurrenceDate)
    } else if (target.closest('[data-add-task]')) {
      openTaskDialog()
    }
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
  document.querySelector<HTMLButtonElement>('[data-show-library]')?.addEventListener('click', () => setActiveView('library'))
  document.querySelector<HTMLButtonElement>('[data-show-stock]')?.addEventListener('click', () => setActiveView('stock'))
  document.querySelector<HTMLButtonElement>('[data-show-admin]')?.addEventListener('click', () => setActiveView('admin'))
  librarySearch?.addEventListener('input', renderLibrary)
  libraryCategory?.addEventListener('change', renderLibrary)
  stockSearch?.addEventListener('input', renderStock)
  stockCategory?.addEventListener('change', renderStock)
  stockStatusFilter?.addEventListener('change', renderStock)

  stockSection?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element) || !target.closest('[data-add-stock]')) return
    openStockDialog()
  })

  stockList?.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element) || !isAdmin()) return

    const editButton = target.closest<HTMLButtonElement>('[data-edit-stock]')
    if (editButton?.dataset.editStock) {
      openStockDialog(Number(editButton.dataset.editStock))
      return
    }

    const deleteButton = target.closest<HTMLButtonElement>('[data-delete-stock]')
    if (deleteButton?.dataset.deleteStock) {
      const productId = Number(deleteButton.dataset.deleteStock)
      const product = stock.find((item) => item.id === productId)
      if (!product || !window.confirm(`¿Eliminar "${product.name}" del inventario?`)) return
      try {
        const result = await apiRequest<{ stock: StockProduct[] }>(`/stock/products/${productId}`, 'DELETE')
        stock = result.stock
        renderStock()
        showNotification(`Se eliminó ${product.name} del inventario.`)
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudo eliminar el producto.', 'warning')
      }
      return
    }

    const movementButton = target.closest<HTMLButtonElement>('[data-stock-change]')
    if (!movementButton?.dataset.stockChange || !movementButton.dataset.direction) return
    const productId = Number(movementButton.dataset.stockChange)
    const card = movementButton.closest<HTMLElement>('[data-stock-card]')
    const quantityInput = card?.querySelector<HTMLInputElement>('[data-stock-adjustment]')
    const amount = Number(quantityInput?.value)
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Indica una cantidad mayor que cero para registrar el movimiento.', 'warning')
      return
    }
    const movement = movementButton.dataset.direction === 'in' ? amount : -amount
    try {
      const result = await apiRequest<{ stock: StockProduct[] }>(
        `/stock/products/${productId}/movements`,
        'POST',
        { change: movement },
      )
      stock = result.stock
      renderStock()
      showNotification(movement > 0 ? 'Entrada de stock registrada.' : 'Salida de stock registrada.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo registrar el movimiento.', 'warning')
    }
  })

  stockForm?.addEventListener('change', (event) => {
    const target = event.target
    if (target instanceof HTMLSelectElement && target.name === 'category' && !pendingStockPhoto) {
      const category = STOCK_CATEGORIES.find((item) => item === target.value) ?? 'Otros'
      setStockPhotoPreview(undefined, category)
    }
  })

  stockPhotoInput?.addEventListener('change', async () => {
    const file = stockPhotoInput.files?.[0]
    if (!file) return
    const previousPhoto = pendingStockPhoto
    try {
      pendingStockPhoto = await readStockPhoto(file)
      const categoryInput = stockForm?.elements.namedItem('category')
      const category = categoryInput instanceof HTMLSelectElement
        ? STOCK_CATEGORIES.find((item) => item === categoryInput.value) ?? 'Otros'
        : 'Otros'
      setStockPhotoPreview(pendingStockPhoto, category)
    } catch (error) {
      pendingStockPhoto = previousPhoto
      stockPhotoInput.value = ''
      setStockPhotoPreview(previousPhoto)
      showNotification(error instanceof Error ? error.message : 'No se pudo cargar la foto del producto.', 'warning')
    }
  })

  stockForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!isAdmin() || !stockForm) {
      showNotification('Solo un administrador puede gestionar el stock.', 'warning')
      return
    }
    if (!stockForm.reportValidity()) return

    const formData = new FormData(stockForm)
    const category = STOCK_CATEGORIES.find((item) => item === String(formData.get('category')))
    const unit = STOCK_UNITS.find((item) => item === String(formData.get('unit')))
    if (!category || !unit) {
      showNotification('Selecciona una categoría y una unidad válidas.', 'warning')
      return
    }
    const editedProduct = editingStockId === null
      ? undefined
      : stock.find((item) => item.id === editingStockId)
    const photoFile = stockPhotoInput?.files?.[0]
    let photo = pendingStockPhoto
    if (photoFile) {
      try {
        photo = await readStockPhoto(photoFile)
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudo cargar la foto del producto.', 'warning')
        return
      }
    }

    const product: StockProductInput = {
      name: String(formData.get('name')),
      category,
      quantity: Number(formData.get('quantity')),
      unit,
      minimumQuantity: Number(formData.get('minimumQuantity')),
      location: String(formData.get('location')),
      defaultImage: editedProduct?.category === category
        ? editedProduct.defaultImage
        : STOCK_CATEGORY_IMAGE[category],
      counted: formData.get('counted') === 'on',
      ...(photo ? { photo } : {}),
    }

    const creatingProduct = editingStockId === null
    try {
      const result = await apiRequest<{ stock: StockProduct[] }>(
        editingStockId === null ? '/stock/products' : `/stock/products/${editingStockId}`,
        editingStockId === null ? 'POST' : 'PUT',
        { product },
      )
      stock = result.stock
      stockForm.reset()
      stockDialog?.close()
      editingStockId = null
      pendingStockPhoto = undefined
      renderStock()
      showNotification(creatingProduct ? 'Producto guardado en el inventario.' : 'Producto actualizado.')
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo guardar el producto.', 'warning')
    }
  })

  stockDialog?.addEventListener('close', () => {
    editingStockId = null
    pendingStockPhoto = undefined
    stockForm?.reset()
    if (stockPhotoInput) stockPhotoInput.required = true
    if (stockDialogTitle) stockDialogTitle.textContent = 'Nuevo producto'
    const submitButton = stockForm?.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitButton) submitButton.textContent = 'Guardar producto'
  })

  document.querySelectorAll<HTMLButtonElement>('[data-close-stock-dialog]').forEach((button) => {
    button.addEventListener('click', () => stockDialog?.close())
  })

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

  adminTaskList?.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const checklistButton = target.closest<HTMLButtonElement>('[data-open-checklist]')
    const editButton = target.closest<HTMLButtonElement>('[data-edit-task]')
    const deleteButton = target.closest<HTMLButtonElement>('[data-admin-delete]')
    if (checklistButton?.dataset.openChecklist && checklistButton.dataset.occurrenceDate) {
      if (!isAdmin()) return
      openTaskChecklist(Number(checklistButton.dataset.openChecklist), checklistButton.dataset.occurrenceDate)
    } else if (editButton?.dataset.editTask) {
      if (!isAdmin()) return
      openTaskDialog(Number(editButton.dataset.editTask))
    } else if (deleteButton?.dataset.adminDelete) {
      if (!isAdmin()) return
      const taskId = Number(deleteButton.dataset.adminDelete)
      const task = tasks.find((item) => item.id === taskId)
      if (!task || !window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return
      try {
        const result = await apiRequest<{ tasks: CalendarTask[] }>(`/tasks/${taskId}`, 'DELETE')
        tasks = result.tasks
        await loadTaskOccurrences()
        showNotification('Tarea eliminada.')
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudo eliminar la tarea.', 'warning')
      }
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
      const result = await apiRequest<{ tasks: CalendarTask[] }>('/tasks', 'PUT', { tasks: importedTasks })
      tasks = result.tasks
      await loadTaskOccurrences()
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

  form?.addEventListener('submit', async (event) => {
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
    try {
      const taskId = editingTaskId
      const result = await apiRequest<{ tasks: CalendarTask[] }>(
        taskId === null ? '/tasks' : `/tasks/${taskId}`,
        taskId === null ? 'POST' : 'PUT',
        { task: newTask },
      )
      tasks = result.tasks
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.', 'warning')
      return
    }
    selectedDate = date
    const selected = parseDateKey(date)
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1)
    form.reset()
    dialog?.close()
    editingTaskId = null
    try {
      await loadTaskOccurrences()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudieron actualizar las tareas.', 'warning')
    }
  })

  dialog?.addEventListener('close', () => {
    editingTaskId = null
    if (taskDialogTitle) taskDialogTitle.textContent = 'Nueva tarea'
    const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitButton) submitButton.textContent = 'Guardar tarea'
  })

  selectedTaskList?.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const deleteButton = target.closest<HTMLButtonElement>('[data-delete-task]')
    const checklistButton = target.closest<HTMLButtonElement>('[data-open-checklist]')

    if (checklistButton?.dataset.openChecklist) {
      const occurrenceDate = checklistButton.dataset.occurrenceDate
      if (occurrenceDate) openTaskChecklist(Number(checklistButton.dataset.openChecklist), occurrenceDate)
    } else if (deleteButton?.dataset.deleteTask) {
      if (!isAdmin()) return
      try {
        const result = await apiRequest<{ tasks: CalendarTask[] }>(
          `/tasks/${Number(deleteButton.dataset.deleteTask)}`,
          'DELETE',
        )
        tasks = result.tasks
        await loadTaskOccurrences()
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'No se pudo eliminar la tarea.', 'warning')
      }
    } else if (target.closest('[data-add-task]')) {
      openTaskDialog()
    }
  })

  selectedTaskList?.addEventListener('change', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.toggleCompletion) return
    const taskId = Number(target.dataset.toggleCompletion)
    const occurrenceDate = target.dataset.occurrenceDate
    if (!occurrenceDate) return
    const wasCompleted = taskOccurrences.find((task) =>
      task.id === taskId && task.date === occurrenceDate)?.completed ?? false
    try {
      await apiRequest<{ occurrences: CalendarTask[] }>(
        `/tasks/${taskId}/occurrences/${occurrenceDate}/completion`,
        'PATCH',
        { completed: target.checked },
      )
      await loadTaskOccurrences()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo completar la tarea.', 'warning')
      renderCalendar()
      return
    }
    const completedTask = taskOccurrences.find((task) => task.id === taskId && task.date === occurrenceDate)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  checklistDialogContent?.addEventListener('change', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.dataset.checklistTask ||
      !target.dataset.checklistDate || !target.dataset.checklistStep) return
    const taskId = Number(target.dataset.checklistTask)
    const occurrenceDate = target.dataset.checklistDate
    const wasCompleted = taskOccurrences.find((task) =>
      task.id === taskId && task.date === occurrenceDate)?.completed ?? false
    try {
      await apiRequest<{ occurrences: CalendarTask[] }>(
        `/tasks/${taskId}/occurrences/${occurrenceDate}/checklist/${Number(target.dataset.checklistStep)}`,
        'PATCH',
        { completed: target.checked },
      )
      await loadTaskOccurrences()
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'No se pudo guardar el paso.', 'warning')
      return
    }
    renderTaskChecklist(taskId, occurrenceDate)
    const completedTask = taskOccurrences.find((task) => task.id === taskId && task.date === occurrenceDate)
    if (!wasCompleted && completedTask?.completed) notifyTaskCompleted(completedTask)
  })

  checklistDialogContent?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-close-checklist]')) {
      checklistDialog?.close()
    } else {
      const button = target.closest<HTMLButtonElement>('[data-open-checklist]')
      if (button?.dataset.openChecklist && button.dataset.occurrenceDate) {
        openTaskChecklist(Number(button.dataset.openChecklist), button.dataset.occurrenceDate)
      }
    }
  })

  deviationPanel?.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('[data-open-checklist]')
    if (button?.dataset.openChecklist && button.dataset.occurrenceDate) {
      openTaskChecklist(Number(button.dataset.openChecklist), button.dataset.occurrenceDate)
    }
  })

  window.setInterval(renderDailyChecklist, 60_000)

  const restoreSession = async () => {
    try {
      const { user } = await apiRequest<{ user: SessionUser | null }>('/auth/session')
      if (!user) {
        renderPinDigits()
        return
      }
      currentUser = user
      await loadDatabaseData()
    } catch (error) {
      if (loginError) {
        loginError.textContent = error instanceof Error
          ? `No se pudo conectar con la base de datos: ${error.message}`
          : 'No se pudo conectar con la base de datos.'
        loginError.hidden = false
      }
    }
  }

  const refreshDatabaseData = async () => {
    if (!currentUser || dialog?.open || checklistDialog?.open || stockDialog?.open) return
    try {
      await loadDatabaseData(false)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Inicia sesión')) {
        currentUser = null
        accounts = []
        tasks = []
        stock = []
        libraryData = []
        if (workspace) workspace.hidden = true
        if (loginScreen) loginScreen.hidden = false
      } else {
        showNotification(
          error instanceof Error ? `No se pudo actualizar la información compartida: ${error.message}` : 'No se pudo actualizar la información compartida.',
          'warning',
        )
      }
    }
  }

  window.addEventListener('focus', () => { void refreshDatabaseData() })
  window.setInterval(() => { void refreshDatabaseData() }, 15_000)
  void restoreSession()
}
