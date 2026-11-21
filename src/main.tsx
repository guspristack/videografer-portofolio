import { lazy, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import '@fontsource-variable/dm-sans';
import '@fontsource/barlow-condensed/latin-700.css';
import './reset.css';
import { Showreel } from './pages/Showreel';

const Admin = lazy(() => import('./pages/Admin'));

function NavigationEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname === '/admin' ? 'Studio Bayu · Admin' : 'Bayu Pradana · Videografer dan editor';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NavigationEffects />
      <Suspense fallback={<p className="resource-state" role="status">Memuat studio…</p>}>
        <Routes>
          <Route path="/" element={<Showreel />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<main className="resource-state"><h1>Halaman tidak ditemukan</h1><Link to="/">Kembali ke portofolio</Link></main>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
