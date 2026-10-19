import { describe, expect, it } from 'vitest'
import {
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
  updateTaskStatus,
  type CalendarTask,
} from './calendar'

const sampleTask: Omit<CalendarTask, 'id'> = {
  date: '2026-10-10',
  period: 'daily',
  title: 'Preparar desayuno',
  time: '08:00',
  status: 'Pendiente',
  completed: false,
  description: 'Preparar la mesa y las bebidas.',
  checklist: [
    { id: 1, text: 'Preparar materiales', completed: false },
    { id: 2, text: 'Revisar el resultado', completed: false },
  ],
}

describe('calendar dates', () => {
  it('formats and parses dates using local calendar days', () => {
    const date = parseDateKey('2026-10-10')

    expect(dateKey(date)).toBe('2026-10-10')
  })

  it('rejects impossible or malformed date keys', () => {
    expect(() => parseDateKey('2026-02-30')).toThrow('Fecha no válida')
    expect(() => parseDateKey('10/10/2026')).toThrow('Fecha no válida')
  })

  it('creates a six-week grid beginning on Monday and including adjacent month days', () => {
    const grid = createMonthGrid(2026, 9)

    expect(grid).toHaveLength(42)
    expect(grid[0].date.getDay()).toBe(1)
    expect(grid[0].dateKey).toBe('2026-09-28')
    expect(grid[grid.length - 1].dateKey).toBe('2026-11-08')
    expect(grid.filter((day) => day.isCurrentMonth)).toHaveLength(31)
  })
})

describe('calendar tasks', () => {
  it('creates seeded tasks on actual dates relative to today', () => {
    const tasks = createInitialTasks(new Date(2026, 9, 30))

    expect(tasks).toHaveLength(6)
    expect(tasks[0].date).toBe('2026-10-30')
    expect(tasks[2].date).toBe('2026-10-31')
    expect(tasks[4].date).toBe('2026-11-01')
  })

  it('filters tasks by date and orders them by time', () => {
    const tasks = [
      { ...sampleTask, id: 1, time: '12:00' },
      { ...sampleTask, id: 2, time: '08:00' },
      { ...sampleTask, id: 3, date: '2026-10-11' },
    ]

    expect(tasksForDate(tasks, '2026-10-10').map((task) => task.id)).toEqual([2, 1])
  })

  it('keeps completed and pending tasks visible for the requested day in time order', () => {
    const tasks: CalendarTask[] = [
      { ...sampleTask, id: 1, time: '12:00' },
      { ...sampleTask, id: 2, time: '08:00', completed: true, status: 'Listo' },
      { ...sampleTask, id: 3, date: '2026-10-11' },
    ]

    expect(tasksForDate(tasks, '2026-10-10').map((task) => task.id)).toEqual([2, 1])
  })

  it('calculates completed percentages for each task group', () => {
    const tasks: CalendarTask[] = [
      { ...sampleTask, id: 1, completed: true },
      { ...sampleTask, id: 2, completed: false },
      { ...sampleTask, id: 3, period: 'weekly', completed: true },
    ]

    expect(completionByPeriod(tasks)).toEqual([
      { period: 'daily', total: 2, completed: 1, percentage: 50 },
      { period: 'weekly', total: 1, completed: 1, percentage: 100 },
      { period: 'monthly', total: 0, completed: 0, percentage: 0 },
    ])
  })

  it('parses checklist lines and ignores empty lines', () => {
    expect(createChecklistSteps('Preparar materiales\n\nRevisar mesa')).toEqual([
      { id: 1, text: 'Preparar materiales', completed: false },
      { id: 2, text: 'Revisar mesa', completed: false },
    ])
    expect(createChecklistSteps(' \n ')).toEqual([])
  })

  it('completes a task only after every guide step has been checked', () => {
    const tasks: CalendarTask[] = [{ ...sampleTask, id: 1, status: 'En curso' }]
    const oneStep = updateChecklistStep(tasks, 1, 1, true)
    const allSteps = updateChecklistStep(oneStep, 1, 2, true, 'supervisor')

    expect(oneStep[0]).toMatchObject({ completed: false, status: 'En curso' })
    expect(allSteps[0]).toMatchObject({ completed: true, status: 'Listo', completedBy: 'supervisor' })
    expect(() => updateChecklistStep(allSteps, 1, 1, false)).toThrow('ya está finalizada')
    expect(() => updateTaskCompletion(tasks, 1, true)).toThrow('Completa todos los pasos')
    expect(() => updateTaskStatus(tasks, 1)).toThrow('Completa todos los pasos')
    expect(() => updateTaskCompletion([{ ...sampleTask, id: 2, checklist: [] }], 2, true))
      .toThrow('Completa todos los pasos')
  })

  it('finds only incomplete tasks whose due date and time have passed', () => {
    const tasks: CalendarTask[] = [
      { ...sampleTask, id: 1, date: '2026-10-10', time: '08:00' },
      { ...sampleTask, id: 2, date: '2026-10-10', time: '12:00', completed: true },
      { ...sampleTask, id: 3, date: '2026-10-10', time: '18:00' },
      { ...sampleTask, id: 4, date: '2026-10-09', time: '22:00' },
    ]

    expect(overdueTasks(tasks, new Date(2026, 9, 10, 14, 0)).map((task) => task.id)).toEqual([4, 1])
  })

  it('toggles completion and keeps the task status in sync', () => {
    const completeChecklist = sampleTask.checklist.map((step) => ({ ...step, completed: true }))
    const tasks = [
      { ...sampleTask, id: 1, checklist: completeChecklist },
      { ...sampleTask, id: 2, status: 'En curso' as const, checklist: completeChecklist },
    ]
    const completed = updateTaskCompletion(tasks, 1, true, 'staff01')
    const reopened = updateTaskCompletion(completed, 1, false)
    const inProgress = updateTaskCompletion(tasks, 2, true, 'staff02')

    expect(completed[0]).toMatchObject({ completed: true, status: 'Listo', completedBy: 'staff01' })
    expect(reopened[0]).toMatchObject({ completed: false, status: 'Pendiente' })
    expect(reopened[0].completedBy).toBeUndefined()
    expect(inProgress[1]).toMatchObject({ completed: true, status: 'Listo', completedBy: 'staff02' })
    expect(tasks[0]).toMatchObject({ completed: false, status: 'Pendiente' })
  })

  it('adds a task with the next available id and cycles its status', () => {
    const tasks = [{ ...sampleTask, id: 2 }, { ...sampleTask, id: 8 }]
    const taskWithCompleteChecklist = {
      ...sampleTask,
      checklist: sampleTask.checklist.map((step) => ({ ...step, completed: true })),
    }
    const added = addTask(tasks, taskWithCompleteChecklist)

    expect(added[2].id).toBe(9)
    expect(updateTaskStatus(added, 9)[2]).toMatchObject({ status: 'En curso', completed: false })
    expect(updateTaskStatus(updateTaskStatus(added, 9), 9)[2]).toMatchObject({ status: 'Listo', completed: true })
    expect(updateTaskStatus(updateTaskStatus(updateTaskStatus(added, 9), 9), 9)[2]).toMatchObject({ status: 'Pendiente', completed: false })
    expect(tasks[1].status).toBe('Pendiente')
  })

  it('removes the requested task without mutating the original list', () => {
    const tasks = [{ ...sampleTask, id: 1 }, { ...sampleTask, id: 2 }]
    const remaining = removeTask(tasks, 1)

    expect(remaining.map((task) => task.id)).toEqual([2])
    expect(tasks).toHaveLength(2)
  })

  it('updates only incomplete tasks without mutating the original data', () => {
    const tasks: CalendarTask[] = [
      { ...sampleTask, id: 1 },
      { ...sampleTask, id: 2, completed: true, status: 'Listo' },
    ]
    const { completed: _completed, ...details } = {
      ...sampleTask,
      title: 'Montar buffet',
      checklist: createChecklistSteps('Ordenar platos\nRevisar temperatura'),
    }

    expect(updateTaskDetails(tasks, 1, details)[0]).toMatchObject({
      title: 'Montar buffet',
      completed: false,
      checklist: [
        { text: 'Ordenar platos', completed: false },
        { text: 'Revisar temperatura', completed: false },
      ],
    })
    expect(() => updateTaskDetails(tasks, 2, details)).toThrow('No se pueden editar tareas completadas')
    expect(tasks[0].title).toBe('Preparar desayuno')
  })

  it('imports valid task files and rejects duplicates and invalid data', () => {
    const serialized = JSON.stringify([{ ...sampleTask, id: 1 }])

    expect(parseTasksJson(serialized)).toEqual([{ ...sampleTask, id: 1 }])
    expect(() => parseTasksJson('{')).toThrow()
    expect(() => parseTasksJson(JSON.stringify([{ ...sampleTask, id: 1 }, { ...sampleTask, id: 1 }])))
      .toThrow('identificadores de tareas duplicados')
  })

  it('persists and restores task data', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const tasks = [{ ...sampleTask, id: 1 }]

    saveTasks(storage, tasks)

    expect(loadTasks(storage, [])).toEqual(tasks)
  })

  it('persists the account that completed a task', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const completedTasks = updateChecklistStep(
      [{ ...sampleTask, id: 1 }],
      1,
      1,
      true,
      'equipo01',
    )
    const finalTasks = updateChecklistStep(completedTasks, 1, 2, true, 'equipo01')

    saveTasks(storage, finalTasks)

    expect(loadTasks(storage, [])[0].completedBy).toBe('equipo01')
  })

  it('loads saved tasks on startup instead of replacing them with seed tasks', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const savedTasks = [{ ...sampleTask, id: 77, title: 'Tarea persistida' }]
    const seedTasks = createInitialTasks(new Date(2026, 9, 10))

    saveTasks(storage, savedTasks)

    expect(loadTasks(storage, seedTasks)).toEqual(savedTasks)
  })

  it('migrates stored tasks created before completion checkboxes existed', () => {
    const { checklist: _checklist, ...legacyTask } = sampleTask
    const storage = {
      getItem: () => JSON.stringify([{ ...legacyTask, id: 1, status: 'Listo', completed: undefined }]),
    }

    expect(loadTasks(storage, [])[0]).toMatchObject({
      completed: true,
      checklist: [
        { id: 1, completed: true },
        { id: 2, completed: true },
        { id: 3, completed: true },
      ],
    })
  })

  it('reports corrupted persisted data instead of silently replacing it', () => {
    const storage = { getItem: () => '[{"id":"wrong"}]' }
    const impossibleDateStorage = {
      getItem: () => JSON.stringify([{ ...sampleTask, id: 1, date: '2026-02-30' }]),
    }

    expect(() => loadTasks(storage, [])).toThrow('formato válido')
    expect(() => loadTasks(impossibleDateStorage, [])).toThrow('formato válido')
  })
})
