import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, Brain, CheckSquare, FileText, Settings, Shield, ChevronLeft, ChevronRight, Plus, History, Cpu, Info, Plug, Menu } from 'lucide-react'
import { useApp } from '../context/AppContext'

const NAV = [
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/memory', icon: Brain, label: 'Memory' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/notes', icon: FileText, label: 'Notes' },
  { path: '/connectors', icon: Plug, label: 'Connectors' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/models', icon: Cpu, label: 'Models' },
]
const BOTTOM_NAV = [
  { path: '/privacy', icon: Shield, label: 'Privacy' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/about', icon: Info, label: 'About' },
]

import { getTranslation } from '../services/translations'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, ollamaStatus, settings, conversations, memory, tasks, createConversation, setActiveConvId } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const t = getTranslation(settings?.language || 'English')
  const navLabels = {
    '/chat': t.chat,
    '/memory': t.memory,
    '/tasks': t.tasks,
    '/notes': t.notes,
    '/connectors': 'Connectors',
    '/history': t.history,
    '/models': t.models,
    '/privacy': t.privacy,
    '/settings': t.settings,
    '/about': t.about,
  }

  const handleNewChat = async () => {
    const conv = await createConversation()
    setActiveConvId(conv.id)
    navigate('/chat')
  }

  return (
    <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        {sidebarOpen ? (
          <div className="flex items-center justify-between">
            <button className="btn btn-primary" style={{fontSize:12,padding:'6px 12px',flex:1}} onClick={handleNewChat}>
              <Plus size={13}/> {t.newChat}
            </button>
            <button
              className="btn btn-icon btn-ghost"
              style={{ marginLeft: 6, border: '1px solid var(--border)', background: 'transparent', padding: 0 }}
              onClick={() => setSidebarOpen(false)}
              title="Collapse Sidebar"
            >
              <ChevronLeft size={16}/>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <button className="btn btn-icon btn-primary" onClick={handleNewChat} title={t.newChat}><Plus size={18}/></button>
            <button
              className="btn btn-icon btn-ghost"
              style={{ border: '1px solid var(--border)', background: 'transparent', padding: 0 }}
              onClick={() => setSidebarOpen(true)}
              title="Expand Sidebar"
            >
              <ChevronRight size={16}/>
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-nav">
        {sidebarOpen && <div className="sidebar-section">{t.navigation}</div>}
        {NAV.map(({ path, icon: Icon, label }) => {
          const badge = path === '/memory' ? memory.length : path === '/tasks' ? tasks.filter(t=>!t.done).length : 0
          return (
            <div key={path} className={`sidebar-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}>
              <Icon size={16} className="icon"/>
              {sidebarOpen && <><span className="label">{navLabels[path] || label}</span>{badge > 0 && <span className="badge">{badge}</span>}</>}
            </div>
          )
        })}

        {sidebarOpen && conversations.length > 0 && (
          <>
            <div className="sidebar-section" style={{marginTop:8}}>{t.recentChats}</div>
            {conversations.slice(0,5).map(c => (
              <div key={c.id} className="sidebar-item" style={{fontSize:12}} onClick={() => { setActiveConvId(c.id); navigate('/chat') }}>
                <MessageSquare size={13} className="icon"/>
                {sidebarOpen && <span className="label" style={{overflow:'hidden',textOverflow:'ellipsis'}}>{c.title}</span>}
              </div>
            ))}
            {conversations.length > 5 && (
              <div 
                className="sidebar-item" 
                style={{ fontSize: 11, justifyContent: 'center', color: 'var(--text-muted)', minHeight: 30, padding: '4px 8px' }} 
                onClick={() => navigate('/history')}
              >
                {t.viewAllConvs}
              </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        {BOTTOM_NAV.map(({ path, icon: Icon, label }) => (
          <div key={path} className={`sidebar-item ${location.pathname === path ? 'active' : ''}`} onClick={() => navigate(path)}>
            <Icon size={16} className="icon"/>
            {sidebarOpen && <span className="label">{navLabels[path] || label}</span>}
          </div>
        ))}
        {sidebarOpen && (
          <div className="sidebar-item" style={{marginTop:4,cursor:'default'}}>
            <div className={`status-dot ${ollamaStatus}`}/>
            <span className="label text-xs" style={{color:'var(--text-muted)'}}>
              Ollama {ollamaStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
