import React, { useState, useMemo } from 'react'
import { RefreshCw, Plus, Cpu } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ModelCard from '../components/ModelCard'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { toast } from '../components/Toast'

const SHORTLIST = [
  { name: 'llama3.2', ram: '4-6 GB', quality: 'Good', speed: 'Fast', bestFor: 'Fast everyday chat and planning' },
  { name: 'llama3.2-vision', ram: '6-8 GB', quality: 'Excellent (Vision)', speed: 'Fast', bestFor: 'Vision and image understanding (recommended for uploads)' },
  { name: 'phi3', ram: '6-8 GB', quality: 'Very Good', speed: 'Medium', bestFor: 'Compact reasoning on modest machines' },
  { name: 'qwen2.5:1.5b', ram: '2-4 GB', quality: 'Standard', speed: 'Very Fast', bestFor: 'Fast execution, multi-lingual' },
  { name: 'mistral', ram: '8-12 GB', quality: 'Excellent', speed: 'Medium', bestFor: 'Stronger drafting and summaries' },
]

export default function ModelsPage() {
  const { settings, saveSettings, availableModels, ollamaStatus, checkOllama } = useApp()
  const [pulling, setPulling] = useState({}) // { [modelName]: percent }
  const [confirmDelete, setConfirmDelete] = useState(null) // modelName | null
  const [customModel, setCustomModel] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await checkOllama()
      toast.success('Ollama status refreshed')
    } catch {
      toast.error('Failed to check Ollama status')
    } finally {
      setRefreshing(false)
    }
  }

  const handlePull = async (name) => {
    if (ollamaStatus !== 'online') {
      toast.error('Ollama is offline. Start Ollama to download models.')
      return
    }
    setPulling(p => ({ ...p, [name]: 0 }))
    try {
      await window.luna.pullModel(name, (percent, status) => {
        setPulling(p => ({ ...p, [name]: percent }))
      })
      toast.success(`${name} is ready!`)
      await checkOllama()
    } catch {
      toast.error(`Failed to download ${name}`)
    } finally {
      setPulling(p => {
        const next = { ...p }
        delete next[name]
        return next
      })
    }
  }

  const handleCancel = async (name) => {
    try {
      await window.luna.cancelPullModel(name)
      toast.info(`Download of ${name} cancelled`)
    } catch {
      toast.error(`Failed to cancel download`)
    }
  }

  const handleDelete = async (name) => {
    if (name === settings.model) {
      toast.error("Cannot delete your active model. Switch models first.")
      setConfirmDelete(null)
      return
    }
    try {
      const success = await window.luna.deleteModel(name)
      if (success) {
        toast.success(`${name} removed`)
        await checkOllama()
      } else {
        toast.error(`Failed to remove ${name}`)
      }
    } catch {
      toast.error(`Failed to remove ${name}`)
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleUseModel = async (name) => {
    try {
      await saveSettings({ model: name })
      toast.success(`Selected model: ${name}`)
    } catch {
      toast.error('Failed to set active model')
    }
  }

  const handlePullCustom = () => {
    const trimmed = customModel.trim()
    if (!trimmed) return
    handlePull(trimmed)
    setCustomModel('')
  }

  // Construct models list: combine shortlist + installed models not on the shortlist
  const allModels = useMemo(() => {
    const list = [...SHORTLIST]
    
    // Find installed models that are not in our shortlist
    availableModels.forEach(installedModel => {
      const isShortlisted = SHORTLIST.some(s => 
        installedModel.name === s.name || 
        installedModel.name.startsWith(s.name + ':') || 
        s.name.startsWith(installedModel.name.split(':')[0])
      )
      
      if (!isShortlisted) {
        const ram = installedModel.details?.parameter_size ? `${installedModel.details.parameter_size} params` : ''
        const quality = installedModel.details?.quantization_level || ''
        const speed = installedModel.details?.family || ''
        list.push({
          name: installedModel.name,
          ram,
          quality,
          speed,
          bestFor: 'Custom installed model.',
          isCustom: true
        })
      }
    })
    
    return list
  }, [availableModels])

  const getInstalledModelFullName = (shortlistName) => {
    const found = availableModels.find(m => 
      m.name === shortlistName || 
      m.name.startsWith(shortlistName + ':') || 
      shortlistName.startsWith(m.name.split(':')[0])
    )
    return found ? found.name : null
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Model Manager</h1>
        <p>Download and manage local Ollama models.</p>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`status-dot ${ollamaStatus}`} />
            <span style={{ fontWeight: 600 }}>Ollama Connection:</span>
            <span style={{ textTransform: 'capitalize', color: ollamaStatus === 'online' ? 'var(--success)' : 'var(--danger)' }}>
              {ollamaStatus}
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', minHeight: 30 }} 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={13} style={{ marginRight: 4 }} /> Recheck
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Cpu size={18} /> Available Models
      </h2>

      <div className="model-grid">
        {allModels.map(model => {
          const installedFullName = getInstalledModelFullName(model.name)
          const isInstalled = installedFullName !== null
          const displayName = installedFullName || model.name
          const isActive = settings.model === displayName
          
          return (
            <ModelCard 
              key={model.name}
              model={{ ...model, name: displayName }}
              installed={isInstalled}
              active={isActive}
              pullPercent={pulling[displayName]}
              onDownload={handlePull}
              onUse={handleUseModel}
              onDelete={setConfirmDelete}
              onCancel={handleCancel}
            />
          )
        })}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Add Custom Model
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          You can download any model from the official Ollama library (e.g., <code>gemma2:2b</code>, <code>llama3.2:1b</code>, <code>coder</code>).
        </p>
        <div className="flex gap-2" style={{ maxWidth: 500 }}>
          <input 
            type="text" 
            className="input-field" 
            style={{ minHeight: 36 }}
            placeholder="e.g., gemma2:2b" 
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
          />
          <button 
            className="btn btn-primary" 
            style={{ minHeight: 36, padding: '0 16px' }}
            onClick={handlePullCustom}
            disabled={!customModel.trim() || pulling[customModel.trim()] !== undefined}
          >
            Download
          </button>
        </div>
      </div>

      <ConfirmDeleteModal 
        open={confirmDelete !== null} 
        modelName={confirmDelete}
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
