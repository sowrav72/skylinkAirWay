import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: get current session
export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// Helper: get current user role
export const getUserRole = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.user_metadata?.role || null;
};

// Helper: get access token
export const getToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
};