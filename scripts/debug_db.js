const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ebtppfzsfpoxskoxfnyx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeWhweXJ0c2FjemVud2RnaG1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyMjQ5MSwiZXhwIjoyMDg4Mzk4NDkxfQ.kewJOm5fWIbM0VjjDqEtDA4bkRTZqvG2l5WqBg8Hflo"; // This key seems wrong because the base url is ebtppfzsfpoxskoxfnyx but the service key says cfyhpyrtsaczenwdghmg. Let me use the anon key.
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidHBwZnpzZnBveHNrb3hmbnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDk0MDksImV4cCI6MjA5MTM4NTQwOX0.FOyuYkDn4yhGD2mHWGFsHQrQ6CiOGvfIGgbk2IVk6bY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log("Checking transactions table...");
  const { data: tx, error: txError } = await supabase.from("transactions").select("*").limit(5).order("created_at", { ascending: false });
  console.log("Transactions:", tx || txError);

  console.log("\nChecking users table...");
  const { data: users, error: userError } = await supabase.from("users").select("id, email, owner_id, store_name").limit(3);
  console.log("Users:", users || userError);
}

checkData();
