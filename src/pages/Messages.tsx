import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Chat, Message, Product, Profile } from '../types';

interface MessagesProps {
  session: Session;
}

interface ChatWithDetails extends Chat {
  product: Product;
  otherUser: Profile;
}

export const Messages: React.FC<MessagesProps> = ({ session }) => {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all chats for the current user
  useEffect(() => {
    async function fetchChats() {
      try {
        setLoading(true);
        setError('');

        // Get all chats where the user is either buyer or seller
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Fetch additional details for each chat
          const chatsWithDetails = await Promise.all(
            data.map(async (chat) => {
              // Determine if user is buyer or seller
              const isUserBuyer = chat.buyer_id === session.user.id;
              const otherUserId = isUserBuyer ? chat.seller_id : chat.buyer_id;

              // Fetch product details
              const { data: productData } = await supabase
                .from('products')
                .select('*')
                .eq('id', chat.product_id)
                .single();

              // Fetch other user's profile
              const { data: userData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherUserId)
                .single();

              return {
                ...chat,
                product: productData || null,
                otherUser: userData || null
              };
            })
          );

          setChats(chatsWithDetails.filter(chat => chat.product && chat.otherUser));
          
          // If there are chats and none is selected, select the first one
          if (chatsWithDetails.length > 0 && !selectedChat) {
            setSelectedChat(chatsWithDetails[0]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching chats:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchChats();
    
    // Set up real-time subscription for new chats
    const chatSubscription = supabase
      .channel('public:chats')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats',
        filter: `buyer_id=eq.${session.user.id}|seller_id=eq.${session.user.id}`
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [session.user.id]);

  // Fetch messages for the selected chat
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChat) return;

      try {
        setLoading(true);
        setError('');

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', selectedChat.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();

    // Set up real-time subscription for new messages
    const messageSubscription = supabase
      .channel(`public:messages:${selectedChat?.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${selectedChat?.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setSendingMessage(true);
      setError('');

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: session.user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleChatSelect = (chat: ChatWithDetails) => {
    setSelectedChat(chat);
  };

  const handleStatusChange = async (status: 'accepted' | 'rejected') => {
    if (!selectedChat) return;

    try {
      setLoading(true);
      setError('');

      const { error } = await supabase
        .from('chats')
        .update({ status })
        .eq('id', selectedChat.id);

      if (error) throw error;

      // Update the local state
      setSelectedChat({
        ...selectedChat,
        status
      });

      // Update the chat in the chats list
      setChats(chats.map(chat => 
        chat.id === selectedChat.id ? { ...chat, status } : chat
      ));
    } catch (error: any) {
      console.error('Error updating chat status:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Messages</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          Error: {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex h-[70vh]">
          {/* Chat List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            {loading && chats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet</p>
              </div>
            ) : (
              <div>
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-purple-50 ${
                      selectedChat?.id === chat.id ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => handleChatSelect(chat)}
                  >
                    <div className="flex items-start">
                      <img
                        src={chat.product.image_url}
                        alt={chat.product.title}
                        className="w-12 h-12 object-cover rounded-md mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {chat.product.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {chat.otherUser.full_name}
                        </p>
                        <div className="flex items-center mt-1">
                          {chat.status === 'pending' && (
                            <div className="flex items-center text-yellow-600 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </div>
                          )}
                          {chat.status === 'accepted' && (
                            <div className="flex items-center text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accepted
                            </div>
                          )}
                          {chat.status === 'rejected' && (
                            <div className="flex items-center text-red-600 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(chat.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="w-2/3 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <img
                        src={selectedChat.product.image_url}
                        alt={selectedChat.product.title}
                        className="w-10 h-10 object-cover rounded-md mr-3"
                      />
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                          {selectedChat.product.title}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {selectedChat.otherUser.full_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status actions for seller */}
                  {selectedChat.seller_id === session.user.id && selectedChat.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange('accepted')}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange('rejected')}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Banner */}
                {selectedChat.status === 'pending' && (
                  <div className="bg-yellow-50 p-3 text-center text-yellow-700 text-sm">
                    {selectedChat.seller_id === session.user.id
                      ? "This buyer is interested in your product. Accept to start chatting."
                      : "Waiting for the seller to accept your request."}
                  </div>
                )}

                {selectedChat.status === 'rejected' && (
                  <div className="bg-red-50 p-3 text-center text-red-700 text-sm">
                    {selectedChat.seller_id === session.user.id
                      ? "You declined this request."
                      : "The seller declined your request."}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedChat.status === 'accepted' ? (
                    messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender_id === session.user.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isOwnMessage
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p>{message.content}</p>
                              <p className={`text-xs mt-1 ${isOwnMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        {selectedChat.status === 'pending'
                          ? "You'll be able to chat once the request is accepted."
                          : "This request was declined. No messages can be sent."}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {selectedChat.status === 'accepted' && (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};