// Storage cleanup utility to fix Supabase auth localStorage issues
export const cleanupSupabaseStorage = () => {
  try {
    // Get all localStorage keys that start with Supabase auth patterns
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase') ||
      key.includes('auth-token')
    );

    console.log('Found Supabase keys to clean:', supabaseKeys);

    // Check each key for corruption (objects stored as strings)
    supabaseKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && value.startsWith('[object Object]')) {
          console.log(`Removing corrupted key: ${key}`);
          localStorage.removeItem(key);
        } else if (value && value !== 'null' && value !== 'undefined') {
          // Try to parse to check if it's valid JSON
          JSON.parse(value);
        }
      } catch (error) {
        console.log(`Removing invalid JSON key: ${key}`);
        localStorage.removeItem(key);
      }
    });

    console.log('Supabase storage cleanup completed');
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
};

// Auto-cleanup on import
if (typeof window !== 'undefined') {
  cleanupSupabaseStorage();
}