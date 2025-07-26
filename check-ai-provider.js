// Test per verificare quale AI provider sta usando il sistema
require('dotenv').config();

console.log("🔍 Verifica AI Provider del Sistema PDF-AI...\n");

// Verifica configurazione
console.log("📋 Configurazione attuale:");
console.log(`   HUGGINGFACE_API_KEY: ${process.env.HUGGINGFACE_API_KEY ? '✅ Presente' : '❌ Mancante'}`);
console.log(`   USE_HUGGINGFACE: ${process.env.USE_HUGGINGFACE || 'false'}`);
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Presente' : '❌ Mancante'}`);

// Determina quale provider dovrebbe essere usato
function determineProvider() {
  const hasHuggingFace = process.env.HUGGINGFACE_API_KEY && process.env.USE_HUGGINGFACE === 'true';
  const hasOpenAI = process.env.OPENAI_API_KEY;
  
  console.log("\n🎯 Provider configurato:");
  
  if (hasHuggingFace) {
    console.log("   🤖 Hugging Face: ✅ Configurato e attivo");
    return 'huggingface';
  } else if (hasOpenAI) {
    console.log("   🤖 OpenAI: ✅ Configurato e attivo");
    return 'openai';
  } else {
    console.log("   ❌ Nessun provider configurato");
    return 'none';
  }
}

// Test del provider attivo
async function testActiveProvider() {
  const provider = determineProvider();
  
  if (provider === 'huggingface') {
    console.log("\n🧪 Testando Hugging Face...");
    
    try {
      const axios = require('axios');
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
        {
          inputs: "Test del sistema PDF-AI"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.data && response.data.length > 0) {
        console.log("✅ Hugging Face: FUNZIONANTE!");
        console.log(`   Embedding generato: ${response.data[0].length} dimensioni`);
        return 'huggingface';
      }
      
    } catch (error) {
      console.log("❌ Hugging Face: NON FUNZIONANTE");
      console.log(`   Errore: ${error.message}`);
      console.log("   Il sistema userà OpenAI come fallback");
      return 'openai';
    }
  }
  
  if (provider === 'openai' || provider === 'none') {
    console.log("\n🧪 Testando OpenAI...");
    
    try {
      const axios = require('axios');
      const response = await axios.post(
        "https://api.openai.com/v1/embeddings",
        {
          input: "Test del sistema PDF-AI",
          model: "text-embedding-ada-002"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.data && response.data.data) {
        console.log("✅ OpenAI: FUNZIONANTE!");
        console.log(`   Embedding generato: ${response.data.data[0].embedding.length} dimensioni`);
        return 'openai';
      }
      
    } catch (error) {
      console.log("❌ OpenAI: NON FUNZIONANTE");
      console.log(`   Errore: ${error.message}`);
      return 'none';
    }
  }
  
  return 'none';
}

// Test del sistema web
async function testWebSystem() {
  console.log("\n🌐 Testando sistema web...");
  
  try {
    const http = require('http');
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000', (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => reject(false));
      req.setTimeout(5000, () => reject(false));
    });
    
    if (response) {
      console.log("✅ Sistema web: ONLINE");
      console.log("   Vai su http://localhost:3000 per testare");
    } else {
      console.log("❌ Sistema web: OFFLINE");
    }
    
  } catch (error) {
    console.log("❌ Sistema web: NON RAGGIUNGIBILE");
  }
}

// Esegui tutti i test
async function runAllTests() {
  console.log("🚀 Eseguendo test completi...\n");
  
  const activeProvider = await testActiveProvider();
  await testWebSystem();
  
  console.log("\n📊 RISULTATO FINALE:");
  
  if (activeProvider === 'huggingface') {
    console.log("🎉 Il sistema sta usando HUGGING FACE!");
    console.log("   - Gratuito e funzionante");
    console.log("   - Tutte le funzionalità disponibili");
  } else if (activeProvider === 'openai') {
    console.log("🎉 Il sistema sta usando OPENAI!");
    console.log("   - Stabile e affidabile");
    console.log("   - Tutte le funzionalità disponibili");
  } else {
    console.log("❌ Nessun provider funzionante");
    console.log("   Configura HUGGINGFACE_API_KEY o OPENAI_API_KEY");
  }
  
  console.log("\n🌐 Per testare: http://localhost:3000");
}

runAllTests().catch(console.error); 