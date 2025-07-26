const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = 3000;

// SSL certificates - Using trusted certificate
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'trusted-cert.key')),
  cert: fs.readFileSync(path.join(__dirname, 'trusted-cert.crt')),
};

// Prepare the Next.js app with error handling
const app = next({ 
  dev, 
  hostname, 
  port,
  // Disable telemetry to avoid permission issues
  telemetry: false,
  // Disable trace to avoid file permission issues
  experimental: {
    trace: false
  }
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully');
  
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error('💡 Port 3000 is already in use. Please stop other servers first.');
      }
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`🚀 HTTPS Server running on:`);
      console.log(`   📱 Local: https://localhost:${port}`);
      console.log(`   🌐 Network: https://192.168.1.86:${port}`);
      console.log(`   🔒 SSL: Trusted certificate (no warnings)`);
      console.log(`   ⚡ Ready to accept connections from other devices!`);
    });
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js app:', err);
  process.exit(1);
});