// preview-server.js
// Live HTML preview server for html-artifacts skill
// This server is in-memory only — no HTML files are written to disk.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PREVIEW_PORT || 19433;
const SPEC_FOLDER = process.argv[2] || '.';

let htmlContent = '';
let isRunning = true;

// Read HTML file or folder content
function loadHtmlContent() {
  const htmlPath = path.join(SPEC_FOLDER, 'index.html') || 
                 path.join(SPEC_FOLDER, 'report.html') || 
                 SPEC_FOLDER;
  
  try {
    if (fs.existsSync(htmlPath) && htmlPath.endsWith('.html')) {
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
    } else if (fs.existsSync(htmlPath)) {
      // Try to read as directory or fallback
      htmlContent = '<html><body><h1>HTML Artifact Preview</h1><p>Load successful.</p></body></html>';
    }
  } catch (err) {
    htmlContent = '<html><body><h1>Error Loading HTML</h1><p>' + err.message + '</p></body></html>';
  }
}

loadHtmlContent();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.method === 'GET' && req.url === '/api/feedback') {
    // Handle feedback submission
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'feedback_received' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`HTML Artifact Preview Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C in the terminal to stop the server when you\'re done.');
  
  // Open browser automatically if possible
  const openCommand = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCommand} http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Stopping HTML artifact preview server...');
  isRunning = false;
  server.close(() => {
    process.exit(0);
  });
});
