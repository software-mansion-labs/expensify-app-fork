#!/usr/bin/env node
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = 8080;
const HOST = 'dev.new.expensify.com';
const DIST_DIR = path.join(__dirname, 'dist');

const app = express();

// Enable gzip compression
app.use(compression());

// CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Proxy API calls
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:9000',
    changeOrigin: true,
}));

app.use('/staging', createProxyMiddleware({
    target: 'http://localhost:9000',
    changeOrigin: true,
}));

app.use('/chat-attachments', createProxyMiddleware({
    target: 'http://localhost:9000',
    changeOrigin: true,
}));

app.use('/receipts', createProxyMiddleware({
    target: 'http://localhost:9000',
    changeOrigin: true,
}));

// Serve static files
app.use(express.static(DIST_DIR));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// HTTPS server
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config/webpack/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'config/webpack/certificate.pem')),
};

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTPS Server running on port ${PORT}`);
    console.log(`   - https://${HOST}:${PORT}`);
    console.log(`   - https://127.0.0.1:${PORT}`);
    console.log(`   - https://localhost:${PORT}`);
    console.log(`   - Serving files from: ${DIST_DIR}`);
    console.log(`   - Proxy enabled: /api, /staging, /chat-attachments, /receipts → http://localhost:9000`);
    console.log(`   - SPA fallback: enabled`);
    console.log(`   - CORS: enabled`);
    console.log(`   - Gzip: enabled`);
});
