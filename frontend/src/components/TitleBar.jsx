import React, { useState, useEffect } from 'react'
import { Minus, Sparkles, Square, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const RestoreIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" style={{ strokeLinejoin: 'round' }}>
    <path d="M3 1.5H8.5V7" />
    <rect x="1.5" y="3.5" width="5.5" height="5.5" />
  </svg>
)

export default function TitleBar() {
  const { settings, ollamaStatus } = useApp()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.luna?.onWindowStateChanged) return
    const unsubscribe = window.luna.onWindowStateChanged((state) => {
      setIsMaximized(state === 'maximized')
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <Sparkles size={13} />
        </div>
        <span className="titlebar-title">{settings?.assistantName || 'Luna'} AI Assistant</span>
        <div className="model-tag" style={{ marginLeft: 8 }}>
          <div className={`status-dot ${ollamaStatus}`} />
          {ollamaStatus === 'online' ? settings?.model || 'local' : ollamaStatus === 'checking' ? 'checking' : 'offline mock'}
        </div>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.luna.minimize()} title="Minimize">
          <Minus size={12} />
        </button>
        <button className="titlebar-btn" onClick={() => window.luna.maximize()} title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? <RestoreIcon /> : <Square size={11} />}
        </button>
        <button className="titlebar-btn close" onClick={() => window.luna.close()} title="Close">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
