import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { WelcomeBanner } from './components/WelcomeBanner';
import { AdminPortal } from './pages/AdminPortal';
import { ProductCard } from './components/ProductCard';
import type { Product } from './types';

function App() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'user' | 'admin'>('user');

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkIfAdmin(session.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkIfAdmin(session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfAdmin = (email: string | undefined) => {
    if (email) {
      // Check if the email is the specific admin email
      setIsAdmin(email === '21bcs6987@cuchd.in');
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'user' ? 'admin' : 'user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-purple-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <HashRouter>
      {!session ? (
        <Login />
      ) : isAdmin && viewMode === 'admin' ? (
        <div>
          <AdminPortal session={session} />
          <button 
            onClick={toggleViewMode}
            className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Switch to User View
          </button>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <WelcomeBanner />
          {isAdmin && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="bg-purple-100 border-l-4 border-purple-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-purple-700">
                      You have admin privileges.{' '}
                      <button 
                        onClick={toggleViewMode}
                        className="font-medium text-purple-700 underline hover:text-purple-600"
                      >
                        Switch to Admin Portal
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/new-listing" element={<NewListing session={session} />} />
              <Route path="/profile" element={<Profile session={session} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </HashRouter>
  );
}

const ProductList = () => {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setProducts(data || []);
      } catch (error: any) {
        console.error('Error fetching products:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        Error loading products: {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="bg-purple-50 p-8 rounded-lg inline-block">
          <p className="text-lg text-gray-600 mb-4">No products listed yet</p>
          <p className="text-sm text-gray-500">Be the first to sell something!</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Available Items</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

interface NewListingProps {
  session: Session;
}

const NewListing: React.FC<NewListingProps> = ({ session }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [condition, setCondition] = React.useState<'new' | 'like-new' | 'good' | 'fair'>('new');
  const [imageUrl, setImageUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !price || !category || !imageUrl) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const newProduct = {
        title,
        description,
        price: parseFloat(price),
        category,
        condition,
        image_url: imageUrl,
        seller_id: session.user.id,
      };

      const { error } = await supabase.from('products').insert(newProduct);

      if (error) {
        throw error;
      }

      setSuccess('Product listed successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setCondition('new');
      setImageUrl('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Listing</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title*
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
            placeholder="e.g., Textbook for Computer Science"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description*
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
            placeholder="Describe your item in detail"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹)*
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
              placeholder="e.g., 500"
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category*
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
              required
            >
              <option value="" disabled>Select a category</option>
              <option value="Textbooks">Textbooks</option>
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Clothing">Clothing</option>
              <option value="Sports">Sports Equipment</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['new', 'like-new', 'good', 'fair'] as const).map((cond) => (
              <div key={cond} className="flex items-center">
                <input
                  type="radio"
                  id={cond}
                  name="condition"
                  value={cond}
                  checked={condition === cond}
                  onChange={() => setCondition(cond)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor={cond} className="ml-2 text-sm text-gray-700 capitalize">
                  {cond.replace('-', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL*
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
            placeholder="https://example.com/image.jpg"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Provide a URL to an image of your item. You can use image hosting services like Imgur or Unsplash.
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {loading ? 'Creating Listing...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
};

interface ProfileProps {
  session: Session;
}

const Profile: React.FC<ProfileProps> = ({ session }) => {
  const [profile, setProfile] = React.useState<{
    id: string;
    full_name: string;
    course: string;
    avatar_url?: string;
  } | null>(null);
  
  const [loading, setLoading] = React.useState(true);
  const [fullName, setFullName] = React.useState('');
  const [course, setCourse] = React.useState('');
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.warn(error);
        } else if (data) {
          setProfile(data);
          setFullName(data.full_name || '');
          setCourse(data.course || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [session]);

  async function updateProfile() {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      if (!fullName || !course) {
        setError('Please fill all required fields');
        return;
      }

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', session.user.id)
        .single();

      let error;
      
      if (!existingProfile) {
        // If profile doesn't exist, we need to add username field for first creation
        const username = session.user.email?.split('@')[0] || `user_${Date.now()}`;
        
        const { error: insertError } = await supabase.from('profiles').insert({
          id: session.user.id,
          username,
          full_name: fullName,
          course,
          created_at: new Date().toISOString(),
        });
        
        error = insertError;
      } else {
        // If profile exists, just update it
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            course,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
          
        error = updateError;
      }

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully!');
        setProfile(prev => ({
          ...prev!,
          full_name: fullName,
          course,
        }));
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Profile</h2>
      
      <div className="mb-4 p-4 bg-purple-50 rounded-lg">
        <p className="text-sm text-gray-600">Email</p>
        <p className="font-medium">{session.user.email}</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-purple-100 mb-6">
        <h3 className="text-xl font-semibold text-purple-700 mb-4">Profile Details</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="text-lg font-medium">{profile?.full_name || 'Not set'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Course</p>
            <p className="text-lg">{profile?.course || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-white p-6 rounded-lg border border-purple-100">
        <h3 className="text-xl font-semibold text-purple-700 mb-4">Update Profile</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name*
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
            placeholder="Your full name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course*
          </label>
          <input
            type="text"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
            placeholder="e.g., B.Tech CSE"
          />
        </div>
        
        <button
          onClick={updateProfile}
          disabled={updating}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </div>
    </div>
  );
};

export default App;