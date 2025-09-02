const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const https = require('https');

const app = express();

// Whitelist of allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://207.211.176.95',
  'https://164.152.28.254',
  'https://fluxity.io'
];

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-N8N-API-KEY');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Proxy all traffic from / → n8n (container on localhost:5678)
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://127.0.0.1:5678',
    changeOrigin: true,
    ws: true, // support WebSocket if n8n uses it
  })
);

// Load Let’s Encrypt certs safely
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
});
