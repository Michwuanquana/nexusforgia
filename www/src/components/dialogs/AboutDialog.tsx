import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const VERSION = '0.1.0';
const GITHUB_URL = 'https://github.com/Michwuanquana/nexusforgia';
const API_URL = import.meta.env.PROD ? 'https://api-udmf.yrx.cz' : 'http://localhost:3001';

const ABOUT_CONTENT = `
# NexumForgia

A web-based Doom map editor running entirely in your browser.

*Nexum* (lat. "connection") + *Forgia* (it. "forge") — where geometry is forged and everything connects.

---

## On AI-Assisted Development

This project was built using Claude (Opus 4.5) as a development partner. I want to be upfront about this because transparency matters.

**What this is not:**
- This is not "vibecoding" — random prompts hoping for magic
- This is not stolen or scraped code from other projects
- This is not a lazy copy-paste job with no understanding

**What this actually is:**

The development process followed a structured approach: architecture was planned before writing code, each feature was specified with clear requirements, and implementation went through multiple iterations of review and refinement. Every piece of code was discussed, understood, and intentionally placed.

AI is a tool. Like any tool, it can be used well or poorly. A hammer doesn't build a house — a person with a plan does. The same applies here: Claude helped translate ideas into code faster, but the design decisions, architecture choices, and quality standards came from human direction.

**The uncomfortable truth:** AI is changing software development whether we like it or not. I personally don't see a problem with using it responsibly — with clear attribution, respect for licenses, and genuine understanding of what's being built. This project aims to demonstrate that AI-assisted development can produce legitimate, quality software.

All code is open source under GPL-3.0. The full conversation history and development process are documented. Nothing is hidden.

---

## Heritage

This project builds on the shoulders of giants:

- **[Doom Builder X](https://github.com/anotak/doombuilderx)** by anotak — Desktop map editor (C#) that inspired the UI patterns
- **[SLADE](https://github.com/sirjuddington/SLADE)** by sirjuddington — Comprehensive Doom editor for reference on WAD formats

Both projects are GPL-licensed, and NexumForgia continues this tradition.

---

## Technical Details

- **Stack:** React 19, TypeScript, PixiJS 8, Zustand, Tailwind CSS
- **Source:** ~15,000 lines across 69 files
- **License:** GPL-3.0

---

*Doom is a registered trademark of id Software LLC.*
`;

interface VoteCounts {
  like: number;
  neutral: number;
  dislike: number;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'about' | 'feedback'>('about');
  const [votes, setVotes] = useState<VoteCounts>({ like: 0, neutral: 0, dislike: 0 });
  const [voteStatus, setVoteStatus] = useState<'idle' | 'voting' | 'voted' | 'cooldown'>('idle');
  const [cooldownTime, setCooldownTime] = useState(0);

  useEscapeKey(onClose, open);

  // Fetch vote counts on open
  useEffect(() => {
    if (open) {
      fetch(`${API_URL}/api/votes`)
        .then(res => res.json())
        .then(data => setVotes(data))
        .catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const handleVote = async (vote: 'like' | 'neutral' | 'dislike') => {
    if (voteStatus === 'voting' || voteStatus === 'cooldown') return;

    setVoteStatus('voting');

    try {
      const response = await fetch(`${API_URL}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });

      const data = await response.json();

      if (response.ok) {
        setVotes(data.counts);
        setVoteStatus('voted');
      } else if (response.status === 429) {
        setCooldownTime(data.retryAfter);
        setVoteStatus('cooldown');
        const interval = setInterval(() => {
          setCooldownTime(t => {
            if (t <= 1) {
              clearInterval(interval);
              setVoteStatus('idle');
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    } catch {
      setVoteStatus('idle');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;

    setSubmitStatus('sending');

    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackText,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          version: VERSION,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFeedbackText('');
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch {
      const feedbackLog = JSON.parse(localStorage.getItem('nexumforgia_feedback') || '[]');
      feedbackLog.push({
        type: feedbackType,
        message: feedbackText,
        timestamp: new Date().toISOString(),
        version: VERSION,
      });
      localStorage.setItem('nexumforgia_feedback', JSON.stringify(feedbackLog));
      setSubmitStatus('success');
      setFeedbackText('');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-2xl w-[600px] max-h-[90vh] flex flex-col">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#3a3a3a]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="w-6 h-6 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-white font-semibold">NexumForgia v{VERSION}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#3a3a3a]">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 text-sm ${
              activeTab === 'about'
                ? 'bg-[#3a3a3a] text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 text-sm ${
              activeTab === 'feedback'
                ? 'bg-[#3a3a3a] text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Feedback
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'about' ? (
            <>
              {/* Scrollable Markdown Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="about-markdown">
                  <Markdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-[#3a3a3a]">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold text-blue-400 mt-6 mb-3 flex items-center gap-2">
                          <span className="w-1 h-5 bg-blue-500 rounded"></span>
                          {children}
                        </h2>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 leading-relaxed my-3">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-gray-400 italic">{children}</em>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">{children}</a>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-3 ml-4 space-y-1">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-300 flex items-start gap-2">
                          <span className="text-blue-500 mt-1.5">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                      hr: () => (
                        <hr className="border-[#3a3a3a] my-5" />
                      ),
                    }}
                  >
                    {ABOUT_CONTENT}
                  </Markdown>

                  {/* Links */}
                  <div className="pt-4 mt-4 border-t border-[#3a3a3a] flex gap-4">
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      GitHub
                    </a>
                    <a
                      href="https://nexusforgia.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                      Website
                    </a>
                  </div>
                </div>
              </div>

              {/* Fixed Sentiment Voting */}
              <div className="shrink-0 px-6 py-4 bg-[#1f1f1f] border-t border-[#3a3a3a]">
                <p className="text-gray-400 text-sm mb-3">What do you think about AI-assisted development?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVote('like')}
                    disabled={voteStatus !== 'idle'}
                    className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                    <span className="text-green-400">Like</span>
                    <span className="text-green-500/70 text-sm bg-green-900/40 px-1.5 rounded">{votes.like}</span>
                  </button>
                  <button
                    onClick={() => handleVote('neutral')}
                    disabled={voteStatus !== 'idle'}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700/30 border border-gray-600/50 rounded hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/></svg>
                    <span className="text-gray-300">Don't Care</span>
                    <span className="text-gray-500 text-sm bg-gray-700/40 px-1.5 rounded">{votes.neutral}</span>
                  </button>
                  <button
                    onClick={() => handleVote('dislike')}
                    disabled={voteStatus !== 'idle'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
                    <span className="text-red-400">Dislike</span>
                    <span className="text-red-500/70 text-sm bg-red-900/40 px-1.5 rounded">{votes.dislike}</span>
                  </button>
                </div>
                {voteStatus === 'voted' && (
                  <p className="text-green-500 text-xs mt-2">Thanks for your feedback!</p>
                )}
                {voteStatus === 'cooldown' && (
                  <p className="text-yellow-500 text-xs mt-2">Please wait {cooldownTime}s before voting again.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Type</label>
                  <div className="flex gap-2">
                    {(['bug', 'feature', 'other'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFeedbackType(type)}
                        className={`px-3 py-1 text-sm rounded ${
                          feedbackType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]'
                        }`}
                      >
                        {type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Other'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    {feedbackType === 'bug' ? 'Describe the bug' : feedbackType === 'feature' ? 'Describe the feature' : 'Your message'}
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === 'bug'
                        ? 'What happened? What did you expect?'
                        : feedbackType === 'feature'
                        ? 'Describe the feature...'
                        : 'Your feedback...'
                    }
                    className="w-full h-40 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">
                    {submitStatus === 'success' && 'Sent. Thank you.'}
                    {submitStatus === 'error' && 'Failed. Saved locally.'}
                    {submitStatus === 'sending' && 'Sending...'}
                  </span>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackText.trim() || submitStatus === 'sending'}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>

                <p className="text-gray-500 text-xs">
                  Or report on{' '}
                  <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    GitHub Issues
                  </a>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-[#3a3a3a]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3a3a3a] text-white text-sm rounded hover:bg-[#4a4a4a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function isFirstLaunch(): boolean {
  const key = 'nexumforgia_has_launched';
  const hasLaunched = localStorage.getItem(key);
  if (!hasLaunched) {
    localStorage.setItem(key, 'true');
    return true;
  }
  return false;
}
