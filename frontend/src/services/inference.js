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

function mockResponse({ prompt, settings, memory }) {
  const lower = prompt.toLowerCase()
  const name = settings.assistantName || 'Luna'
  const memoryLine = memory?.length
    ? `\n\nI also checked your saved memory and found ${memory.length} local item${memory.length === 1 ? '' : 's'} available for context.`
    : ''

  if (lower.includes('email') || lower.includes('draft')) {
    return `Here is a clean draft you can edit locally:\n\nSubject: Quick follow-up\n\nHi,\n\nThanks for the context. I wanted to follow up with a concise update and suggest the next practical step. Please let me know what timing works best, and I can adjust accordingly.\n\nBest,\n${settings.userName || 'User'}\n\nThis was generated in offline mock mode. Connect Ollama for model-backed drafting.${memoryLine}`
  }

  if (lower.includes('task') || lower.includes('plan')) {
    return `I would break this into a small local plan:\n\n1. Capture the goal in Tasks.\n2. Save any durable preference in Memory.\n3. Create or attach notes for supporting details.\n4. Ask for confirmation before any file or automation action.\n\n${name} is running without a connected local model right now, so this is the built-in offline runner.${memoryLine}`
  }

  if (lower.includes('summarize') || lower.includes('[file:')) {
    return `Summary preview:\n\n- I found the key user intent and preserved it locally.\n- The safest next step is to turn the content into tasks, notes, or a chat answer.\n- File contents are only read on this device.\n\nConnect Ollama to replace this mock summary with local model inference.${memoryLine}`
  }

  return `I am ready in local preview mode. Ollama is not connected, so I am using Luna's offline mock responder instead of a cloud service.\n\nYou asked: "${prompt.slice(0, 220)}${prompt.length > 220 ? '...' : ''}"\n\nTry asking me to draft an email, make a plan, summarize an attached text file, or remember a preference.${memoryLine}`
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
  const systemMessages = [
    { role: 'system', content: settings.systemPrompt },
    memoryContext ? { role: 'system', content: memoryContext } : null,
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

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)

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
