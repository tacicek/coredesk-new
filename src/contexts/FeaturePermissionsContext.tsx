import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

export type FeatureName = 
  | 'invoices'
  | 'offers' 
  | 'customers'
  | 'products'
  | 'projects'
  | 'reports'
  | 'financial_management'
  | 'expenses'
  | 'revenue'
  | 'payroll';

export interface FeaturePermission {
  feature_name: FeatureName;
  is_enabled: boolean;
}

interface FeaturePermissionsContextType {
  permissions: Record<FeatureName, boolean>;
  loading: boolean;
  hasPermission: (feature: FeatureName) => boolean;
  refreshPermissions: () => Promise<void>;
}

const FeaturePermissionsContext = createContext<FeaturePermissionsContextType | undefined>(undefined);

export { FeaturePermissionsContext };

export const useFeaturePermissions = () => {
  const context = useContext(FeaturePermissionsContext);
  if (context === undefined) {
    throw new Error('useFeaturePermissions must be used within a FeaturePermissionsProvider');
  }
  return context;
};

interface FeaturePermissionsProviderProps {
  children: React.ReactNode;
}

export const FeaturePermissionsProvider: React.FC<FeaturePermissionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<FeatureName, boolean>>({
    invoices: true,
    offers: true,
    customers: true,
    products: true,
    projects: false,
    reports: false,
    financial_management: true,
    expenses: true,
    revenue: true,
    payroll: false,
  });
  const [loading, setLoading] = useState(true);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_tenant_features');
      
      if (error) {
        console.error('Error fetching feature permissions:', error);
        return;
      }

      const permissionsMap: Record<FeatureName, boolean> = {
        invoices: true,
        offers: true,
        customers: true,
        products: true,
        projects: false,
        reports: false,
        financial_management: true,
        expenses: true,
        revenue: true,
        payroll: false,
      };

      if (data) {
        data.forEach((item: FeaturePermission) => {
          if (item.feature_name in permissionsMap) {
            permissionsMap[item.feature_name] = item.is_enabled;
          }
        });
      }

      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (feature: FeatureName): boolean => {
    return permissions[feature] || false;
  };

  const refreshPermissions = async () => {
    setLoading(true);
    await fetchPermissions();
  };

  const getUserTenantId = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user tenant ID:', error);
        return null;
      }
      
      return data?.tenant_id || null;
    } catch (error) {
      console.error('Error fetching user tenant ID:', error);
      return null;  
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cleanup: (() => void) | undefined;

    const setupRealTimeSubscription = async () => {
      // First fetch initial permissions
      await fetchPermissions();
      
      // Get user's tenant ID
      const tenantId = await getUserTenantId();
      setUserTenantId(tenantId);
      
      if (!tenantId) return;

      // Set up real-time subscription for tenant feature changes
      const channel = supabase
        .channel('tenant_features_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'tenant_features',
            filter: `tenant_id=eq.${tenantId}` // Only listen to changes for this tenant
          },
          async (payload) => {
            console.log('Feature permission changed:', payload);
            
            // Store old permissions to compare
            const oldPermissions = { ...permissions };
            
            // Refresh permissions when any change occurs
            await fetchPermissions();
            
            // Show toast notification about the change
            if (payload.eventType === 'UPDATE' && payload.new) {
              const featureName = payload.new.feature_name;
              const isEnabled = payload.new.is_enabled;
              
              toast({
                title: 'Funktionsberechtigung geändert',
                description: `${featureName} wurde ${isEnabled ? 'aktiviert' : 'deaktiviert'}`,
                duration: 5000,
              });
            }
          }
        )
        .subscribe();

      // Set cleanup function
      cleanup = () => {
        channel.unsubscribe();
      };
    };

    setupRealTimeSubscription();

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [user]);

  const value: FeaturePermissionsContextType = {
    permissions,
    loading,
    hasPermission,
    refreshPermissions,
  };

  return (
    <FeaturePermissionsContext.Provider value={value}>
      {children}
    </FeaturePermissionsContext.Provider>
  );
};