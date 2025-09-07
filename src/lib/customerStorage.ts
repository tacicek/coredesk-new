import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/index";
import { useVendor } from "@/contexts/VendorContext";

class CustomerStorageService {
  async getAll(): Promise<Customer[]> {
    try {
      console.log('CustomerStorage: Loading customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading customers:', error);
        throw error;
      }

      console.log('CustomerStorage: Loaded customers:', data?.length || 0, 'customers');
      console.log('CustomerStorage: Raw data:', data);

      return data?.map(c => ({
        id: c.id,
        name: c.name,
        contactPerson: c.contact_person,
        contactGender: c.contact_gender as 'male' | 'female' | 'neutral' | undefined,
        email: c.email,
        phone: c.phone,
        address: c.address,
        taxNumber: c.tax_number,
        createdAt: c.created_at
      })) || [];
    } catch (error) {
      console.error('Error in customerStorage.getAll:', error);
      return [];
    }
  }

  async add(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's vendor ID
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.vendor_id) throw new Error('User vendor not found');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          contact_person: customer.contactPerson,
          contact_gender: customer.contactGender,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          tax_number: customer.taxNumber,
          vendor_id: profile.vendor_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        contactGender: data.contact_gender as 'male' | 'female' | 'neutral' | undefined,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxNumber: data.tax_number,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: updates.name,
          contact_person: updates.contactPerson,
          contact_gender: updates.contactGender,
          email: updates.email,
          phone: updates.phone,
          address: updates.address,
          tax_number: updates.taxNumber
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        contactGender: data.contact_gender as 'male' | 'female' | 'neutral' | undefined,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxNumber: data.tax_number,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      console.log('CustomerStorage: Attempting to delete customer with ID:', id);
      
      // Check if customer exists before deletion
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('CustomerStorage: Customer before deletion:', existingCustomer);

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('CustomerStorage: Delete error:', error);
        throw error;
      }
      
      console.log('CustomerStorage: Customer deleted successfully');
      
      // Verify deletion
      const { data: afterDelete } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
        
      console.log('CustomerStorage: Customer after deletion attempt:', afterDelete);
      
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        contactGender: data.contact_gender as 'male' | 'female' | 'neutral' | undefined,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxNumber: data.tax_number,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }
}

export const customerStorage = new CustomerStorageService();