"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { Mic, Square, Volume2, VolumeX, RefreshCw } from 'lucide-react';

interface ElevenLabsAgentProps {
  agentId: string;
}

// Define the message types based on the ElevenLabs documentation
type MessageType = {
  message: string;
  source: 'user' | 'assistant';
  // Additional fields for different message types
  is_final?: boolean;
  type?: string;
};

const ElevenLabsAgent: React.FC<ElevenLabsAgentProps> = ({ agentId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const connectionAttemptRef = useRef<number>(0);
  const sessionRef = useRef<string | null>(null);
  
  // Initialize the conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs Conversational AI');
      setStatusMessage('Connected');
      setIsConnecting(false);
      setRetryCount(0);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs Conversational AI');
      setStatusMessage('Disconnected');
      
      // Only attempt reconnection if we had previously established a connection
      if (sessionRef.current && retryCount < 3) {
        console.log(`Attempting to reconnect (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(() => {
          startConversation();
        }, 2000); // Wait 2 seconds before reconnecting
      }
    },
    onError: (error: any) => {
      console.error('Conversation error:', error);
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
      setIsConnecting(false);
    },
    onMessage: (message: any) => {
      // Using any type temporarily until we know the exact message format
      console.log('New message:', message);
      
      // Handle different message types based on their structure
      if (message.type === 'transcript' && message.is_final) {
        setStatusMessage(`You said: ${message.text || message.message}`);
      } else if (message.type === 'response') {
        setStatusMessage(`AI responding...`);
      } else if (message.source === 'user') {
        setStatusMessage(`You said: ${message.message}`);
      } else if (message.source === 'assistant') {
        setStatusMessage(`AI: ${message.message}`);
      }
    },
  });

  // Extract status and isSpeaking from the conversation object
  const { status, isSpeaking } = conversation;

  // Function to start the conversation
  const startConversation = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    connectionAttemptRef.current += 1;
    const currentAttempt = connectionAttemptRef.current;
    
    try {
      console.log(`Starting conversation, attempt #${currentAttempt}`);
      
      // Get microphone permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the session with the agent ID
      const conversationId = await conversation.startSession({ 
        agentId: agentId 
      });
      
      // Only update if this is still the latest attempt
      if (currentAttempt === connectionAttemptRef.current) {
        console.log(`Started conversation with ID: ${conversationId}`);
        sessionRef.current = conversationId;
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      
      // Only update if this is still the latest attempt
      if (currentAttempt === connectionAttemptRef.current) {
        setStatusMessage('Failed to start conversation. Please check microphone permissions.');
        setIsConnecting(false);
      }
    }
  };

  // Start the conversation when the component mounts
  useEffect(() => {
    startConversation();
    
    // Cleanup function to end the session when component unmounts
    return () => {
      console.log('Cleaning up conversation session');
      setIsConnecting(false);
      connectionAttemptRef.current = 0;
      sessionRef.current = null;
      conversation.endSession();
    };
  }, [agentId]);

  // Toggle mute/unmute
  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1.0 : 0.0 });
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to change volume:', error);
    }
  };

  // Handle manual reconnection
  const handleReconnect = () => {
    if (status === 'disconnected' && !isConnecting) {
      setRetryCount(0);
      startConversation();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full">
        {/* Status indicator */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs bg-opacity-70 bg-black text-white px-2 py-1 rounded">
          <div className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>
            {isConnecting ? 'Connecting...' : 
             isSpeaking ? 'AI Speaking' : status}
          </span>
        </div>
        
        {/* Controls */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {/* Reconnect button */}
          {status === 'disconnected' && !isConnecting && (
            <button 
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"
              onClick={handleReconnect}
              title="Reconnect"
            >
              <RefreshCw size={16} className={isConnecting ? 'animate-spin' : ''} />
            </button>
          )}
          
          {/* Mute button */}
          <button 
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
            onClick={toggleMute}
            disabled={status !== 'connected'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
      
      {/* Status message */}
      {statusMessage && (
        <div className="mt-2 text-sm text-gray-400">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default ElevenLabsAgent; 