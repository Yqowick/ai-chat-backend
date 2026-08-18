# AI Chat Backend

A Node.js and Express backend for an AI chat application powered by the Gemini API, MongoDB, Server-Sent Events, and Wikipedia-grounded citations.

## Features

- Node.js backend built with Express
- Gemini LLM integration
- MongoDB conversation persistence
- Server-Sent Events response streaming
- Conversation list and resume support
- Response regeneration
- Response version switching
- Persistent thumbs up/down feedback
- Wikipedia-grounded citations
- Citation persistence across response versions
- Gemini rate-limit and API error handling
- Health endpoint for server and database status

## Tech Stack

- Node.js
- Express 5
- MongoDB
- Mongoose
- Google Gen AI SDK
- Wikipedia MediaWiki API
- Server-Sent Events
- Nodemon

## Prerequisites

Install the following:

- Node.js 20 or later
- npm
- MongoDB Community Server
- Git
- A Gemini API key

MongoDB must be running on:

```text
mongodb://127.0.0.1:27017
```

## Setup in Under 5 Minutes

Clone the repository:

```powershell
git clone https://github.com/Yqowick/ai-chat-backend.git

cd ai-chat-backend
```

Install dependencies:

```powershell
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder API key:

```env
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_chat
```

Do not commit `.env` or share the API key.

Check that MongoDB is running:

```powershell
Get-Service MongoDB
```

If it is stopped, open PowerShell as Administrator and run:

```powershell
Start-Service MongoDB
```

Start the backend:

```powershell
npm run dev
```

Expected output:

```text
MongoDB connected: 127.0.0.1/ai_chat
Backend running on http://localhost:8000
Health check: http://localhost:8000/api/health
```

## Health Check

Open another PowerShell window:

```powershell
Invoke-RestMethod "http://localhost:8000/api/health"
```

Expected result:

```text
status   : ok
service  : ai-chat-backend
database : connected
```

## Available Scripts

Run in development mode:

```powershell
npm run dev
```

Run in production mode:

```powershell
npm start
```

Test the configured Gemini connection:

```powershell
npm run test:gemini
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check server and MongoDB status |
| POST | `/api/chat` | Generate a normal AI response |
| POST | `/api/chat/stream` | Generate an SSE-streamed response |
| GET | `/api/conversations` | List saved conversation threads |
| GET | `/api/conversations/:conversationId` | Load a conversation |
| POST | `/api/conversations/:conversationId/messages/:messageId/regenerate` | Regenerate an assistant response |
| PATCH | `/api/conversations/:conversationId/messages/:messageId/versions/:versionIndex` | Select a response version |
| PUT | `/api/conversations/:conversationId/messages/:messageId/feedback` | Save message feedback |

## Chat Request Example

```powershell
$body = @{
  message = "Who created Node.js?"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## SSE Streaming Example

```powershell
$body = @{
  message = "Explain JavaScript promises."
} | ConvertTo-Json -Compress

$body |
curl.exe -N `
  -X POST `
  "http://localhost:8000/api/chat/stream" `
  -H "Content-Type: application/json" `
  --data-binary "@-"
```

The stream emits:

- `conversation`
- `chunk`
- `done`
- `error`

## Conversation Schema

Each MongoDB conversation stores:

- A unique conversation ID
- A generated title
- User and assistant messages
- Assistant response versions
- Active response version
- Wikipedia citation sources
- Persistent message feedback
- Creation and update timestamps

Assistant feedback supports:

```text
up
down
```

## Citation Flow

1. The backend searches Wikipedia using the MediaWiki API.
2. Relevant extracts are sent to Gemini as context.
3. Gemini adds citation markers such as `[1]`.
4. Citation markers are converted into Markdown links.
5. The response and sources are saved in MongoDB.
6. The frontend displays inline citation tooltips.

Wikipedia retrieval is used because Gemini Google Search grounding is not available on the selected free API tier.

## Project Structure

```text
backend/
  scripts/
    test-gemini.js
  src/
    config/
      database.js
    controllers/
      chatController.js
      conversationController.js
    middleware/
      errorHandler.js
    models/
      Conversation.js
    routes/
      chatRoutes.js
      conversationRoutes.js
    services/
      conversationService.js
      geminiService.js
      wikipediaService.js
    utils/
      geminiError.js
    server.js
  .env.example
  .gitignore
  package.json
```

## Error Handling

The backend handles:

- Invalid request bodies
- Missing messages
- Invalid conversation IDs
- Missing conversations
- Invalid response versions
- Invalid feedback values
- Gemini rate limits
- Gemini API failures
- Missing endpoints
- Unexpected server errors

## Security Notes

- `.env` is ignored by Git.
- Never commit a Gemini API key.
- MongoDB is bound to the local machine for development.
- Request bodies are limited to 1 MB.
- Feedback comments are validated and limited in length.

## Frontend Repository

The React frontend is available at:

```text
https://github.com/Yqowick/ai-chat-frontend
```