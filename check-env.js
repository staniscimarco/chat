// Script per verificare le variabili d'ambiente
require('dotenv').config();

console.log("🔍 Verificando variabili d'ambiente...\n");

// Verifica se il file .env è stato caricato
console.log("📁 File .env caricato:", process.env.NODE_ENV ? "Sì" : "Sì (default)");

// Verifica le variabili Hugging Face
console.log("\n🤗 Variabili Hugging Face:");
console.log("   HUGGINGFACE_API_KEY:", process.env.HUGGINGFACE_API_KEY ? 
  `${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...` : "❌ Non trovata");
console.log("   USE_HUGGINGFACE:", process.env.USE_HUGGINGFACE || "❌ Non trovata");

// Verifica altre variabili importanti
console.log("\n🔧 Altre variabili:");
console.log("   DATABASE_URL:", process.env.DATABASE_URL ? "✅ Trovata" : "❌ Non trovata");
console.log("   PINECONE_API_KEY:", process.env.PINECONE_API_KEY ? "✅ Trovata" : "❌ Non trovata");
console.log("   OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Trovata" : "❌ Non trovata");

// Test del token se presente
if (process.env.HUGGINGFACE_API_KEY) {
  console.log("\n🧪 Testando il token trovato...");
  const axios = require('axios');
  
  axios.get("https://huggingface.co/api/whoami", {
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
    }
  })
  .then(response => {
    console.log("✅ Token valido!");
    console.log(`   Utente: ${response.data.name}`);
  })
  .catch(error => {
    console.log("❌ Token non valido");
    console.log(`   Errore: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  });
} else {
  console.log("\n⚠️  Nessun token Hugging Face trovato nel file .env");
}

console.log("\n📝 Suggerimenti:");
console.log("1. Assicurati che il file .env sia nella root del progetto");
console.log("2. Verifica che il token sia copiato correttamente");
console.log("3. Il token dovrebbe iniziare con 'hf_'");
console.log("4. Riavvia il server dopo aver modificato il file .env"); 