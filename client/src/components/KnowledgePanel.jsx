import { motion } from 'framer-motion';

const SKILLS_FLAT = ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Python', 'Java', 'TailwindCSS', 'Git', 'Docker', 'SQL', 'REST APIs'];

export default function KnowledgePanel() {
  return (
    <aside className="w-full lg:w-[380px] shrink-0">
      <div className="border border-[#dadce0] dark:border-[#3c4043] rounded-3xl overflow-hidden">
        {/* Top image strip */}
        <div className="w-full h-32 bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05]
                        flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
            <img
              src="/avatar.jpg"
              alt="Anurag"
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
            />
            <div className="hidden items-center justify-center w-full h-full bg-[#4285F4]">
              <span className="text-white text-3xl font-semibold select-none">A</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <h2 className="text-xl font-normal text-[#202124] dark:text-[#e8eaed] mb-0.5">Anurag</h2>
          <p className="text-sm text-[#70757a] dark:text-[#9aa0a6] mb-1">Full-Stack Developer</p>
          <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mb-4">
            B.Tech ISE · 3rd Year, 5th Semester
          </p>

          <div className="h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

          {/* Quick facts */}
          <div className="space-y-2 mb-4">
            {[
              { label: 'Studying', val: 'Information Science & Engineering' },
              { label: 'Location', val: 'India' },
              { label: 'Looking for', val: 'Internship / Full-time roles' },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-start gap-1.5">
                <div>
                  <span className="text-xs text-[#70757a] dark:text-[#9aa0a6] block">{label}</span>
                  <span className="text-sm text-[#202124] dark:text-[#e8eaed]">{val}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

          {/* Social links */}
          <p className="text-xs uppercase tracking-wide text-[#70757a] dark:text-[#9aa0a6] mb-2">Profiles</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { name: 'GitHub',   href: 'https://github.com/anurag-2911',            color: '#24292e' },
              { name: 'LinkedIn', href: 'https://linkedin.com/in/anurag-2911',       color: '#0a66c2' },
              { name: 'Twitter',  href: 'https://twitter.com/anurag_dev',            color: '#1d9bf0' },
            ].map(({ name, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-3 py-1 rounded-full border border-[#dadce0] dark:border-[#3c4043]
                           text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043]
                           transition-colors"
              >
                {name}
              </a>
            ))}
          </div>

          <div className="h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

          {/* Skills preview */}
          <p className="text-xs uppercase tracking-wide text-[#70757a] dark:text-[#9aa0a6] mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS_FLAT.slice(0, 8).map(s => (
              <span key={s}
                className="text-xs px-2 py-0.5 rounded-sm bg-[#f8f9fa] dark:bg-[#303134]
                           text-[#202124] dark:text-[#e8eaed] border border-[#dadce0] dark:border-[#5f6368]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
