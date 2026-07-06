import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let _addToast = null
export const toast = {
  success: (msg) => _addToast?.({ type: 'success', msg }),
  error: (msg) => _addToast?.({ type: 'error', msg }),
  info: (msg) => _addToast?.({ type: 'info', msg }),
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  _addToast = useCallback((t) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500)
  }, [])

  const icons = { success: <CheckCircle size={15} color="var(--success)"/>, error: <AlertCircle size={15} color="var(--danger)"/>, info: <Info size={15} color="var(--accent-light)"/> }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {icons[t.type]}
          <span style={{flex:1,fontSize:13}}>{t.msg}</span>
          <button className="btn-ghost" style={{padding:2}} onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}><X size={13}/></button>
        </div>
      ))}
    </div>
  )
}
