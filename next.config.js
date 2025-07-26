/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
        assert: false,
        constants: false,
        domain: false,
        punycode: false,
        querystring: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        url: false,
        vm: false,
        zlib: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        module: false,
        process: false,
        readline: false,
        repl: false,
        v8: false,
        worker_threads: false,
      };
      
      // Completely exclude all Pinecone modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@pinecone-database/pinecone': false,
        '@pinecone-database/pinecone/dist/assistant': false,
        '@pinecone-database/pinecone/dist/assistant/data/uploadFile': false,
        '@pinecone-database/pinecone/dist/assistant/data/chatCompletionStream': false,
        '@pinecone-database/pinecone/dist/control': false,
        '@pinecone-database/pinecone/dist/index': false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
