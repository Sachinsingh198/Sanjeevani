import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTypewriter — ChatGPT / Gemini-style streaming text reveal hook.
 *
 * Takes the full response text and progressively reveals it character-by-character.
 * Handles markdown tokens (**, \n) as atomic chunks so formatting isn't broken mid-stream.
 *
 * @param {string} fullText      — The complete text to reveal
 * @param {boolean} enabled      — Whether to animate (false = show full text instantly)
 * @param {number} speed         — Milliseconds per character chunk (default 18ms)
 * @param {number} chunkSize     — Characters to reveal per tick (default 2)
 * @returns {{ displayText: string, isStreaming: boolean, skipToEnd: () => void }}
 */
export default function useTypewriter(fullText, enabled = true, speed = 18, chunkSize = 2) {
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const fullTextRef = useRef('');

  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayText(fullTextRef.current);
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    // Clear any previous animation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!fullText) {
      setDisplayText('');
      setIsStreaming(false);
      return;
    }

    fullTextRef.current = fullText;

    // If disabled, show full text immediately
    if (!enabled) {
      setDisplayText(fullText);
      setIsStreaming(false);
      return;
    }

    // Start streaming
    indexRef.current = 0;
    setDisplayText('');
    setIsStreaming(true);

    timerRef.current = setInterval(() => {
      const text = fullTextRef.current;
      let nextIndex = indexRef.current;

      if (nextIndex >= text.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setDisplayText(text);
        setIsStreaming(false);
        return;
      }

      // Advance by chunkSize, but handle markdown tokens atomically
      let advance = 0;
      while (advance < chunkSize && nextIndex + advance < text.length) {
        const remaining = text.slice(nextIndex + advance);

        // Keep ** together (markdown bold markers)
        if (remaining.startsWith('**')) {
          advance += 2;
          continue;
        }

        // Keep \n together with adjacent whitespace
        if (remaining[0] === '\n') {
          advance += 1;
          // Also consume any following newlines
          while (nextIndex + advance < text.length && text[nextIndex + advance] === '\n') {
            advance += 1;
          }
          break;
        }

        advance += 1;
      }

      // Ensure at least 1 character advances
      if (advance === 0) advance = 1;

      indexRef.current = nextIndex + advance;
      setDisplayText(text.slice(0, indexRef.current));
    }, speed);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fullText, enabled, speed, chunkSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { displayText, isStreaming, skipToEnd };
}
