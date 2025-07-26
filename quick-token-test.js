// Test rapido del token con il sistema in esecuzione
require('dotenv').config();
const axios = require('axios');

console.log("🔍 Test rapido del token Hugging Face...\n");

const token = process.env.HUGGINGFACE_API_KEY;

if (!token) {
  console.log("❌ Token non trovato nel file .env");
  process.exit(1);
}

console.log(`Token: ${token.substring(0, 10)}...`);

// Test semplice e veloce
async function quickTest() {
  try {
    console.log("🧪 Testando con modello semplice...");
    
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/bert-base-uncased",
      {
        inputs: "Hello world"
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.data) {
      console.log("✅ Token funziona!");
      console.log("✅ Il sistema PDF-AI può utilizzare Hugging Face");
      console.log("\n🚀 Vai su http://localhost:3000 e testa il sistema!");
      return true;
    }
    
  } catch (error) {
    console.log("❌ Token non funziona");
    console.log(`   Errore: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
    
    return false;
  }
}

quickTest().catch(console.error); 