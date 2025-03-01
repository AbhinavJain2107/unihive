import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600">
            {product.title}
          </h3>
          <p className="text-2xl font-bold text-purple-600">₹{product.price}</p>
          <p className="text-sm text-gray-500 mt-1">{product.category}</p>
          <div className="mt-2">
            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
              {product.condition}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};