# Conversational AI with ElevenLabs and Next.js

This project is a Next.js application that integrates with Supabase for user authentication and stores metadata (like the ElevenLabs API key and Agent ID) directly on the user object. The system allows users to interact with an ElevenLabs ConversationalAI Agent, and upload documents to enhance the agent’s knowledge base. Below is an overview of the key features and relevant details:

---

## Overview

1. **Next.js (App Router)**  
   Leverages the App Router for routes, including server-side route handlers for API endpoints under the `app/api/` directory.

2. **Supabase Authentication**  
   Manages user authentication with Supabase. User credentials are handled securely, and session management is tracked via Supabase’s auth service.  
   Custom metadata fields stored on each user:
   - `elevenlabs_agent_id`
   - `elevenlabs_api_key`

3. **ElevenLabs Integration**  
   Utilizes ElevenLabs’ ConversationalAI endpoints and the ElevenLabsClient SDK.  
   - Users can upload documents to ElevenLabs’ knowledge base, which is then linked to the user’s configured Agent ID.

4. **Settings Page**  
   A dedicated Settings page for users to enter and persist their ElevenLabs API key and Agent ID. These values are stored in the user’s metadata within Supabase.

5. **Document Upload Flow**  
   - Users select or drag files into an interface.  
   - The file is submitted to an API route (`/api/agent/set-document`), which sends it to ElevenLabs, updates the knowledge base, and links the document to the user’s agent.

6. **Chat Interface**  
   - The main conversation view displays messages.  
   - A chat sidebar to select or create new chats.  
   - Users can attach documents and see real-time feedback while the upload is processed.  
   - Once processed, the agent can consume the newly uploaded data in subsequent queries.

---

## File Structure

Below is a high-level view of some key directories and files:

- `app/`
  - `layout.tsx` – Global page layout for Next.js App.
  - `settings/page.tsx` – Renders the Settings component.
  - `api/agent/`
    - `set-document/route.ts` – Route handler that receives file uploads and configures them in ElevenLabs.
- `components/`
  - `Settings.tsx` – Manages reading and saving user metadata fields (mastery: Agent ID, API key).
  - `ChatPageContent.tsx` – Coordinates uploading documents and starting chat sessions.
  - `ChatView.tsx` – The main chat UI for sending/receiving messages.
  - `ChatSidebar.tsx` – Sidebar listing existing chats and allowing the creation of new ones.
  - `ElevenLabsAgent.tsx` – The client-side logic to interface with ElevenLabs for voice generation or text response.

- `lib/supabase/`
  - `auth-context.tsx` – React Context for user authentication logic and session management. 
  - `client.ts` – Supabase client instance.

---

## How It Works

1. **User Authentication**  
   - On initial load, the user is either authenticated automatically if a Supabase session is present or prompted to log in/sign up.  
   - The `AuthProvider` tracks the user object and session.

2. **Adding/Editing Credentials**  
   - The user visits the “Settings” page.  
   - Inside `Settings.tsx`, the Agent ID and API key are displayed in text fields.  
   - On save, these fields are updated in the user’s metadata via Supabase auth updates.

3. **Document Upload**  
   - In the chat interface (`ChatPageContent` and `ChatView`), users can pick a document to upload.  
   - The system collects both the file and the user’s ElevenLabs credentials (from metadata) and POSTs them to `/api/agent/set-document`.  
   - The route uploads the file to ElevenLabs, updates the user’s agent knowledge base, and confirms success or failure.

4. **Real-Time Chat**  
   - On the client side, the user can interact with the agent using text or voice (via `ElevenLabsAgent.tsx`).  
   - The agent references the newly uploaded documents.  
   - Chat messages are stored in Supabase for persistent conversation history.

---

## Installation & Setup

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/yourusername/conversational-ai-nextjs.git
   cd conversational-ai-nextjs
   ```

2. **Install Dependencies**  
   ```bash
   npm install
   ```
   or  
   ```bash
   pnpm install
   ```

3. **Environment Variables**  
   Create a `.env` file for Next.js environment variables:  
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-instance-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   Optionally place a default ElevenLabs API key if desired (though users can manage their own in Settings):  
   ```
   ELEVENLABS_API_KEY=your-default-elevenlabs-api-key
   ```
   This is optional now because each user can enter their own.  

4. **Running the Development Server**  
   ```bash
   npm run dev
   ```
   or  
   ```bash
   pnpm dev
   ```
   Then open http://localhost:3000 in your browser.

---

## Usage

1. **Register or Sign In** to create/set up an account in the application.  
2. **Navigate to the Settings** page to enter your ElevenLabs Agent ID and API Key.  
3. **Create or Select a Chat** from the sidebar.  
4. **Upload a Document** by clicking on the paperclip icon, pick your file.  
5. **Use Document** once it’s uploaded, watch for the success message.  
6. **Ask Questions** about that document through voice or text. The agent will utilize the updated knowledge base.

---

## Technologies

- **Next.js** (App Router)  
- **React**  
- **Supabase** (Auth & Database)  
- **TypeScript**  
- **ElevenLabs** (ConversationalAI, text-to-speech/voice-based features)

---

## Contributing

1. Fork the repository.  
2. Create a new feature branch.  
3. Make changes and commit.  
4. Open a pull request.

---
