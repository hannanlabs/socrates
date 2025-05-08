import { supabase } from "./client"
import type { Database } from "./database.types"

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"]

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  // First, check if the user exists in the users table
  const { data: userData, error: userError } = await supabase.from("users").select("id").eq("id", userId).single()

  if (userError) {
    // If user doesn't exist, we need to create them first
    if (userError.code === "PGRST116") {
      // Get user data from auth
      const { data: authUser } = await supabase.auth.getUser()

      if (authUser && authUser.user) {
        // Create user record
        const { error: createUserError } = await supabase.from("users").insert({
          id: userId,
          email: authUser.user.email || "unknown@example.com",
          name: authUser.user.user_metadata?.name || null,
        })

        if (createUserError) {
          console.error("Error creating user record:", createUserError)
          return null
        }
      } else {
        console.error("Cannot get authenticated user")
        return null
      }
    } else {
      console.error("Error checking user existence:", userError)
      return null
    }
  }

  // Now check if settings exist
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId)

  if (error) {
    console.error("Error fetching user settings:", error)
    return null
  }

  // If no settings found, create default settings
  if (!data || data.length === 0) {
    const defaultSettings = {
      user_id: userId,
      theme: "dark",
      model_preference: "claude-3.7-sonnet",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newSettings, error: insertError } = await supabase
      .from("user_settings")
      .insert(defaultSettings)
      .select()
      .single()

    if (insertError) {
      console.error("Error creating default settings:", insertError)
      return null
    }

    return newSettings
  }

  // Return the first settings record if multiple exist
  return data[0]
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, "user_id" | "created_at" | "updated_at">>,
): Promise<boolean> {
  const { error } = await supabase
    .from("user_settings")
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    console.error("Error updating user settings:", error)
    return false
  }

  return true
}
