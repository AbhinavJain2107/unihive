import React from 'react';
import { supabase } from '../lib/supabase';

export const WelcomeBanner: React.FC = () => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (data && data.full_name) {
            setUsername(data.full_name);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, []);

  if (loading) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold">
            {username ? `Welcome back, ${username}!` : 'Welcome to UniHive!'}
          </h2>
          <p className="mt-1 text-purple-100">
            The marketplace exclusively for Chandigarh University students
          </p>
        </div>
      </div>
    </div>
  );
};