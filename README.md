# 🚀 DOCKY-AI: Next-Generation AI Assistant

A modern, full-stack AI-powered document assistant built with cutting-edge technologies. DOCKY-AI transforms how you interact with PDF documents through intelligent chat, voice commands, and advanced document processing.

![DOCKY-AI](https://img.shields.io/badge/DOCKY--AI-v1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2.30-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.3-38B2AC)

## ✨ Features

- 🤖 **AI-Powered Chat**: Intelligent conversations with your PDF documents
- 🎤 **Voice Assistant**: Natural language processing with speech recognition
- 📄 **PDF Processing**: Advanced document analysis and extraction
- 🔐 **User Authentication**: Secure login and user management
- 👥 **Admin Panel**: Complete user management system
- 🎨 **Modern UI**: Beautiful dark theme with DOCKY-inspired design
- 📱 **Responsive Design**: Works perfectly on all devices
- 🔍 **Smart Search**: Vector-based document search with Pinecone
- 💳 **Payment Integration**: Stripe-powered subscription system

## 🛠️ Tech Stack

### Frontend
- **Next.js 14.2.30** - React framework with App Router
- **TypeScript 5.2.2** - Type-safe development
- **Tailwind CSS 3.3.3** - Utility-first CSS framework
- **React 18.2.0** - Modern React with hooks
- **Lucide React** - Beautiful icons

### Backend & APIs
- **Next.js API Routes** - Serverless API endpoints
- **Clerk Authentication** - Modern auth solution
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Reliable database
- **Pinecone** - Vector database for AI search

### AI & ML
- **OpenAI GPT-4** - Advanced language model
- **Anthropic Claude** - Alternative AI provider
- **Ollama** - Local AI models support
- **Hugging Face** - Open-source AI models

### Infrastructure
- **Vercel** - Deployment and hosting
- **AWS S3** - File storage
- **Stripe** - Payment processing
- **Pinecone** - Vector embeddings

## 🚀 Quick Start

### Prerequisites
- Node.js 20.14.0+
- npm 10.8.1+
- PostgreSQL database
- Vercel account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/staniscimarco/chat.git
cd chat

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

## 🔧 Environment Variables

### Database Configuration
```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Authentication (Clerk)
```env
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

### AI Providers
```env
# OpenAI (Primary AI)
OPENAI_API_KEY="sk-your-openai-api-key"

# Anthropic Claude (Alternative)
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

# Ollama (Local AI)
OLLAMA_BASE_URL="http://localhost:11434"
```

### Vector Database (Pinecone)
```env
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"
PINECONE_INDEX_NAME="your-pinecone-index-name"
```

### File Storage (AWS S3)
```env
S3_ACCESS_KEY_ID="your-s3-access-key"
S3_SECRET_ACCESS_KEY="your-s3-secret-key"
S3_BUCKET_NAME="your-s3-bucket-name"
S3_REGION="your-s3-region"
```

### Payment Processing (Stripe)
```env
STRIPE_SECRET_KEY="sk_test_your-stripe-secret"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
```

### Optional AI (Hugging Face)
```env
HUGGINGFACE_API_KEY="hf_your-huggingface-key"
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Configure database connection
3. Set up S3 bucket and Pinecone index
4. Configure Stripe webhooks

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   ├── chat/              # Chat interface
│   ├── docky/             # AI assistant
│   ├── files/             # File management
│   └── upload/            # File upload
├── components/            # React components
├── lib/                   # Utility libraries
├── contexts/              # React contexts
└── hooks/                 # Custom hooks
```

## 🎯 Key Features Explained

### AI Chat Interface
- Real-time conversation with PDF documents
- Context-aware responses using vector embeddings
- Support for multiple AI providers (OpenAI, Claude, Ollama)

### Voice Assistant (DOCKY)
- Speech-to-text and text-to-speech
- Natural language processing
- Voice command recognition

### Document Processing
- PDF text extraction and analysis
- Image and table detection
- OCR capabilities for scanned documents

### User Management
- Role-based access control
- Admin panel for user management
- Secure authentication with Clerk

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Secure file upload validation
- API rate limiting
- Environment variable protection

## 📈 Performance

- Server-side rendering (SSR)
- Static site generation (SSG)
- CDN optimization
- Database query optimization
- Image optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for seamless deployment
- OpenAI and Anthropic for AI capabilities
- Pinecone for vector database
- Clerk for authentication

---

**Built with ❤️ using modern web technologies**

*Transform your document workflow with AI-powered intelligence*


