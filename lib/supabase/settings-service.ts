import { supabase } from "./client"
import type { Database } from "./database.types"

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"]

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  // Directly attempt to fetch user settings
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single() // Use .single() to get one record or null/error

  if (error) {
    // If the error is PGRST116, it means no settings were found for the user.
    // This is not a fatal error; we should proceed to create default settings.
    if (error.code === 'PGRST116') {
      console.log(`No settings found for user ${userId}. Creating default settings.`);
      // Fall through to create default settings
    } else {
      // For any other unexpected error, log it and return null.
      console.error("Error fetching user settings:", error);
      return null;
    }
  }

  // If settings were found (data is not null and no unhandled error occurred),
  // return the found settings.
  if (data && (!error || error.code === 'PGRST116')) {
    // If data exists even with PGRST116 (shouldn't happen with .single() as data would be null)
    // or if data exists and there was no error, return data.
    // More simply, if data is truthy, it means settings were found.
    if (data) {
        return data;
    }
  }

  // If no settings were found (data was null due to PGRST116 or initially empty), create them.
  console.log(`Proceeding to create default settings for user ${userId}.`);
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
