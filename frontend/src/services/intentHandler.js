/**
 * intentHandler.js
 * Parses a natural language prompt into a structured action intent that
 * Luna can execute directly — independently of the AI model response.
 *
 * Each returned intent has the shape:
 *   { type: string, ...params }
 *
 * Possible types:
 *   SUMMARIZE_PDF   – user wants to summarize an attached / specific file
 *   CREATE_REMINDER – user wants a timed reminder
 *   SEARCH_FILES    – user wants to find a file
 *   OPEN_APP        – user wants to launch an application
 *   ORGANIZE_FOLDER – user wants to organize a folder
 *   OPEN_URL        – user wants to open a URL/website
 *   COMPOSE_EMAIL   – user wants to draft/send an email
 *   null            – no specific action intent detected
 */

// ─── App registry ─────────────────────────────────────────────────────────────
export const APP_MAP = {
  // Browsers
  chrome: { command: 'start chrome', label: 'Google Chrome', url: null },
  firefox: { command: 'start firefox', label: 'Firefox', url: null },
  edge: { command: 'start msedge', label: 'Microsoft Edge', url: null },
  browser: { command: 'start chrome', label: 'Browser', url: null },

  // Productivity
  notepad: { command: 'notepad.exe', label: 'Notepad', url: null },
  wordpad: { command: 'wordpad.exe', label: 'WordPad', url: null },
  excel: { command: 'start excel', label: 'Excel', url: null },
  word: { command: 'start winword', label: 'Word', url: null },
  powerpoint: { command: 'start powerpnt', label: 'PowerPoint', url: null },
  vscode: { command: 'code .', label: 'VS Code', url: null },
  'visual studio code': { command: 'code .', label: 'VS Code', url: null },

  // Media
  spotify: { command: null, label: 'Spotify', url: 'https://open.spotify.com' },
  music: { command: null, label: 'Spotify', url: 'https://open.spotify.com' },
  youtube: { command: null, label: 'YouTube', url: 'https://youtube.com' },
  netflix: { command: null, label: 'Netflix', url: 'https://netflix.com' },
  'media player': { command: 'start wmplayer', label: 'Windows Media Player', url: null },
  vlc: { command: 'vlc', label: 'VLC', url: null },

  // System
  explorer: { command: 'explorer.exe', label: 'File Explorer', url: null },
  'file explorer': { command: 'explorer.exe', label: 'File Explorer', url: null },
  calculator: { command: 'calc.exe', label: 'Calculator', url: null },
  calc: { command: 'calc.exe', label: 'Calculator', url: null },
  paint: { command: 'mspaint.exe', label: 'MS Paint', url: null },
  cmd: { command: 'cmd.exe', label: 'Command Prompt', url: null },
  terminal: { command: 'wt.exe', label: 'Windows Terminal', url: null },
  powershell: { command: 'powershell.exe', label: 'PowerShell', url: null },
  'task manager': { command: 'taskmgr.exe', label: 'Task Manager', url: null },

  // Social / Web
  gmail: { command: null, label: 'Gmail', url: 'https://mail.google.com' },
  twitter: { command: null, label: 'Twitter/X', url: 'https://twitter.com' },
  instagram: { command: null, label: 'Instagram', url: 'https://instagram.com' },
  linkedin: { command: null, label: 'LinkedIn', url: 'https://linkedin.com' },
  github: { command: null, label: 'GitHub', url: 'https://github.com' },
  google: { command: null, label: 'Google', url: 'https://google.com' },
  reddit: { command: null, label: 'Reddit', url: 'https://reddit.com' },
  discord: { command: 'discord', label: 'Discord', url: null },
  slack: { command: 'slack', label: 'Slack', url: null },
  zoom: { command: 'zoom', label: 'Zoom', url: null },
}

// ─── Folder aliases ────────────────────────────────────────────────────────────
const FOLDER_ALIASES = {
  downloads: '%USERPROFILE%\\Downloads',
  desktop: '%USERPROFILE%\\Desktop',
  documents: '%USERPROFILE%\\Documents',
  pictures: '%USERPROFILE%\\Pictures',
  music: '%USERPROFILE%\\Music',
  videos: '%USERPROFILE%\\Videos',
}

// ─── Time parser ───────────────────────────────────────────────────────────────
function parseReminderTime(text) {
  const lower = text.toLowerCase()
  let delayMs = null
  let dueLabel = ''

  // "in X seconds/minutes/hours"
  const secMatch = lower.match(/in\s+(\d+)\s+sec/i)
  const minMatch = lower.match(/in\s+(\d+)\s+min/i)
  const hrMatch  = lower.match(/in\s+(\d+)\s+h(?:ou)?r/i)

  if (secMatch) {
    delayMs = parseInt(secMatch[1]) * 1000
    dueLabel = `in ${secMatch[1]} second${secMatch[1] === '1' ? '' : 's'}`
  } else if (minMatch) {
    delayMs = parseInt(minMatch[1]) * 60_000
    dueLabel = `in ${minMatch[1]} minute${minMatch[1] === '1' ? '' : 's'}`
  } else if (hrMatch) {
    delayMs = parseInt(hrMatch[1]) * 3_600_000
    dueLabel = `in ${hrMatch[1]} hour${hrMatch[1] === '1' ? '' : 's'}`
  }

  // "tomorrow at HH:MM" or "tomorrow morning/afternoon/evening"
  if (lower.includes('tomorrow')) {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2] || '0')
      const meridian = timeMatch[3]?.toLowerCase()
      if (meridian === 'pm' && hours < 12) hours += 12
      if (meridian === 'am' && hours === 12) hours = 0
      tomorrow.setHours(hours, minutes, 0, 0)
    } else if (lower.includes('morning')) {
      tomorrow.setHours(8, 0, 0, 0)
    } else if (lower.includes('afternoon')) {
      tomorrow.setHours(14, 0, 0, 0)
    } else if (lower.includes('evening') || lower.includes('night')) {
      tomorrow.setHours(19, 0, 0, 0)
    } else {
      tomorrow.setHours(9, 0, 0, 0)
    }
    delayMs = tomorrow.getTime() - Date.now()
    dueLabel = `tomorrow at ${tomorrow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  // "today at HH:MM"
  if (lower.includes('today')) {
    const now = new Date()
    const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2] || '0')
      const meridian = timeMatch[3]?.toLowerCase()
      if (meridian === 'pm' && hours < 12) hours += 12
      if (meridian === 'am' && hours === 12) hours = 0
      const target = new Date(now)
      target.setHours(hours, minutes, 0, 0)
      if (target > now) {
        delayMs = target.getTime() - Date.now()
        dueLabel = `today at ${target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      }
    }
  }

  // Default: 5 minutes
  if (delayMs === null) {
    delayMs = 5 * 60_000
    dueLabel = 'in 5 minutes (default)'
  }

  return { delayMs, dueLabel }
}

// ─── Topic extractor ──────────────────────────────────────────────────────────
function extractReminderTopic(text) {
  const cleaned = text
    .replace(/create\s+(a\s+)?reminder\s+(for\s+)?/i, '')
    .replace(/remind\s+me\s+(to\s+|about\s+)?/i, '')
    .replace(/set\s+(a\s+)?reminder\s+(for\s+)?/i, '')
    .replace(/alert\s+me\s+(to\s+|about\s+)?/i, '')
    .replace(/in\s+\d+\s+(sec|min|hour|hr)s?/gi, '')
    .replace(/tomorrow\s*(morning|afternoon|evening|night)?/gi, '')
    .replace(/today\s*/gi, '')
    .replace(/at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'Reminder'
}

// ─── File search type extractor ────────────────────────────────────────────────
function extractFileQuery(text) {
  const lower = text.toLowerCase()
  // Try to extract the thing being searched for
  const patterns = [
    /(?:find|locate|search\s+for|where\s+is)\s+(?:my\s+)?(.+?)(?:\s+(?:file|document|pdf|in|on|at)|\s*$)/i,
    /(?:find|locate|search\s+for|where\s+is)\s+(.+)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].replace(/\.$/, '').trim()
    }
  }
  // Fallback: common file types
  const types = ['resume', 'cv', 'report', 'invoice', 'contract', 'photo', 'image', 'pdf', 'document']
  return types.find(t => lower.includes(t)) || 'file'
}

// ─── App extractor ────────────────────────────────────────────────────────────
function extractApp(text) {
  const lower = text.toLowerCase()
  // Try longest-match first
  const sortedKeys = Object.keys(APP_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return { key, ...APP_MAP[key] }
    }
  }
  // Fallback: grab the word after "open" / "launch" / "start"
  const verbMatch = lower.match(/(?:open|launch|start)\s+([a-z0-9\s]+?)(?:\s+please|\s+now|\s*$)/i)
  if (verbMatch) {
    const candidate = verbMatch[1].trim()
    return { key: candidate, command: candidate, label: candidate, url: null }
  }
  return null
}

// ─── Folder extractor ─────────────────────────────────────────────────────────
function extractFolder(text) {
  const lower = text.toLowerCase()
  for (const [alias, path] of Object.entries(FOLDER_ALIASES)) {
    if (lower.includes(alias)) return { alias, path }
  }
  return { alias: 'Downloads', path: FOLDER_ALIASES.downloads }
}

// ─── Main intent parser ────────────────────────────────────────────────────────
export function parseIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') return null
  const lower = prompt.toLowerCase().trim()

  // ── Summarize PDF / file ────────────────────────────────────────────────────
  if (
    lower.includes('summarize') ||
    lower.includes('summary') ||
    (lower.includes('read') && (lower.includes('pdf') || lower.includes('file') || lower.includes('document'))) ||
    lower.includes('what does this say') ||
    lower.includes('what is in this')
  ) {
    return { type: 'SUMMARIZE_PDF' }
  }

  // ── Create reminder ─────────────────────────────────────────────────────────
  if (
    lower.includes('reminder') ||
    lower.includes('remind me') ||
    lower.includes('set an alarm') ||
    lower.includes('alert me') ||
    (lower.includes('remind') && lower.includes('to'))
  ) {
    const topic = extractReminderTopic(prompt)
    const { delayMs, dueLabel } = parseReminderTime(prompt)
    return { type: 'CREATE_REMINDER', topic, delayMs, dueLabel }
  }

  // ── Find / search file ──────────────────────────────────────────────────────
  if (
    (lower.includes('find') || lower.includes('locate') || lower.includes('search for') || lower.includes('where is')) &&
    (lower.includes('file') || lower.includes('document') || lower.includes('pdf') ||
     lower.includes('resume') || lower.includes('photo') || lower.includes('invoice') ||
     lower.includes('cv') || lower.includes('report') || lower.includes('my '))
  ) {
    const query = extractFileQuery(prompt)
    return { type: 'SEARCH_FILES', query }
  }

  // ── Organize folder ─────────────────────────────────────────────────────────
  if (
    lower.includes('organiz') ||
    lower.includes('clean up') ||
    lower.includes('sort my') ||
    lower.includes('tidy up') ||
    (lower.includes('organize') && (lower.includes('folder') || lower.includes('downloads') || lower.includes('desktop')))
  ) {
    const { alias, path } = extractFolder(prompt)
    return { type: 'ORGANIZE_FOLDER', folder: alias, path }
  }

  // ── Open / Launch app ───────────────────────────────────────────────────────
  if (
    lower.includes('open') ||
    lower.includes('launch') ||
    lower.includes('start ') ||
    lower.includes('run ')
  ) {
    const app = extractApp(prompt)
    if (app) {
      if (app.url) return { type: 'OPEN_URL', url: app.url, label: app.label }
      return { type: 'OPEN_APP', appKey: app.key, command: app.command, label: app.label }
    }
  }

  // ── Email / draft ───────────────────────────────────────────────────────────
  if (lower.includes('email') || lower.includes('draft') || lower.includes('compose') || lower.includes('send a message')) {
    const emailMatch = prompt.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/)
    return { type: 'COMPOSE_EMAIL', to: emailMatch?.[1] || '' }
  }

  // ── Smart Device Control ──────────────────────────────────────────────────
  if (
    lower.includes('turn on') ||
    lower.includes('turn off') ||
    lower.includes('switch on') ||
    lower.includes('switch off') ||
    lower.includes('toggle') ||
    lower.includes('dim ') ||
    lower.includes('set temperature') ||
    lower.includes('set thermostat') ||
    lower.includes('adjust temperature') ||
    lower.includes('adjust thermostat') ||
    lower.includes('set the temperature') ||
    lower.includes('set the thermostat') ||
    lower.includes('play music') ||
    lower.includes('pause music') ||
    lower.includes('set volume') ||
    (lower.includes('light') && (lower.includes('on') || lower.includes('off') || lower.includes('brightness'))) ||
    (lower.includes('plug') && (lower.includes('on') || lower.includes('off'))) ||
    (lower.includes('thermostat') && (lower.includes('set') || lower.includes('temperature') || lower.includes('degrees'))) ||
    (lower.includes('speaker') && (lower.includes('volume') || lower.includes('mute') || lower.includes('play') || lower.includes('pause')))
  ) {
    let action = 'turn_on'
    if (lower.includes('turn off') || lower.includes('switch off') || lower.includes('pause')) {
      action = 'turn_off'
    } else if (lower.includes('set') || lower.includes('dim') || lower.includes('adjust') || lower.includes('brightness') || lower.includes('volume') || lower.includes('degrees')) {
      action = 'set_value'
    }

    // Extract value (e.g. degrees, percentage, volume)
    let value = null
    const numMatch = lower.match(/(\d+)/)
    if (numMatch) {
      value = parseInt(numMatch[1])
    }

    // Clean device name by removing stop words and verbs
    let deviceName = prompt
      .replace(/turn\s+on\s+(the\s+)?/i, '')
      .replace(/turn\s+off\s+(the\s+)?/i, '')
      .replace(/switch\s+on\s+(the\s+)?/i, '')
      .replace(/switch\s+off\s+(the\s+)?/i, '')
      .replace(/toggle\s+(the\s+)?/i, '')
      .replace(/set\s+(the\s+)?/i, '')
      .replace(/dim\s+(the\s+)?/i, '')
      .replace(/adjust\s+(the\s+)?/i, '')
      .replace(/play\s+music\s+(on\s+)?/i, '')
      .replace(/pause\s+music\s+(on\s+)?/i, '')
      .replace(/set\s+volume\s+(to\s+)?/i, '')
      .replace(/set\s+temperature\s+(to\s+)?/i, '')
      .replace(/set\s+thermostat\s+(to\s+)?/i, '')
      .replace(/to\s+\d+(\s*%)?(\s*degrees)?/i, '')
      .replace(/at\s+\d+(\s*%)?(\s*degrees)?/i, '')
      .replace(/\d+(\s*%)?(\s*degrees)?/i, '')
      .replace(/please/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Fallbacks if clean resulted in empty
    if (!deviceName) {
      if (lower.includes('light')) deviceName = 'light'
      else if (lower.includes('plug')) deviceName = 'plug'
      else if (lower.includes('thermostat')) deviceName = 'thermostat'
      else if (lower.includes('speaker')) deviceName = 'speaker'
      else deviceName = 'device'
    }

    return { type: 'SMART_DEVICE_CONTROL', deviceName, action, value }
  }

  return null
}
