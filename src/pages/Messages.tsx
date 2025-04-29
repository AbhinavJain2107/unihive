import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Chat, Message, Product, Profile } from '../types';

interface MessagesProps {
  session: Session;
}

interface ChatWithDetails extends Chat {
  product: Product | null;
  otherUser: Profile | null;
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

        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const chatsWithDetails = await Promise.all(
            data.map(async (chat) => {
              const isUserBuyer = chat.buyer_id === session.user.id;
              const otherUserId = isUserBuyer ? chat.seller_id : chat.buyer_id;

              const { data: productData } = await supabase
                .from('products')
                .select('*')
                .eq('id', chat.product_id)
                .single();

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

          const validChats = chatsWithDetails.filter(chat => chat.product && chat.otherUser);
          setChats(validChats);

          if (validChats.length > 0 && !selectedChat) {
            setSelectedChat(validChats[0]);
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

    const chatSubscription = supabase
      .channel('chats-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
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

    const messageSubscription = supabase
      .channel('messages-listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.chat_id === selectedChat?.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [selectedChat]);

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

      setSelectedChat({
        ...selectedChat,
        status
      });

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
          <div className="w-1/3 border-r overflow-y-auto">
            {loading && chats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`p-4 cursor-pointer hover:bg-purple-50 ${selectedChat?.id === chat.id ? 'bg-purple-50' : ''}`}
                >
                  <div className="flex items-start">
                    <img src={chat.product?.image_url || ''} alt={chat.product?.title || 'Product'} className="w-12 h-12 object-cover rounded mr-3" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.product?.title || 'Untitled'}</p>
                      <p className="text-xs text-gray-500 truncate">{chat.otherUser?.full_name ?? 'Unknown User'}</p>
                      <div className="flex items-center text-xs mt-1">
                        {chat.status === 'pending' && (
                          <div className="flex items-center text-yellow-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </div>
                        )}
                        {chat.status === 'accepted' && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Accepted
                          </div>
                        )}
                        {chat.status === 'rejected' && (
                          <div className="flex items-center text-red-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(chat.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Window */}
          <div className="w-2/3 flex flex-col">
            {selectedChat ? (
              <>
                <div className="flex items-center p-4 border-b">
                  <img src={selectedChat.product?.image_url || ''} alt="" className="w-10 h-10 object-cover rounded mr-3" />
                  <div>
                    <h2 className="font-semibold">{selectedChat.product?.title || 'Untitled'}</h2>
                    <p className="text-sm text-gray-500">{selectedChat.otherUser?.full_name ?? 'Unknown User'}</p>
                  </div>
                  {selectedChat.seller_id === session.user.id && selectedChat.status === 'pending' && (
                    <div className="ml-auto flex space-x-2">
                      <button onClick={() => handleStatusChange('accepted')} className="px-3 py-1 bg-green-100 text-green-700 rounded flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </button>
                      <button onClick={() => handleStatusChange('rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded flex items-center text-sm">
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {(selectedChat.status === 'pending' || selectedChat.status === 'rejected') && (
                  <div className={`p-3 text-center text-sm ${selectedChat.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    {selectedChat.status === 'pending'
                      ? selectedChat.seller_id === session.user.id
                        ? "This buyer is interested in your product. Accept to start chatting."
                        : "Waiting for the seller to accept your request."
                      : selectedChat.seller_id === session.user.id
                        ? "You declined this request."
                        : "The seller declined your request."
                    }
                  </div>
                )}

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {selectedChat.status === 'accepted' ? (
                    messages.length === 0 ? (
                      <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
                    ) : (
                      messages.map(msg => {
                        const isOwn = msg.sender_id === session.user.id;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-lg ${isOwn ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                              <p>{msg.content}</p>
                              <p className="text-xs mt-1">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      {selectedChat.status === 'pending'
                        ? "You'll be able to chat once accepted."
                        : "This request was declined."}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {selectedChat.status === 'accepted' && (
                  <form onSubmit={handleSendMessage} className="p-4 border-t flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sendingMessage}
                      className="flex-1 rounded border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                    />
                    <button type="submit" disabled={!newMessage.trim() || sendingMessage} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700">
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
