const MOCK_DELAY = 18

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMemoryContext(memory) {
  const pinned = memory.filter((item) => item.pinned).slice(0, 6)
  const recent = memory.filter((item) => !item.pinned).slice(0, 4)
  const selected = [...pinned, ...recent]
  if (!selected.length) return ''
  return `Known user memory:\n${selected.map((item) => `- ${item.content}`).join('\n')}`
}

const MOCK_RESPONSES = {
  English: {
    greeting: (prompt, name, memoryLine) => `I am ready in local preview mode. Ollama is not connected, so I am using ${name}'s offline mock responder instead of a cloud service.\n\nYou asked: "${prompt}"\n\nTry asking me to draft an email, make a plan, summarize an attached text file, or remember a preference.${memoryLine}`,
    email: (user, memoryLine) => `Here is a clean draft you can edit locally:\n\nSubject: Quick follow-up\n\nHi,\n\nThanks for the context. I wanted to follow up with a concise update and suggest the next practical step. Please let me know what timing works best, and I can adjust accordingly.\n\nBest,\n${user}\n\nThis was generated in offline mock mode. Connect Ollama for model-backed drafting.${memoryLine}`,
    plan: (name, memoryLine) => `I would break this into a small local plan:\n\n1. Capture the goal in Tasks.\n2. Save any durable preference in Memory.\n3. Create or attach notes for supporting details.\n4. Ask for confirmation before any file or automation action.\n\n${name} is running without a connected local model right now, so this is the built-in offline runner.${memoryLine}`,
    summary: (memoryLine) => `Summary preview:\n\n- I found the key user intent and preserved it locally.\n- The safest next step is to turn the content into tasks, notes, or a chat answer.\n- File contents are only read on this device.\n\nConnect Ollama to replace this mock summary with local model inference.${memoryLine}`
  },
  Spanish: {
    greeting: (prompt, name, memoryLine) => `Estoy listo en modo de vista previa local. Ollama no está conectado, así que estoy usando el respondedor simulado fuera de línea de ${name} en lugar de un servicio en la nube.\n\nPreguntaste: "${prompt}"\n\nIntenta pedirme que redacte un correo electrónico, haga un plan, resuma un archivo de texto adjunto o recuerde una preferencia.${memoryLine}`,
    email: (user, memoryLine) => `Aquí hay un borrador limpio que puedes editar localmente:\n\nAsunto: Seguimiento rápido\n\nHola,\n\nGracias por el contexto. Quería hacer un seguimiento con una actualización concisa y sugerir el siguiente paso práctico. Por favor, avísame qué horario te conviene más y me adaptaré en consecuencia.\n\nSaludos,\n${user}\n\nEsto fue generado en modo simulado fuera de línea. Conecta Ollama para la redacción respaldada por modelos.${memoryLine}`,
    plan: (name, memoryLine) => `Dividiría esto en un pequeño plan local:\n\n1. Capturar el objetivo en Tareas.\n2. Guardar cualquier preferencia duradera en la Memoria.\n3. Crear o adjuntar notas para detalles de apoyo.\n4. Pedir confirmación antes de cualquier acción de archivo o automatización.\n\n${name} se está ejecutando sin un modelo local conectado en este momento, por lo que este es el ejecutor fuera de línea integrado.${memoryLine}`,
    summary: (memoryLine) => `Vista previa del resumen:\n\n- Encontré la intención clave del usuario y la guardé localmente.\n- El siguiente paso más seguro es convertir el contenido en tareas, notas o una respuesta de chat.\n- El contenido del archivo solo se lee en este dispositivo.\n\nConecta Ollama para reemplazar este resumen simulado con la inferencia del modelo local.${memoryLine}`
  },
  French: {
    greeting: (prompt, name, memoryLine) => `Je suis prêt en mode aperçu local. Ollama n'est pas connecté, j'utilise donc le répondeur hors ligne de ${name} au lieu d'un service cloud.\n\nVous avez demandé : "${prompt}"\n\nEssayez de me demander de rédiger un e-mail, de faire un plan, de résumer un fichier texte joint ou de me souvenir d'une préférence.${memoryLine}`,
    email: (user, memoryLine) => `Voici un brouillon propre que vous pouvez modifier localement :\n\nObjet : Suivi rapide\n\nBonjour,\n\nMerci pour le contexte. Je voulais faire un suivi avec une mise à jour concise et suggérer la prochaine étape pratique. S'il vous plaît faites-moi savoir quel moment fonctionne le mieux, et je m'adapterai en conséquence.\n\nCordialement,\n${user}\n\nCeci a été généré en mode hors ligne. Connectez Ollama pour la rédaction assistée par modèle.${memoryLine}`,
    plan: (name, memoryLine) => `Je diviserais cela en un petit plan local :\n\n1. Enregistrez l'objectif dans les Tâches.\n2. Enregistrez toute préférence durable dans la Mémoire.\n3. Créez ou joignez des notes pour les détails de support.\n4. Demandez une confirmation avant toute action de fichier ou d'automatisation.\n\n${name} fonctionne actuellement sans modèle local connecté, il s'agit donc de l'exécuteur hors ligne intégré.${memoryLine}`,
    summary: (memoryLine) => `Aperçu du résumé :\n\n- J'ai trouvé l'intention clé de l'utilisateur et l'ai conservée localement.\n- L'étape suivante la plus sûre consiste à transformer le contenu en tâches, en notes ou en réponse de chat.\n- Le contenu du fichier est uniquement lu sur cet appareil.\n\nConnectez Ollama pour remplacer ce résumé simulé par l'inférence du modèle local.${memoryLine}`
  },
  German: {
    greeting: (prompt, name, memoryLine) => `Ich bin im lokalen Vorschaumodus bereit. Ollama ist nicht verbunden, daher verwende ich den Offline-Antworter von ${name} anstelle eines Cloud-Dienstes.\n\nSie haben gefragt: "${prompt}"\n\nVersuchen Sie, mich zu bitten, eine E-Mail zu entwerfen, einen Plan zu erstellen, eine angehängte Textdatei zusammenzufassen oder sich an eine Einstellung zu erinnern.${memoryLine}`,
    email: (user, memoryLine) => `Hier ist ein Entwurf, den Sie lokal bearbeiten können:\n\nBetreff: Kurze Nachverfolgung\n\nHallo,\n\nVielen Dank für den Kontext. Ich wollte eine kurze Aktualisierung senden und den nächsten praktischen Schritt vorschlagen. Bitte lassen Sie mich wissen, welcher Zeitpunkt am besten passt.\n\nBeste Grüße,\n${user}\n\nDies wurde im Offline-Simulationsmodus generiert. Verbinden Sie Ollama für modellgestützte Entwürfe.${memoryLine}`,
    plan: (name, memoryLine) => `Ich würde dies in einen kleinen lokalen Plan aufteilen:\n\n1. Ziel in Aufgaben erfassen.\n2. Dauerhafte Einstellungen im Speicher sichern.\n3. Notizen für unterstützende Details erstellen.\n4. Vor jeder Datei- oder Automatisierungsaktion um Bestätigung bitten.\n\n${name} läuft derzeit ohne verbundenes lokales Modell, dies ist also der integrierte Offline-Runner.${memoryLine}`,
    summary: (memoryLine) => `Zusammenfassungsvorschau:\n\n- Ich habe die wichtigste Absicht gefunden und lokal gespeichert.\n- Der sicherste nächste Schritt besteht darin, den Inhalt in Aufgaben, Notizen oder eine Chat-Antwort umzuwandeln.\n- Dateiinhalte werden nur auf diesem Gerät gelesen.\n\nVerbinden Sie Ollama, um diese Simulation durch ein echtes Modell zu ersetzen.${memoryLine}`
  }
}

function mockResponse({ prompt, settings, memory, messages }) {
  const lower = prompt.toLowerCase()
  const name = settings.assistantName || 'Luna'
  const lang = settings.language || 'English'
  const memoryLine = memory?.length
    ? (lang === 'Spanish' ? `\n\nTambién verifiqué tu memoria guardada y encontré ${memory.length} elemento(s) local(es).` :
       lang === 'French' ? `\n\nJ'ai également vérifié votre mémoire et trouvé ${memory.length} élément(s) local(aux).` :
       lang === 'German' ? `\n\nIch habe auch Ihren Speicher überprüft und ${memory.length} lokale(s) Element(e) gefunden.` :
       `\n\nI also checked your saved memory and found ${memory.length} local item${memory.length === 1 ? '' : 's'} available for context.`)
    : ''

  const hasImages = messages?.some(m => m.images && m.images.length > 0)
  if (hasImages || lower.includes('image') || lower.includes('imagen') || lower.includes('bild')) {
    return lang === 'Spanish' ? `[Respuesta Simulada] He recibido tu archivo de imagen adjunto. Conecta Ollama con un modelo de visión (como llama3.2-vision o llava) para realizar un análisis de imágenes real local.` :
           lang === 'French' ? `[Réponse Simulée] J'ai bien reçu votre image en pièce jointe. Connectez Ollama avec un modèle de vision (comme llama3.2-vision ou llava) pour effectuer une analyse d'image locale réelle.` :
           lang === 'German' ? `[Simulierte Antwort] Ich habe Ihr angehängtes Bild erhalten. Verbinden Sie Ollama mit einem Vision-Modell (wie llama3.2-vision oder llava), um eine echte lokale Bildanalyse durchzuführen.` :
           `[Mock Response] I received your image attachment. Connect Ollama with a vision model (like llama3.2-vision or llava) to perform real local image analysis!`
  }

  // Intercept system integrations keywords
  if (lower.includes('open') || lower.includes('launch') || lower.includes('start') || lower.includes('abrir') || lower.includes('ouvrir') || lower.includes('öffnen')) {
    if (lower.includes('notepad') || lower.includes('editor')) {
      return `I will launch Notepad for you.\n\n[ACTION: APP notepad]`
    }
    if (lower.includes('calc') || lower.includes('calculator') || lower.includes('calculadora')) {
      return `I will launch the Calculator application.\n\n[ACTION: APP calc]`
    }
    if (lower.includes('paint')) {
      return `I will launch MS Paint.\n\n[ACTION: APP paint]`
    }
    if (lower.includes('chrome') || lower.includes('browser') || lower.includes('navegador')) {
      return `I will launch Google Chrome.\n\n[ACTION: APP chrome]`
    }
    if (lower.includes('google')) {
      return `Opening Google Search in your default web browser.\n\n[ACTION: OPEN_URL https://google.com]`
    }
    if (lower.includes('youtube')) {
      return `Opening YouTube in your default web browser.\n\n[ACTION: OPEN_URL https://youtube.com]`
    }
    if (lower.includes('wikipedia')) {
      return `Opening Wikipedia in your default web browser.\n\n[ACTION: OPEN_URL https://wikipedia.org]`
    }
    if (lower.includes('spotify') || lower.includes('music')) {
      return `Opening Spotify Web Player.\n\n[ACTION: OPEN_URL https://open.spotify.com]`
    }
    if (lower.includes('instagram')) {
      return `Opening Instagram in your web browser.\n\n[ACTION: OPEN_URL https://instagram.com]`
    }
  }

  if (lower.includes('email') || lower.includes('draft') || lower.includes('correo') || lower.includes('courriel') || lower.includes('mail') || lower.includes('entwurf')) {
    let emailAddress = 'recipient@example.com'
    const emailMatch = prompt.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/)
    if (emailMatch) emailAddress = emailMatch[1]
    return `Opening mail client to compose email to ${emailAddress}.\n\n[ACTION: MAILTO mailto:${emailAddress}?subject=Luna%20Follow-up]`
  }

  const dict = MOCK_RESPONSES[lang] || MOCK_RESPONSES.English

  if (lower.includes('task') || lower.includes('plan') || lower.includes('tarea') || lower.includes('tâche') || lower.includes('aufgabe')) {
    return dict.plan(name, memoryLine)
  }

  if (lower.includes('summarize') || lower.includes('[file:') || lower.includes('resum') || lower.includes('zusammen')) {
    return dict.summary(memoryLine)
  }

  return dict.greeting(prompt.slice(0, 220) + (prompt.length > 220 ? '...' : ''), name, memoryLine)
}

async function streamMock(params, onToken) {
  const response = mockResponse(params)
  const chunks = response.match(/.{1,18}(\s|$)/g) || [response]
  for (const chunk of chunks) {
    await sleep(MOCK_DELAY)
    onToken(chunk)
  }
  return { provider: 'mock', content: response }
}

async function resolveModel(ollamaUrl, preferredModel) {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return preferredModel
    const data = await res.json()
    const models = data.models || []
    if (models.length === 0) return preferredModel
    const installedNames = models.map(m => m.name)
    const exact = installedNames.find(
      n => n === preferredModel || n.startsWith(preferredModel + ':') || preferredModel.startsWith(n.split(':')[0])
    )
    return exact || installedNames[0]
  } catch {
    return preferredModel
  }
}

async function streamOllama({ settings, messages, memory, signal }, onToken) {
  const memoryContext = buildMemoryContext(memory)
  const languageInstruction = settings.language && settings.language !== 'English'
    ? { role: 'system', content: `IMPORTANT: The user's preferred language is ${settings.language}. You MUST output your responses in ${settings.language}.` }
    : null
  const systemMessages = [
    { role: 'system', content: settings.systemPrompt },
    { role: 'system', content: `You can perform desktop integrations. If the user asks to open a website, email someone, or launch an app, append a tag at the very end of your response:
- Open URL: [ACTION: OPEN_URL <url>]
- Send email: [ACTION: MAILTO <mailto_link>] (e.g. mailto:email@example.com?subject=Hello)
- Launch app: [ACTION: APP <app_name>] (e.g. notepad, chrome, calc, paint)
Ensure the tag is formatted precisely and appended at the absolute end of the message.` },
    memoryContext ? { role: 'system', content: memoryContext } : null,
    languageInstruction,
  ].filter(Boolean)

  const preferredModel = settings.model || 'qwen2:0.5b'

  const doRequest = async (model) => {
    return fetch(`${settings.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        messages: [...systemMessages, ...messages],
        stream: true,
      }),
    })
  }

  let response = await doRequest(preferredModel)

  // If model not found, auto-resolve to an installed model and retry
  if (response.status === 404) {
    const resolvedModel = await resolveModel(settings.ollamaUrl, preferredModel)
    if (resolvedModel !== preferredModel) {
      // Persist the resolved model so next request uses it directly
      try {
        await window.luna.saveSettings({ ...settings, model: resolvedModel })
      } catch { /* non-critical */ }
      response = await doRequest(resolvedModel)
    }
  }

  if (!response.ok) {
    let errMsg = `Ollama error: ${response.status}`
    try {
      const errData = await response.json()
      if (errData.error) {
        errMsg = errData.error
      }
    } catch {}
    const hasImages = messages?.some(m => m.images && m.images.length > 0)
    if (response.status === 400 && hasImages) {
      errMsg += " (Note: This model might not support vision/images. Please use a vision-capable model like llama3.2-vision or llava)"
    }
    throw new Error(errMsg)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let accum = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    buffer += chunk
    const lines = buffer.split('\n')
    // Keep the last part in the buffer as it might be incomplete
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const json = JSON.parse(line)
        if (json.message?.content) {
          accum += json.message.content
          onToken(json.message.content)
        }
      } catch (err) {
        // Line was likely incomplete, but we handled it using pop().
        // If parsing fails for any other reason, log it or discard it.
      }
    }
  }

  // Handle any remaining content in the buffer
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer)
      if (json.message?.content) {
        accum += json.message.content
        onToken(json.message.content)
      }
    } catch {}
  }

  return { provider: 'ollama', content: accum }
}

export async function streamAssistantReply(params, onToken) {
  const { settings, ollamaStatus } = params
  const shouldUseMock =
    settings.inferenceMode === 'mock' ||
    (settings.mockWhenOffline !== false && ollamaStatus !== 'online')

  if (shouldUseMock) return streamMock(params, onToken)
  return streamOllama(params, onToken)
}
