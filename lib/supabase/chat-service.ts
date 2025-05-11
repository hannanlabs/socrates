import { supabase } from "./client"
import type { Database } from "./database.types"

type Chat = Database["public"]["Tables"]["chats"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]

export async function getUserChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching chats:", error)
    return []
  }

  return data
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages:", error)
    return []
  }

  return data
}

export async function createNewChat(initialTitle: string): Promise<string | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Error fetching authenticated user for chat creation:", authError)
    return null
  }

  const authenticatedUserId = user.id

  // Create a new chat with the provided title
  const { data: chatData, error: chatError } = await supabase
    .from("chats")
    .insert({
      user_id: authenticatedUserId,
      title: initialTitle.slice(0, 50) + (initialTitle.length > 50 ? "..." : ""),
    })
    .select()

  if (chatError || !chatData || chatData.length === 0) {
    console.error("Error creating chat:", chatError)
    return null
  }

  return chatData[0].id
}

export async function addMessageToChat(chatId: string, role: "user" | "assistant", content: string): Promise<boolean> {
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    role,
    content,
  })

  if (error) {
    console.error("Error adding message:", error)
    return false
  }

  // Update the chat's updated_at timestamp
  await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId)

  return true
}

export async function updateChatTitle(chatId: string, title: string): Promise<boolean> {
  const { error } = await supabase.from("chats").update({ title }).eq("id", chatId)

  if (error) {
    console.error("Error updating chat title:", error)
    return false
  }

  return true
}

export async function archiveChat(chatId: string): Promise<boolean> {
  const { error } = await supabase.from("chats").update({ is_archived: true }).eq("id", chatId)

  if (error) {
    console.error("Error archiving chat:", error)
    return false
  }

  return true
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single();

  if (error) {
    console.error("Error fetching chat:", error)
    return null
  }

  return data
}
