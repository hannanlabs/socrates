"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useConversation, Role } from '@11labs/react';
import { Mic, Square, Volume2, VolumeX, RefreshCw, PauseCircle, PlayCircle } from 'lucide-react';

export interface TranscriptEntry {
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ElevenLabsAgentProps {
  agentId: string;
  onSpeakingStatusChange?: (isSpeaking: boolean) => void;
  onNewMessage?: (message: TranscriptEntry) => void;
}

interface SDKMessage {
    message: string;
    source: Role;
    type?: string;
    is_final?: boolean;
    text?: string;
}

const ElevenLabsAgent: React.FC<ElevenLabsAgentProps> = ({ 
  agentId, 
  onSpeakingStatusChange, 
  onNewMessage 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(true); 
  const [statusMessage, setStatusMessage] = useState<string | null>('Paused - Click Play to Start');
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const connectionAttemptRef = useRef<number>(0);
  const sessionRef = useRef<string | null>(null);
  
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
      if (!isPaused) setStatusMessage('Disconnected');
      
      if (retryCount < 3 && !isPaused && !isConnecting) {
        console.log(`Attempting to reconnect (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(() => {
          if (!isPaused && !isConnecting && elevenLabsConversation.status !== 'connected') {
            startConversation();
          }
        }, 2000);
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
      
      // Handle user transcript
      if (message.source === 'user' && message.type === 'transcript' && message.is_final && message.text) {
        setStatusMessage(`You said: ${message.text}`);
        
        const entry: TranscriptEntry = { 
          speaker: 'user', 
          text: message.text, 
          timestamp: new Date() 
        };
        
        // Send message to parent component for saving
        if (onNewMessageRef.current) {
          onNewMessageRef.current(entry);
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

  useEffect(() => {
    if (onSpeakingStatusChange) {
      onSpeakingStatusChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingStatusChange]);

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
    
    if (!isPaused) {
      if (sdkStatus !== 'connected' && !isConnecting && !sessionRef.current) {
        console.log('Lifecycle Effect: Unpaused, attempting to start conversation.');
        startConversation();
      }
    } else {
      if (sessionRef.current) { 
        console.log('Lifecycle Effect: Paused state, ending session.');
        elevenLabsConversation.endSession();
        sessionRef.current = null; 
      }
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

  const toggleMute = async () => {
    try {
      await elevenLabsConversation.setVolume({ volume: isMuted ? 1.0 : 0.0 });
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to change volume:', error);
    }
  };

  const togglePause = () => {
    const nextPausedState = !isPaused;
    console.log(`togglePause: Setting isPaused to ${nextPausedState}`);
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
  
  const currentDisplayStatus = isPaused ? 'Paused' : 
                               isConnecting ? 'Connecting...' : 
                               isSpeaking ? 'AI Speaking' : statusMessage || sdkStatus;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full">
        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs bg-opacity-70 bg-black text-white px-2 py-1 rounded">
          <div className={`h-2 w-2 rounded-full ${sdkStatus === 'connected' && !isPaused ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{currentDisplayStatus}</span>
        </div>
        
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
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
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center"
            onClick={toggleMute}
            disabled={(sdkStatus !== 'connected' && !isConnecting) || isPaused}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
      
      {statusMessage && currentDisplayStatus !== statusMessage && (
        <div className="mt-2 text-sm text-gray-400">
          {statusMessage}
        </div>
      )}
    </div>
  );
}; 

export default ElevenLabsAgent;