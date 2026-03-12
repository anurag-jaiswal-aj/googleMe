/**
 * Seed script — run once to populate MongoDB with sample projects.
 * Usage: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');

const sampleProjects = [
  {
    title: 'gfolio — Google-Themed Portfolio',
    description:
      'A production-ready MERN stack portfolio website inspired by the Google Search homepage. Features dark/light mode, animated search navigation, dynamic projects, and a contact form with email notifications.',
    techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'TailwindCSS', 'Framer Motion'],
    repoUrl: 'https://github.com/yourusername/gfolio',
    demoUrl: 'https://gfolio.vercel.app',
    imageUrl: '',
    featured: true,
    order: 1,
  },
  {
    title: 'E-Commerce Platform',
    description:
      'Full-stack e-commerce application with product listings, cart management, user authentication, and Stripe payments integration.',
    techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe', 'JWT'],
    repoUrl: 'https://github.com/yourusername/ecommerce',
    demoUrl: 'https://ecommerce-demo.vercel.app',
    imageUrl: '',
    featured: true,
    order: 2,
  },
  {
    title: 'Real-Time Chat App',
    description:
      'WebSocket-based real-time chat application with rooms, private messaging, and online presence indicators.',
    techStack: ['React', 'Socket.io', 'Node.js', 'Express', 'MongoDB'],
    repoUrl: 'https://github.com/yourusername/chat-app',
    demoUrl: 'https://chat-app-demo.vercel.app',
    imageUrl: '',
    featured: false,
    order: 3,
  },
  {
    title: 'Task Management Dashboard',
    description:
      'Kanban-style project management tool with drag-and-drop, team collaboration, deadline tracking, and progress analytics.',
    techStack: ['React', 'Redux', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
    repoUrl: 'https://github.com/yourusername/task-manager',
    demoUrl: 'https://taskboard-demo.vercel.app',
    imageUrl: '',
    featured: false,
    order: 4,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gfolio');
    console.log('Connected to MongoDB');

    await Project.deleteMany({});
    const inserted = await Project.insertMany(sampleProjects);
    console.log(`Seeded ${inserted.length} projects`);

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
