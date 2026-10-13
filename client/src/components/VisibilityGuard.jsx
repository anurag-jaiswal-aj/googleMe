import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useConfig, getCachedConfig } from '../hooks/useConfig';
import { getPageVisibility } from '../data/pageVisibility';
import {
  isTokenSessionVerified,
  verifyAdminSession,
  subscribeToAdminAuth,
} from '../utils/adminAuth';

function GuardLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-8 h-8 rounded-full border-2 border-[#e8eaed] border-t-[#4285F4] animate-spin" />
    </div>
  );
}

/**
 * Route guard for optional pages (blog, tools, images).
 * - Enabled page: allows public access without authentication checks.
 * - Disabled page: redirects anonymous visitors to /all using replacement navigation.
 * - Disabled page + verified admin: allows admin preview.
 * - Prevents brief flashing by displaying a loader while initial config is in-flight.
 * - Listens for cross-tab and same-tab authentication changes to immediately revoke preview.
 */
export default function VisibilityGuard({ pageKey, children }) {
  const cfg = useConfig();
  const cached = getCachedConfig();
  const visibility = getPageVisibility(cfg);
  const isEnabled = visibility[pageKey] !== false;

  const [authChecking, setAuthChecking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => isTokenSessionVerified());

  useEffect(() => {
    // If page is enabled, public visitors have full access without auth evaluation
    if (isEnabled) {
      return;
    }

    let isMounted = true;

    const evaluateAuth = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      if (!token) {
        if (isMounted) {
          setIsAdmin(false);
          setAuthChecking(false);
        }
        return;
      }

      if (isTokenSessionVerified(token)) {
        if (isMounted) {
          setIsAdmin(true);
          setAuthChecking(false);
        }
        return;
      }

      // Fail-closed while verifying: cannot remain admin with an unverified or replaced token
      if (isMounted) {
        setIsAdmin(false);
        setAuthChecking(true);
      }

      verifyAdminSession().then((valid) => {
        if (!isMounted) return;
        setIsAdmin(valid);
        setAuthChecking(false);
      });
    };

    // Run initial evaluation
    evaluateAuth();

    // Subscribe to cross-tab storage events and admin session changes
    const unsubscribe = subscribeToAdminAuth(() => {
      if (isMounted) {
        evaluateAuth();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isEnabled]);

  // 1. Initial config loading: avoid flashing disabled page before first config fetch resolves
  if (cached === null) {
    return <GuardLoader />;
  }

  // 2. If page is enabled, allow access immediately
  if (isEnabled) {
    return children;
  }

  // 3. Page is disabled: if user has a token and verification is running, show loader
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  if (token && authChecking) {
    return <GuardLoader />;
  }

  // 4. Page is disabled: if verified administrator, allow preview
  if (isAdmin) {
    return children;
  }

  // 5. Page is disabled: anonymous or invalid token -> redirect to /all
  return <Navigate to="/all" replace />;
}
