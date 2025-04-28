import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageCircle, AlertTriangle } from 'lucide-react';
import type { Product, Profile } from '../types';
import type { Session } from '@supabase/supabase-js';

interface ProductDetailProps {
  session: Session;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ session }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchProductDetails() {
      try {
        setLoading(true);
        setError('');

        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybesingle();

        if (productError) throw productError;
        if (!productData) throw new Error('Product not found');

        setProduct(productData);

        // Fetch seller details
        const { data: sellerData, error: sellerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', productData.seller_id)
          .maybesingle();

        if (sellerError) throw sellerError;
        setSeller(sellerData);

        // Check if user has already sent a request
        if (session.user.id !== productData.seller_id) {
          const { data: chatData, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .eq('product_id', id)
            .eq('buyer_id', session.user.id)
            .eq('seller_id', productData.seller_id)
            .maybesingle();

          if (!chatError && chatData) {
            setRequestSent(true);
            setRequestStatus(chatData.status as 'pending' | 'accepted' | 'rejected');
          }
        }
      } catch (error: any) {
        console.error('Error fetching product details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProductDetails();
  }, [id, session.user.id]);

  const handleBuyRequest = async () => {
    if (!product || !session.user.id) return;

    try {
      setSendingRequest(true);
      setError('');

      // Check if user is trying to buy their own product
      if (session.user.id === product.seller_id) {
        setError("You can't buy your own product");
        return;
      }

      // Create a new chat request
      const { data, error } = await supabase
        .from('chats')
        .insert({
          product_id: product.id,
          buyer_id: session.user.id,
          seller_id: product.seller_id,
          status: 'pending'
        })
        .select()
        .maybesingle();

      if (error) throw error;

      setRequestSent(true);
      setRequestStatus('pending');
    } catch (error: any) {
      console.error('Error sending buy request:', error);
      setError(error.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const goToChat = () => {
    navigate('/messages');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Error: {error}</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to products
          </button>
        </div>
      </div>
    );
  }

  if (!product || !seller) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Product not found</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to products
          </button>
        </div>
      </div>
    );
  }

  const isOwnProduct = session.user.id === product.seller_id;

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
        <div className="md:flex">
          <div className="md:w-1/2">
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-64 md:h-full object-cover"
            />
          </div>
          <div className="md:w-1/2 p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-gray-800">{product.title}</h1>
              <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded capitalize">
                {product.condition.replace('-', ' ')}
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-600 mt-2">₹{product.price}</p>
            <p className="text-sm text-gray-500 mt-1">Category: {product.category}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Description</h2>
              <p className="mt-2 text-gray-600">{product.description}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Seller Information</h2>
              <p className="mt-2 text-gray-600">{seller.full_name}</p>
              <p className="text-sm text-gray-500">{seller.course}</p>
            </div>
            
            <div className="mt-6">
              {isOwnProduct ? (
                <div className="bg-purple-50 p-4 rounded-md">
                  <p className="text-purple-700">This is your listing</p>
                </div>
              ) : requestSent ? (
                <div className="space-y-4">
                  {requestStatus === 'pending' && (
                    <div className="bg-yellow-50 p-4 rounded-md">
                      <p className="text-yellow-700">
                        Your buy request has been sent. Waiting for seller to accept.
                      </p>
                    </div>
                  )}
                  
                  {requestStatus === 'accepted' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-green-700">
                          Your buy request has been accepted! You can now chat with the seller.
                        </p>
                      </div>
                      <button
                        onClick={goToChat}
                        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Go to Chat
                      </button>
                    </div>
                  )}
                  
                  {requestStatus === 'rejected' && (
                    <div className="bg-red-50 p-4 rounded-md">
                      <p className="text-red-700">
                        Your buy request was declined by the seller.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleBuyRequest}
                  disabled={sendingRequest}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  {sendingRequest ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Request to Buy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
