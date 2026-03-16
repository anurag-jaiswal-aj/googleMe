import { Routes, Route } from 'react-router-dom';
import SearchLayout from './components/SearchLayout';
import Home from './pages/Home';
import All from './pages/All';
import About from './pages/About';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import Tools from './pages/Tools';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Home — standalone Google-homepage style */}
      <Route path="/" element={<Home />} />

      {/* SERP pages — share a persistent SearchLayout header */}
      <Route element={<SearchLayout />}>
        <Route path="/all"      element={<All />} />
        <Route path="/about"    element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact"  element={<Contact />} />
        <Route path="/blog"     element={<Blog />} />
        <Route path="/tools"    element={<Tools />} />
      </Route>

      {/* Admin — standalone page */}
      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
