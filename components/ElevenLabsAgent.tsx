"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useConversation, Role } from '@11labs/react';
import { Mic, Square, Volume2, VolumeX, RefreshCw, PauseCircle, PlayCircle, Paperclip } from 'lucide-react';

export interface TranscriptEntry {
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ElevenLabsAgentProps {
  agentId: string;
  onSpeakingStatusChange?: (isSpeaking: boolean) => void;
  onNewMessage?: (message: TranscriptEntry) => void;
  onPauseStateChange?: (isPaused: boolean) => void;
  initiateDocumentUpload: () => void;
  isProcessingDocument?: boolean;
}

interface SDKMessage {
    message: string;
    source: Role | string;
    type?: string;
    is_final?: boolean;
    text?: string;
}

const ElevenLabsAgent: React.FC<ElevenLabsAgentProps> = ({ 
  agentId, 
  onSpeakingStatusChange, 
  onNewMessage,
  onPauseStateChange,
  initiateDocumentUpload,
  isProcessingDocument
}) => {
  const [isPaused, setIsPaused] = useState(true); 
  const [statusMessage, setStatusMessage] = useState<string | null>('Paused - Click Play to Start');
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const connectionAttemptRef = useRef<number>(0);
  const sessionRef = useRef<string | null>(null);
  const intentionallyPaused = useRef<boolean>(true);
  
  const onNewMessageRef = useRef(onNewMessage);
  
  // Update refs when props change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  
  const elevenLabsConversation = useConversation({
    onConnect: () => {
      console.log('(ElevenLabs SDK) Connected');
      setStatusMessage('Connected & Listening...');
      setIsConnecting(false);
      setRetryCount(0);
    },
    onDisconnect: () => {
      console.log('(ElevenLabs SDK) Disconnected');
      sessionRef.current = null;
      
      // Only set disconnected message and attempt to reconnect if not intentionally paused
      if (!intentionallyPaused.current) {
        if (!isPaused) setStatusMessage('Disconnected');
        
        if (retryCount < 3 && !isPaused && !isConnecting) {
          console.log(`Attempting to reconnect (attempt ${retryCount + 1}/3)...`);
          setRetryCount(prevCount => prevCount + 1);
          setTimeout(() => {
            if (!isPaused && !isConnecting && elevenLabsConversation.status !== 'connected' && !intentionallyPaused.current) {
              startConversation();
            }
          }, 2000);
        }
      } else {
        console.log('Disconnected due to intentional pause - not attempting to reconnect');
      }
    },
    onError: (error: any) => {
      console.error('(ElevenLabs SDK) Error:', error);
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
      setIsConnecting(false);
      sessionRef.current = null;
    },
    onMessage: (message: SDKMessage) => {
      console.log('New message from SDK:', message);
      
      // Handle user messages
      if (message.source === 'user') {
        // Handle both transcript format and direct message format
        const userText = message.type === 'transcript' && message.is_final && message.text 
          ? message.text 
          : message.message; // Direct message format
          
        if (userText) {
          setStatusMessage(`You said: ${userText}`);
          
          const entry: TranscriptEntry = { 
            speaker: 'user', 
            text: userText, 
            timestamp: new Date() 
          };
          
          // Send message to parent component for saving
          if (onNewMessageRef.current) {
            onNewMessageRef.current(entry);
          }
        }
      } 
      // Handle AI response
      else if (message.source !== 'user' && message.message) { 
        const speakerRole: 'assistant' = 'assistant';
        setStatusMessage(`${speakerRole === 'assistant' ? 'AI' : message.source}: ${message.message}`);
        
        const entry: TranscriptEntry = { 
          speaker: speakerRole, 
          text: message.message, 
          timestamp: new Date() 
        };
        
        // Send message to parent component for saving
        if (onNewMessageRef.current) {
          onNewMessageRef.current(entry);
        }
      } 
      else if (message.source !== 'user' && message.type === 'response') { 
        setStatusMessage('AI responding...');
      }
    },
  });

  const { status: sdkStatus, isSpeaking } = elevenLabsConversation;

  // Determine the terse status for the primary display (truncated)
  let terseCalculatedStatus: string;
  if (isPaused) {
    terseCalculatedStatus = 'Paused';
  } else if (isConnecting) {
    terseCalculatedStatus = 'Connecting...';
  } else if (isSpeaking) {
    terseCalculatedStatus = 'AI Speaking';
  } else {
    // If not in a specific active state, rely on sdkStatus or a default
    switch (sdkStatus) {
      case 'connected':
        terseCalculatedStatus = 'Listening...';
        break;
      case 'disconnected':
        // If statusMessage indicates an error, terse status should be 'Error'
        if (statusMessage && statusMessage.toLowerCase().startsWith("error")) {
          terseCalculatedStatus = 'Error';
        } else {
          terseCalculatedStatus = 'Disconnected';
        }
        break;
      case 'connecting': // SDK might also report 'connecting'
        terseCalculatedStatus = 'Connecting...';
        break;
      default:
        // Fallback: Use statusMessage if it's short and not a transcript/error, otherwise sdkStatus or 'Idle'
        // Check if statusMessage itself implies an error that wasn't caught by sdkStatus being 'disconnected' while statusMessage starts with error
        if (statusMessage && statusMessage.toLowerCase().startsWith("error")) {
          terseCalculatedStatus = 'Error';
        } else if (statusMessage && !statusMessage.startsWith("You said:") && !statusMessage.startsWith("AI:") && statusMessage.length < 30) {
          terseCalculatedStatus = statusMessage;
        } else {
          terseCalculatedStatus = sdkStatus || 'Idle'; // Display raw sdkStatus (if any) or "Idle"
        }
    }
  }

  useEffect(() => {
    if (onSpeakingStatusChange) {
      onSpeakingStatusChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingStatusChange]);

  // Update effect to notify parent about pause state changes
  useEffect(() => {
    if (onPauseStateChange) {
      onPauseStateChange(isPaused);
    }
  }, [isPaused, onPauseStateChange]);

  const startConversation = useCallback(async () => {
    if (isConnecting || isPaused || sdkStatus === 'connected' || sessionRef.current) return;
    
    console.log('startConversation: Attempting to start...');
    setIsConnecting(true);
    connectionAttemptRef.current += 1;
    const currentAttempt = connectionAttemptRef.current;
    
    try {
      console.log(`startConversation: Starting session, attempt #${currentAttempt}`);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const conversationId = await elevenLabsConversation.startSession({ agentId });
      
      if (currentAttempt === connectionAttemptRef.current) {
        console.log(`startConversation: Session started with ID: ${conversationId}`);
        sessionRef.current = conversationId; 
        setStatusMessage('Connected & Listening...');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('startConversation: Failed to start:', error);
      if (currentAttempt === connectionAttemptRef.current) {
        setStatusMessage('Failed to start. Check mic permissions.');
        setIsConnecting(false);
        sessionRef.current = null; 
      }
    }
  }, [agentId, elevenLabsConversation, isConnecting, isPaused, sdkStatus]);

  // Main effect to handle pause/unpause
  useEffect(() => {
    console.log(`Lifecycle Effect: isPaused=${isPaused}, agentId=${agentId}, sdkStatus=${sdkStatus}, isConnecting=${isConnecting}`);
    
    // Update the intentional pause ref when isPaused changes
    intentionallyPaused.current = isPaused;
    
    if (!isPaused) {
      // If not paused and not already connected or connecting, start conversation
      if (sdkStatus !== 'connected' && !isConnecting && !sessionRef.current) {
        console.log('Lifecycle Effect: Unpaused, attempting to start conversation.');
        startConversation();
      }
    } else {
      // When paused, always try to end the session regardless of sessionRef
      console.log('Lifecycle Effect: Paused state, ending session.');
      elevenLabsConversation.endSession();
      sessionRef.current = null;
      setStatusMessage('Paused - Click Play to Start');
      // Ensure connecting state is reset when paused
      setIsConnecting(false);
      // Reset retry count when paused
      setRetryCount(0);
    }

    return () => {
      console.log(`Cleanup (agentId: ${agentId}): Ending session if active.`);
      if (sessionRef.current) {
        elevenLabsConversation.endSession();
        sessionRef.current = null;
      }
      connectionAttemptRef.current = 0;
    };
  }, [isPaused, agentId, startConversation, sdkStatus, isConnecting, elevenLabsConversation]);


  const togglePause = () => {
    const nextPausedState = !isPaused;
    console.log(`togglePause: Setting isPaused to ${nextPausedState}`);
    
    // Set intentional pause flag first
    intentionallyPaused.current = nextPausedState;
    
    // If switching to paused state, immediately end the session
    if (nextPausedState) {
      console.log('togglePause: Actively ending session due to pause');
      elevenLabsConversation.endSession();
      sessionRef.current = null;
      setRetryCount(0);
      setIsConnecting(false);
    }
    
    setIsPaused(nextPausedState);
    
    if (nextPausedState) {
      setStatusMessage('Paused - Click Play to Start');
    } else {
      setStatusMessage('Attempting to connect...');
    }
  };

  const handleReconnect = () => {
    if (sdkStatus === 'disconnected' && !isConnecting && !isPaused) {
      setRetryCount(0);
      startConversation();
    }
  };
  
  // const currentDisplayStatus = isPaused ? 'Paused' : 
  //                              isConnecting ? 'Connecting...' : 
  //                              isSpeaking ? 'AI Speaking' : statusMessage || sdkStatus;
  // The above is replaced by terseCalculatedStatus for the main display

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs bg-opacity-70 bg-black text-white px-2 py-1 rounded min-w-0 flex-shrink">
          <div className={`h-2 w-2 rounded-full ${sdkStatus === 'connected' && !isPaused ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="truncate">{terseCalculatedStatus}</span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            className={`w-8 h-8 rounded-full ${isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} flex items-center justify-center`}
            onClick={togglePause}
            title={isPaused ? 'Resume (start API usage)' : 'Pause (stop API usage)'}
          >
            {isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          </button>

          {sdkStatus === 'disconnected' && !isConnecting && !isPaused && (
            <button 
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center"
              onClick={handleReconnect}
              title="Reconnect"
            >
              <RefreshCw size={16} className={isConnecting ? 'animate-spin' : ''} />
            </button>
          )}

          <button
            onClick={initiateDocumentUpload}
            disabled={isProcessingDocument}
            className="p-2 bg-[#2A2A2A] hover:bg-[#383838] text-gray-300 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Upload a document"
          >
            <Paperclip size={20} />
          </button>
        </div>
      </div>

      {/* Dedicated container for long status messages/transcriptions (statusMessage from state) */}
      {/* Show if statusMessage exists and is different from the terseCalculatedStatus to avoid redundancy */}
      {statusMessage && statusMessage !== terseCalculatedStatus && (
        <div className="mt-1 text-xs text-gray-400 w-full text-left px-1 overflow-hidden"> 
          <p className="break-words whitespace-normal"> 
            {statusMessage}
          </p>
        </div>
      )}
    </div>
  );
}; 

export default ElevenLabsAgent;