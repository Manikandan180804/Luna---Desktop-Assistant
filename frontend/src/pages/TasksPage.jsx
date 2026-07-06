import React, { useMemo, useState } from 'react'
import { Check, CheckSquare, ClipboardList, FilePenLine, Mail, Plus, Trash2, Bell, FolderCog, Play, Search, FolderSync } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from '../context/AppContext'
import { toast } from '../components/Toast'

const PRIORITIES = ['high', 'medium', 'low']
const AUTOMATIONS = [
  { id: 'note', label: 'Note', icon: FilePenLine },
  { id: 'email', label: 'Email draft', icon: Mail },
  { id: 'reminder', label: 'Reminder', icon: Bell },
  { id: 'file', label: 'File Action', icon: FolderCog },
  { id: 'launch', label: 'Launch App', icon: Play },
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

  // File automation states
  const [fileSubAction, setFileSubAction] = useState('organize') // 'rename' | 'organize' | 'search'
  const [sourcePath, setSourcePath] = useState('')
  const [destPath, setDestPath] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const addTask = async () => {
    if (!newTask.trim()) return
    await saveTasks([makeTask(newTask.trim(), priority), ...tasks])
    setNewTask('')
    toast.success('Task added')
  }

  const handleBrowseFile = async (target) => {
    try {
      const files = await window.luna.openFileDialog()
      if (files && files.length > 0) {
        if (target === 'source') {
          setSourcePath(files[0].path)
        } else if (target === 'folder') {
          const fp = files[0].path
          const dir = fp.substring(0, fp.replace(/\\/g, '/').lastIndexOf('/'))
          setFolderPath(dir)
        }
      }
    } catch {
      toast.error('Failed to open file browser')
    }
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

    if (automation === 'note') {
      if (!prompt) return
      await saveNote({
        id: uuidv4(),
        title: `Note: ${prompt.slice(0, 42)}`,
        body: prompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await saveTasks([makeTask(`Created note from: ${prompt.slice(0, 80)}`, 'low', { kind: 'automation' }), ...tasks])
      toast.success('Note created')
      setAutomationInput('')
    }

    if (automation === 'email') {
      if (!prompt) return
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
      setAutomationInput('')
    }

    if (automation === 'reminder') {
      if (!prompt) return
      // Parse potential delays like "in 5 seconds" or "in 10 minutes"
      let delayMs = 0
      const secondsMatch = prompt.match(/in\s+(\d+)\s+sec/i)
      const minutesMatch = prompt.match(/in\s+(\d+)\s+min/i)

      if (secondsMatch) {
        delayMs = parseInt(secondsMatch[1]) * 1000
      } else if (minutesMatch) {
        delayMs = parseInt(minutesMatch[1]) * 60 * 1000
      } else {
        // default to 10 seconds for user feedback / instant demonstration if unspecified
        delayMs = 10000
      }

      const delayText = delayMs >= 60000 ? `${delayMs / 60000} min` : `${delayMs / 1000} sec`
      const cleanText = prompt.replace(/in\s+\d+\s+(?:sec|min)\w*/gi, '').trim()

      const reminder = makeTask(cleanText || prompt, 'high', { kind: 'reminder', dueText: `Alert in ${delayText}` })
      await saveTasks([reminder, ...tasks])
      toast.success(`Reminder set for ${delayText}`)

      setTimeout(async () => {
        if (settings.notifications) {
          await window.luna.notify('Luna Reminder Alert', cleanText || prompt)
        }
        toast.info(`REMINDER: ${cleanText || prompt}`)
      }, delayMs)

      setAutomationInput('')
    }

    if (automation === 'file') {
      if (fileSubAction === 'rename') {
        if (!sourcePath.trim() || !destPath.trim()) {
          toast.error('Please specify both source and destination paths.')
          return
        }
        const res = await window.luna.renameFile(sourcePath.trim(), destPath.trim())
        if (res.success) {
          toast.success('File renamed successfully')
          await saveTasks([makeTask(`Renamed file: ${sourcePath} -> ${destPath}`, 'medium', { kind: 'file-action' }), ...tasks])
          setSourcePath('')
          setDestPath('')
        } else {
          toast.error(`Rename failed: ${res.error}`)
        }
      }

      if (fileSubAction === 'organize') {
        if (!folderPath.trim()) {
          toast.error('Please specify folder path.')
          return
        }
        const res = await window.luna.organizeFolder(folderPath.trim())
        if (res.success) {
          toast.success(`Organized folder: moved ${res.movedCount} files`)
          await saveTasks([makeTask(`Organized files in folder: ${folderPath} (${res.movedCount} files moved)`, 'medium', { kind: 'file-action' }), ...tasks])
          setFolderPath('')
        } else {
          toast.error(`Organization failed: ${res.error}`)
        }
      }

      if (fileSubAction === 'search') {
        if (!folderPath.trim() || !searchQuery.trim()) {
          toast.error('Please specify folder path and search query.')
          return
        }
        const res = await window.luna.searchFiles(folderPath.trim(), searchQuery.trim())
        if (res.success) {
          setSearchResults(res.results)
          toast.success(`Found ${res.results.length} files`)
          await saveTasks([makeTask(`Searched folder: ${folderPath} for "${searchQuery}"`, 'low', { kind: 'file-action' }), ...tasks])
        } else {
          toast.error(`Search failed: ${res.error}`)
        }
      }
    }

    if (automation === 'launch') {
      const app = automationInput.trim()
      if (!app) return
      const res = await window.luna.launchApp(app)
      if (res.success) {
        toast.success(`Launched ${app}`)
        await saveTasks([makeTask(`Launched application: ${app}`, 'low', { kind: 'automation' }), ...tasks])
        setAutomationInput('')
      } else {
        toast.error(`Failed to launch ${app}: ${res.error}`)
      }
    }
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
          <div className="tabs" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 4 }}>
            {AUTOMATIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`tab ${automation === id ? 'active' : ''}`} onClick={() => setAutomation(id)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          
          {automation === 'file' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex gap-2" style={{ marginBottom: 4 }}>
                {['rename', 'organize', 'search'].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className={`tab ${fileSubAction === sub ? 'active' : ''}`}
                    onClick={() => {
                      setFileSubAction(sub)
                      setSearchResults([])
                    }}
                    style={{ padding: '4px 10px', fontSize: 11 }}
                  >
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </button>
                ))}
              </div>
              
              {fileSubAction === 'rename' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="flex gap-2">
                    <input
                      className="input-field"
                      style={{ flex: 1 }}
                      placeholder="Source file path..."
                      value={sourcePath}
                      onChange={(e) => setSourcePath(e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={() => handleBrowseFile('source')} style={{ fontSize: 11 }}>
                      Browse
                    </button>
                  </div>
                  <input
                    className="input-field"
                    placeholder="Destination file path..."
                    value={destPath}
                    onChange={(e) => setDestPath(e.target.value)}
                  />
                </div>
              )}
              
              {fileSubAction === 'organize' && (
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Folder path to organize..."
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                  />
                  <button className="btn btn-secondary" onClick={() => handleBrowseFile('folder')} style={{ fontSize: 11 }}>
                    Browse
                  </button>
                </div>
              )}
              
              {fileSubAction === 'search' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="flex gap-2">
                    <input
                      className="input-field"
                      style={{ flex: 1 }}
                      placeholder="Folder path to search..."
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={() => handleBrowseFile('folder')} style={{ fontSize: 11 }}>
                      Browse
                    </button>
                  </div>
                  <input
                    className="input-field"
                    placeholder="Search query (regex or text)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
              
              <button className="btn btn-primary" onClick={runAutomation} style={{ width: '100%', marginTop: 4 }}>
                <FolderSync size={14} /> Execute File Action
              </button>
              
              {searchResults.length > 0 && (
                <div className="search-results-list" style={{ marginTop: 8, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: 'var(--text-secondary)' }}>Search Results ({searchResults.length})</div>
                  <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {searchResults.map((file, idx) => (
                      <div key={idx} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 6px', background: 'rgba(255,255,255,0.01)', borderRadius: 4 }}>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }} title={file.path}>{file.name}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="input-field"
                style={{ flex: 1 }}
                placeholder={
                  automation === 'launch'
                    ? 'Enter app name (e.g. notepad, chrome)...'
                    : automation === 'reminder'
                    ? 'Remind me to... (e.g., Stretch in 10 seconds)'
                    : 'Describe the action...'
                }
                value={automationInput}
                onChange={(event) => setAutomationInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && runAutomation()}
              />
              <button className="btn btn-primary" onClick={runAutomation}>
                <ClipboardList size={14} /> Run
              </button>
            </div>
          )}
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
