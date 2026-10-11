import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import SEO from '../components/SEO';
import { LINKS } from '../config/links';

const LOGO = [
  { char: 'A', color: '#4285F4' },
  { char: 'n', color: '#EA4335' },
  { char: 'u', color: '#FBBC05' },
  { char: 'r', color: '#4285F4' },
  { char: 'a', color: '#34A853' },
  { char: 'g', color: '#EA4335' },
];


const D4 = [
  '!@#$      !@#$',
  '%^&*      %^&*',
  '!@#$      !@#$',
  '%^&*      %^&*',
  '!@#$%^&*!@#$%^',
  '&*!@#$%^&*!@#$',
  '          !@#$',
  '          %^&*',
  '          !@#$',
  '          %^&*',
];

const D0 = [
  '  !@#$%^&*!@  ',
  '%^&*!@#$%^&*!@',
  '!@#$      !@#$',
  '%^&*      %^&*',
  '!@#$      !@#$',
  '%^&*      %^&*',
  '!@#$      !@#$',
  '%^&*      %^&*',
  '%^&*!@#$%^&*!@',
  '  !@#$%^&*!@  ',
];

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-[#202124] flex flex-col text-[#202124] dark:text-[#e8eaed] relative overflow-x-hidden">
      <SEO
        title="Page not found"
        description="The requested URL was not found on this server."
        path={pathname}
        noIndex={true}
      />

      {/* Decorative Full-Screen Typographic 404 Background */}
      <div
        className="fixed inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden z-0"
        aria-hidden="true"
      >
        <div className="w-full max-w-[96vw] flex items-center justify-between sm:justify-around px-2 sm:px-6 -translate-y-4 sm:-translate-y-8 text-[#202124]/[0.08] dark:text-[#e8eaed]/[0.09] transition-colors">
          <pre className="font-mono font-bold text-[3.2vw] sm:text-[3.0vw] md:text-[2.5vw] lg:text-[2.1vw] xl:text-[1.8vw] leading-[1.08] tracking-tight select-none">
            {D4.join('\n')}
          </pre>
          <pre className="font-mono font-bold text-[3.2vw] sm:text-[3.0vw] md:text-[2.5vw] lg:text-[2.1vw] xl:text-[1.8vw] leading-[1.08] tracking-tight select-none">
            {D0.join('\n')}
          </pre>
          <pre className="font-mono font-bold text-[3.2vw] sm:text-[3.0vw] md:text-[2.5vw] lg:text-[2.1vw] xl:text-[1.8vw] leading-[1.08] tracking-tight select-none">
            {D4.join('\n')}
          </pre>
        </div>
      </div>

      {/* Header matching portfolio standards */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-[#e8eaed] dark:border-[#3c4043] bg-white/90 dark:bg-[#202124]/90 backdrop-blur-sm">
        <Link
          to="/"
          className="select-none text-2xl sm:text-[28px] font-bold tracking-tight leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] dark:focus-visible:ring-[#8ab4f8] rounded"
          aria-label="Anurag Portfolio Home"
        >
          {LOGO.map(({ char, color }, i) => (
            <span key={i} style={{ color }}>{char}</span>
          ))}
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 md:px-16 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center flex flex-col items-center"
        >
          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-[#202124] dark:text-[#e8eaed] tracking-tight mb-6">
            Page not found
          </h1>

          {/* Primary Action Button */}
          <Link
            to="/"
            className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8] dark:focus-visible:ring-offset-[#202124]"
          >
            Return to Home
          </Link>
        </motion.div>
      </main>

      {/* Footer matching standard portfolio footer */}
      <footer className="relative z-10 mt-auto border-t border-[#e8eaed] dark:border-[#3c4043] bg-[#f2f2f2] dark:bg-[#171717] text-sm text-[#70757a] dark:text-[#9aa0a6]">
        <div className="px-6 py-2.5 border-b border-[#e8eaed] dark:border-[#3c4043]">
          Earth
        </div>
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/" className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded">
              Home
            </Link>
            <Link to="/about" className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded">
              About
            </Link>
            <Link to="/projects" className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded">
              Projects
            </Link>
            <Link to="/contact" className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded">
              Contact
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded"
            >
              GitHub
            </a>
            <a
              href={LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
