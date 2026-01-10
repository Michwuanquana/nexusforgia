import { useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const VERSION = '0.1.0-alpha';
const GITHUB_URL = 'https://github.com/Michwuanquana/doombuilder-web';
const API_URL = import.meta.env.PROD ? 'https://api-udmf.yrx.cz' : 'http://localhost:3001';

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'about' | 'feedback'>('about');

  // Close on Escape
  useEscapeKey(onClose, open);

  if (!open) return null;

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
      // Fallback: save to localStorage if API fails
      const feedbackLog = JSON.parse(localStorage.getItem('wadsmith_feedback') || '[]');
      feedbackLog.push({
        type: feedbackType,
        message: feedbackText,
        timestamp: new Date().toISOString(),
        version: VERSION,
      });
      localStorage.setItem('wadsmith_feedback', JSON.stringify(feedbackLog));
      setSubmitStatus('success');
      setFeedbackText('');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-2xl w-[480px] max-h-[90vh] flex flex-col">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#3a3a3a]">
          <span className="text-white font-semibold">About WADsmith</span>
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
            Feedback & Bug Report
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'about' ? (
            <div className="space-y-4">
              {/* Logo and Title */}
              <div className="flex items-center gap-4 pb-4 border-b border-[#3a3a3a]">
                <img
                  src="/logo.png"
                  alt="WADsmith Logo"
                  className="w-16 h-16 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">WADsmith</h1>
                  <p className="text-gray-400 text-sm">Version {VERSION}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                A web-based Doom map editor running entirely in your browser.
                Create and edit maps for Doom, Doom II, Hexen, and other compatible games.
              </p>

              {/* Links */}
              <div className="space-y-2">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub Repository
                </a>
                <a
                  href="https://udmf.yrx.cz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  Live Demo
                </a>
              </div>

              {/* Credits */}
              <div className="pt-4 border-t border-[#3a3a3a]">
                <h3 className="text-white font-semibold mb-2">Credits</h3>
                <div className="text-gray-400 text-xs space-y-1">
                  <p><span className="text-gray-300">Inspired by:</span> Doom Builder X, GZDoom Builder</p>
                  <p><span className="text-gray-300">Icons:</span> Doom Builder X icon set</p>
                  <p><span className="text-gray-300">Technologies:</span> React, TypeScript, PixiJS, Zustand</p>
                </div>
              </div>

              {/* Copyright */}
              <div className="pt-4 border-t border-[#3a3a3a] text-center">
                <p className="text-gray-500 text-xs">
                  Doom is a registered trademark of id Software LLC.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  WADsmith is free and open source software.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Feedback Type */}
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

              {/* Message */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  {feedbackType === 'bug' ? 'Describe the bug' : feedbackType === 'feature' ? 'Describe the feature' : 'Your message'}
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    feedbackType === 'bug'
                      ? 'What happened? What did you expect to happen? Steps to reproduce...'
                      : feedbackType === 'feature'
                      ? 'Describe the feature you would like to see...'
                      : 'Your feedback, tips, or questions...'
                  }
                  className="w-full h-40 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  {submitStatus === 'success' && '✓ Feedback sent! Thank you.'}
                  {submitStatus === 'error' && '✗ Failed to send. Saved locally.'}
                  {submitStatus === 'sending' && 'Sending...'}
                </span>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackText.trim() || submitStatus === 'sending'}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Feedback
                </button>
              </div>

              {/* Info */}
              <p className="text-gray-500 text-xs">
                Feedback is sent to the development server. If offline, it will be saved locally.
                You can also report issues directly on{' '}
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  GitHub Issues
                </a>.
              </p>
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

// Helper to check if this is first launch
export function isFirstLaunch(): boolean {
  const key = 'wadsmith_has_launched';
  const hasLaunched = localStorage.getItem(key);
  if (!hasLaunched) {
    localStorage.setItem(key, 'true');
    return true;
  }
  return false;
}
