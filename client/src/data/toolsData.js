export const TOOLS = [
  {
    category: 'Languages',
    color: '#4285F4',
    items: [
      { name: 'JavaScript (ES2023)', level: 'Expert', desc: 'Primary language for both frontend and backend development. Deep knowledge of async/await, closures, prototypes, and the event loop.' },
      { name: 'Python', level: 'Proficient', desc: 'Used for scripting, data processing, automation, and building small utilities. Comfortable with pandas, requests, and Flask.' },
      { name: 'Java', level: 'Intermediate', desc: 'OOP fundamentals, data structures, and algorithms. Used for academic coursework and competitive programming.' },
      { name: 'SQL', level: 'Proficient', desc: 'Writes complex queries, joins, indexes, and stored procedures. Experience with PostgreSQL and MySQL.' },
    ],
  },
  {
    category: 'Frontend',
    color: '#34A853',
    items: [
      { name: 'React 18', level: 'Expert', desc: 'Hooks, Context API, custom hooks, code-splitting, memoization, and React Router v6. This portfolio is built with React.' },
      { name: 'TailwindCSS', level: 'Expert', desc: 'Utility-first styling with dark mode, responsive design, and custom configuration. Preferred over traditional CSS.' },
      { name: 'Framer Motion', level: 'Proficient', desc: 'Smooth page transitions, stagger animations, AnimatePresence, and gesture-based interactions.' },
      { name: 'Vite', level: 'Proficient', desc: 'Fast dev server and build tool. Configured with proxy, custom plugins, and environment variables.' },
    ],
  },
  {
    category: 'Backend',
    color: '#FBBC05',
    items: [
      { name: 'Node.js', level: 'Expert', desc: 'Event-driven, non-blocking I/O. Built REST APIs, middleware chains, and real-time services with Node.' },
      { name: 'Express', level: 'Expert', desc: 'Custom middleware, route handlers, error handling, JWT auth, rate limiting, and Helmet security.' },
      { name: 'REST APIs', level: 'Expert', desc: 'Designed and consumed RESTful APIs with proper status codes, pagination, input validation, and error responses.' },
      { name: 'Socket.io', level: 'Intermediate', desc: 'Real-time bidirectional communication for chat apps and live dashboards.' },
    ],
  },
  {
    category: 'Database',
    color: '#EA4335',
    items: [
      { name: 'MongoDB', level: 'Proficient', desc: 'Document modelling, aggregation pipelines, indexing, and Mongoose ODM for schema validation.' },
      { name: 'PostgreSQL', level: 'Intermediate', desc: 'Relational schema design, transactions, and complex joins. Used with Prisma ORM.' },
      { name: 'Redis', level: 'Beginner', desc: 'Caching, session storage, and pub/sub for rate limiting and real-time features.' },
    ],
  },
  {
    category: 'DevOps & Tools',
    color: '#9c27b0',
    items: [
      { name: 'Git & GitHub', level: 'Expert', desc: 'Branching, rebasing, pull requests, GitHub Actions CI/CD, and semantic commits.' },
      { name: 'Docker', level: 'Intermediate', desc: 'Containerising Node.js apps, writing Dockerfiles, and using docker-compose for local multi-service setups.' },
      { name: 'Postman', level: 'Expert', desc: 'API testing, collection automation, environment variables, and pre-request scripts.' },
      { name: 'VS Code', level: 'Expert', desc: 'Custom keybindings, extensions (ESLint, Prettier, GitLens), and workspace settings.' },
    ],
  },
];

export const getToolCards = () =>
  TOOLS.map((group) => ({
    url: `anurag.dev/tools/${group.category.toLowerCase().replace(/\s+/g, '-')}`,
    title: `${group.category} - Anurag's Tech Stack`,
    snippet: group.items.map((item) => item.name).join(' · '),
    to: '/tools',
    faviconBg: group.color,
    faviconLetter: group.category[0],
  }));
