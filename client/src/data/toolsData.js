export const DEFAULT_TOOLS = [
  {
    category: 'Languages',
    title: 'Languages I Code In',
    color: '#4285F4',
    snippet: 'JavaScript and Python are the primary languages, used daily across web apps, ML pipelines, and scripting. Java and C++ cover competitive programming and systems concepts, while C and SQL round out the foundation for low-level work and relational databases.',
    items: [
      { name: 'JavaScript (ES2023)', level: 'Expert',       desc: 'Primary language for both frontend and backend. Deep knowledge of async/await, closures, prototypes, and the event loop.' },
      { name: 'Python',              level: 'Expert',       desc: 'Used for ML pipelines, data processing, scripting, and automation. Comfortable across the full scientific stack.' },
      { name: 'Java',                level: 'Intermediate', desc: 'OOP fundamentals and data structures. Primary language for DSA practice and competitive programming.' },
      { name: 'C++',                 level: 'Intermediate', desc: 'Used for competitive programming and understanding low-level memory management and performance.' },
      { name: 'C',                   level: 'Beginner',     desc: 'Basic systems programming concepts, pointers, and memory allocation from coursework.' },
      { name: 'SQL',                 level: 'Intermediate', desc: 'Writes queries, joins, and indexes. Experience with MySQL and PostgreSQL for relational data.' },
    ],
  },
  {
    category: 'Frontend',
    title: 'Frontend Development',
    color: '#34A853',
    snippet: 'Responsive, animated UIs are built with React 18, TailwindCSS, Framer Motion, and GSAP. This portfolio itself is a live example of what that combination looks like in practice, from page transitions to stagger animations and dark mode.',
    items: [
      { name: 'HTML & CSS',    level: 'Expert',       desc: 'Semantic HTML5, CSS3 layouts (Flexbox, Grid), animations, and responsive design from scratch.' },
      { name: 'React 18',      level: 'Expert',       desc: 'Hooks, Context API, custom hooks, code-splitting, memoization, and React Router v6. This portfolio is built with React.' },
      { name: 'TailwindCSS',   level: 'Expert',       desc: 'Utility-first styling with dark mode, responsive design, and custom configuration. Preferred over traditional CSS.' },
      { name: 'Framer Motion', level: 'Expert',       desc: 'Smooth page transitions, stagger animations, AnimatePresence, and gesture-based interactions.' },
      { name: 'GSAP',          level: 'Proficient',   desc: 'Timeline-based animations, scroll triggers, and high-performance UI motion for web projects.' },
      { name: 'Vite',          level: 'Proficient',   desc: 'Fast dev server and build tool. Configured with proxy, custom plugins, and environment variables.' },
      { name: 'Next.js',       level: 'Beginner',     desc: 'Exploring SSR, SSG, and the App Router for building full-stack React applications.' },
    ],
  },
  {
    category: 'Backend',
    title: 'Backend & APIs',
    color: '#FBBC05',
    snippet: 'REST APIs are designed and shipped with Node.js and Express, covering middleware chains, rate limiting, Helmet security, and real-time features via Socket.io. Most backend projects follow a clean route-controller-model structure.',
    items: [
      { name: 'Node.js',    level: 'Expert',     desc: 'Event-driven, non-blocking I/O. Built REST APIs, middleware chains, and real-time services.' },
      { name: 'Express',    level: 'Proficient', desc: 'Custom middleware, route handlers, error handling, rate limiting, and Helmet security.' },
      { name: 'REST APIs',  level: 'Proficient', desc: 'Designed and consumed RESTful APIs with proper status codes, pagination, validation, and error responses.' },
      { name: 'Socket.io',  level: 'Beginner',   desc: 'Real-time bidirectional communication for chat apps and live dashboards.' },
    ],
  },
  {
    category: 'Database',
    title: 'Databases & Storage',
    color: '#EA4335',
    snippet: 'MongoDB is the go-to database for most projects, used with Mongoose for schema validation and aggregation pipelines. MySQL and PostgreSQL handle relational data needs, and Redis is used for caching and session storage.',
    items: [
      { name: 'MongoDB',    level: 'Expert',       desc: 'Document modelling, aggregation pipelines, indexing, and Mongoose ODM for schema validation.' },
      { name: 'MySQL',      level: 'Intermediate', desc: 'Relational schema design, complex joins, and transactions for structured data.' },
      { name: 'PostgreSQL', level: 'Beginner',     desc: 'Basic relational queries and schema design. Used with Prisma ORM in small projects.' },
      { name: 'Redis',      level: 'Beginner',     desc: 'Caching and session storage for rate limiting and real-time features.' },
    ],
  },
  {
    category: 'Machine Learning',
    title: 'Machine Learning & Data Science',
    color: '#00897B',
    snippet: 'ML models are built and evaluated using NumPy, Pandas, Scikit-learn, Matplotlib, and TensorFlow. Work spans data wrangling, classification, regression, clustering, and neural network experiments across real-world datasets.',
    items: [
      { name: 'NumPy',        level: 'Expert',       desc: 'N-dimensional arrays, vectorised operations, linear algebra, and numerical computing.' },
      { name: 'Pandas',       level: 'Expert',       desc: 'Data wrangling, cleaning, groupby operations, and exploratory data analysis on structured datasets.' },
      { name: 'Scikit-learn', level: 'Expert',       desc: 'Classification, regression, clustering, pipelines, cross-validation, and model evaluation.' },
      { name: 'Matplotlib',   level: 'Expert',       desc: 'Data visualisation including plots, histograms, heatmaps, and custom figure styling.' },
      { name: 'TensorFlow',   level: 'Proficient',   desc: 'Building and training neural networks, working with Keras API for deep learning experiments.' },
      { name: 'Seaborn',      level: 'Intermediate', desc: 'Statistical data visualisation built on Matplotlib for cleaner, more expressive plots.' },
      { name: 'Jupyter',      level: 'Proficient',   desc: 'Interactive notebooks for experimentation, data exploration, and sharing ML workflows.' },
    ],
  },
  {
    category: 'DSA',
    title: 'DSA & Problem Solving',
    color: '#F4511E',
    snippet: 'Data Structures and Algorithms are practised regularly on LeetCode and competitive platforms, with a focus on writing optimised solutions and understanding Big-O trade-offs. Core topics include trees, graphs, dynamic programming, and greedy algorithms.',
    items: [
      { name: 'Data Structures',       level: 'Proficient', desc: 'Arrays, linked lists, stacks, queues, trees, heaps, graphs, and hash maps, implemented and applied across problems.' },
      { name: 'Algorithms',            level: 'Proficient', desc: 'Sorting, searching, recursion, dynamic programming, greedy, and backtracking techniques.' },
      { name: 'Problem Solving',       level: 'Proficient', desc: 'Regular practice on LeetCode and competitive platforms. Focus on writing optimised, clean solutions.' },
      { name: 'Time & Space Analysis', level: 'Proficient', desc: 'Big-O analysis for evaluating and improving algorithm efficiency in real-world scenarios.' },
    ],
  },
  {
    category: 'UI / UX',
    title: 'UI / UX Design',
    color: '#8E24AA',
    snippet: 'Visual assets, presentations, and UI mockups are created in Canva and Figma. Canva handles polished graphics and social content, while Figma is used for wireframing and component layouts before moving into code.',
    items: [
      { name: 'Canva', level: 'Expert',   desc: 'Designing social graphics, presentations, thumbnails, and visual assets with a polished, consistent style.' },
      { name: 'Figma', level: 'Beginner', desc: 'Basic wireframing, component layouts, and prototyping for planning UI before development.' },
    ],
  },
  {
    category: 'Tools & Workflow',
    title: 'Dev Tools & Workflow',
    color: '#546E7A',
    snippet: 'Git, Postman, VS Code, and Docker are part of the daily workflow. Git handles version control and CI/CD via GitHub Actions, Postman covers API testing and automation, and Docker is used to containerise Node.js services for consistent local environments.',
    items: [
      { name: 'Git & GitHub', level: 'Expert',       desc: 'Branching, rebasing, pull requests, GitHub Actions CI/CD, and semantic commits.' },
      { name: 'Postman',      level: 'Expert',       desc: 'API testing, collection automation, environment variables, and pre-request scripts.' },
      { name: 'VS Code',      level: 'Expert',       desc: 'Custom keybindings, extensions (ESLint, Prettier, GitLens), and workspace settings.' },
      { name: 'Docker',       level: 'Intermediate', desc: 'Containerising Node.js apps, writing Dockerfiles, and docker-compose for local multi-service setups.' },
    ],
  },
];

export const TOOLS = DEFAULT_TOOLS;

export const VALID_LEVELS = ['Expert', 'Proficient', 'Intermediate', 'Beginner'];

export const HEX6_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const isValidHexColor = (color) =>
  typeof color === 'string' && HEX6_COLOR_REGEX.test(color.trim());

export function validateToolsConfig(tools) {
  if (!Array.isArray(tools)) {
    return { valid: false, error: 'Tools configuration must be an array' };
  }
  if (tools.length === 0) {
    return { valid: false, error: 'Tools configuration must contain at least one category' };
  }
  const seenCategories = new Set();
  for (let ci = 0; ci < tools.length; ci++) {
    const cat = tools[ci];
    if (!cat || typeof cat !== 'object') {
      return { valid: false, error: `Category at index ${ci} must be an object` };
    }
    if (typeof cat.category !== 'string' || !cat.category.trim()) {
      return { valid: false, error: `Category at index ${ci} requires a non-empty name` };
    }
    const catName = cat.category.trim();
    const normalizedName = catName.toLowerCase();
    if (seenCategories.has(normalizedName)) {
      return { valid: false, error: `Duplicate category name "${catName}". Category names must be unique.` };
    }
    seenCategories.add(normalizedName);
    if (typeof cat.title !== 'string' || !cat.title.trim()) {
      return { valid: false, error: `Category "${cat.category}" requires a non-empty title` };
    }
    if (typeof cat.color !== 'string' || !isValidHexColor(cat.color)) {
      return { valid: false, error: `Category "${cat.category}" requires a valid 6-digit hex color (e.g. #4285F4)` };
    }
    if (typeof cat.snippet !== 'string' || !cat.snippet.trim()) {
      return { valid: false, error: `Category "${cat.category}" requires a non-empty snippet` };
    }
    if (!Array.isArray(cat.items) || cat.items.length === 0) {
      return { valid: false, error: `Category "${cat.category}" must contain at least one skill` };
    }
    for (let si = 0; si < cat.items.length; si++) {
      const skill = cat.items[si];
      if (!skill || typeof skill !== 'object') {
        return { valid: false, error: `Skill at index ${si} in "${cat.category}" must be an object` };
      }
      if (typeof skill.name !== 'string' || !skill.name.trim()) {
        return { valid: false, error: `Skill at index ${si} in "${cat.category}" requires a non-empty name` };
      }
      if (!VALID_LEVELS.includes(skill.level)) {
        return { valid: false, error: `Skill "${skill.name || si}" in "${cat.category}" has an invalid level "${skill.level}". Allowed: Expert, Proficient, Intermediate, Beginner` };
      }
      if (typeof skill.desc !== 'string' || !skill.desc.trim()) {
        return { valid: false, error: `Skill "${skill.name}" in "${cat.category}" requires a non-empty description` };
      }
    }
  }
  return { valid: true };
}

export function getEffectiveTools(savedTools) {
  if (savedTools === undefined || savedTools === null) {
    return DEFAULT_TOOLS;
  }
  if (!Array.isArray(savedTools)) {
    console.warn('[toolsData] Tools config is not an array; falling back to DEFAULT_TOOLS');
    return DEFAULT_TOOLS;
  }
  const validation = validateToolsConfig(savedTools);
  if (!validation.valid) {
    console.warn('[toolsData] Malformed tools config; falling back to DEFAULT_TOOLS:', validation.error);
    return DEFAULT_TOOLS;
  }
  return savedTools.map((cat) => ({
    ...cat,
    category: cat.category.trim(),
    title: cat.title.trim(),
    color: cat.color.trim(),
    snippet: cat.snippet.trim(),
    items: cat.items.map((skill) => ({
      ...skill,
      name: skill.name.trim(),
      level: skill.level,
      desc: skill.desc.trim(),
    })),
  }));
}

export const getToolCards = (tools = DEFAULT_TOOLS) => {
  const effective = getEffectiveTools(tools);
  return effective.map((group) => {
    const categoryName = (group.category || 'Tools').trim();
    const slug = categoryName.toLowerCase().replace(/[\s/]+/g, '-');
    const color = isValidHexColor(group.color) ? group.color.trim() : '#4285F4';
    return {
      url: `anuragjaiswal.me/toolkit/${slug}`,
      title: (group.title || categoryName).trim(),
      snippet: (group.snippet || '').trim(),
      category: categoryName,
      items: Array.isArray(group.items) ? group.items : [],
      faviconBg: color,
      faviconLetter: categoryName[0] || 'T',
    };
  });
};
