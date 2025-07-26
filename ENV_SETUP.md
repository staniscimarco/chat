# 🚀 DOCKY-AI Deployment Guide

## 📋 Variabili d'Ambiente Necessarie

### Database Configuration
```env
DATABASE_URL="your_database_url_here"
```

### Authentication
```env
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

### AI Providers
```env
OPENAI_API_KEY="your_openai_api_key_here"
ANTHROPIC_API_KEY="your_anthropic_api_key_here"
OLLAMA_BASE_URL="http://localhost:11434"
```

### Vector Database (Pinecone)
```env
PINECONE_API_KEY="your_pinecone_api_key_here"
PINECONE_ENVIRONMENT="your_pinecone_environment_here"
PINECONE_INDEX_NAME="your_pinecone_index_name_here"
```

### File Storage (S3)
```env
S3_ACCESS_KEY_ID="your_s3_access_key_here"
S3_SECRET_ACCESS_KEY="your_s3_secret_key_here"
S3_BUCKET_NAME="your_s3_bucket_name_here"
S3_REGION="your_s3_region_here"
```

### Stripe (Payments)
```env
STRIPE_SECRET_KEY="your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret_here"
```

### Hugging Face (Optional)
```env
HUGGINGFACE_API_KEY="your_huggingface_api_key_here"
```

### Environment
```env
NODE_ENV="production"
```

## 🌐 Opzioni di Deployment

### 1. Vercel (Raccomandato)
1. Vai su [vercel.com](https://vercel.com)
2. Registrati con GitHub
3. Importa il repository `chat`
4. Configura le variabili d'ambiente
5. Deploy automatico!

### 2. Netlify
1. Vai su [netlify.com](https://netlify.com)
2. Importa da GitHub
3. Build command: `npm run build`
4. Publish directory: `.next`

### 3. Railway
1. Vai su [railway.app](https://railway.app)
2. Importa il repository
3. Configura database e variabili
4. Deploy automatico

## 🔧 Setup Database

### Opzioni Database:
- **Vercel Postgres** (gratuito con Vercel)
- **PlanetScale** (gratuito)
- **Supabase** (gratuito)
- **Railway Postgres** (a pagamento)

## 📝 Passi per Vercel

1. **Preparazione:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configurazione:**
   - Aggiungi variabili d'ambiente nel dashboard Vercel
   - Configura il database
   - Imposta il dominio personalizzato

## ⚠️ Note Importanti

- Assicurati che tutte le API keys siano valide
- Il database deve essere accessibile dall'esterno
- Configura correttamente CORS se necessario
- Testa l'applicazione dopo il deploy 