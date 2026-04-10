import { useState, useRef } from 'react';

/**
 * Shared voice search hook used by both Home and SearchLayout.
 * Returns state + handlers for the voice search modal.
 */
export function useVoiceSearch(onResult) {
  const [micOpen,       setMicOpen]       = useState(false);
  const [micState,      setMicState]      = useState('idle'); // idle | listening | retrying | result | error
  const [micTranscript, setMicTranscript] = useState('');
  const [micError,      setMicError]      = useState('');
  const recognitionRef = useRef(null);

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError('SpeechRecognition API not found. Try Chrome or Edge.');
      setMicState('error');
      setMicOpen(true);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setMicTranscript('');
    setMicError('');
    setMicState('listening');
    setMicOpen(true);

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      setMicTranscript(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setMicState('result');
        onResult?.(transcript);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone access denied. Please allow mic access and try again.');
        setMicState('error');
        return;
      }
      if (e.error === 'network') {
        setMicState('retrying');
        setTimeout(() => {
          try {
            const r2 = new SR();
            recognitionRef.current = r2;
            r2.lang = 'en-US';
            r2.interimResults = true;
            r2.continuous = false;
            r2.maxAlternatives = 1;
            r2.onresult = recognition.onresult;
            r2.onerror = () => {
              setMicError('Speech service unavailable. Check your internet and try again.');
              setMicState('error');
            };
            r2.onend = () => setMicState((s) => (s === 'listening' ? 'idle' : s));
            r2.start();
            setMicState('listening');
          } catch (_) {
            setMicError('Speech service unavailable. Try again.');
            setMicState('error');
          }
        }, 400);
        return;
      }
      setMicError(`Something went wrong (${e.error}). Try again.`);
      setMicState('error');
    };

    recognition.onend = () => setMicState((s) => (s === 'listening' ? 'idle' : s));

    try {
      recognition.start();
    } catch (err) {
      setMicError(`Could not start: ${err.message}`);
      setMicState('error');
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.abort();
    setMicOpen(false);
    setMicState('idle');
  };

  return { micOpen, setMicOpen, micState, micTranscript, micError, startVoiceSearch, stopVoice };
}
