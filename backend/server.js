import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Secret for hashing (regenerated on restart - that's fine for this use case)
const VOTE_SECRET = crypto.randomBytes(32).toString('hex');

// Middleware
app.use(cors());
app.use(express.json());

// Feedback storage directory
const FEEDBACK_DIR = path.join(__dirname, 'feedback');
const VOTES_FILE = path.join(__dirname, 'votes.json');

// Ensure feedback directory exists
if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

// Initialize votes file
function getVotes() {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
    }
  } catch {}
  return { like: 0, neutral: 0, dislike: 0, tokens: {} };
}

function saveVotes(votes) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');
}

// Get client IP (not stored, only used for hashing)
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         'unknown';
}

// Generate anonymous token from IP - changes every 10 minutes
// No way to reverse this to get the IP back = GDPR compliant
function getVoterToken(ip) {
  const salt = Math.floor(Date.now() / (10 * 60 * 1000)); // changes every 10 min
  return crypto.createHash('sha256').update(ip + salt + VOTE_SECRET).digest('hex').substring(0, 16);
}

// Clean old tokens (from previous time windows)
function cleanOldTokens(votes) {
  const currentSalt = Math.floor(Date.now() / (10 * 60 * 1000));
  const validTokens = {};

  for (const [token, data] of Object.entries(votes.tokens)) {
    // Keep only tokens from current time window
    if (data.salt === currentSalt) {
      validTokens[token] = data;
    }
  }

  votes.tokens = validTokens;
}

// POST /api/vote - Record sentiment vote
app.post('/api/vote', (req, res) => {
  try {
    const { vote } = req.body;
    const ip = getClientIP(req);

    if (!['like', 'neutral', 'dislike'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    const votes = getVotes();
    const currentSalt = Math.floor(Date.now() / (10 * 60 * 1000));
    const token = getVoterToken(ip);

    // Clean old tokens first
    cleanOldTokens(votes);

    // Check if already voted in this time window
    if (votes.tokens[token]) {
      return res.status(429).json({
        error: 'Please wait before voting again',
        retryAfter: 600 // approximate
      });
    }

    // Record vote
    votes[vote]++;
    votes.tokens[token] = { salt: currentSalt };

    saveVotes(votes);

    res.json({
      success: true,
      counts: {
        like: votes.like,
        neutral: votes.neutral,
        dislike: votes.dislike
      }
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// GET /api/votes - Get current vote counts
app.get('/api/votes', (req, res) => {
  try {
    const votes = getVotes();
    res.json({
      like: votes.like,
      neutral: votes.neutral,
      dislike: votes.dislike
    });
  } catch (error) {
    console.error('Error getting votes:', error);
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

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

    // Format as markdown - no IP or personal data stored
    const content = `# ${type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Feedback'}

**Date:** ${date.toLocaleString()}
**Version:** ${version || 'unknown'}
**Type:** ${type || 'other'}

## Message

${message}

---

*Browser: ${userAgent ? userAgent.substring(0, 100) : 'unknown'}*
`;

    // Write to file
    fs.writeFileSync(filepath, content, 'utf8');

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
  console.log(`NexumForgia API server running on port ${PORT}`);
  console.log(`Feedback will be saved to: ${FEEDBACK_DIR}`);
});
