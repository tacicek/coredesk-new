import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';

interface Vendor {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  address?: any;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  vendor_id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: string;
  is_owner: boolean;
  vendor?: Vendor;
}

interface VendorContextType {
  vendor: Vendor | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isOwner: boolean;
  refreshVendorData: () => Promise<void>;
  updateVendor: (data: Partial<Vendor>) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const VendorContext = createContext<VendorContextType | null>(null);

export function VendorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { impersonatedTenant, isImpersonating } = useImpersonation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  console.log('VendorContext state:', { vendor, userProfile, loading, isOwner: userProfile?.is_owner || false });

  const refreshVendorData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // If impersonating, get the tenant's vendor data instead
      if (isImpersonating && impersonatedTenant) {
        console.log('Loading impersonated tenant data for:', impersonatedTenant.company_name);
        
        // Get the vendor associated with the impersonated tenant
        const { data: impersonatedVendor, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('tenant_id', impersonatedTenant.id)
          .maybeSingle();

        if (vendorError) {
          console.error('Error fetching impersonated vendor:', vendorError);
          return;
        }

        if (impersonatedVendor) {
          // Create a mock user profile for impersonation
          const mockProfile: UserProfile = {
            id: 'impersonated',
            user_id: user.id,
            vendor_id: impersonatedVendor.id,
            first_name: 'Admin',
            last_name: 'Impersonating',
            role: 'admin',
            is_owner: true,
            vendor: impersonatedVendor
          };
          
          setUserProfile(mockProfile);
          setVendor(impersonatedVendor);
          return;
        }
      }
      
      // Normal user profile loading
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('user_id', user.id)
         .maybeSingle();

      console.log('Profile query result:', { profile, profileError });

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      if (!profile) {
        // User profile doesn't exist, create it manually
        console.log('No user profile found, creating one...');
        
        try {
          // First create a vendor for the user
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
              name: user.user_metadata?.company_name || 'Meine Firma',
              slug: `${(user.user_metadata?.company_name || 'meine-firma').toLowerCase().replace(/\s+/g, '-')}-${user.id.substring(0, 8)}`,
              is_active: true
            })
            .select()
            .single();

          if (vendorError) {
            console.error('Error creating vendor:', vendorError);
            return;
          }

          // Then create the user profile
          const { data: newProfile, error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              vendor_id: newVendor.id,
              is_owner: true,
              role: 'admin',
              first_name: user.user_metadata?.first_name,
              last_name: user.user_metadata?.last_name
            })
            .select(`
              *,
              vendor:vendors(*)
            `)
            .single();

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            return;
          }

          // Create default company settings
          await supabase
            .from('company_settings')
            .insert({
              user_id: user.id,
              vendor_id: newVendor.id,
              name: user.user_metadata?.company_name || 'Meine Firma',
              email: user.email,
              default_tax_rate: 8.1,
              default_due_days: 30,
              invoice_number_format: 'F-{YYYY}-{MM}-{###}'
            });

          setUserProfile(newProfile);
          setVendor(newProfile.vendor);
        } catch (error) {
          console.error('Error creating profile and vendor:', error);
        }
      } else {
        console.log('Profile found:', profile);
        setUserProfile(profile);
        setVendor(profile.vendor);
      }
    } catch (error) {
      console.error('Error in refreshVendorData:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVendor = async (data: Partial<Vendor>) => {
    if (!vendor) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .update(data)
        .eq('id', vendor.id);

      if (error) throw error;

      setVendor(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('user_id', user?.id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshVendorData();
  }, [user, isImpersonating, impersonatedTenant]);

  const value: VendorContextType = {
    vendor,
    userProfile,
    loading,
    isOwner: userProfile?.is_owner || false,
    refreshVendorData,
    updateVendor,
    updateProfile,
  };

  return (
    <VendorContext.Provider value={value}>
      {children}
    </VendorContext.Provider>
  );
}

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
}