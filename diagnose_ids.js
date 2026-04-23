const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ebtppfzsfpoxskoxfnyx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidHBwZnpzZnBveHNrb3hmbnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDk0MDksImV4cCI6MjA5MTM4NTQwOX0.FOyuYkDn4yhGD2mHWGFsHQrQ6CiOGvfIGgbk2IVk6bY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log("--- Diagnosa Data ---");
  
  // Ambil transaksi 10 terakhir
  const { data: tx } = await supabase.from("transactions").select("id").limit(10);
  if (!tx || tx.length === 0) {
    console.log("Tidak ada transaksi ditemukan.");
    return;
  }
  const txIds = tx.map(t => t.id);

  // Ambil item transaksi
  const { data: items } = await supabase.from("transaction_items").select("product_id, quantity").in("transaction_id", txIds);
  console.log("Sampel Item Transaksi (Product IDs):", items?.map(i => i.product_id));

  // Ambil produk
  const { data: products } = await supabase.from("products").select("id, name");
  console.log("Daftar ID Produk di Tabel Products:", products?.map(p => ({ id: p.id, type: typeof p.id, name: p.name })));

  if (items && items.length > 0 && products) {
    const samplePid = items[0].product_id;
    const found = products.find(p => p.id === samplePid);
    console.log(`\nPercobaan mencocokkan ID [${samplePid}] (tipe: ${typeof samplePid}): ${found ? "BERHASIL (" + found.name + ")" : "GAGAL"}`);
    
    const foundString = products.find(p => String(p.id) === String(samplePid));
    console.log(`Percobaan mencocokkan ID dengan String conversion: ${foundString ? "BERHASIL (" + foundString.name + ")" : "GAGAL"}`);
  } else {
    console.log("Gagal melakukan pencocokan karena item atau produk kosong.");
  }
}

diagnose();
