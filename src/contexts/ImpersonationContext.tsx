import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface ImpersonatedTenant {
  id: string;
  company_name: string;
  contact_email: string;
  status: string;
}

interface ImpersonationContextType {
  impersonatedTenant: ImpersonatedTenant | null;
  isImpersonating: boolean;
  availableTenants: ImpersonatedTenant[];
  startImpersonation: (tenant: ImpersonatedTenant) => void;
  stopImpersonation: () => void;
  loadAvailableTenants: () => Promise<void>;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<ImpersonatedTenant[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAvailableTenants = async () => {
    if (!user || !isAdmin) return;

    try {
      setLoading(true);
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, company_name, contact_email, status')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;

      setAvailableTenants(tenants || []);
    } catch (error) {
      console.error('Error loading available tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const startImpersonation = (tenant: ImpersonatedTenant) => {
    console.log('Starting impersonation for tenant:', tenant);
    setImpersonatedTenant(tenant);
    // Store in sessionStorage to persist across page reloads
    sessionStorage.setItem('impersonated_tenant', JSON.stringify(tenant));
  };

  const stopImpersonation = () => {
    console.log('Stopping impersonation');
    setImpersonatedTenant(null);
    sessionStorage.removeItem('impersonated_tenant');
  };

  // Restore impersonation state on app load
  useEffect(() => {
    if (isAdmin) {
      const stored = sessionStorage.getItem('impersonated_tenant');
      if (stored) {
        try {
          const tenant = JSON.parse(stored);
          setImpersonatedTenant(tenant);
        } catch (error) {
          console.error('Error parsing stored impersonation data:', error);
          sessionStorage.removeItem('impersonated_tenant');
        }
      }
    }
  }, [isAdmin]);

  // Load available tenants when admin status is confirmed
  useEffect(() => {
    if (isAdmin) {
      loadAvailableTenants();
    }
  }, [isAdmin]);

  const value: ImpersonationContextType = {
    impersonatedTenant,
    isImpersonating: !!impersonatedTenant,
    availableTenants,
    startImpersonation,
    stopImpersonation,
    loadAvailableTenants,
    loading,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}