// annotate-server.js
// Annotate server for plan-review skill
// Allows inline annotation and feedback loop for plans, specs, and markdown

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.ANNOTATE_PORT || 19434;
const PLAN_FILE = process.argv[2] || '';

let planContent = '';
let annotations = [];
let isRunning = true;

// Load plan content
function loadPlanContent() {
  if (PLAN_FILE && fs.existsSync(PLAN_FILE)) {
    planContent = fs.readFileSync(PLAN_FILE, 'utf8');
  } else {
    planContent = '# Plan Review\n\nNo plan file specified or file not found.';
  }
}

loadPlanContent();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Plan Review - Annotate Server</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .plan-content { background: #f5f5f5; padding: 20px; margin: 10px 0; }
          .feedback-section { margin-top: 20px; padding: 20px; background: #e8f4f8; }
        </style>
      </head>
      <body>
        <h1>Plan Review Surface</h1>
        <div class="plan-content">
          <pre>${planContent}</pre>
        </div>
        <div class="feedback-section">
          <h2>Feedback for Agent</h2>
          <form id="feedback-form">
            <label>Line/Section:</label>
            <input type="text" id="line-section" placeholder="e.g., Line 42 or Section 3">
            <br><br>
            <label>Comment/Suggestion:</label>
            <textarea id="comment" rows="4" cols="50"></textarea>
            <br><br>
            <label>Approval Status:</label>
            <select id="approval-status">
              <option value="Approve">Approve</option>
              <option value="Request Revisions">Request Revisions</option>
              <option value="Deny">Deny</option>
            </select>
            <br><br>
            <button type="submit">Submit Feedback</button>
          </form>
        </div>
        <script>
          document.getElementById('feedback-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const feedback = {
              lineSection: document.getElementById('line-section').value,
              comment: document.getElementById('comment').value,
              approvalStatus: document.getElementById('approval-status').value
            };
            // Send feedback to server
            fetch('/api/feedback', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(feedback)
            });
            alert('Feedback submitted to agent!');
          });
        </script>
      </body>
      </html>
    `;
    res.end(html);
  } else if (req.method === 'POST' && req.url === '/api/feedback') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const feedback = JSON.parse(body);
        annotations.push(feedback);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'feedback_received', annotations: annotations.length }));
      } catch (err) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Plan Review Annotate Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C in the terminal to stop the server when you\'re done.');
});

process.on('SIGINT', () => {
  console.log('Stopping plan review annotate server...');
  isRunning = false;
  server.close(() => {
    process.exit(0);
  });
});
