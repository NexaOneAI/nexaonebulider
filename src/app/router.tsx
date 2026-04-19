import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from '@/features/auth/guards';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Install from '@/pages/Install';
import Dashboard from '@/pages/Dashboard';
import Builder from '@/pages/Builder';
import ProjectDetail from '@/pages/ProjectDetail';
import Billing from '@/pages/Billing';
import Connectors from '@/pages/Connectors';
import Admin from '@/pages/Admin';
import SharedPreview from '@/pages/SharedPreview';
import NotFound from '@/pages/NotFound';

export function AppRouter() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
