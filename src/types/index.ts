export type OrderStatus =
  | "PENDING_PACK"
  | "PACKED"
  | "SHIPPED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus = "PAID" | "COD";
export type SalePaymentMethod = "CASH" | "TRANSFER" | "OTHER";
export type SaleStatus = "ACTIVE" | "CANCELLED" | "RETURNED";
export type DashboardChannel = "ALL" | "ONLINE" | "POS";

export type Member = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberTier = {
  id: string;
  name: string;
  minSpend: number;
  discountPercent: number;
  isActive: boolean;
};

export type MemberSummary = Member & {
  totalSpend: number;
  billCount: number;
  lastPurchaseAt?: Date | null;
  tier?: MemberTier | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string | null;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  unit?: string | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
  lowStockAlert: number;
};

export type OrderItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  category?: string | null;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  imageUrl?: string | null;
};

export type Order = {
  id: string;
  orderNo?: string | null;
  customerName: string;
  phone: string;
  province: string;
  city: string;
  shippingCompany: string;
  pickupBranch?: string | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  note?: string | null;
  returnReason?: string | null;
  returnNote?: string | null;
  returnedAt?: Date | null;
  restockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SaleItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  category?: string | null;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  imageUrl?: string | null;
};

export type Sale = {
  id: string;
  saleNo?: string | null;
  cashierId?: string | null;
  cashierName?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  memberPhone?: string | null;
  memberTierName?: string | null;
  memberDiscount?: number | null;
  status?: SaleStatus;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  discount: number;
  netAmount: number;
  paymentMethod: SalePaymentMethod;
  receivedAmount?: number | null;
  changeAmount?: number | null;
  voidReason?: string | null;
  voidNote?: string | null;
  voidedAt?: Date | null;
  restockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PosPaymentSummary = {
  cashAmount: number;
  transferAmount: number;
  otherAmount: number;
  totalAmount: number;
  billCount: number;
  profit: number;
};

export type DailyClosing = {
  id: string;
  closingNo?: string | null;
  date: string;
  cashAmount: number;
  transferAmount: number;
  otherAmount: number;
  totalAmount: number;
  billCount: number;
  profit: number;
  countedCash: number;
  cashDifference: number;
  note?: string | null;
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyChartPoint = {
  date: string;
  sales: number;
  profit: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  totalAmount: number;
};

export type SalesBreakdown = {
  onlineSales: number;
  onlineProfit: number;
  posSales: number;
  posProfit: number;
  totalSales: number;
  totalProfit: number;
};

export type DashboardRecentItem = {
  id: string;
  type: "ONLINE" | "POS";
  title: string;
  description: string;
  amount: number;
  status?: OrderStatus;
  createdAt: Date;
};

export type SoldProductSummary = {
  productId: string;
  variantId?: string | null;
  sku: string;
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  quantity: number;
  latestPrice: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
  lastSoldAt: Date;
};

export type DashboardStats = {
  channel: DashboardChannel;
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  monthSales: number;
  monthProfit: number;
  todayBreakdown: SalesBreakdown;
  monthBreakdown: SalesBreakdown;
  dailyChart: DailyChartPoint[];
  lowStockProducts: Product[];
  topProducts: TopProduct[];
  recentOrders: Order[];
  recentSales: Sale[];
  recentActivity: DashboardRecentItem[];
  tasks: {
    pendingPackOrders: number;
    codToShipOrders: number;
    outOfStockVariants: number;
    lowStockVariants: number;
    todayClosingDone: boolean;
  };
};

export type StoreSettings = {
  storeName: string;
  storeSubtitle: string;
  storeNote: string;
  logoUrl: string | null;
  posReceiptName: string;
  posReceiptSubtitle: string;
  posReceiptNote: string;
  posReceiptLogoUrl: string | null;
  orderBillSize: "LABEL_100X150" | "A4";
  posReceiptSize: "POS_80MM" | "POS_58MM";
  shippingCompanies: string[];
};
