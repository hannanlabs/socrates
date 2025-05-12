import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
// Import Blob if not globally available (usually is in Node.js recent versions via undici)
// If you get an error for Blob, you might need to explicitly import it or ensure your Node version is >= 18
// For older Node or specific environments, you might need: import { Blob } from 'buffer';

export async function POST(req: NextRequest) {
  let newUploadedDocumentId: string | undefined = undefined;
  let newUploadedDocumentName: string | undefined = undefined;
  let elevenlabs: ElevenLabsClient | undefined = undefined;
  
  try {
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ELEVENLABS_API_KEY = formData.get('apiKey') as string | null;
    const agentId = formData.get('agentId') as string | null;
    
    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key missing.' }, { status: 400 });
    }
    
    if (!agentId) {
      return NextResponse.json({ error: 'ElevenLabs Agent ID missing.' }, { status: 400 });
    }
    
    elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

    console.log(`Uploading file "${file.name}" to create a new knowledge base document.`);
    newUploadedDocumentName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBlob = new Blob([fileBuffer], { type: file.type || 'application/octet-stream' });
    
    const uploadedDocResponse = await elevenlabs.conversationalAi.createKnowledgeBaseFileDocument({
        file: fileBlob, 
        name: file.name,
    });
    
    if (!uploadedDocResponse || !uploadedDocResponse.id) {
        console.error('Failed to get ID from upload response:', uploadedDocResponse);
        const responseDetails = typeof uploadedDocResponse === 'object' ? JSON.stringify(uploadedDocResponse) : uploadedDocResponse;
        throw new Error(`Failed to create or retrieve ID for the uploaded file. Response: ${responseDetails}`);
    }
    newUploadedDocumentId = uploadedDocResponse.id;
    console.log(`File uploaded to Knowledge Base. New Document ID: ${newUploadedDocumentId}, Name: ${newUploadedDocumentName}`);

    console.log(`Updating agent ${agentId} to include new document ID: ${newUploadedDocumentId}`);
    
    const currentAgent = await elevenlabs.conversationalAi.getAgent(agentId);
    
    let existingKnowledgeBaseEntries: any[] = [];
    if (currentAgent.conversation_config?.agent?.prompt?.knowledge_base && Array.isArray(currentAgent.conversation_config.agent.prompt.knowledge_base)) {
        existingKnowledgeBaseEntries = currentAgent.conversation_config.agent.prompt.knowledge_base;
    }

    if (!existingKnowledgeBaseEntries.find(doc => doc.id === newUploadedDocumentId)) {
        existingKnowledgeBaseEntries.push({
            id: newUploadedDocumentId,
            name: newUploadedDocumentName, 
            type: "file", 
            usage_mode: "prompt"
        });
    }
    
    const agentUpdatePayload = {
      conversation_config: {
        ...(currentAgent.conversation_config || {}),
        agent: {
          ...(currentAgent.conversation_config?.agent || {}),
          prompt: {
            ...(currentAgent.conversation_config?.agent?.prompt || {}),
            knowledge_base: existingKnowledgeBaseEntries
          }
        }
      }
    };

    await elevenlabs.conversationalAi.updateAgent(agentId, agentUpdatePayload);
    console.log(`Agent ${agentId} successfully updated to use document ${newUploadedDocumentId}.`);

    return NextResponse.json({
      message: 'Document processed, agent knowledge base updated successfully.',
      newDocumentId: newUploadedDocumentId
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error during ElevenLabs API interaction:', error);
    if (newUploadedDocumentId && elevenlabs) {
        try {
            console.warn(`Attempting to cleanup newly uploaded document ${newUploadedDocumentId} from Knowledge Base due to error: ${error.message}`);
            await elevenlabs.conversationalAi.deleteKnowledgeBaseDocument(newUploadedDocumentId);
            console.warn(`Successfully cleaned up document ${newUploadedDocumentId} from Knowledge Base`);
        } catch (cleanupErr: any) {
            console.error(`Failed to cleanup document ${newUploadedDocumentId} from Knowledge Base during error handling:`, cleanupErr.message);
        }
    }
    let errorMessage = 'An unknown error occurred.';
    let errorStatus = 500;
    if (error.status && error.body && error.body.detail) {
        errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
        errorStatus = error.status;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
} 