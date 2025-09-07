import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VendorProvider } from "./contexts/VendorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { FeaturePermissionsProvider } from "./contexts/FeaturePermissionsContext";
import { useIsAdmin } from "./hooks/useIsAdmin";
import AdminAuthPage from "./pages/AdminAuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PricingPage from "./pages/PricingPage";
import DemoPage from "./pages/DemoPage";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import NewCustomer from "./pages/NewCustomer";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import EditInvoice from "./pages/EditInvoice";
import InvoicePreview from "./pages/InvoicePreview";
import Products from "./pages/Products";
import Offers from "./pages/Offers";
import NewOffer from "./pages/NewOffer";
import EditOffer from "./pages/EditOffer";
import Reports from "./pages/Reports";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectsList from "./pages/ProjectsList";
import NewProject from "./pages/NewProject";
import Settings from "./pages/Settings";
import CompanyInfo from "./pages/CompanyInfo";
import IncomingInvoices from "./pages/IncomingInvoices";
import InvoiceManagement from "./pages/InvoiceManagement";
import ApiManagement from "./pages/ApiManagement";
import NotFound from "./pages/NotFound";
import Expenses from "./pages/Expenses";
import Revenue from "./pages/Revenue";
import PayrollManagement from "./pages/PayrollManagement";
import Tax from "./pages/Tax";
import VendorManagement from "./pages/VendorManagement";
import AdminDashboard from "./pages/AdminDashboard";
import Activities from "./pages/Activities";

import ReportWizard from "./pages/ReportWizard";

// Separate Admin App Component
function AdminApp() {
  return <AdminDashboard />;
}

// Main Business App Component
function BusinessApp() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<NewCustomer />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<NewInvoice />} />
        <Route path="/invoices/:id/edit" element={<EditInvoice />} />
        <Route path="/invoices/:id" element={<InvoicePreview />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offers/new" element={<NewOffer />} />
        <Route path="/offers/:id/edit" element={<EditOffer />} />
        <Route path="/products" element={<Products />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tax-report" element={<IncomingInvoices />} />
        <Route path="/incoming-invoices" element={<IncomingInvoices />} />
        <Route path="/invoice-management" element={<InvoiceManagement />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/payroll-management" element={<PayrollManagement />} />
        <Route path="/tax" element={<Tax />} />
        <Route path="/api-management" element={<ApiManagement />} />
        <Route path="/company-info" element={<CompanyInfo />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  console.log('🔍 AppRoutes - User:', user?.email, 'Loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Admin Login Route - No authentication required */}
      <Route path="/admin/login" element={<AdminAuthPage />} />
      
      {/* Protected Admin Routes - Requires admin authentication */}
      <Route path="/admin" element={
        user ? <AdminLayout /> : <Navigate to="/admin/login" replace />
      }>
        <Route index element={<AdminApp />} />
      </Route>
      
      {/* Public Routes */}
      <Route path="/" element={
        user ? <Navigate to="/dashboard" replace /> : <LandingPage />
      } />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/password-reset" element={<ResetPasswordPage />} />
      
      {/* Business App Routes - Requires user authentication */}
      <Route path="/vendor-management" element={
        user ? <VendorManagement /> : <Navigate to="/login" replace />
      } />
      <Route path="/projects/new" element={
        user ? <AppLayout><NewProject /></AppLayout> : <Navigate to="/login" replace />
      } />
      <Route path="/projects/:id" element={
        user ? <AppLayout><ProjectDetail /></AppLayout> : <Navigate to="/login" replace />
      } />
      <Route path="/dashboard/projects/:id/report-wizard" element={
        user ? <AppLayout><ReportWizard /></AppLayout> : <Navigate to="/login" replace />
      } />
      <Route path="/projects" element={
        user ? <AppLayout><ProjectsList /></AppLayout> : <Navigate to="/login" replace />
      } />
      <Route path="/dashboard/*" element={
        user ? <BusinessApp /> : <Navigate to="/login" replace />
      } />
      <Route path="/dashboard" element={
        user ? <BusinessApp /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ImpersonationProvider>
                <VendorProvider>
                  <FeaturePermissionsProvider>
                    <AppRoutes />
                  </FeaturePermissionsProvider>
                </VendorProvider>
              </ImpersonationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Uygulama Hatası</h1>
        <p>Bir hata oluştu: {error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
      </div>
    );
  }
};

export default App;