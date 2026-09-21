# AI Chat Assistant

A production-style full-stack AI chat application with real-time OpenAI streaming, persistent MongoDB conversations, history sidebar, tone selection, and a responsive React UI.

## Features

- Real AI responses streamed progressively through Server-Sent Events (SSE)
- Persistent conversations and messages in MongoDB via Mongoose
- Conversation history sidebar with timestamps and reopen/continue support
- New Chat flow with readable titles derived from the first prompt
- Exactly three response tones: Professional, Casual, Concise
- Tone is enforced server-side through an OpenAI system instruction
- Responsive desktop/tablet/mobile UI with accessible controls
- Server-side OpenAI API key handling
- Validation, error handling, CORS, Helmet, request-size limits, and API rate limiting
- Clean separation between routes, controllers, data models, and AI service

## Architecture

```text
ai-chat-assistant/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInput.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ToneSelector.jsx
│   │   ├── hooks/
│   │   │   └── useChat.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── controllers/
│   │   └── conversationController.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── models/
│   │   └── Conversation.js
│   ├── routes/
│   │   └── conversationRoutes.js
│   ├── services/
│   │   └── aiService.js
│   ├── utils/
│   │   └── title.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── package.json
```

## Environment variables

Create `server/.env` from `server/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_chat_assistant
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.5
CLIENT_ORIGIN=http://localhost:5173
```

`OPENAI_API_KEY` must never be placed in the Vite client environment.

## MongoDB setup

You can use either a local MongoDB instance or MongoDB Atlas.

For local MongoDB, the default database URL in the example points to:

```text
mongodb://127.0.0.1:27017/ai_chat_assistant
```

For Atlas, replace `MONGODB_URI` with the Atlas connection string and allow the server IP in the Atlas network settings.

## Run locally

From the repository root:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

Then:

```bash
npm run dev
```

This starts:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

For production-style frontend verification:

```bash
npm run build
npm run preview
```

To start only the backend:

```bash
npm start
```

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Server/database health information |
| POST | `/api/conversations` | Create a conversation |
| GET | `/api/conversations` | Get sidebar conversation summaries |
| GET | `/api/conversations/:id` | Get a conversation and all messages |
| POST | `/api/conversations/:id/messages` | Persist user prompt and stream AI response |
| DELETE | `/api/conversations/:id` | Delete a conversation |

The message route returns SSE events such as:

```text
data: {"type":"delta","delta":"Hello"}

data: {"type":"done","message":{...}}
```

Errors use an `error` event and do not expose secrets.

## Testing performed in this workspace

The implementation includes source-level validation, build verification where dependencies are available, and a health endpoint for runtime checks. Full end-to-end OpenAI and MongoDB testing requires valid credentials and a reachable MongoDB instance in the execution environment.

## Known limitations

- No user authentication was added because authentication was not part of the supplied requirements.
- Conversation data is not encrypted at the application layer; rely on MongoDB/Atlas security controls for deployment.
- Recovery of an interrupted OpenAI stream intentionally does not persist an incomplete assistant message, matching the required persistence behavior.
