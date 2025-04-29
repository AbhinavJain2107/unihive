import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Edit, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Profile as ProfileType, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

interface ProfileProps {
  session?: Session;
}

export const Profile: React.FC<ProfileProps> = ({ session }) => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [course, setCourse] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!session) return;
    
    getProfile();
    getUserProducts();
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      setError('');

      if (!session?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setCourse(data.course || '');
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserProducts = async () => {
    try {
      setLoadingProducts(true);
      
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserProducts(data || []);
    } catch (error: any) {
      console.error('Error loading user products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!session?.user) return;

      // Validate inputs
      if (!fullName.trim()) {
        setError('Full name is required');
        return;
      }

      if (!username.trim()) {
        setError('Username is required');
        return;
      }

      if (!course.trim()) {
        setError('Course is required');
        return;
      }

      // Check if username is already taken (if changed)
      if (username !== profile?.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', session.user.id)
          .single();

        if (existingUser) {
          setError('Username is already taken');
          return;
        }

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is the error code for "no rows returned"
          throw checkError;
        }
      }

      const updates = {
        id: session.user.id,
        full_name: fullName,
        username,
        course,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (error) throw error;

      setSuccess('Profile updated successfully');
      setProfile({ ...profile!, ...updates });
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="ml-4 text-2xl font-bold text-white">Your Profile</h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 border-b border-red-100">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 border-b border-green-100">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center text-sm font-medium ${
                editing ? 'text-red-600 hover:text-red-800' : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              {editing ? (
                <>Cancel</>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Profile
                </>
              )}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <input
                  type="text"
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  required
                />
              </div>
              
              <div className="pt-4">
                <button
                  onClick={updateProfile}
                  disabled={saving}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  <p className="mt-1 text-lg text-gray-800">{profile?.full_name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Username</h3>
                  <p className="mt-1 text-lg text-gray-800">@{profile?.username}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-lg text-gray-800">{session?.user?.email}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Course</h3>
                  <p className="mt-1 text-lg text-gray-800">{profile?.course}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Your Listings</h2>
        </div>

        <div className="p-6">
          {loadingProducts ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading your listings...</p>
            </div>
          ) : userProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">You haven't listed any products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
