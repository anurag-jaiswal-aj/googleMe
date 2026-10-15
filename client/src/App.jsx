import { lazy, Suspense, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import SearchLayout from './components/SearchLayout';
import ErrorBoundary from './components/ErrorBoundary';
import WelcomeSplash from './components/WelcomeSplash';
import { getCachedConfig } from './hooks/useConfig';
import { fetchConfig } from './api';
import { LINKS } from './config/links';
import { inlineResumeUrl, getSafeResumeUrl } from './utils/resumeUrl';

import VisibilityGuard from './components/VisibilityGuard';

// Page-level code splitting - each page loads only when first visited
const Home     = lazy(() => import('./pages/Home'));
const All      = lazy(() => import('./pages/All'));
const About    = lazy(() => import('./pages/About'));
const Projects = lazy(() => import('./pages/Projects'));
const Contact  = lazy(() => import('./pages/Contact'));
const Blog     = lazy(() => import('./pages/Blog'));
const Tools    = lazy(() => import('./pages/Tools'));
const Images   = lazy(() => import('./pages/Images'));
const Admin    = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-8 h-8 rounded-full border-2 border-[#e8eaed] border-t-[#4285F4] animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ResumeRedirect() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update?.()).catch(() => {});
    }

    let isMounted = true;

    const navigateTo = (rawTarget) => {
      if (!isMounted) return;
      const destination = getSafeResumeUrl(rawTarget, LINKS.resume);
      if (destination) {
        window.location.replace(destination);
      }
    };

    // 1. If in-memory cache already has a configured resumeUrl, redirect immediately
    const cached = getCachedConfig();
    if (typeof cached?.resumeUrl === 'string' && cached.resumeUrl.trim()) {
      navigateTo(cached.resumeUrl.trim());
      return;
    }

    // 2. Otherwise query current config from backend API, racing against a 1.5s fallback timer
    let didResolve = false;
    const timer = setTimeout(() => {
      if (!didResolve) {
        didResolve = true;
        navigateTo(LINKS.resume);
      }
    }, 1500);

    fetchConfig()
      .then((data) => {
        if (!didResolve) {
          didResolve = true;
          clearTimeout(timer);
          const activeUrl = (typeof data?.resumeUrl === 'string' && data.resumeUrl.trim()) || LINKS.resume;
          navigateTo(activeUrl);
        }
      })
      .catch(() => {
        if (!didResolve) {
          didResolve = true;
          clearTimeout(timer);
          navigateTo(LINKS.resume);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return <PageLoader />;
}

export default function App() {
  // Show splash once per browser session
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('splashSeen')
  );

  const handleSplashDone = () => {
    sessionStorage.setItem('splashSeen', '1');
    setShowSplash(false);
  };

  return (
    <ErrorBoundary>
      {showSplash && <WelcomeSplash onDone={handleSplashDone} />}
      <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <Routes>
          {/* Home — standalone Google-homepage style */}
          <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />

          {/* SERP pages — share a persistent SearchLayout header */}
          <Route element={<SearchLayout />}>
            <Route path="/all"      element={<ErrorBoundary><All /></ErrorBoundary>} />
            <Route path="/about"    element={<ErrorBoundary><About /></ErrorBoundary>} />
            <Route path="/projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
            <Route path="/contact"  element={<ErrorBoundary><Contact /></ErrorBoundary>} />
            <Route path="/blog"     element={<ErrorBoundary><VisibilityGuard pageKey="blog"><Blog /></VisibilityGuard></ErrorBoundary>} />
            <Route path="/tools"    element={<ErrorBoundary><VisibilityGuard pageKey="tools"><Tools /></VisibilityGuard></ErrorBoundary>} />
            <Route path="/images"   element={<ErrorBoundary><VisibilityGuard pageKey="images"><Images /></VisibilityGuard></ErrorBoundary>} />
          </Route>

          {/* Admin — standalone page */}
          <Route path="/admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />

          {/* Direct resume route - dynamic client-side redirect honoring configured resumeUrl */}
          <Route path="/resume" element={<ResumeRedirect />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
