import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GREETINGS = [
  { word: 'Hello',       lang: 'English'    },
  { word: 'नमस्ते',      lang: 'Hindi'      },
  { word: 'Hola',        lang: 'Spanish'    },
  { word: 'Bonjour',     lang: 'French'     },
  { word: 'こんにちは',   lang: 'Japanese'   },
  { word: '안녕하세요',   lang: 'Korean'     },
  { word: 'Ciao',        lang: 'Italian'    },
  { word: 'Olá',         lang: 'Portuguese' },
  { word: 'Hallo',       lang: 'German'     },
  { word: 'مرحبا',       lang: 'Arabic'     },
  { word: '你好',         lang: 'Chinese'    },
  { word: 'Привет',      lang: 'Russian'    },
  { word: 'নমস্কার',     lang: 'Bengali'    },
  { word: 'నమస్కారం',    lang: 'Telugu'     },
  { word: 'வணக்கம்',     lang: 'Tamil'      },
  { word: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', lang: 'Punjabi'  },
  { word: 'નમસ્તે',      lang: 'Gujarati'   },
  { word: 'ನಮಸ್ಕಾರ',    lang: 'Kannada'    },
  { word: 'നമസ്കാരം',   lang: 'Malayalam'  },
  { word: 'Merhaba',     lang: 'Turkish'    },
];

// Google brand colors cycling across letters
const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

function colorize(word) {
  return [...word].map((char, i) => (
    <span key={i} style={{ color: GOOGLE_COLORS[i % GOOGLE_COLORS.length] }}>
      {char}
    </span>
  ));
}

const INTERVAL_MS = 440;

export default function WelcomeSplash({ onDone }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [wordVisible, setWordVisible] = useState(true);

  const dismiss = () => {
    setWordVisible(false);
    setTimeout(() => setVisible(false), 80);
    setTimeout(onDone, 580);
  };

  useEffect(() => {
    const tick = setInterval(() => {
      setIndex((i) => {
        if (i >= GREETINGS.length - 1) {
          clearInterval(tick);
          setTimeout(() => setVisible(false), 300);
          setTimeout(onDone, 900);
          return i;
        }
        return i + 1;
      });
    }, INTERVAL_MS);

    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        clearInterval(tick);
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearInterval(tick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDone]);

  const { word } = GREETINGS[index];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onClick={dismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                     bg-white dark:bg-[#202124] select-none cursor-pointer"
        >
          {/* Greeting word */}
          <AnimatePresence mode="wait">
            {wordVisible && (
              <motion.p
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="text-7xl sm:text-9xl md:text-[10rem] font-bold tracking-tight leading-none text-center"
              >
                {colorize(word)}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Progress dots */}
          <div className="absolute bottom-10 flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {GREETINGS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === index ? '20px' : '6px',
                    backgroundColor: i <= index
                      ? GOOGLE_COLORS[i % GOOGLE_COLORS.length]
                      : '#e8eaed',
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-[#9aa0a6] tracking-wide">
              <span className="sm:hidden">Tap to skip</span>
              <span className="hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded border border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] font-mono text-xs">Space</kbd> to skip
              </span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
