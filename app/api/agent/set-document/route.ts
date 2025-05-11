import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
// Import Blob if not globally available (usually is in Node.js recent versions via undici)
// If you get an error for Blob, you might need to explicitly import it or ensure your Node version is >= 18
// For older Node or specific environments, you might need: import { Blob } from 'buffer';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// !!! IMPORTANT: Replace with your actual Agent ID from ElevenLabs for testing !!!
const HARDCODED_AGENT_ID = "UvPz3Vgu9O6iI0KDWJDT"; 

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key not configured.');
    return NextResponse.json({ error: 'Server configuration error: ElevenLabs API key missing.' }, { status: 500 });
  }
  // Removed check for placeholder hardcoded ID as user has updated it.

  const agentId = HARDCODED_AGENT_ID;
  const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
  
  let oldDocumentIds: string[] = [];
  let newUploadedDocumentId: string | undefined = undefined;
  let agentUpdatePayload: any = {}; 

  try {
    console.log(`Fetching details for agent ID: ${agentId}`);
    const currentAgent: any = await elevenlabs.conversationalAi.getAgent(agentId); // Use any for now to bypass linter for logging
    // console.log("Full currentAgent structure:", JSON.stringify(currentAgent, null, 2)); // UNCOMMENT THIS TO DEBUG AGENT STRUCTURE

    agentUpdatePayload = {
        name: currentAgent.name, 
        // Assuming other fields like voice_id, model_id, llm_model_id, description are directly on currentAgent or its config
        // and will be part of the update payload if we want to preserve them.
        // For simplicity, if `updateAgent` only updates specified fields, sending only name and KB IDs is fine.
        // If it overwrites, then we need to fetch and pass all existing settable fields.
        // voice_id: currentAgent.voice_id, 
        // model_id: currentAgent.model_id,
        // llm_model_id: currentAgent.llm_model_id,
    };
    
    // Try to access knowledge_base_ids from common possible paths based on typical SDK structures
    // The exact path needs to be confirmed by logging currentAgent structure if linter errors persist or runtime issues occur
    if (currentAgent.conversation_config && Array.isArray(currentAgent.conversation_config.knowledge_base_ids)) {
      oldDocumentIds = currentAgent.conversation_config.knowledge_base_ids;
    } else if (Array.isArray(currentAgent.knowledge_base_ids)) {
      oldDocumentIds = currentAgent.knowledge_base_ids;
    } else {
      oldDocumentIds = [];
    }
    console.log(`Agent ${agentId} is currently using document IDs: ${oldDocumentIds.join(', ') || 'None'}`);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    console.log(`Uploading file "${file.name}" to create a new knowledge base document.`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBlob = new Blob([fileBuffer], { type: file.type || 'application/octet-stream' });
    
    const uploadedDocResponse: any = await elevenlabs.conversationalAi.createKnowledgeBaseFileDocument({
        file: fileBlob, 
        name: file.name, 
    });
    // console.log("Full uploadedDocResponse structure:", JSON.stringify(uploadedDocResponse, null, 2)); // UNCOMMENT TO DEBUG DOC RESPONSE
    
    newUploadedDocumentId = uploadedDocResponse.id; // Corrected: Use .id based on runtime logs
    if (!newUploadedDocumentId) {
        console.error('Failed to get ID from upload response:', uploadedDocResponse);
        throw new Error('Failed to create or retrieve ID for the uploaded file.');
    }
    console.log(`File uploaded. New Document ID: ${newUploadedDocumentId}`);

    agentUpdatePayload.knowledge_base_ids = [newUploadedDocumentId];
    console.log(`Updating agent ${agentId} to use only new document ID: ${newUploadedDocumentId}`);
    // Ensure the update payload contains all necessary fields for an agent update if the API overwrites missing ones.
    // If `name` and `knowledge_base_ids` are the only fields changing, this is fine.
    await elevenlabs.conversationalAi.updateAgent(agentId, agentUpdatePayload);
    console.log(`Agent ${agentId} successfully updated.`);

    if (oldDocumentIds.length > 0) {
      console.log(`Cleaning up ${oldDocumentIds.length} old documents...`);
      for (const oldDocId of oldDocumentIds) {
        if (oldDocId === newUploadedDocumentId) continue; 
        try {
          console.log(`Deleting old document ID: ${oldDocId}`);
          await elevenlabs.conversationalAi.deleteKnowledgeBaseDocument(oldDocId);
          console.log(`Successfully deleted old document: ${oldDocId}`);
        } catch (cleanupError: any) {
          console.error(`Failed to delete old document ${oldDocId}:`, cleanupError.message);
        }
      }
    }

    return NextResponse.json({
      message: 'Document processed, agent knowledge base updated successfully.',
      newDocumentId: newUploadedDocumentId
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error during ElevenLabs API interaction:', error);
    // Attempt to clean up the newly uploaded document if it was created and an error occurred afterwards
    // before the agent was successfully linked to it (or if linking failed).
    if (newUploadedDocumentId && (!agentUpdatePayload.knowledge_base_ids || !agentUpdatePayload.knowledge_base_ids.includes(newUploadedDocumentId))) {
        try {
            console.warn(`Attempting to cleanup newly uploaded document ${newUploadedDocumentId} due to error: ${error.message}`);
            await elevenlabs.conversationalAi.deleteKnowledgeBaseDocument(newUploadedDocumentId);
            console.warn(`Successfully cleaned up document ${newUploadedDocumentId}`);
        } catch (cleanupErr: any) {
            console.error(`Failed to cleanup document ${newUploadedDocumentId} during error handling:`, cleanupErr.message);
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