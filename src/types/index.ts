// Shared TypeScript types for the application

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
export type OrderStatus = "PENDING" | "PAYMENT_PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUND_REQUESTED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  descriptionHtml?: string | null;
  price: number;
  comparePrice?: number | null;
  sku?: string | null;
  stock: number;
  images: string[];
  categoryId: string;
  isFeatured: boolean;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product: Pick<Product, "id" | "name" | "slug" | "price" | "images" | "stock">;
  variant?: { id: string; name: string; value: string; priceAdj: number } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  razorpayOrderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  errors?: Record<string, string[]>;
}
