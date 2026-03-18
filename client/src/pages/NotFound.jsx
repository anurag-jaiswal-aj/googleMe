import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const LOGO = [
  { char: 'A', color: '#4285F4' },
  { char: 'n', color: '#EA4335' },
  { char: 'u', color: '#FBBC05' },
  { char: 'r', color: '#4285F4' },
  { char: 'a', color: '#34A853' },
  { char: 'g', color: '#EA4335' },
];

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-[#202124] flex flex-col">
      {/* Mini header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-[#e8eaed] dark:border-[#3c4043]">
        <Link to="/" className="text-2xl font-bold">
          {LOGO.map(({ char, color }, i) => <span key={i} style={{ color }}>{char}</span>)}
        </Link>
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-8 md:px-16 pt-12 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[680px] w-full"
        >
          {/* Stats line */}
          <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-4">
            Your search for <span className="italic">{pathname}</span> did not match any documents.
          </p>
          <div className="h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-6" />

          {/* Google-style "no results" copy */}
          <p className="text-[#202124] dark:text-[#e8eaed] text-base mb-1 font-medium">Suggestions:</p>
          <ul className="list-disc list-inside text-sm text-[#133780] dark:text-[#bdc1c6] space-y-1 mb-8">
            <li>Make sure all words are spelled correctly.</li>
            <li>Try different keywords.</li>
            <li>Try more general keywords.</li>
            <li>Try fewer keywords.</li>
          </ul>

          {/* Quick nav links */}
          <div className="border-t border-[#e8eaed] dark:border-[#3c4043] pt-6">
            <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mb-3">You may also be interested in:</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '← Back to Home', to: '/' },
                { label: 'About Me',        to: '/about' },
                { label: 'Projects',        to: '/projects' },
                { label: 'Contact',         to: '/contact' },
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Error code */}
          <p className="mt-10 text-7xl font-bold text-[#e8eaed] dark:text-[#3c4043] select-none">404</p>
        </motion.div>
      </main>
    </div>
  );
}

