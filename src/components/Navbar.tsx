import React from 'react';
import { Link } from 'react-router-dom';
import { Store, PlusCircle, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Navbar = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-purple-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Store className="h-8 w-8" />
            <span className="text-xl font-bold">UniHive</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/new-listing" className="flex items-center space-x-1 hover:text-purple-200">
              <PlusCircle className="h-5 w-5" />
              <span>Sell</span>
            </Link>
            <Link to="/profile" className="hover:text-purple-200">
              <User className="h-5 w-5" />
            </Link>
            <button onClick={handleLogout} className="hover:text-purple-200">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};