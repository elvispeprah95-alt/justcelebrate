import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hohddtjiapyjztrskcaz.supabase.co";
const supabaseKey = "sb_publishable_nKZ3DnE9IDgKLMQFhVh1Jg_KST0Ebhf";

export const supabase = createClient(supabaseUrl, supabaseKey);
