export type Period = 'daily' | 'weekly' | 'monthly' | 'eventual'
export type TaskStatus = 'Pendiente' | 'En curso' | 'Listo'

export type ChecklistStep = {
  id: number
  text: string
  completed: boolean
}

export type CalendarTask = {
  id: number
  date: string
  period: Period
  title: string
  time: string
  status: TaskStatus
  completed: boolean
  completedBy?: string
  completedByName?: string
  description: string
  checklist: ChecklistStep[]
}

export type CalendarDay = {
  date: Date
  dateKey: string
  isCurrentMonth: boolean
}

export const TASKS_STORAGE_KEY = 'andy-app-calendar-tasks'

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Fecha no válida: ${value}`)

  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (dateKey(parsed) !== value) throw new Error(`Fecha no válida: ${value}`)
  return parsed
}

export function createMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      date,
      dateKey: dateKey(date),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
    }
  })
}

export function tasksForDate(tasks: CalendarTask[], date: string): CalendarTask[] {
  return tasks
    .filter((task) => task.date === date)
    .sort((first, second) => first.time.localeCompare(second.time))
}

export function taskOccursOnDate(task: Pick<CalendarTask, 'date' | 'period'>, date: string): boolean {
  const anchorDate = parseDateKey(task.date)
  const occurrenceDate = parseDateKey(date)
  if (occurrenceDate < anchorDate) return false
  if (task.period === 'eventual') return date === task.date
  if (task.period === 'daily') return true
  if (task.period === 'weekly') return occurrenceDate.getDay() === anchorDate.getDay()
  const lastDayOfOccurrenceMonth = new Date(
    occurrenceDate.getFullYear(),
    occurrenceDate.getMonth() + 1,
    0,
  ).getDate()
  return occurrenceDate.getDate() === Math.min(anchorDate.getDate(), lastDayOfOccurrenceMonth)
}

export function taskOccurrenceDates(
  task: Pick<CalendarTask, 'date' | 'period'>,
  from: string,
  to: string,
): string[] {
  const firstDate = parseDateKey(from)
  const lastDate = parseDateKey(to)
  if (firstDate > lastDate) throw new Error('El intervalo de fechas no es válido.')
  const anchorDate = parseDateKey(task.date)
  const cursor = new Date(Math.max(firstDate.getTime(), anchorDate.getTime()))
  const dates: string[] = []
  while (cursor <= lastDate) {
    const currentDate = dateKey(cursor)
    if (taskOccursOnDate(task, currentDate)) dates.push(currentDate)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function overdueTasks<T extends Pick<CalendarTask, 'date' | 'time' | 'completed'>>(
  tasks: T[],
  now: Date,
): T[] {
  const nowTime = now.getTime()
  return tasks
    .filter((task) => {
      if (task.completed) return false
      const date = parseDateKey(task.date)
      const [hours, minutes] = task.time.split(':').map(Number)
      date.setHours(hours, minutes, 0, 0)
      return date.getTime() < nowTime
    })
    .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))
}

export function createChecklistSteps(lines: string): ChecklistStep[] {
  return lines
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: index + 1, text, completed: false }))
}

export function updateChecklistStep(
  tasks: CalendarTask[],
  taskId: number,
  stepId: number,
  completed: boolean,
  completedBy?: string,
  completedByName?: string,
): CalendarTask[] {
  const task = tasks.find((item) => item.id === taskId)
  if (!task) throw new Error('No se encontró la tarea asociada a esta lista.')
  if (task.completed) throw new Error('La checklist de esta tarea ya está finalizada.')
  if (!task.checklist.some((step) => step.id === stepId)) {
    throw new Error('No se encontró el paso de la lista.')
  }

  return tasks.map((item) => {
    if (item.id !== taskId) return item
    const checklist = item.checklist.map((step) =>
      step.id === stepId ? { ...step, completed } : step,
    )
    const completedSteps = checklist.filter((step) => step.completed).length
    const taskCompleted = checklist.length > 0 && completedSteps === checklist.length
    return {
      ...item,
      checklist,
      completed: taskCompleted,
      completedBy: taskCompleted ? completedBy : undefined,
      completedByName: taskCompleted ? completedByName : undefined,
      status: taskCompleted ? 'Listo' : completedSteps > 0 ? 'En curso' : 'Pendiente',
    }
  })
}

function hasIncompleteChecklist(task: CalendarTask): boolean {
  return task.checklist.length === 0 || task.checklist.some((step) => !step.completed)
}

export function completionByPeriod(tasks: CalendarTask[]): Array<{
  period: Period
  total: number
  completed: number
  percentage: number
}> {
  const periods: Period[] = ['daily', 'weekly', 'monthly', 'eventual']
  return periods.map((period) => {
    const groupedTasks = tasks.filter((task) => task.period === period)
    const completed = groupedTasks.filter((task) => task.completed).length
    return {
      period,
      total: groupedTasks.length,
      completed,
      percentage: groupedTasks.length === 0 ? 0 : Math.round((completed / groupedTasks.length) * 100),
    }
  })
}

export function addTask(tasks: CalendarTask[], task: Omit<CalendarTask, 'id'>): CalendarTask[] {
  const nextId = tasks.reduce((highest, current) => Math.max(highest, current.id), 0) + 1
  return [...tasks, { ...task, id: nextId }]
}

export function updateTaskDetails(
  tasks: CalendarTask[],
  id: number,
  details: Omit<CalendarTask, 'id' | 'completed'>,
): CalendarTask[] {
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('No se encontró la tarea.')
  if (task.completed) throw new Error('No se pueden editar tareas completadas.')
  return tasks.map((item) => item.id === id ? { ...details, id, completed: false } : item)
}

export function updateTaskStatus(tasks: CalendarTask[], id: number): CalendarTask[] {
  const statuses: TaskStatus[] = ['Pendiente', 'En curso', 'Listo']
  const task = tasks.find((item) => item.id === id)
  if (!task) throw new Error('No se encontró la tarea.')
  const nextStatus = (statuses.indexOf(task.status) + 1) % statuses.length
  if (statuses[nextStatus] === 'Listo' && hasIncompleteChecklist(task)) {
    throw new Error('Completa todos los pasos de la checklist antes de cerrar la tarea.')
  }

  return tasks.map((task) => {
    if (task.id !== id) return task
    const statusIndex = (statuses.indexOf(task.status) + 1) % statuses.length
    const completed = statuses[statusIndex] === 'Listo'
    return {
      ...task,
      status: statuses[statusIndex],
      completed,
      completedBy: completed ? task.completedBy : undefined,
      checklist: completed
        ? task.checklist
        : task.completed
          ? task.checklist.map((step) => ({ ...step, completed: false }))
          : task.checklist,
    }
  })
}

export function updateTaskCompletion(
  tasks: CalendarTask[],
  id: number,
  completed: boolean,
  completedBy?: string,
  completedByName?: string,
): CalendarTask[] {
  const task = tasks.find((item) => item.id === id)
  if (completed && task && hasIncompleteChecklist(task)) {
    throw new Error('Completa todos los pasos de la checklist antes de cerrar la tarea.')
  }

  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          completed,
          completedBy: completed ? completedBy : undefined,
          completedByName: completed ? completedByName : undefined,
          status: completed ? 'Listo' : 'Pendiente',
          checklist: completed
            ? task.checklist
            : task.checklist.map((step) => ({ ...step, completed: false })),
        }
      : task,
  )
}

export function removeTask(tasks: CalendarTask[], id: number): CalendarTask[] {
  return tasks.filter((task) => task.id !== id)
}

export function createInitialTasks(today: Date): CalendarTask[] {
  const firstDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const taskData: Omit<CalendarTask, 'id' | 'date'>[] = [
    {
      period: 'daily',
      title: 'Preparar la mesa del desayuno',
      time: '07:30',
      status: 'Pendiente',
      completed: false,
      description: 'Selecciona manteles claros, vajilla simple y frutas frescas para un detalle cálido y ordenado.',
      checklist: [
        { id: 1, text: 'Limpiar y vestir la mesa con mantel y servilletas', completed: false },
        { id: 2, text: 'Colocar platos, cubiertos y vasos correctamente', completed: false },
        { id: 3, text: 'Preparar pan, fruta y complementos del desayuno', completed: false },
        { id: 4, text: 'Revisar presentación y dejar todo listo para el servicio', completed: false },
      ],
    },
    {
      period: 'daily',
      title: 'Servir bebidas frescas',
      time: '12:15',
      status: 'En curso',
      completed: false,
      description: 'Adecua agua, zumos, infusiones y hielo para un servicio elegante y bien coordinado.',
      checklist: [
        { id: 1, text: 'Confirmar las bebidas previstas y las necesidades del servicio', completed: false },
        { id: 2, text: 'Preparar vasos, copas, jarras y hielo', completed: false },
        { id: 3, text: 'Comprobar temperatura, limpieza y presentación', completed: false },
      ],
    },
    {
      period: 'weekly',
      title: 'Planificar el buffet del viernes',
      time: '10:00',
      status: 'Pendiente',
      completed: false,
      description: 'Revisa la composición del buffet, la temperatura de servicio y la disposición de platos calientes.',
      checklist: [
        { id: 1, text: 'Confirmar menú, cantidades y necesidades alimentarias', completed: false },
        { id: 2, text: 'Comprobar equipos y temperaturas de conservación', completed: false },
        { id: 3, text: 'Organizar el recorrido y los utensilios de servicio', completed: false },
        { id: 4, text: 'Revisar etiquetas, presentación y reposición', completed: false },
      ],
    },
    {
      period: 'weekly',
      title: 'Actualizar la lista de vinos',
      time: '16:00',
      status: 'Listo',
      completed: true,
      description: 'Mantén adecuada la carta de vinos para acompañar la comida y la cena de la semana.',
      checklist: [
        { id: 1, text: 'Revisar existencias y añadas', completed: true },
        { id: 2, text: 'Actualizar precios y disponibilidad', completed: true },
        { id: 3, text: 'Validar maridajes y carta final', completed: true },
      ],
    },
    {
      period: 'monthly',
      title: 'Auditoría de equipos y cristalería',
      time: '09:00',
      status: 'Pendiente',
      completed: false,
      description: 'Comprueba copas, platos y utensilios para evitar roturas y asegurar un servicio impecable.',
      checklist: [
        { id: 1, text: 'Inspeccionar cristalería y vajilla', completed: false },
        { id: 2, text: 'Separar piezas dañadas y registrar faltantes', completed: false },
        { id: 3, text: 'Reponer material y confirmar el inventario', completed: false },
      ],
    },
    {
      period: 'monthly',
      title: 'Revisión de menús y tendencias',
      time: '14:30',
      status: 'En curso',
      completed: false,
      description: 'Analiza nuevas propuestas para desayunos, cenas y elevación del servicio gastronómico.',
      checklist: [
        { id: 1, text: 'Recopilar comentarios del equipo y clientes', completed: false },
        { id: 2, text: 'Evaluar ideas y viabilidad de ingredientes', completed: false },
        { id: 3, text: 'Seleccionar propuestas y documentar próximos pasos', completed: false },
      ],
    },
  ]

  return taskData.map((task, index) => {
    const date = new Date(firstDate)
    date.setDate(firstDate.getDate() + Math.floor(index / 2))
    return { ...task, id: index + 1, date: dateKey(date) }
  })
}

function isCalendarTask(value: unknown): value is CalendarTask {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<CalendarTask>
  if (typeof task.date !== 'string') return false
  try {
    parseDateKey(task.date)
  } catch {
    return false
  }

  return (
    Number.isInteger(task.id) &&
    (task.period === 'daily' || task.period === 'weekly' ||
      task.period === 'monthly' || task.period === 'eventual') &&
    typeof task.title === 'string' &&
    typeof task.time === 'string' &&
    (task.status === 'Pendiente' || task.status === 'En curso' || task.status === 'Listo') &&
    (task.completed === undefined || typeof task.completed === 'boolean') &&
    typeof task.description === 'string' &&
    (task.completedBy === undefined || typeof task.completedBy === 'string') &&
    (task.completedByName === undefined || typeof task.completedByName === 'string') &&
    (task.checklist === undefined ||
      (Array.isArray(task.checklist) &&
        task.checklist.every(
          (step) =>
            step !== null &&
            typeof step === 'object' &&
            Number.isInteger(step.id) &&
            typeof step.text === 'string' &&
            typeof step.completed === 'boolean',
        )))
  )
}

export function loadTasks(storage: Pick<Storage, 'getItem'>, initialTasks: CalendarTask[]): CalendarTask[] {
  const stored = storage.getItem(TASKS_STORAGE_KEY)
  if (stored === null) return initialTasks

  return parseTasksJson(stored)
}

export function parseTasksJson(json: string): CalendarTask[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed) || !parsed.every(isCalendarTask)) {
    throw new Error('Los datos guardados del calendario no tienen un formato válido.')
  }
  const ids = parsed.map((task) => task.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('El archivo contiene identificadores de tareas duplicados.')
  }
  return parsed.map((task) => {
    const completed = task.completed ?? task.status === 'Listo'
    const checklist = task.checklist?.length
      ? task.checklist
      : [
      { id: 1, text: 'Revisar los materiales y el espacio de trabajo', completed },
      { id: 2, text: `Realizar la tarea: ${task.title}`, completed },
      { id: 3, text: 'Comprobar el resultado y dejar el área lista', completed },
        ]
    return { ...task, completed, checklist }
  })
}

export function saveTasks(storage: Pick<Storage, 'setItem'>, tasks: CalendarTask[]): void {
  storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
}

export function getToday(): string {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const year = today.getFullYear()
  return `${day}/${month}/${year}`
}
