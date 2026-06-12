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
  shipping_cost: number | null
  stock: number
  manage_stock: boolean
  category_id: string | null
  images: string[]
  videos: string[]
  tags: string[]
  is_active: boolean
  is_offer: boolean
  sort_order: number
  wix_id: string | null
  created_at: string
  category?: Category | Pick<Category, 'id' | 'name' | 'slug'>
}

/** Campos mínimos para grillas/tarjetas — evita traer description HTML en listados */
export type ProductListItem = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'price'
  | 'compare_at_price'
  | 'manage_stock'
  | 'stock'
  | 'images'
  | 'is_active'
  | 'is_offer'
  | 'sort_order'
  | 'shipping_cost'
> & {
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null
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
  id?: string
  profile_id?: string
  alias?: string
  street: string
  numExterior?: string
  numInterior?: string
  referencias?: string
  colonia?: string
  municipio?: string
  city?: string          // campo legacy (órdenes Wix históricas)
  state: string
  zip?: string
  zip_code?: string      // campo legacy (órdenes Wix históricas)
  country: string
  phone?: string   // órdenes Wix migradas
  email?: string   // órdenes Wix migradas
  is_default?: boolean
}

export interface Order {
  id: string
  profile_id: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
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

export interface ProductOptionValue {
  id: string
  option_id: string
  value: string
  sort_order: number
}

export interface ProductOption {
  id: string
  product_id: string
  name: string
  sort_order: number
  values: ProductOptionValue[]
}

export interface CartItem {
  product: ProductListItem
  quantity: number
  /** Stable key: product.id + selected options (allows same product, diff variant) */
  cartKey: string
  selectedOptions?: Record<string, string>
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
