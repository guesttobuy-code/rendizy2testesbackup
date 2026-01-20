// api/guest-area.js
// Proxy para servir a cápsula Guest Area em /guest-area/

const path = require('path');
const fs = require('fs');

export default function handler(req, res) {
  // Remove /api/guest-area prefix
  let requestPath = req.url.replace(/^\/api\/guest-area\/?/, '') || 'index.html';
  
  // Se não tem extensão, serve index.html (SPA)
  if (!path.extname(requestPath)) {
    requestPath = 'index.html';
  }

  // Monta caminho para public/guest-area/
  const filePath = path.join(process.cwd(), 'public', 'guest-area', requestPath);

  // Verifica se arquivo existe
  if (!fs.existsSync(filePath)) {
    // Fallback para index.html (SPA routing)
    const indexPath = path.join(process.cwd(), 'public', 'guest-area', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.send(fs.readFileSync(indexPath, 'utf-8'));
      return;
    }
    res.status(404).send('Not found');
    return;
  }

  // Content-Type por extensão
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=31536000');
  res.send(fs.readFileSync(filePath));
}
