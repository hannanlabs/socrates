"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { getChatMessages, getChatById, addMessageToChat } from "@/lib/supabase/chat-service";
import { useAuth } from "@/lib/supabase/auth-context";
import { Loader2, Download, FileText, File as FileIconType, ChevronDown, Send, AlertTriangle, Mic, Paperclip, X, CheckCircle } from "lucide-react";
import { jsPDF } from "jspdf";
import { Packer, Paragraph, TextRun, Document, HeadingLevel } from "docx";
import ElevenLabsAgent, { TranscriptEntry } from "@/components/ElevenLabsAgent";
import { User } from "@supabase/supabase-js";

import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

interface ChatViewProps {
  chatId: string;
  user: User;
  initiateDocumentUpload: () => void;
  onDocumentReadyToProcess: () => Promise<void>;
  selectedFile: File | null;
  clearSelectedFile: () => void;
  isProcessingDocument?: boolean;
  documentProcessingError?: string | null;
}

const AudioVisualizer = ({ isSpeaking }: { isSpeaking: boolean }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const particleCount = 150;
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      position: [ (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5 ],
      radius: 0.015 + Math.random() * 0.03,
      color: new THREE.Color( `hsl(${Math.random() * 60 + 180}, 70%, 60%)` ),
      speed: 0.2 + Math.random() * 0.8,
      axis: new THREE.Vector3( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 ).normalize()
    }));
  }, [particleCount]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.children.forEach((particle, i) => {
        if (particle instanceof THREE.Mesh) {
          const data = particles[i];
          const rotationSpeed = isSpeaking ? data.speed * 2.5 : data.speed * 0.5;
          particle.rotateOnAxis(data.axis, delta * rotationSpeed);
          const scaleBase = isSpeaking ? 0.8 + Math.sin(state.clock.elapsedTime * 6 + i) * 0.4 : 0.6 + Math.sin(state.clock.elapsedTime * 1 + i) * 0.1;
          particle.scale.setScalar(data.radius * scaleBase * 20);
          if (particle.material instanceof THREE.MeshStandardMaterial) {
            if (isSpeaking) {
              const hue = (state.clock.elapsedTime * 0.2 + i * 0.02) % 1;
              particle.material.color.setHSL(hue, 0.9, 0.65);
              particle.material.emissive.setHSL(hue, 0.7, 0.4);
              particle.material.emissiveIntensity = 0.8;
            } else {
              particle.material.color.copy(data.color);
              particle.material.emissive.set(0x000000);
              particle.material.emissiveIntensity = 0;
            }
          }
        }
      });
    }
  });
  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
          <sphereGeometry args={[particle.radius, 12, 12]} />
          <meshStandardMaterial color={particle.color} roughness={0.4} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

const FloatingLogo = ({ isSpeaking }: { isSpeaking: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
      meshRef.current.rotation.y += 0.004;
      meshRef.current.rotation.x += 0.002;
      if (isSpeaking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.6, 0]} /> 
      <meshStandardMaterial 
        color={isSpeaking ? "#E50041" : "#A0002D"} 
        roughness={0.2}
        metalness={0.6}
        emissive={isSpeaking ? "#E50041" : "#400012"}
        emissiveIntensity={isSpeaking ? 0.6 : 0.2}
      />
    </mesh>
  );
};

export function ChatView({ 
  chatId, 
  user: propUser,
  initiateDocumentUpload,
  onDocumentReadyToProcess,
  selectedFile,
  clearSelectedFile, 
  isProcessingDocument,
  documentProcessingError
}: ChatViewProps) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Conversation");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const agentInstanceIdBase = `agent-for-chat-${chatId}`;

  const agentIdToUse = user?.user_metadata?.elevenlabs_agent_id;
  const agentKey = `${agentInstanceIdBase}-${agentIdToUse}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !chatId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError(null);

    const fetchChatData = async () => {
      try {
        const chatDetails = await getChatById(chatId);
        if (isActive && chatDetails) {
          setChatTitle(chatDetails.title);
        }

        const messagesData = await getChatMessages(chatId);
        if (isActive) {
          setMessages(messagesData as Message[]);
        }
      } catch (err) {
        console.error("Error fetching chat data:", err);
        if (isActive) {
          setError("Could not load chat. Please try again or select another chat.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchChatData();

    return () => {
      isActive = false;
    };
  }, [chatId, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNewMessageFromAgent = useCallback(async (messageEntry: TranscriptEntry) => {
    if (!user || !chatId) return;

    const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        chat_id: chatId,
        role: messageEntry.speaker,
        content: messageEntry.text,
        created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
        const success = await addMessageToChat(
            chatId, 
            messageEntry.speaker,
            messageEntry.text
        );
        
        if (!success) {
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          console.warn("Failed to save message from agent to DB, optimistic update reverted.");
        } else {
          console.log("Agent message saved to DB");
        }
    } catch (error) {
        console.error("Error saving message from agent to DB:", error);
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  }, [chatId, user]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const exportToTxt = () => {
    let content = `${chatTitle}\n\n`;
    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      content += `${speaker}:\n${message.content}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const textWidth = pageWidth - (margin * 2);
    let yPosition = 20;
    
    doc.setFontSize(16);
    doc.text(chatTitle, margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(11);
    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      doc.setFont("helvetica", 'bold');
      const speakerText = `${speaker}:`;
      const speakerLines = doc.splitTextToSize(speakerText, textWidth);
      if (yPosition + (speakerLines.length * 6) > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); yPosition = margin; }
      doc.text(speakerLines, margin, yPosition);
      yPosition += (speakerLines.length * 6);
      
      doc.setFont("helvetica", 'normal');
      const contentLines = doc.splitTextToSize(message.content, textWidth);
      if (yPosition + (contentLines.length * 6) > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); yPosition = margin; }
      doc.text(contentLines, margin, yPosition);
      yPosition += (contentLines.length * 6) + 8;
      if (yPosition > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); yPosition = margin; }
    });
    
    doc.save(`${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    setShowExportMenu(false);
  };

  const exportToDocx = async () => {
    const docParagraphs: Paragraph[] = [];
    docParagraphs.push(new Paragraph({ text: chatTitle, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      docParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${speaker}:`, bold: true })] }));
      docParagraphs.push(new Paragraph({ text: message.content, spacing: { after: 200 } }));
    });
    const doc = new Document({ sections: [{ children: docParagraphs }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handlePauseStateChange = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-4 bg-[#171717]">
        <Loader2 className="h-10 w-10 animate-spin text-[#E50041] mb-4" />
        <p className="text-gray-400">Loading conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#171717] text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl text-gray-200 mb-2">Error Loading Chat</h3>
        <p className="text-gray-400 mb-6 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#171717] h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] bg-[#1D1D1D]">
        <h1 className="text-lg font-semibold text-gray-100 truncate">{chatTitle}</h1>
        <div className="relative" ref={exportMenuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center bg-[#2A2A2A] hover:bg-[#333333] text-gray-200 px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
            <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#2A2A2A] border border-[#333333] rounded-md shadow-xl z-20 py-1">
              {[{ label: "PDF (.pdf)", icon: FileIconType, action: exportToPdf },
                { label: "Word (.docx)", icon: FileIconType, action: exportToDocx },
                { label: "Text File (.txt)", icon: FileText, action: exportToTxt },
              ].map(item => (
                <button key={item.label} onClick={item.action} className="w-full flex items-center px-3.5 py-2 text-sm text-gray-200 hover:bg-[#383838] transition-colors">
                  <item.icon className="mr-2.5 h-4 w-4 text-gray-400" /> {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative">
        {!isPaused && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-full h-[300px] max-w-md mx-auto mb-6">
              <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[5, 5, 5]} intensity={1.2} angle={0.3} penumbra={0.5} castShadow />
                <pointLight position={[-5, -5, -5]} intensity={0.7} color="#E50041" />
                <FloatingLogo isSpeaking={isAgentSpeaking} />
                <AudioVisualizer isSpeaking={isAgentSpeaking} />
              </Canvas>
            </div>
            <h2 className="text-xl font-semibold text-gray-200 mt-4">
              {isAgentSpeaking ? "Listening to AI..." : "Speak now..."}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {messages.length > 0 ? "Press pause to view conversation" : "Click Pause when you're done"}
            </p>
          </div>
        )}
        
        {isPaused && messages.length === 0 && !isLoading && !error && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-full h-[300px] max-w-md mx-auto mb-6">
              <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[5, 5, 5]} intensity={1.2} angle={0.3} penumbra={0.5} castShadow />
                <pointLight position={[-5, -5, -5]} intensity={0.7} color="#E50041" />
                <FloatingLogo isSpeaking={false} />
                <AudioVisualizer isSpeaking={false} />
              </Canvas>
            </div>
            <h2 className="text-xl font-semibold text-gray-200 mt-4">Hello! How can I help you today?</h2>
            <p className="text-sm text-gray-500">Click the Play button below to start speaking</p>
          </div>
        )}
        
        {isPaused && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-xl shadow ${ 
                    msg.role === "user" 
                    ? "bg-gradient-to-r from-[#E50041] to-[#C00031] text-white rounded-br-none" 
                    : "bg-[#252525] text-gray-200 rounded-bl-none" }`}
                >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                    <div className="text-xs opacity-60 mt-1.5 text-right">
                        {formatTimestamp(msg.created_at)}
                    </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#2A2A2A] bg-[#1D1D1D]">
        {documentProcessingError && (
          <div className="mb-2 p-2.5 bg-red-700 bg-opacity-30 text-red-300 border border-red-700 rounded-md text-xs text-center">
            Error: {documentProcessingError}
          </div>
        )}
        {selectedFile && (
          <div className="mb-2 p-3 bg-[#252525] rounded-md flex items-center justify-between text-sm">
            <div className="flex items-center overflow-hidden">
              <FileText size={18} className="text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-gray-200 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="text-gray-500 ml-2 flex-shrink-0">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={async () => {
                  if (!isProcessingDocument) {
                    await onDocumentReadyToProcess();
                  }
                }}
                disabled={isProcessingDocument}
                className={`flex items-center bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md text-xs transition-colors mr-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                title="Use this document for the conversation"
              >
                {isProcessingDocument ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle size={14} className="mr-1" />
                )}
                {isProcessingDocument ? "Processing..." : "Use Document"}
              </button>
              <button
                onClick={clearSelectedFile}
                disabled={isProcessingDocument}
                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Clear selected document"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <ElevenLabsAgent 
              key={agentKey}
              agentId={agentIdToUse}
              onNewMessage={handleNewMessageFromAgent}
              onSpeakingStatusChange={setIsAgentSpeaking}
              onPauseStateChange={handlePauseStateChange}
          />
          <button
            onClick={initiateDocumentUpload}
            disabled={isProcessingDocument}
            className="ml-3 p-2 bg-[#2A2A2A] hover:bg-[#383838] text-gray-300 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Upload a document"
          >
            <Paperclip size={20} />
          </button>
        </div>
      </div>
    </div>
  );
} 