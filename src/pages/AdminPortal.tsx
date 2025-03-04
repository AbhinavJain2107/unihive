import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserPlus, Shield, ShieldOff, Trash, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Admin, Profile, Product } from '../types';

interface AdminPortalProps {
  session: Session;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ session }) => {
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [admins, setAdmins] = useState<(Admin & { profile?: Profile })[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<(Product & { seller?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'admins'>('users');

  useEffect(() => {
    checkMasterAdmin();
    fetchAdmins();
    fetchUsers();
    fetchProducts();
  }, [session.user.id]);

  const checkMasterAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('is_master')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking master admin status:', error);
        setIsMasterAdmin(false);
        return;
      }
      
      setIsMasterAdmin(data?.is_master || false);
    } catch (error: any) {
      console.error('Error checking master admin status:', error);
      setIsMasterAdmin(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile details for each admin
      const adminsWithProfiles = await Promise.all(
        (data || []).map(async (admin) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', admin.id)
            .single();

          return {
            ...admin,
            profile: profileData || undefined
          };
        })
      );

      setAdmins(adminsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller details for each product
      const productsWithSellers = await Promise.all(
        (data || []).map(async (product) => {
          const { data: sellerData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', product.seller_id)
            .single();

          return {
            ...product,
            seller: sellerData || undefined
          };
        })
      );

      setProducts(productsWithSellers);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;

    try {
      setAddingAdmin(true);
      setError('');
      setSuccess('');

      // Extract username from email
      const emailParts = newAdminEmail.split('@');
      const username = emailParts[0];
      
      if (!username) {
        setError('Invalid email format');
        return;
      }

      // First, find the user by username
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (userError) {
        console.error('Error finding user:', userError);
        setError(`User with email ${newAdminEmail} not found`);
        return;
      }

      if (!userData) {
        setError(`User with email ${newAdminEmail} not found`);
        return;
      }

      // Check if user is already an admin
      const { data: existingAdmin, error: adminCheckError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userData.id)
        .single();

      if (existingAdmin) {
        setError('This user is already an admin');
        return;
      }

      // Add user as admin
      const { error: insertError } = await supabase
        .from('admins')
        .insert({
          id: userData.id,
          is_master: false,
          created_by: session.user.id
        });

      if (insertError) throw insertError;

      setSuccess(`Admin ${newAdminEmail} added successfully`);
      setNewAdminEmail('');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      setError(error.message);
    } finally {
      setAddingAdmin(false);
    }
  };

  const handlePromoteAdmin = async (adminId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('admins')
        .update({ is_master: true })
        .eq('id', adminId);

      if (error) throw error;

      setSuccess('Admin promoted to master admin successfully');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error promoting admin:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteAdmin = async (adminId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Check if this is the last master admin
      const masterAdmins = admins.filter(admin => admin.is_master);
      if (masterAdmins.length === 1 && masterAdmins[0].id === adminId) {
        setError('Cannot demote the last master admin');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('admins')
        .update({ is_master: false })
        .eq('id', adminId);

      if (error) throw error;

      setSuccess('Master admin demoted to regular admin successfully');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error demoting admin:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Check if this is a master admin
      const admin = admins.find(a => a.id === adminId);
      if (admin?.is_master) {
        // Check if this is the last master admin
        const masterAdmins = admins.filter(a => a.is_master);
        if (masterAdmins.length === 1) {
          setError('Cannot remove the last master admin');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      setSuccess('Admin removed successfully');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setSuccess('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">UniHive Admin Portal</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'admins'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Admins
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">All Users</h2>
                {loading && users.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                    <p className="mt-2 text-gray-600">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-gray-500">No users found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Course
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {/* Email would be fetched from auth.users but we don't have direct access */}
                              {user.username}@cuchd.in
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.course}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at || '').toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">All Products</h2>
                {loading && products.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                    <p className="mt-2 text-gray-600">Loading products...</p>
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-gray-500">No products found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seller
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Listed
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <img className="h-10 w-10 rounded-full object-cover" src={product.image_url} alt="" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                  <div className="text-sm text-gray-500">{product.condition.replace('-', ' ')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">₹{product.price}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{product.category}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{product.seller?.full_name || 'Unknown'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(product.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admins' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Admin Management</h2>
                
                {isMasterAdmin && (
                  <div className="mb-6 bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-800 mb-2">Add New Admin</h3>
                    <div className="flex">
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="Enter user email (e.g., 21bcs6987@cuchd.in)"
                        className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                      />
                      <button
                        onClick={handleAddAdmin}
                        disabled={addingAdmin || !newAdminEmail}
                        className="bg-purple-600 text-white px-4 py-2 rounded-r-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 flex items-center"
                      >
                        {addingAdmin ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <>
                            <UserPlus className="h-5 w-5 mr-1" />
                            Add Admin
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {loading && admins.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                    <p className="mt-2 text-gray-600">Loading admins...</p>
                  </div>
                ) : admins.length === 0 ? (
                  <p className="text-gray-500">No admins found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Added On
                          </th>
                          {isMasterAdmin && (
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {admins.map((admin) => (
                          <tr key={admin.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{admin.profile?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{admin.profile?.username || 'Unknown'}@cuchd.in</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                admin.is_master ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {admin.is_master ? 'Master Admin' : 'Admin'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(admin.created_at).toLocaleDateString()}
                            </td>
                            {isMasterAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {!admin.is_master ? (
                                    <button
                                      onClick={() => handlePromoteAdmin(admin.id)}
                                      className="text-purple-600 hover:text-purple-900"
                                      title="Promote to Master Admin"
                                    >
                                      <Shield className="h-5 w-5" />
                                    </button>
                                  ) : admin.id !== session.user.id && (
                                    <button
                                      onClick={() => handleDemoteAdmin(admin.id)}
                                      className="text-orange-600 hover:text-orange-900"
                                      title="Demote to Regular Admin"
                                    >
                                      <ShieldOff className="h-5 w-5" />
                                    </button>
                                  )}
                                  
                                  {admin.id !== session.user.id && (
                                    <button
                                      onClick={() => handleRemoveAdmin(admin.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Remove Admin"
                                    >
                                      <Trash className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};