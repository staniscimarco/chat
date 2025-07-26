import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  try {
    // Controlla se usare Ollama o OpenAI
    const useOllama = process.env.USE_OLLAMA === 'true';
    
    if (useOllama) {
      console.log("Usando Ollama per embeddings");
      // Per ora usiamo OpenAI per embeddings (Ollama non ha modelli di embedding specifici)
      // In futuro potremmo implementare un approccio diverso
      const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text.replace(/\n/g, " "),
      });
      const result = await response.json();
      return result.data[0].embedding as number[];
    } else {
      console.log("Usando OpenAI per embeddings");
      const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text.replace(/\n/g, " "),
      });
      const result = await response.json();
      return result.data[0].embedding as number[];
    }
  } catch (error) {
    console.log("error calling embeddings api", error);
    throw error;
  }
}
