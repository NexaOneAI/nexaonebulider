import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from '@/features/auth/guards';
import { Loader } from '@/components/ui/Loader';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

// Lazy-loaded heavy routes — code-splitting reduces initial bundle.
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Install = lazy(() => import('@/pages/Install'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Builder = lazy(() => import('@/pages/Builder'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Billing = lazy(() => import('@/pages/Billing'));
const Connectors = lazy(() => import('@/pages/Connectors'));
const Admin = lazy(() => import('@/pages/Admin'));
const SharedPreview = lazy(() => import('@/pages/SharedPreview'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader size="lg" />
  </div>
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/install" element={<Install />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/builder/:projectId" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
          <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/share/:token" element={<SharedPreview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
