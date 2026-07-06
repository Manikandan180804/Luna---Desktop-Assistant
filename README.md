# Luna AI Assistant

Luna is a polished local-first desktop AI assistant prototype. It demonstrates chat, memory, notes, task capture, safe automation staging, local model selection, and transparent privacy controls without hosted AI APIs.

## Chosen Stack

- Desktop shell: Electron, for one packaged app per OS with mature Windows, macOS, and Linux distribution support.
- UI: React + Vite, with a browser-safe fallback bridge for previewing the renderer without Electron.
- Local AI: Ollama-compatible streaming API, with a built-in local mock responder so the prototype runs before a model is installed.
- Storage: local JSON files through Electron IPC under the OS app data directory.
- Automation: permission-aware task runner for notes, email drafts, reminders, and reviewed file-action proposals.

## MVP Features

- Onboarding with profile, local model, and privacy setup.
- Chat with file attachments, streaming-ready responses, Ollama support, and offline mock mode.
- Editable memory with add, pin, search, and delete.
- Notes with local save and markdown export.
- Tasks plus automation runner for notes, drafts, reminders, and file-action proposals.
- Privacy dashboard with data counts, export, memory clearing, and permission toggles.
- Cross-platform Electron packaging config for Windows, macOS, and Linux.

## Local Model Shortlist

| Model | Suggested RAM | Best fit |
| --- | ---: | --- |
| `llama3.2` | 4-6 GB | Fast everyday chat and planning |
| `phi3` | 6-8 GB | Compact reasoning on modest machines |
| `qwen2.5` | 6-12 GB | Multilingual work |
| `mistral` | 8-12 GB | Stronger drafting and summaries |

Recommended prototype default: `llama3.2`, because it is responsive on moderate consumer hardware.

## Architecture

```text
React renderer
  -> Luna bridge fallback for browser preview
  -> Electron preload bridge in desktop mode
  -> Electron main process IPC
  -> Local JSON data store, OS dialogs, clipboard, notifications

Chat inference
  -> Ollama /api/chat when available
  -> Local mock stream when offline or selected
```

## Development

Install dependencies if needed:

```bash
npm install
```

Run the browser renderer:

```bash
npm run dev
```

Run the desktop app in development:

```bash
npm run electron:dev
```

Build the renderer:

```bash
npm run build
```

Package per OS:

```bash
npm run package:win
npm run package:mac
npm run package:linux
```

## Ollama Setup

Install Ollama, then pull a model:

```bash
ollama pull llama3.2
```

Luna defaults to `http://localhost:11434`. If Ollama is not running, Luna uses local mock responses so the prototype remains demoable offline.

## Prototype Safety Notes

- No hosted AI API path is implemented.
- File access goes through the system picker.
- File automation is staged as a proposal instead of silently renaming or moving files.
- Memory is visible and deletable.
- Local JSON storage is not encrypted; this is a prototype, not a production security release.
