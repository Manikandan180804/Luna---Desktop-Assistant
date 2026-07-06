import React, { useMemo, useState } from 'react'
import { Check, CheckSquare, ClipboardList, FilePenLine, Mail, Plus, Trash2, Bell, FolderCog } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

const PRIORITIES = ['high', 'medium', 'low']
const AUTOMATIONS = [
  { id: 'note', label: 'Note', icon: FilePenLine },
  { id: 'email', label: 'Email draft', icon: Mail },
  { id: 'reminder', label: 'Reminder', icon: Bell },
  { id: 'file', label: 'File action', icon: FolderCog },
]

function makeTask(text, priority = 'medium', extra = {}) {
  return {
    id: uuidv4(),
    text,
    done: false,
    priority,
    createdAt: new Date().toISOString(),
    ...extra,
  }
}

export default function TasksPage() {
  const { tasks, saveTasks, saveNote, settings } = useApp()
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')
  const [automation, setAutomation] = useState('note')
  const [automationInput, setAutomationInput] = useState('')

  const addTask = async () => {
    if (!newTask.trim()) return
    await saveTasks([makeTask(newTask.trim(), priority), ...tasks])
    setNewTask('')
    toast.success('Task added')
  }

  const toggleTask = async (id) => {
    await saveTasks(tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }

  const deleteTask = async (id) => {
    await saveTasks(tasks.filter((task) => task.id !== id))
    toast.success('Task deleted')
  }

  const clearDone = async () => {
    await saveTasks(tasks.filter((task) => !task.done))
    toast.success('Completed tasks cleared')
  }

  const runAutomation = async () => {
    const prompt = automationInput.trim()
    if (!prompt) return

    if (automation === 'note') {
      await saveNote({
        id: uuidv4(),
        title: `Note: ${prompt.slice(0, 42)}`,
        body: prompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await saveTasks([makeTask(`Created note from: ${prompt.slice(0, 80)}`, 'low', { kind: 'automation' }), ...tasks])
      toast.success('Note created')
    }

    if (automation === 'email') {
      const draft = `Subject: Follow-up\n\nHi,\n\n${prompt}\n\nBest,\n${settings.userName || 'User'}`
      await saveNote({
        id: uuidv4(),
        title: `Email draft: ${prompt.slice(0, 36)}`,
        body: draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      if (settings.permissions?.clipboard) await window.luna.writeClipboard(draft)
      await saveTasks([makeTask(`Drafted email: ${prompt.slice(0, 80)}`, 'medium', { kind: 'automation' }), ...tasks])
      toast.success(settings.permissions?.clipboard ? 'Draft saved and copied' : 'Draft saved')
    }

    if (automation === 'reminder') {
      const reminder = makeTask(prompt, 'high', { kind: 'reminder', dueText: 'Later today' })
      await saveTasks([reminder, ...tasks])
      if (settings.notifications) await window.luna.notify('Luna reminder saved', prompt)
      toast.success('Reminder captured')
    }

    if (automation === 'file') {
      const proposal = makeTask(`Review file action: ${prompt}`, 'medium', {
        kind: 'file-proposal',
        consentRequired: true,
      })
      await saveTasks([proposal, ...tasks])
      toast.info('File action saved for review')
    }

    setAutomationInput('')
  }

  const filtered = useMemo(() => {
    return tasks
      .filter((task) => (filter === 'all' ? true : filter === 'active' ? !task.done : task.done))
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
      })
  }, [tasks, filter])

  const done = tasks.filter((task) => task.done).length

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Tasks & Automation</h1>
          <p>Capture work, create local drafts, and stage sensitive desktop actions.</p>
        </div>
        {done > 0 && (
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={clearDone}>
            <Trash2 size={13} /> Clear done ({done})
          </button>
        )}
      </div>

      <div className="grid-2" style={{ gap: 16, alignItems: 'start', marginBottom: 18 }}>
        <div className="card">
          <div className="settings-section-title">Task Capture</div>
          <div className="flex gap-2 items-center">
            <input
              className="input-field"
              style={{ flex: 1 }}
              placeholder="Add a task..."
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addTask()}
            />
            <select className="input-field" style={{ width: 112 }} value={priority} onChange={(event) => setPriority(event.target.value)}>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={addTask}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="card">
          <div className="settings-section-title">Automation Runner</div>
          <div className="tabs" style={{ marginBottom: 12 }}>
            {AUTOMATIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`tab ${automation === id ? 'active' : ''}`} onClick={() => setAutomation(id)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input-field"
              style={{ flex: 1 }}
              placeholder="Describe the action..."
              value={automationInput}
              onChange={(event) => setAutomationInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && runAutomation()}
            />
            <button className="btn btn-primary" onClick={runAutomation}>
              <ClipboardList size={14} /> Run
            </button>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16, width: 'fit-content' }}>
        {['all', 'active', 'done'].map((item) => (
          <button key={item} type="button" className={`tab ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={40} />
          <p>No tasks in this view.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <div key={task.id} className="task-item">
              <button className={`task-checkbox ${task.done ? 'checked' : ''}`} onClick={() => toggleTask(task.id)} title="Toggle task">
                {task.done && <Check size={11} color="#fff" />}
              </button>
              <div className="task-main">
                <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
                {task.consentRequired && <span className="task-note">Requires explicit confirmation</span>}
                {task.dueText && <span className="task-note">{task.dueText}</span>}
              </div>
              <span className={`task-priority priority-${task.priority}`}>{task.priority}</span>
              <button className="btn btn-icon btn-ghost" onClick={() => deleteTask(task.id)} title="Delete task">
                <Trash2 size={13} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />
      <div className="flex gap-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{tasks.length} total</span>
        <span>{tasks.filter((task) => !task.done).length} remaining</span>
        <span>{done} completed</span>
      </div>
    </div>
  )
}
