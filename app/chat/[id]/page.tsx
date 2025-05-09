"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getChatMessages } from "@/lib/supabase/chat-service";
import { useAuth } from "@/lib/supabase/auth-context";
import { ArrowLeft, Loader2 } from "lucide-react";

type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) {
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const messagesData = await getChatMessages(id);
        // Type assertion to ensure the data conforms to our Message type
        setMessages(messagesData as Message[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching chat messages:", err);
        setError("Could not load messages. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [id, user]);

  const goBack = () => {
    router.push("/");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A] text-white p-4">
      <div className="flex items-center mb-6">
        <button
          onClick={goBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </button>
        <h1 className="text-xl font-light ml-4">Chat Conversation</h1>
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