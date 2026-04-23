const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ebtppfzsfpoxskoxfnyx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidHBwZnpzZnBveHNrb3hmbnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDk0MDksImV4cCI6MjA5MTM4NTQwOX0.FOyuYkDn4yhGD2mHWGFsHQrQ6CiOGvfIGgbk2IVk6bY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prods, error: pErr } = await supabase.from('products').select('*, categories(name)');
  console.log('PRODUCTS:', JSON.stringify(prods, null, 2));
  if (pErr) console.error('P_ERROR:', pErr);

  const { data: cats, error: cErr } = await supabase.from('categories').select('*');
  console.log('CATEGORIES:', JSON.stringify(cats, null, 2));
  if (cErr) console.error('C_ERROR:', cErr);
}
run();
