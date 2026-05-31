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
  cost: number | null
  stock: number
  category_id: string | null
  images: string[]
  videos: string[]
  tags: string[]
  is_active: boolean
  is_offer: boolean
  wix_id: string | null
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
  customer_email: string | null
  customer_name: string | null
  wix_order_number: number | null
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  subtotal: number
  shipping_cost: number
  discount: number
  coupon_code: string | null
  openpay_transaction_id: string | null
  tracking_number: string | null
  shipping_address: Address | null
  idempotency_key: string | null
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

export type CouponType = 'percentage' | 'fixed' | 'free_shipping'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  min_purchase: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

/** Cupón aplicado en el carrito (subset validado + descuento calculado) */
export interface AppliedCoupon {
  code: string
  type: CouponType
  value: number
  discount: number
  freeShipping: boolean
}

/** Archivo en la galería de medios (Supabase Storage, bucket `images`) */
export interface MediaItem {
  /** Ruta completa dentro del bucket, p.ej. "products/abc_123.jpg" */
  path: string
  /** Nombre del archivo */
  name: string
  /** Carpeta contenedora, p.ej. "products" */
  folder: string
  /** URL pública */
  url: string
  /** 'image' | 'video' según extensión */
  kind: 'image' | 'video'
  /** Tamaño en bytes (si está disponible) */
  size: number | null
  /** Fecha de creación ISO (si está disponible) */
  created_at: string | null
}
