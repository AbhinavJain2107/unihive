import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Components
import { Navbar } from './components/Navbar';
import { WelcomeBanner } from './components/WelcomeBanner';

// Pages
import { Login } from './pages/Login';
import { Messages } from './pages/Messages';
import { ProductDetail } from './pages/ProductDetail';
import { AdminPortal } from './pages/AdminPortal';
import { HomePage } from './pages/HomePage';
import { NewListing } from './pages/NewListing';
import { Profile } from './pages/Profile';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkIfAdmin(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkIfAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfAdmin = async (userId: string) => {
    try {
      // First check if the profiles table has this user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', userId)
        .single();
      
      // If profile doesn't exist, create one
      if (profileError && profileError.code === 'PGRST116') {
        // Get user email
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email || '';
        const username = email.split('@')[0];
        
        // Create profile
        await supabase.from('profiles').insert({
          id: userId,
          username: username,
          full_name: username,
          course: 'Not specified',
        });

        console.log('Created new profile for user:', username);
      }
      
      // Special case for master admin email
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email === '21bcs6987@cuchd.in') {
        console.log('Master admin detected');
        setIsAdmin(true);
        
        // Ensure this user is in the admins table with master privileges
        const { error: adminError } = await supabase
          .from('admins')
          .upsert({
            id: userId,
            is_master: true,
            created_by: userId,
            created_at: new Date().toISOString()
          });
          
        if (adminError) {
          console.error('Error ensuring master admin status:', adminError);
        }
        
        return;
      }
      
      // Now check if user is admin
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('User is not an admin');
        } else {
          console.error('Error checking admin status:', error);
        }
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
      
      // Special case for master admin
      if (data && data.is_master) {
        console.log('User is a master admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading UniHive...</p>
        </div>
      </div>
    );
  }

  return (
    <Router basename="/unihive">
      <div className="min-h-screen bg-gray-100">
        {session ? (
          <>
            <Navbar isAdmin={isAdmin} />
            <Routes>
              <Route path="/" element={
                <>
                  <WelcomeBanner />
                  <HomePage session={session} />
                </>
              } />
              <Route path="/product/:id" element={<ProductDetail session={session} />} />
              <Route path="/messages" element={<Messages session={session} />} />
              <Route path="/profile" element={<Profile session={session} />} />
              <Route path="/new-listing" element={<NewListing session={session} />} />
              {isAdmin && <Route path="/admin" element={<AdminPortal session={session} />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/*" element={<Login />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;