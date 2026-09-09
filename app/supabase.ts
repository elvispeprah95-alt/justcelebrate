import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://hohddtjiapyjztrskcaz.supabase.co";
export const supabaseKey = "sb_publishable_nKZ3DnE9IDgKLMQFhVh1Jg_KST0Ebhf";

export const supabase = createClient(supabaseUrl, supabaseKey);

// The vendor directory now uses the main Just Celebrate Supabase project.
// Keeping these aliases means the existing vendor and claim pages continue to work.
export const vendorDirectoryUrl = supabaseUrl;
export const vendorDirectoryKey = supabaseKey;
