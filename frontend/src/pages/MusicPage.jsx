import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, Volume2, Music, ListMusic, Plus, Trash2, Sliders } from 'lucide-react'
import { toast } from '../components/Toast'

export default function MusicPage() {
  const [playlist, setPlaylist] = useState([
    { id: '1', name: 'Ambient Chill Out', artist: 'Luna AI', duration: '3:45', url: '' },
    { id: '2', name: 'Cyberpunk Focus Beats', artist: 'Synthetic Echo', duration: '4:12', url: '' }
  ])
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  const currentTrack = playlist[currentTrackIdx] || null

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const handlePlayPause = () => {
    if (!audioRef.current) return
    if (!currentTrack?.url) {
      toast.info('Please select or upload a local music track first!')
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {
        toast.error('Failed to play audio file')
      })
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleAudioEnded = () => {
    handleNext()
  }

  const handleNext = () => {
    if (playlist.length <= 1) return
    const nextIdx = (currentTrackIdx + 1) % playlist.length
    playTrack(nextIdx)
  }

  const playTrack = (idx) => {
    setCurrentTrackIdx(idx)
    setIsPlaying(false)
    setCurrentTime(0)
    
    // Set timeout to let state resolve before loading and playing
    setTimeout(() => {
      if (audioRef.current && playlist[idx]?.url) {
        audioRef.current.load()
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => toast.error('Error playing track'))
      }
    }, 50)
  }

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const handleAddLocalFile = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newTracks = Array.from(files).map((file, idx) => {
      const url = URL.createObjectURL(file)
      return {
        id: (Date.now() + idx).toString(),
        name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
        artist: 'Local File',
        duration: '--:--',
        url: url
      }
    })

    setPlaylist(prev => [...prev, ...newTracks])
    toast.success(`Added ${newTracks.length} track(s) to playlist`)
    
    // If playlist had no playable tracks, select the first newly added one
    if (!currentTrack?.url && newTracks.length > 0) {
      setCurrentTrackIdx(playlist.length)
    }
  }

  const handleDeleteTrack = (id, e) => {
    e.stopPropagation()
    const trackIdx = playlist.findIndex(t => t.id === id)
    if (trackIdx === currentTrackIdx && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    }
    const updated = playlist.filter(t => t.id !== id)
    setPlaylist(updated)
    
    if (trackIdx === currentTrackIdx) {
      setCurrentTrackIdx(0)
    } else if (trackIdx < currentTrackIdx) {
      setCurrentTrackIdx(currentTrackIdx - 1)
    }
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Music Player</h1>
          <p>Play your local files offline with zero network latency.</p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          <Plus size={14} /> Add Local Audio
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAddLocalFile}
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
      />

      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
        {/* Visual Player */}
        <div className="card flex flex-col items-center justify-center" style={{ padding: 24, textAlign: 'center', minHeight: 380, position: 'relative', overflow: 'hidden' }}>
          {/* Equalizer overlay */}
          <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end', marginBottom: 20 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  background: 'var(--primary)',
                  borderRadius: 3,
                  height: isPlaying ? `${Math.floor(Math.random() * 50) + 10}px` : '4px',
                  transition: 'height 0.15s ease-in-out',
                  opacity: 0.8
                }}
              />
            ))}
          </div>

          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
            }}
          >
            <Music size={40} style={{ color: 'var(--primary)', animation: isPlaying ? 'spin 12s linear infinite' : 'none' }} />
          </div>

          <div style={{ fontWeight: 600, fontSize: 16, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTrack?.name || 'No Track Selected'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {currentTrack?.artist || 'Select a track from the playlist'}
          </div>

          {/* Timeline slider */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              style={{
                width: '100%',
                accentColor: 'var(--primary)',
                background: 'rgba(255,255,255,0.1)',
                height: 4,
                borderRadius: 2,
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-4 items-center" style={{ marginBottom: 20 }}>
            <button className="btn btn-secondary btn-icon" onClick={handlePlayPause} style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none' }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button className="btn btn-secondary btn-icon" onClick={handleNext} disabled={playlist.length <= 1} title="Next Track">
              <SkipForward size={16} />
            </button>
          </div>

          {/* Volume Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '60%', margin: '0 auto' }}>
            <Volume2 size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: 'var(--primary)',
                background: 'rgba(255,255,255,0.1)',
                height: 3,
                borderRadius: 1.5,
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Playlist Panel */}
        <div className="card" style={{ padding: 18, minHeight: 380 }}>
          <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListMusic size={15} /> Playlist ({playlist.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginTop: 10 }}>
            {playlist.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => track.url && playTrack(idx)}
                className={`task-item ${idx === currentTrackIdx ? 'active' : ''}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  background: idx === currentTrackIdx ? 'rgba(39, 199, 184, 0.08)' : 'rgba(255,255,255,0.01)',
                  border: idx === currentTrackIdx ? '1px solid var(--primary)' : '1px solid var(--border)',
                  cursor: track.url ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <Music size={13} style={{ color: idx === currentTrackIdx ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: idx === currentTrackIdx ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {track.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {track.artist}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{track.duration}</span>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={(e) => handleDeleteTrack(track.id, e)}
                    title="Remove Track"
                    style={{ padding: 2 }}
                  >
                    <Trash2 size={12} color="var(--danger)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
