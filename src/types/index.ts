export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  stock: number
  category_id: string | null
  images: string[]
  videos: string[]
  tags: string[]
  is_active: boolean
  created_at: string
  category?: Category
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface Address {
  id: string
  profile_id: string
  alias: string
  street: string
  city: string
  state: string
  zip_code: string
  country: string
  is_default: boolean
}

export interface Order {
  id: string
  profile_id: string | null
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  subtotal: number
  shipping_cost: number
  openpay_transaction_id: string | null
  shipping_address: Address | null
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  product?: Product
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_image: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}
