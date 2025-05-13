import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { createServerClient, type CookieOptions, type GetCookiess } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Import Blob if not globally available (usually is in Node.js recent versions via undici)
// If you get an error for Blob, you might need to explicitly import it or ensure your Node version is >= 18
// For older Node or specific environments, you might need: import { Blob } from 'buffer';

export async function POST(req: NextRequest) {
  let newUploadedDocumentId: string | undefined = undefined;
  let newUploadedDocumentName: string | undefined = undefined;
  let elevenlabs: ElevenLabsClient | undefined = undefined;
  let supabaseStoragePath: string | undefined = undefined; // Track storage path for potential cleanup
  const cookieStore = await cookies();

  // Collect cookies Supabase wants to set/remove so we can add them to the response later.
  const responseCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseCookies.push({ name, value, options });
          });
        },
        removeAll(cookiesToRemove) {
          cookiesToRemove.forEach(({ name, options }) => {
            responseCookies.push({ name, value: '', options });
          });
        },
      },
    }
  );

  // Always authenticate using getUser() – ensures token is valid
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Authentication error:', authError);
    return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
  }
  const userId = user.id;

  try {
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ELEVENLABS_API_KEY = formData.get('apiKey') as string | null;
    const agentId = formData.get('agentId') as string | null;
    const chatId = formData.get('chatId') as string | null; // Expect chatId from frontend

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

    // --- Supabase Storage Upload ---
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBlob = new Blob([fileBuffer], { type: file.type || 'application/octet-stream' });
    // Construct a unique path. Using user_id and timestamp/uuid is good practice.
    // Let's use userId/timestamp-filename for simplicity here.
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; // Sanitize filename
    supabaseStoragePath = `${userId}/${uniqueFileName}`; // Define the path

    console.log(`Uploading file "${file.name}" to Supabase Storage at path: ${supabaseStoragePath}`);
    const { data: storageData, error: storageError } = await supabase.storage
      .from('chat-documents') // Use the bucket name created
      .upload(supabaseStoragePath, fileBlob, {
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files (should be unique anyway)
          contentType: file.type || 'application/octet-stream',
      });

    if (storageError) {
        console.error('Supabase Storage Error:', storageError);
        throw new Error(`Failed to upload file to storage: ${storageError.message}`);
    }
    console.log('File uploaded to Supabase Storage successfully:', storageData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-documents')
      .getPublicUrl(supabaseStoragePath);

    if (!publicUrl) {
        console.warn(`Could not get public URL for ${supabaseStoragePath}, proceeding without it.`);
        // You might want to throw an error here depending on requirements
    } else {
       console.log(`Public URL: ${publicUrl}`);
    }
    // --- End Supabase Storage Upload ---


    // --- ElevenLabs Processing (existing logic) ---
    elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

    console.log(`Uploading file "${file.name}" to ElevenLabs Knowledge Base.`);
    newUploadedDocumentName = file.name;

    const uploadedDocResponse = await elevenlabs.conversationalAi.createKnowledgeBaseFileDocument({
        file: fileBlob, // Re-use the blob
        name: file.name,
    });

    if (!uploadedDocResponse || !uploadedDocResponse.id) {
        console.error('Failed to get ID from ElevenLabs upload response:', uploadedDocResponse);
        const responseDetails = typeof uploadedDocResponse === 'object' ? JSON.stringify(uploadedDocResponse) : uploadedDocResponse;
        throw new Error(`Failed to create or retrieve ID for the ElevenLabs uploaded file. Response: ${responseDetails}`);
    }
    newUploadedDocumentId = uploadedDocResponse.id;
    console.log(`File uploaded to ElevenLabs Knowledge Base. New Document ID: ${newUploadedDocumentId}, Name: ${newUploadedDocumentName}`);

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
            usage_mode: "prompt" // Or "document_retrieval"? Check ElevenLabs docs if unsure
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
    // --- End ElevenLabs Processing ---

    // --- Supabase Database Insert ---
    console.log('Inserting document metadata into Supabase database.');
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        chat_id: chatId || null, // Use provided chatId or null
        file_name: file.name,
        mimetype: file.type || 'application/octet-stream',
        storage_path: supabaseStoragePath,
        // page_count: null, // TODO: Add page count detection later (Stage 5)
      })
      .select('id') // Select the newly created document ID
      .single(); // Expect only one row

    if (dbError) {
      console.error('Supabase Database Insert Error:', dbError);
      // Attempt to cleanup ElevenLabs doc if DB insert fails
       if (newUploadedDocumentId && elevenlabs) {
         try {
           console.warn(`Attempting to cleanup ElevenLabs document ${newUploadedDocumentId} due to DB insert error.`);
           await elevenlabs.conversationalAi.deleteKnowledgeBaseDocument(newUploadedDocumentId);
           console.warn(`Successfully cleaned up ElevenLabs document ${newUploadedDocumentId}.`);
         } catch (cleanupErr: any) {
           console.error(`Failed to cleanup ElevenLabs document ${newUploadedDocumentId} during DB error handling:`, cleanupErr.message);
         }
       }
      throw new Error(`Failed to record document metadata in database: ${dbError.message}`);
    }

    const supabaseDocId = dbData?.id;
    console.log('Document metadata inserted successfully. Supabase Document ID:', supabaseDocId);
    // --- End Supabase Database Insert ---

    // Build success response & attach any cookies Supabase asked us to set
    const successRes = NextResponse.json({
      message: 'Document processed, uploaded to storage, agent knowledge base updated, and metadata saved.',
      elevenLabsDocId: newUploadedDocumentId, // Renamed for clarity
      supabaseDocId: supabaseDocId,
      publicUrl: publicUrl,
      pageCount: null // Placeholder for now
    }, { status: 200 });

    responseCookies.forEach(({ name, value, options }) => {
      successRes.cookies.set({ name, value, ...options });
    });

    return successRes;

  } catch (error: any) {
    console.error('Error during document processing:', error);

    // --- Enhanced Cleanup Logic ---
    // 1. Attempt to delete from Supabase Storage if path exists
    if (supabaseStoragePath) {
      try {
        console.warn(`Attempting cleanup: Deleting ${supabaseStoragePath} from Supabase Storage.`);
        await supabase.storage.from('chat-documents').remove([supabaseStoragePath]);
        console.warn(`Cleanup successful: Deleted ${supabaseStoragePath} from Storage.`);
      } catch (storageCleanupErr: any) {
        console.error(`Cleanup failed: Could not delete ${supabaseStoragePath} from Storage.`, storageCleanupErr.message);
        // Log but continue cleanup
      }
    }

    // 2. Attempt to delete from ElevenLabs KB if ID exists
    if (newUploadedDocumentId && elevenlabs) {
        try {
            console.warn(`Attempting cleanup: Deleting document ${newUploadedDocumentId} from ElevenLabs KB.`);
            await elevenlabs.conversationalAi.deleteKnowledgeBaseDocument(newUploadedDocumentId);
            console.warn(`Cleanup successful: Deleted document ${newUploadedDocumentId} from ElevenLabs KB.`);
        } catch (cleanupErr: any) {
            console.error(`Cleanup failed: Could not delete document ${newUploadedDocumentId} from ElevenLabs KB.`, cleanupErr.message);
            // Log and continue
        }
    }
    // --- End Cleanup Logic ---

    let errorMessage = 'An unknown error occurred.';
    let errorStatus = 500;
    if (error.status && error.body && error.body.detail) {
        errorMessage = typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error.body.detail);
        errorStatus = error.status;
    } else if (error.message) {
        errorMessage = error.message;
    }
    const errorRes = NextResponse.json({ error: errorMessage }, { status: errorStatus });

    responseCookies.forEach(({ name, value, options }) => {
      errorRes.cookies.set({ name, value, ...options });
    });

    return errorRes;
  }
} 