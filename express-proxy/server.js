const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const https = require('https');

const app = express();

// Whitelist of allowed origins for API access
const allowedOrigins = [
  'http://localhost:3000',
  'https://207.211.176.95',
  'https://164.152.28.254',
  'https://fluxity.io'
];

// Selective CORS middleware - only apply to API routes from external origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isApiRequest = req.path.startsWith('/api/') || 
                      req.path.startsWith('/webhook/') || 
                      req.path.startsWith('/rest/');
  
  // Only apply CORS for API requests from external origins (not same-origin requests)
  if (isApiRequest && origin && origin !== `https://${req.get('host')}` && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-N8N-API-KEY, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests for external API endpoints only
  if (req.method === 'OPTIONS' && isApiRequest && origin && allowedOrigins.includes(origin)) {
    return res.sendStatus(204);
  }
  
  next();
});

// Proxy all traffic from / → n8n (container on localhost:5678)
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://127.0.0.1:5678',
    changeOrigin: false, // Keep original host for same-origin requests
    ws: true, // support WebSocket for n8n UI
    secure: true,
    // Preserve authentication headers and cookies
    onProxyReq: (proxyReq, req, res) => {
      // Forward all authentication headers
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
      // Set the correct host header
      proxyReq.setHeader('Host', 'cxdemo.cxmainstreetservers.com');
      proxyReq.setHeader('X-Forwarded-Proto', 'https');
      proxyReq.setHeader('X-Forwarded-Host', 'cxdemo.cxmainstreetservers.com');
    },
    // Handle WebSocket upgrade properly
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Proxy error: ' + err.message);
    }
  })
);

// Load Let's Encrypt certs safely
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/cxdemo.cxmainstreetservers.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/cxdemo.cxmainstreetservers.com/fullchain.pem'),
  };
  console.log('SSL files loaded successfully');
} catch (err) {
  console.error('Error loading SSL files:', err);
  process.exit(1);
}

// Start HTTPS server
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
  console.log('Express proxy running at https://cxdemo.cxmainstreetservers.com');
  console.log('- UI access: Direct (no CORS)');
  console.log('- API access: CORS enabled for whitelisted origins');
});