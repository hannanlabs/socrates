"use client"

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getChatMessages, getChatById } from "@/lib/supabase/chat-service";
import { useAuth } from "@/lib/supabase/auth-context";
import { ArrowLeft, Loader2, Download, FileText, File, FileIcon, ChevronDown } from "lucide-react";
import { jsPDF } from "jspdf";
import * as docx from "docx";
import { Packer, Paragraph, TextRun, Document, HeadingLevel } from "docx";

type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Chat = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
};

export default function ChatPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Chat Conversation");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) {
      return;
    }

    const fetchChatData = async () => {
      setIsLoading(true);
      try {
        // First fetch the chat details to get the title
        const chatData = await getChatById(id);
        if (chatData) {
          setChatTitle(chatData.title);
        }

        // Then fetch the messages
        const messagesData = await getChatMessages(id);
        setMessages(messagesData as Message[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Could not load chat. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
  }, [id, user]);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const goBack = () => {
    router.push("/");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Export chat to TXT format
  const exportToTxt = () => {
    let content = `${chatTitle}\n`;
    content += `Exported on ${new Date().toLocaleString()}\n\n`;

    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      const time = formatTimestamp(message.created_at);
      const date = formatDate(message.created_at);
      
      content += `[${date} ${time}] ${speaker}:\n${message.content}\n\n`;
    });

    // Create blob and download
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

  // Export chat to PDF format
  const exportToPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const textWidth = pageWidth - (margin * 2);
    let yPosition = 20;
    
    // Title
    doc.setFontSize(16);
    doc.text(chatTitle, margin, yPosition);
    yPosition += 10;
    
    // Export date
    doc.setFontSize(10);
    doc.text(`Exported on ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;
    
    // Messages
    doc.setFontSize(12);
    
    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      const time = formatTimestamp(message.created_at);
      const date = formatDate(message.created_at);
      
      // Header (speaker & timestamp)
      doc.setFont("helvetica", 'bold');
      doc.text(`[${date} ${time}] ${speaker}:`, margin, yPosition);
      yPosition += 7;
      
      // Message content (with text wrapping)
      doc.setFont("helvetica", 'normal');
      const contentLines = doc.splitTextToSize(message.content, textWidth);
      
      // Check if we need a new page
      if (yPosition + (contentLines.length * 7) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(contentLines, margin, yPosition);
      yPosition += (contentLines.length * 7) + 10;
      
      // Check if we need a new page for the next message
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    doc.save(`${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    setShowExportMenu(false);
  };

  // Export chat to DOCX format
  const exportToDocx = async () => {
    // Create an array of paragraphs for the document
    const docParagraphs = [];
    
    // Title
    docParagraphs.push(
      new Paragraph({
        text: chatTitle,
        heading: HeadingLevel.HEADING_1
      })
    );
    
    // Export date
    docParagraphs.push(
      new Paragraph({
        text: `Exported on ${new Date().toLocaleString()}`,
        spacing: {
          after: 400
        }
      })
    );
    
    // Messages
    messages.forEach(message => {
      const speaker = message.role === "user" ? "You" : "AI Assistant";
      const time = formatTimestamp(message.created_at);
      const date = formatDate(message.created_at);
      
      // Header (speaker & timestamp)
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${date} ${time}] ${speaker}:`,
              bold: true
            })
          ]
        })
      );
      
      // Message content
      docParagraphs.push(
        new Paragraph({
          text: message.content,
          spacing: {
            after: 300
          }
        })
      );
    });
    
    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docParagraphs
        }
      ]
    });
    
    // Generate and download
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

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={goBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </button>
          <h1 className="text-xl font-light ml-4">{chatTitle}</h1>
        </div>
        
        <div className="relative" ref={exportMenuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center bg-[#333333] hover:bg-[#444444] text-white px-3 py-2 rounded transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
            <ChevronDown className="ml-2 h-4 w-4" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#333333] border border-[#444444] rounded-md shadow-lg z-10">
              <div className="py-1">
                <button 
                  onClick={exportToTxt}
                  className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-[#444444]"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Text File (.txt)
                </button>
                <button 
                  onClick={exportToDocx}
                  className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-[#444444]"
                >
                  <File className="mr-2 h-4 w-4" />
                  Word Document (.docx)
                </button>
                <button 
                  onClick={exportToPdf}
                  className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-[#444444]"
                >
                  <FileIcon className="mr-2 h-4 w-4" />
                  PDF Document (.pdf)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#CC0033]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center text-gray-500">
            No messages found in this conversation.
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pb-4 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-[#CC0033] text-white"
                    : "bg-[#222222] text-gray-200"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium text-xs">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  <div className="text-xs opacity-70">
                    {formatTimestamp(message.created_at)}
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 