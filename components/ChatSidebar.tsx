"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Search, Trash2, Edit2, Save, X, PlusCircle, MessageSquare, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { getUserChats, archiveChat, updateChatTitle, createNewChat, getChatById } from "@/lib/supabase/chat-service";
import type { Database } from "@/lib/supabase/database.types";
import { supabase } from "@/lib/supabase/client"; // For logout

type Chat = Database["public"]["Tables"]["chats"]["Row"];

interface ChatSidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void; // Callback to inform parent about new chat initiation
}

export function ChatSidebar({ selectedChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userChats = await getUserChats(user.id);
        setChats(userChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, [user]);

  const handleCreateNewChat = async () => {
    if (!user) return;
    try {
      // Step 1: Create the new chat, expecting just the ID back
      const newChatId = await createNewChat(user.id) as string | null;
      
      if (newChatId && typeof newChatId === 'string') {
        // Step 2: Fetch the full chat object using the new ID
        const newChatObject = await getChatById(newChatId);

        if (newChatObject && typeof newChatObject === 'object' && 'id' in newChatObject) {
          // Now we have the full Chat object
          setChats(prevChats => 
            [newChatObject, ...prevChats].sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
          );
          onSelectChat(newChatObject.id); // Select the new chat
        } else {
          console.error("Failed to fetch details for newly created chat. ID:", newChatId);
          // Handle error - perhaps the chat was created but couldn't be fetched immediately
        }
      } else {
        console.error("Failed to create new chat: No ID returned or invalid ID format", newChatId);
      }
    } catch (error) {
      console.error("Error in new chat creation process:", error);
    }
  };

  const handleArchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const success = await archiveChat(chatId);
      if (success) {
        setChats(chats.filter((chat) => chat.id !== chatId));
        if (selectedChatId === chatId) {
          onSelectChat(null); // Deselect if archived
        }
      }
    } catch (error) {
      console.error("Error archiving chat:", error);
    }
  };

  const handleEditTitle = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditedTitle(chat.title);
  };

  const handleSaveTitle = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedTitle.trim()) {
      try {
        const success = await updateChatTitle(chatId, editedTitle.trim());
        if (success) {
          setChats(chats.map(c => c.id === chatId ? { ...c, title: editedTitle.trim(), updated_at: new Date().toISOString() } : c).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        }
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    }
    setEditingChatId(null);
    setEditedTitle("");
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditedTitle("");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
    // Parent component (ChatPage) will handle redirect via useAuth
  };

  const filteredChats = useMemo(() => {
    return searchQuery
      ? chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : chats;
  }, [chats, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays <= 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const getInitial = () => {
    if (!user) return "U";
    const emailName = user.email?.split('@')[0];
    return emailName ? emailName.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || "U");
  };

  return (
    <div className="h-full flex flex-col bg-[#1D1D1D] text-white">
      {/* Header with Search */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
                {/* Placeholder for company logo/name if needed, like in the image */}
                 <MessageSquare className="h-7 w-7 text-[#E50041] mr-2" />
                <h1 className="text-xl font-semibold">Socratic</h1>
            </div>
            {/* Settings icon - can be implemented later */}
            {/* <button className="text-gray-400 hover:text-white"><Settings size={20} /></button> */}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252525] border border-[#333333] rounded-md py-2 pl-10 pr-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#E50041] placeholder-gray-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E50041] border-t-transparent"></div>
          </div>
        ) : filteredChats.length === 0 && !searchQuery ? (
          <div className="text-center py-10 px-3 text-gray-400 text-sm">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-50"/>
            No conversations yet.
            <button 
              onClick={handleCreateNewChat}
              className="mt-4 w-full flex items-center justify-center bg-gradient-to-r from-[#E50041] to-[#C00031] hover:opacity-90 text-white font-medium py-2 px-4 rounded-md text-sm"
            >
              <PlusCircle size={18} className="mr-2" /> Start New Chat
            </button>
          </div>
        ) : filteredChats.length === 0 && searchQuery ? (
            <div className="text-center py-10 px-3 text-gray-400 text-sm">
             <Search size={40} className="mx-auto mb-3 opacity-50"/>
             No chats found for "{searchQuery}".
            </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group 
                          ${selectedChatId === chat.id ? 'bg-[#E50041] text-white shadow-md' : 'hover:bg-[#2A2A2A] text-gray-300'}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex-1 min-w-0">
                {editingChatId === chat.id ? (
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className={`flex-1 bg-transparent border rounded px-2 py-1 text-sm mr-1 focus:outline-none 
                                  ${selectedChatId === chat.id ? 'border-white/50 focus:border-white' : 'border-gray-500 focus:border-gray-400'}`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle(chat.id, e as any);
                        if (e.key === 'Escape') handleCancelEdit(e as any);
                      }}
                    />
                    <button onClick={(e) => handleSaveTitle(chat.id, e)} className={`p-1 hover:text-green-400 ${selectedChatId === chat.id ? 'text-white/80' : 'text-gray-400'}`} title="Save">
                      <Save size={16} />
                    </button>
                    <button onClick={handleCancelEdit} className={`p-1 hover:text-red-400 ${selectedChatId === chat.id ? 'text-white/80' : 'text-gray-400'}`} title="Cancel">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className={`text-sm font-medium truncate ${selectedChatId === chat.id ? 'text-white' : 'text-gray-100 group-hover:text-white'}`}>{chat.title}</h3>
                    {/* Preview of last message can be added here if available */}
                    <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-white/70' : 'text-gray-400 group-hover:text-gray-300'}`}>
                      {/* Placeholder for last message snippet or use date */}
                      {`Last activity: ${formatDate(chat.updated_at)}`}
                    </p>
                  </>
                )}
              </div>
              {!editingChatId || editingChatId !== chat.id ? (
                <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity 
                              ${selectedChatId === chat.id ? 'opacity-100' : ''}">
                  <button
                    onClick={(e) => handleEditTitle(chat, e)}
                    className={`p-1 rounded hover:bg-white/20 ${selectedChatId === chat.id ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-100'}`}
                    title="Edit title"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleArchiveChat(chat.id, e)}
                    className={`p-1 rounded hover:bg-white/20 ${selectedChatId === chat.id ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-400'}`}
                    title="Archive chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Footer with New Chat Button & User Info/Logout */}
      <div className="p-3 border-t border-[#2A2A2A] mt-auto">
        <button 
          onClick={handleCreateNewChat}
          className="w-full flex items-center justify-center bg-[#252525] hover:bg-[#303030] text-gray-200 font-medium py-2.5 px-4 rounded-md text-sm transition-colors mb-3"
        >
          <PlusCircle size={18} className="mr-2 text-[#E50041]" /> Start New Chat
        </button>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-sm font-semibold text-white mr-2.5">
                    {getInitial()}
                </div>
                <span className="text-xs text-gray-300 truncate">{user?.email}</span>
            </div>
            <button 
                onClick={handleLogout}
                title="Logout"
                className="text-gray-400 hover:text-[#E50041] p-1 rounded"
            >
                <LogOut size={18}/>
            </button>
        </div>
      </div>
    </div>
  );
} 