/**
 * Shared AI chat logic used by both Home and SearchLayout.
 * Keeps the reply map and routing in one place.
 */

const AI_REPLIES = {
  who:        "Anurag is a full-stack developer specialising in the MERN stack: React, Node.js, Express and MongoDB. He loves clean UI and fast developer tooling. Visit the About section for the full story!",
  projects:   "Anurag has shipped several web apps and open-source projects. Head to the Projects section for deep-dives, or check out his GitHub for the source code.",
  hire:       "Anurag is open to freelance and full-time opportunities. Drop him a message through the Contact page, there's an email form and links to all his socials.",
  stack:      "Primary stack: React, Node.js, Express, MongoDB, TailwindCSS. He's also comfortable with TypeScript, Docker, REST and GraphQL APIs, and Vite.",
  blog:       "Anurag writes about web development, design systems, and side-project journeys. Browse the Blog section to catch his latest posts.",
  experience: "Anurag has hands-on experience building full-stack web applications, working with REST APIs, and contributing to team projects. Check the Projects section for detailed case studies.",
  opensource: "Yes! Anurag actively contributes to open-source projects and publishes all his own work on GitHub. Visit his profile to explore repositories and contributions.",
  education:  "Anurag is studying Information Science and Engineering. He complements his academics with self-driven learning in modern web dev, system design, and software engineering.",
  contact:    "Reach Anurag through the Contact page. There's a direct email form and links to all his social profiles. He typically responds within 24 hours.",
  github:     "All of Anurag's code lives on GitHub. You'll find the link in the top-right corner of every page, feel free to explore and star his repos!",
  greet:      "Hey! I'm an AI assistant built into Anurag's portfolio. Ask me about his background, projects, tech stack, blog, or how to get in touch!",
};

export function getAiReply(input) {
  const q = input.toLowerCase();
  if (/\b(hello|hi|hey|howdy)\b/.test(q))                              return AI_REPLIES.greet;
  if (/education|studying|degree|university|college|academic/.test(q)) return AI_REPLIES.education;
  if (/who|about|yourself|introduce|bio|background/.test(q))           return AI_REPLIES.who;
  if (/open.?source|contribut/.test(q))                                return AI_REPLIES.opensource;
  if (/project|built|portfolio|app|code/.test(q))                      return AI_REPLIES.projects;
  if (/github/.test(q))                                                 return AI_REPLIES.github;
  if (/blog|article|post|writ/.test(q))                                return AI_REPLIES.blog;
  if (/hire|freelance|opportunit|availab/.test(q))                     return AI_REPLIES.hire;
  if (/contact|email|touch|reach|message|connect/.test(q))             return AI_REPLIES.contact;
  if (/skill|tech|stack|language|framework|tool|work with|use/.test(q)) return AI_REPLIES.stack;
  if (/experience|work history|career/.test(q))                        return AI_REPLIES.experience;
  return "Hmm, not sure about that one. Try one of the suggestion chips or ask about Anurag's projects, stack, blog, or contact info!";
}
