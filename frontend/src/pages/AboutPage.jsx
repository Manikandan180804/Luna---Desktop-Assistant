import React, { useState, useEffect } from 'react'
import { Download, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from '../components/Toast'

export default function AboutPage() {
  const [version, setVersion] = useState('')
  const [sysInfo, setSysInfo] = useState(null)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const v = await window.luna.getAppVersion()
        setVersion(v)
        const info = await window.luna.systemInfo()
        setSysInfo(info)
      } catch (err) {
        console.error('Failed to load system info:', err)
      }
    }
    loadData()
  }, [])

  const handleCheckUpdate = async () => {
    setChecking(true)
    try {
      const result = await window.luna.checkForUpdates()
      setUpdateInfo(result)
      if (!result.available) {
        toast.info("You're up to date!")
      } else {
        toast.success("New version available!")
      }
    } catch {
      toast.error("Couldn't check for updates")
    } finally {
      setChecking(false)
    }
  }

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>About Luna</h1>
        <p>System diagnostics, credits, and updates.</p>
      </div>

      {updateInfo?.available && (
        <div className="update-banner">
          <div className="update-banner-text">
            <Download size={20} className="text-accent" />
            <div>
              <span className="update-banner-title">Update Available (v{updateInfo.latestVersion})</span>
              <p className="update-banner-desc">A new version of Luna Desktop Assistant is ready to download.</p>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '6px 12px', minHeight: 30 }}
            onClick={() => window.luna.shellOpen(updateInfo.url || 'https://github.com/Manikandan180804/Luna---Desktop-Assistant')}
          >
            Download
          </button>
        </div>
      )}

      <div className="card about-version-card">
        <div className="about-logo-wrapper">
          <div className="chat-empty-logo" style={{ cursor: 'default', animation: 'none', width: 64, height: 64, fontSize: 26, borderRadius: 16 }}>L</div>
        </div>
        <div className="about-info-wrapper">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Luna Desktop Assistant</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            Version: {version || '0.1.0-prototype'} | Running Locally
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', minHeight: 30 }}
            onClick={handleCheckUpdate}
            disabled={checking}
          >
            <RefreshCw size={13} style={{ marginRight: 4 }} className={checking ? 'animation-spin' : ''} /> Check for updates
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} className="text-accent" /> Privacy & Local Status
          </h3>
          <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
            Luna operates 100% locally on your computer. Chat sessions, user memory, system settings, and documents are kept offline inside local application folders. No telemetry or hosted AI API paths are utilized, guaranteeing total data sovereignty.
          </p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            System Diagnostics
          </h3>
          {sysInfo ? (
            <table className="system-info-table">
              <tbody>
                <tr>
                  <td>Operating System</td>
                  <td>{sysInfo.platform} ({sysInfo.arch})</td>
                </tr>
                <tr>
                  <td>System Memory</td>
                  <td>{formatMemory(sysInfo.totalMemory)}</td>
                </tr>
                <tr>
                  <td>CPU Cores</td>
                  <td>{sysInfo.cpus} threads</td>
                </tr>
                <tr>
                  <td>Hostname</td>
                  <td>{sysInfo.hostname}</td>
                </tr>
                <tr>
                  <td>Node Runtime</td>
                  <td>{sysInfo.nodeVersion}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">Retrieving system diagnostics...</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Credits & Technologies</h3>
        <div className="credits-list">
          <p><strong>Ollama:</strong> Serving the local LLMs (Llama, Qwen, Phi, Mistral) over high-performance local APIs.</p>
          <p><strong>Electron:</strong> Powering the secure local desktop shell for native OS window rendering.</p>
          <p><strong>React & Vite:</strong> Building the responsive, modern UI client bundle.</p>
          <p><strong>Lucide React:</strong> Providing clear, modern vector iconography.</p>
          <div className="divider" style={{ margin: '12px 0' }} />
          <p className="text-xs text-muted">MIT License. Created as a privacy-focused assistant prototype.</p>
        </div>
      </div>
    </div>
  )
}
