import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, AlertTriangle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

interface NewListingProps {
  session: Session;
}

export const NewListing: React.FC<NewListingProps> = ({ session }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<'new' | 'like-new' | 'good' | 'fair'>('new');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Textbooks',
    'Electronics',
    'Furniture',
    'Clothing',
    'Sports Equipment',
    'Musical Instruments',
    'Stationery',
    'Lab Equipment',
    'Other'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const fileExt = file.name.split('.').pop();
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif'];
      if (!allowedExts.includes(fileExt?.toLowerCase() || '')) {
        setError('Only image files are allowed (jpg, jpeg, png, gif)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setUploading(true);

      // Upload file to Supabase Storage
      const fileName = `${Math.random().toString(36).substring(2)}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(`public/${fileName}`, file);

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(`public/${fileName}`);

      setImageUrl(publicUrlData.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Validate form
      if (!title || !description || !price || !category || !condition) {
        setError('Please fill in all required fields');
        return;
      }

      if (!imageUrl) {
        setError('Please upload an image');
        return;
      }

      // Parse price as number
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue <= 0) {
        setError('Please enter a valid price');
        return;
      }

      // Insert product into database
      const { data, error } = await supabase
        .from('products')
        .insert({
          title,
          description,
          price: priceValue,
          category,
          condition,
          image_url: imageUrl,
          seller_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect to product page
      navigate(`/product/${data.id}`);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to products
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <h1 className="text-2xl font-bold text-white">Create New Listing</h1>
          <p className="text-purple-100">Sell your items to other students</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 border-b border-red-100">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
              placeholder="e.g., Engineering Mathematics Textbook"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
              placeholder="Describe your item, including any details about its condition, features, etc."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                placeholder="e.g., 500"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                required
              >
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
              Condition *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                condition === 'new' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700'
              }`}>
                <input
                  type="radio"
                  name="condition"
                  value="new"
                  checked={condition === 'new'}
                  onChange={() => setCondition('new')}
                  className="sr-only"
                />
                <span>New</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                condition === 'like-new' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700'
              }`}>
                <input
                  type="radio"
                  name="condition"
                  value="like-new"
                  checked={condition === 'like-new'}
                  onChange={() => setCondition('like-new')}
                  className="sr-only"
                />
                <span>Like New</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                condition === 'good' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700'
              }`}>
                <input
                  type="radio"
                  name="condition"
                  value="good"
                  checked={condition === 'good'}
                  onChange={() => setCondition('good')}
                  className="sr-only"
                />
                <span>Good</span>
              </label>
              <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                condition === 'fair' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700'
              }`}>
                <input
                  type="radio"
                  name="condition"
                  value="fair"
                  checked={condition === 'fair'}
                  onChange={() => setCondition('fair')}
                  className="sr-only"
                />
                <span>Fair</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image *
            </label>
            {imageUrl ? (
              <div className="mt-2 relative">
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="h-64 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500"
                    >
                      <span>Upload an image</span>
                      <input
                        id="image-upload"
                        name="image-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                  {uploading && (
                    <div className="mt-2 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                      <span className="ml-2 text-sm text-gray-500">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Creating Listing...
                </>
              ) : (
                'Create Listing'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};