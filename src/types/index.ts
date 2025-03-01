export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  seller_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  course: string;
}