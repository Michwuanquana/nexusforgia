import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Feedback storage directory
const FEEDBACK_DIR = path.join(__dirname, 'feedback');

// Ensure feedback directory exists
if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

// POST /api/feedback - Save feedback to markdown file
app.post('/api/feedback', (req, res) => {
  try {
    const { type, message, timestamp, userAgent, version } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create filename with timestamp
    const date = new Date(timestamp || Date.now());
    const dateStr = date.toISOString().replace(/[:.]/g, '-');
    const filename = `${type || 'feedback'}_${dateStr}.md`;
    const filepath = path.join(FEEDBACK_DIR, filename);

    // Format as markdown
    const content = `# ${type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Feedback'}

**Date:** ${date.toLocaleString()}
**Version:** ${version || 'unknown'}
**Type:** ${type || 'other'}

## Message

${message}

---

<details>
<summary>Technical Info</summary>

- **Timestamp:** ${timestamp}
- **User Agent:** ${userAgent || 'unknown'}

</details>
`;

    // Write to file
    fs.writeFileSync(filepath, content, 'utf8');

    // Also append to summary log
    const logPath = path.join(FEEDBACK_DIR, 'FEEDBACK_LOG.md');
    const logEntry = `\n## ${date.toLocaleString()} - ${type}\n\n${message.substring(0, 200)}${message.length > 200 ? '...' : ''}\n\n[Full report](${filename})\n\n---\n`;

    fs.appendFileSync(logPath, logEntry, 'utf8');

    console.log(`Feedback saved: ${filename}`);
    res.json({ success: true, filename });

  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedback - List all feedback (for admin)
app.get('/api/feedback', (req, res) => {
  try {
    const files = fs.readdirSync(FEEDBACK_DIR)
      .filter(f => f.endsWith('.md') && f !== 'FEEDBACK_LOG.md')
      .map(f => ({
        filename: f,
        created: fs.statSync(path.join(FEEDBACK_DIR, f)).birthtime
      }))
      .sort((a, b) => b.created - a.created);

    res.json({ feedback: files });
  } catch (error) {
    console.error('Error listing feedback:', error);
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WADsmith API server running on port ${PORT}`);
  console.log(`Feedback will be saved to: ${FEEDBACK_DIR}`);
});
