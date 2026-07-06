import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import MemoryPage from './pages/MemoryPage'
import TasksPage from './pages/TasksPage'
import NotesPage from './pages/NotesPage'
import ConnectorsPage from './pages/ConnectorsPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import HistoryPage from './pages/HistoryPage'
import ModelsPage from './pages/ModelsPage'
import AboutPage from './pages/AboutPage'
import Onboarding from './pages/Onboarding'
import Toast from './components/Toast'

function BrowserBlockedScreen() {
  return (
    <div className="blocked-layout">
      <div className="blocked-card fade-in">
        <div className="blocked-logo">L</div>
        <h1>Luna Desktop Assistant</h1>
        <p>This application is built to run securely on your system as a native desktop application.</p>
        <div className="blocked-info">
          <span>Browser mode is disabled to protect your local data privacy.</span>
        </div>
        <p style={{ fontSize: 13 }}>To start the desktop application in development mode, run:</p>
        <div className="blocked-command">
          <code>npm run electron:dev</code>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Launch Luna via the terminal or application shortcut.
        </span>
      </div>
    </div>
  )
}

function AppInner() {
  const { settings } = useApp()
  if (!settings) return null
  if (!settings.onboardingComplete) return <Onboarding />
  return (
    <div className="app-layout">
      <TitleBar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/connectors" element={<ConnectorsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
      </div>
      <Toast />
    </div>
  )
}

export default function App() {
  const isBrowserFallback = window.luna?.isFallback

  if (isBrowserFallback) {
    return <BrowserBlockedScreen />
  }

  return (
    <AppProvider>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </AppProvider>
  )
}
