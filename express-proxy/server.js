const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const https = require('https');

const app = express();

// Proxy all traffic from / → n8n (container on localhost:5678)
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://127.0.0.1:5678',
    changeOrigin: true,
  })
);

// Use Let’s Encrypt certs
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/cxdemo.cxmainstreetservers.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/cxdemo.cxmainstreetservers.com/fullchain.pem'),
};

// Start HTTPS server
https.createServer(sslOptions, app).listen(443, () => {
  console.log('Express proxy running at https://cxdemo.cxmainstreetservers.com');
});
