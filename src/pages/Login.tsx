import React, { useState } from 'react';
import { Store, Settings, KeyRound } from 'lucide-react';
import { supabase, isValidCUEmail } from '../lib/supabase';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signup' | 'signin' | 'forgot'>('signin');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    // Skip email validation for admin login
    if (!isAdminLogin && !isValidCUEmail(email)) {
      setError('Please use your @cuchd.in email address');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup' && !isAdminLogin) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            // Disable email verification requirement
            data: {
              email_confirmed: true
            }
          },
        });

        if (error) throw error;
        
        // Show success message for signup
        setSuccessMessage('Signup successful! You can now sign in.');
        setMode('signin');
      } else if (mode === 'forgot') {
        // Handle forgot password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (error) throw error;
        
        setSuccessMessage('Password reset instructions have been sent to your email.');
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminLogin = () => {
    setIsAdminLogin(!isAdminLogin);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center">
          <div className="flex justify-center mb-3">
            <Store className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold">UniHive</h1>
          <p className="mt-1 text-purple-100">
            The marketplace exclusively for Chandigarh University students
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between mb-6">
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 text-center font-medium border-b-2 ${
                mode === 'signin' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 text-center font-medium border-b-2 ${
                mode === 'signup' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                setMode('forgot');
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 text-center font-medium border-b-2 ${
                mode === 'forgot' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Forgot
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              <span>{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 text-green-700 p-3 rounded mb-4">
              <span>{successMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder={isAdminLogin ? "Admin email" : "your.name@cuchd.in"}
                required
              />
            </div>
            
            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? (
                'Processing...'
              ) : mode === 'signin' ? (
                'Sign In'
              ) : mode === 'signup' ? (
                'Sign Up'
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleAdminLogin}
              className="text-sm text-gray-600 hover:text-purple-600 flex items-center justify-center mx-auto"
            >
              <Settings className="h-4 w-4 mr-1" />
              {isAdminLogin ? 'Student Login' : 'Admin Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};