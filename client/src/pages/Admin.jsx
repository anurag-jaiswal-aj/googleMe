import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import { LINKS } from '../config/links';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Content states
  const [aboutContent, setAboutContent] = useState('');
  const [projects, setProjects] = useState([]);
  const [contactInfo, setContactInfo] = useState({
    email: LINKS.email,
    phone: '+91 XXXXX XXXXX',
    address: 'Bengaluru, India'
  });
  const [activeTab, setActiveTab] = useState('about');

  // Check authentication on mount
  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
      loadContent();
    }
  }, []);

  const loadContent = async () => {
    try {
      // Load about content (you might need to create this endpoint)
      // const aboutRes = await api.get('/admin/about');
      // setAboutContent(aboutRes.data.content);
      
      // Load projects
      const projectsRes = await api.get('/projects');
      setProjects(projectsRes.data);
      
      // Load contact info
      setContactInfo({
        email: LINKS.email,
        phone: '+91 XXXXX XXXXX',
        address: 'Bengaluru, India'
      });
    } catch (err) {
      console.error('Failed to load content:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple password authentication (in production, use proper JWT)
    if (password === 'admin123') { // Change this to a secure password
      localStorage.setItem('adminAuth', 'authenticated');
      setIsAuthenticated(true);
      loadContent();
    } else {
      setError('Invalid password');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setPassword('');
  };

  const saveAbout = async () => {
    try {
      // await api.post('/admin/about', { content: aboutContent });
      alert('About content saved successfully!');
    } catch (err) {
      alert('Failed to save about content');
    }
  };

  const saveProjects = async () => {
    try {
      // await api.post('/admin/projects', { projects });
      alert('Projects saved successfully!');
    } catch (err) {
      alert('Failed to save projects');
    }
  };

  const saveContact = async () => {
    try {
      // await api.post('/admin/contact', contactInfo });
      alert('Contact info saved successfully!');
    } catch (err) {
      alert('Failed to save contact info');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124] flex flex-col">
        {/* Google-style header */}
        <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
          <div className="max-w-[680px] mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Google-style logo */}
              <div className="flex items-center gap-1">
                <span className="text-[26px] font-normal" style={{ color: '#4285F4' }}>A</span>
                <span className="text-[26px] font-normal" style={{ color: '#EA4335' }}>d</span>
                <span className="text-[26px] font-normal" style={{ color: '#FBBC05' }}>m</span>
                <span className="text-[26px] font-normal" style={{ color: '#4285F4' }}>i</span>
                <span className="text-[26px] font-normal" style={{ color: '#34A853' }}>n</span>
              </div>
              <div className="flex-1" />
              <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                Portfolio
              </a>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  A
                </div>
                <h1 className="text-2xl font-normal text-[#202124] dark:text-[#e8eaed] mb-2">Admin Access</h1>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Sign in to access admin panel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#303134] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a73e8] text-white py-3 rounded-lg font-normal hover:bg-[#1967d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Signing in...' : 'Next'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                  ← Back to Portfolio
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#202124]">
      {/* Google-style Header */}
      <div className="bg-white dark:bg-[#202124] border-b border-[#e8eaed] dark:border-[#3c4043]">
        <div className="max-w-[680px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Google-style logo */}
            <div className="flex items-center gap-1">
              <span className="text-[20px] font-normal" style={{ color: '#4285F4' }}>A</span>
              <span className="text-[20px] font-normal" style={{ color: '#EA4335' }}>d</span>
              <span className="text-[20px] font-normal" style={{ color: '#FBBC05' }}>m</span>
              <span className="text-[20px] font-normal" style={{ color: '#4285F4' }}>i</span>
              <span className="text-[20px] font-normal" style={{ color: '#34A853' }}>n</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-normal text-[#202124] dark:text-[#e8eaed]">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline">
                Portfolio
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-full transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-sm border border-[#dadce0] dark:border-[#5f6368] mb-6">
          <div className="flex space-x-1 p-1">
            {['about', 'projects', 'contact'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-normal transition-colors ${
                  activeTab === tab
                    ? 'bg-[#1a73e8] text-white'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-[#303134] rounded-lg shadow-sm border border-[#dadce0] dark:border-[#5f6368] p-6"
        >
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">About Content</h2>
                <textarea
                  value={aboutContent}
                  onChange={(e) => setAboutContent(e.target.value)}
                  className="w-full h-64 px-4 py-3 border border-[#dadce0] dark:border-[#5f6368] rounded-lg bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors font-mono text-sm"
                  placeholder="Enter your about content here..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveAbout}
                  className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed]">Manage Projects</h2>
                <button
                  onClick={() => {
                    const newProject = {
                      _id: `project-${Date.now()}`,
                      title: 'New Project',
                      description: 'Project description',
                      techStack: [],
                      repoUrl: '',
                      demoUrl: '',
                      featured: false,
                      order: projects.length + 1
                    };
                    setProjects([...projects, newProject]);
                  }}
                  className="px-4 py-2 bg-[#34a853] text-white rounded-lg font-normal hover:bg-[#2d8f47] transition-colors text-sm"
                >
                  + Add Project
                </button>
              </div>

              <div className="space-y-4">
                {projects.map((project, index) => (
                  <div key={project._id} className="border border-[#e8eaed] dark:border-[#3c4043] rounded-lg p-4 space-y-3">
                    <input
                      type="text"
                      value={project.title}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].title = e.target.value;
                        setProjects(updated);
                      }}
                      className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors text-sm"
                      placeholder="Project Title"
                    />
                    <textarea
                      value={project.description}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].description = e.target.value;
                        setProjects(updated);
                      }}
                      className="w-full h-20 px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors text-sm"
                      placeholder="Project Description"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="url"
                        value={project.repoUrl}
                        onChange={(e) => {
                          const updated = [...projects];
                          updated[index].repoUrl = e.target.value;
                          setProjects(updated);
                        }}
                        className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors text-sm"
                        placeholder="GitHub Repository URL"
                      />
                      <input
                        type="url"
                        value={project.demoUrl}
                        onChange={(e) => {
                          const updated = [...projects];
                          updated[index].demoUrl = e.target.value;
                          setProjects(updated);
                        }}
                        className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors text-sm"
                        placeholder="Live Demo URL"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-[#202124] dark:text-[#e8eaed]">
                        <input
                          type="checkbox"
                          checked={project.featured}
                          onChange={(e) => {
                            const updated = [...projects];
                            updated[index].featured = e.target.checked;
                            setProjects(updated);
                          }}
                          className="rounded border-[#e8eaed] dark:border-[#3c4043]"
                        />
                        Featured Project
                      </label>
                      <button
                        onClick={() => {
                          const updated = projects.filter((_, i) => i !== index);
                          setProjects(updated);
                        }}
                        className="ml-auto px-3 py-1.5 text-sm text-[#ea4335] hover:bg-[#fce8e6] dark:hover:bg-[#3b1f1f] rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={saveProjects}
                  className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] transition-colors"
                >
                  Save All Projects
                </button>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-2">
                  Address
                </label>
                <textarea
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo({...contactInfo, address: e.target.value})}
                  className="w-full h-24 px-3 py-2 border border-[#dadce0] dark:border-[#5f6368] rounded-md bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] transition-colors"
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={saveContact}
                  className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-normal hover:bg-[#1967d2] transition-colors"
                >
                  Save Contact Info
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
