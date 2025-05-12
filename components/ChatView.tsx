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
  initialTitle: string | null;
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
      color: new THREE.Color( `hsl(210, ${Math.random() * 30 + 70}%, ${Math.random() * 20 + 60}%)` ),
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
              const hue = 210 / 360;
              const saturation = 0.9 + Math.sin(state.clock.elapsedTime * 0.5 + i * 0.1) * 0.1;
              const lightness = 0.65 + Math.sin(state.clock.elapsedTime * 1.5 + i * 0.3) * 0.1;
              particle.material.color.setHSL(hue, saturation, lightness);
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
  const primaryColor = "#3B82F6";
  const darkPrimaryColor = "#1E40AF";
  const emissivePrimary = "#1D4ED8";
  const darkEmissivePrimary = "#1E3A8A";

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
        color={isSpeaking ? primaryColor : darkPrimaryColor} 
        roughness={0.2}
        metalness={0.6}
        emissive={isSpeaking ? emissivePrimary : darkEmissivePrimary}
        emissiveIntensity={isSpeaking ? 0.6 : 0.2}
      />
    </mesh>
  );
};

export function ChatView({ 
  chatId, 
  user: propUser,
  initialTitle,
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
  const [chatTitle, setChatTitle] = useState(initialTitle || "Conversation");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const agentInstanceIdBase = `agent-for-chat-${chatId}`;

  // Define primary color for 3D elements here
  const primaryColor = "#3B82F6"; // Example: Tailwind's blue-500 approx

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
        if (!initialTitle) { 
          const chatDetails = await getChatById(chatId);
          if (isActive && chatDetails) {
            setChatTitle(chatDetails.title);
          }
        } else if (chatTitle !== initialTitle) {
          setChatTitle(initialTitle);
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
  }, [chatId, user, initialTitle, chatTitle]);

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

  const exportToPdf = () => {
    // Initialize PDF with professional settings
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Professional red and black color scheme
    const colors = {
      red: [180, 0, 0] as [number, number, number],
      lightRed: [220, 0, 0] as [number, number, number],
      black: [0, 0, 0] as [number, number, number],
      darkGray: [51, 51, 51] as [number, number, number],
      mediumGray: [102, 102, 102] as [number, number, number],
      lightGray: [230, 230, 230] as [number, number, number],
      white: [255, 255, 255] as [number, number, number]
    };
    
    // Metadata
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    let yPosition = 20;
    
    // Title section
    doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", 'bold');
    doc.text(chatTitle, margin, yPosition);
    
    yPosition += 3;
    doc.setDrawColor(colors.red[0], colors.red[1], colors.red[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, margin + doc.getTextWidth(chatTitle), yPosition);
    
    yPosition += 7;
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", 'normal');
    doc.text(`Exported on ${currentDate} at ${currentTime}`, margin, yPosition);
    
    yPosition += 15;
    
    messages.forEach((message, index) => {
      const isUser = message.role === "user";
      const speaker = isUser ? "You" : "AI Assistant";
      
      if (yPosition > pageHeight - 40) { // Check if new message section needs new page
        doc.addPage();
        yPosition = 20;
        doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
        doc.setFontSize(8);
        doc.text(`Page ${doc.internal.pages.length}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
      
      const bubbleY = yPosition;
      const bubblePadding = 10;
      
      doc.setFontSize(10);
      const contentLines = doc.splitTextToSize(message.content, contentWidth - (bubblePadding * 2));
      // This messageHeight is for the current page's bubble segment.
      // For multi-page text, the actual drawn content will dictate the final yPosition.
      let currentSegmentLineCount = 0;
      let tempY = bubbleY + 18; // Initial text position within bubble
      for(let line of contentLines) {
        if (tempY + 6 > pageHeight - 25) { // Approximate check if line fits
            break; 
        }
        currentSegmentLineCount++;
        tempY +=6;
      }
      const bubbleSegmentHeight = (currentSegmentLineCount * 6) + 20;


      if (isUser) {
        doc.setDrawColor(colors.red[0], colors.red[1], colors.red[2]);
        doc.setLineWidth(1.5);
        doc.line(margin, bubbleY, margin, bubbleY + bubbleSegmentHeight);
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
        doc.rect(margin + 3, bubbleY, contentWidth - 3, bubbleSegmentHeight, 'F');
        doc.setTextColor(colors.red[0], colors.red[1], colors.red[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", 'bold');
        doc.text(speaker, margin + bubblePadding, bubbleY + 8);
      } else {
        doc.setDrawColor(colors.black[0], colors.black[1], colors.black[2]);
        doc.setLineWidth(1.5);
        doc.line(margin, bubbleY, margin, bubbleY + bubbleSegmentHeight);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin + 3, bubbleY, contentWidth - 3, bubbleSegmentHeight, 'F');
        doc.setTextColor(colors.black[0], colors.black[1], colors.black[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", 'bold');
        doc.text(speaker, margin + bubblePadding, bubbleY + 8);
      }
      
      if (message.created_at) { // Use created_at for timestamp
        const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        doc.setFontSize(8);
        doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
        doc.text(timestamp, pageWidth - margin - bubblePadding, bubbleY + 8, { align: 'right' });
      }
      
      doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", 'normal');
      
      let contentY = bubbleY + bubblePadding + 8; // Initial Y for text content (after speaker/timestamp and top padding)
      const speakerLineHeight = 8; // Approximate height taken by speaker/timestamp line

      for (let i = 0; i < contentLines.length; i++) {
        // Check if the current line will overflow
        if (contentY + 6 > pageHeight - (margin / 2)) { // Use a tighter bottom margin for content
          doc.addPage();
          let newPageBubbleY = 20; // Bubble for continued part starts at top of content area
          yPosition = newPageBubbleY; // Update main yPosition for context of this new page

          // Draw page number on new page
          doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
          doc.setFontSize(8);
          doc.text(`Page ${doc.internal.pages.length}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

          // Calculate height of the continued message segment on this new page
          let linesOnThisNewPage = 0;
          const continuedIndicatorHeight = 6; // Height for "(continued)" text line
          const continuedIndicatorPadding = 4; // Padding around "(continued)"
          let calculatedContinuedBubbleHeight = bubblePadding; // Top bubble padding
          calculatedContinuedBubbleHeight += continuedIndicatorHeight + continuedIndicatorPadding;

          let tempTextYOnNewPage = newPageBubbleY + bubblePadding + continuedIndicatorHeight + continuedIndicatorPadding;

          for (let j = i; j < contentLines.length; j++) { // Iterate over REMAINING lines
            if (tempTextYOnNewPage + 6 > pageHeight - (margin/2) - bubblePadding) { // - bubblePadding for bottom of bubble
              break;
            }
            linesOnThisNewPage++;
            tempTextYOnNewPage += 6;
            calculatedContinuedBubbleHeight += 6;
          }
          calculatedContinuedBubbleHeight += bubblePadding; // Bottom bubble padding
          if (linesOnThisNewPage === 0) { // Ensure minimum height for "(continued)" if no other lines fit
             calculatedContinuedBubbleHeight = bubblePadding + continuedIndicatorHeight + continuedIndicatorPadding + bubblePadding;
          }

          // Redraw bubble styling for the continued part
          if (isUser) {
            doc.setDrawColor(colors.red[0], colors.red[1], colors.red[2]);
            doc.setLineWidth(1.5);
            doc.line(margin, newPageBubbleY, margin, newPageBubbleY + calculatedContinuedBubbleHeight);
            doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
            doc.rect(margin + 3, newPageBubbleY, contentWidth - 3, calculatedContinuedBubbleHeight, 'F');
          } else { // AI
            doc.setDrawColor(colors.black[0], colors.black[1], colors.black[2]);
            doc.setLineWidth(1.5);
            doc.line(margin, newPageBubbleY, margin, newPageBubbleY + calculatedContinuedBubbleHeight);
            doc.setFillColor(245, 245, 245);
            doc.rect(margin + 3, newPageBubbleY, contentWidth - 3, calculatedContinuedBubbleHeight, 'F');
          }

          // Set contentY for drawing text within this new bubble segment
          contentY = newPageBubbleY + bubblePadding;
          doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
          doc.setFontSize(8);
          doc.setFont("helvetica", 'italic');
          doc.text("(continued)", margin + bubblePadding, contentY + 5); // Position (continued) text
          contentY += continuedIndicatorHeight + continuedIndicatorPadding; // Move contentY down

          // Reset text style for actual message content
          doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
          doc.setFontSize(10);
          doc.setFont("helvetica", 'normal');
        }
        
        doc.text(contentLines[i], margin + bubblePadding, contentY);
        contentY += 6;
      }
      
      yPosition = contentY + bubblePadding; // Update yPosition to after the bottom padding of the last drawn segment

      if (index < messages.length - 1) { // If not the last message
          const separatorAndPaddingHeight = 15; 
          if (yPosition + separatorAndPaddingHeight > pageHeight - 25) {
              doc.addPage();
              yPosition = 20; 
              doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
              doc.setFontSize(8);
              doc.text(`Page ${doc.internal.pages.length}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
          } else {
              const separatorY = yPosition + 7; 
              doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
              doc.setLineWidth(0.5);
              doc.line(margin + 10, separatorY, pageWidth - margin - 10, separatorY);
              yPosition += separatorAndPaddingHeight; 
          }
      }
    });
    
    // Add final page number if not already on a fresh page
    if (pageHeight - yPosition < 20 && doc.internal.pages.length > 0) {
    } else if (doc.internal.pages.length > 0) { 
        doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
        doc.setFontSize(8);
        doc.text(`Page ${doc.internal.pages.length}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15); // Footer line
    
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", 'normal');
    doc.text("Conversation Export", margin, pageHeight - 10); // Footer text
    
    const safeFileName = chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeFileName}.pdf`);
    setShowExportMenu(false);
  };
    
  const handlePauseStateChange = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-background text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl text-foreground mb-2">Error Loading Chat</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h1 className="text-lg font-semibold text-foreground truncate">{chatTitle}</h1>
        <div className="relative" ref={exportMenuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center bg-muted hover:bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
            <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-xl z-20 py-1">
              {[{ label: "PDF (.pdf)", action: exportToPdf}
              ].map(item => (
                <button key={item.label} onClick={item.action} className="w-full flex items-center px-3.5 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative">
        {!isPaused && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-full h-[300px] max-w-md mx-auto mb-6">
              <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[5, 5, 5]} intensity={1.2} angle={0.3} penumbra={0.5} castShadow />
                <pointLight position={[-5, -5, -5]} intensity={0.7} color={primaryColor} />
                <FloatingLogo isSpeaking={isAgentSpeaking} />
                <AudioVisualizer isSpeaking={isAgentSpeaking} />
              </Canvas>
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-4">
              {isAgentSpeaking ? "Listening to AI..." : "Speak now..."}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {messages.length > 0 ? "Press pause to view conversation" : "Click Pause when you're done"}
            </p>
          </div>
        )}
        
        {isPaused && messages.length === 0 && !isLoading && !error && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-full h-[300px] max-w-md mx-auto mb-6">
              <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[5, 5, 5]} intensity={1.2} angle={0.3} penumbra={0.5} castShadow />
                <pointLight position={[-5, -5, -5]} intensity={0.7} color={primaryColor} />
                <FloatingLogo isSpeaking={false} />
                <AudioVisualizer isSpeaking={false} />
              </Canvas>
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-4">Hello! How can I help you today?</h2>
            <p className="text-sm text-muted-foreground">Click the Play button below to start speaking</p>
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
                    ? "bg-primary text-primary-foreground rounded-br-none" 
                    : "bg-muted text-muted-foreground rounded-bl-none" }`}
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

      <div className="p-3 border-t border-border bg-card">
        {documentProcessingError && (
          <div className={`mb-2 p-2.5 rounded-md text-xs text-center ${
            documentProcessingError.startsWith('✅') 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {documentProcessingError}
          </div>
        )}
        {selectedFile && (
          <div className="mb-2 p-3 bg-muted rounded-md flex items-center justify-between text-sm">
            <div className="flex items-center overflow-hidden">
              <FileText size={18} className="text-muted-foreground mr-2 flex-shrink-0" />
              <span className="text-foreground truncate" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="text-muted-foreground ml-2 flex-shrink-0">
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
                className={`flex items-center bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md text-xs transition-colors mr-2 disabled:opacity-60 disabled:cursor-not-allowed`}
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
                className="p-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Clear selected document"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end justify-start">
          <ElevenLabsAgent 
              key={agentKey}
              agentId={agentIdToUse}
              onNewMessage={handleNewMessageFromAgent}
              onSpeakingStatusChange={setIsAgentSpeaking}
              onPauseStateChange={handlePauseStateChange}
              initiateDocumentUpload={initiateDocumentUpload}
              isProcessingDocument={isProcessingDocument}
          />
        </div>
      </div>
    </div>
  );
} 