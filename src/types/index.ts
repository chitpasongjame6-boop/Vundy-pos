export type OrderStatus =
  | "PENDING_PACK"
  | "PACKED"
  | "SHIPPED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus = "PAID" | "COD";
export type SalePaymentMethod = "CASH" | "TRANSFER" | "OTHER" | "SPLIT";
export type SaleStatus = "ACTIVE" | "PARTIALLY_RETURNED" | "CANCELLED" | "RETURNED";
export type ShiftStatus = "OPEN" | "CLOSED";
export type CashMovementType = "CASH_IN" | "CASH_OUT";
export type StockMovementType =
  | "OPENING"
  | "SALE"
  | "SALE_RETURN"
  | "PURCHASE_RECEIPT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DAMAGED"
  | "EXCHANGE";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
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
  catalogSource?: import("@/lib/product-catalog").CatalogAttribution | null;
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
  expiryDate?: string | null;
  purchaseCurrency?: "LAK" | "THB" | null;
  purchaseAmountMinor?: number | null;
  purchaseRate?: number | null;
};

export type ProductFormState = {
  ok: boolean | null;
  message: string;
};

export type Promotion = {
  id: string;
  name: string;
  kind: "FIXED_PRICE" | "PERCENT";
  value: number;
  targets: Array<{ productId: string; variantId: string }>;
  startsAt: Date | string;
  endsAt: Date | string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type PromotionInput = Pick<Promotion, "name" | "kind" | "value" | "targets" | "isActive"> & {
  id?: string;
  startsAt: string;
  endsAt: string;
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
  originalPrice?: number | null;
  promotionId?: string | null;
  promotionName?: string | null;
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
  payments?: SalePayment[];
  paymentReference?: string | null;
  receivedAmount?: number | null;
  changeAmount?: number | null;
  tenderCurrency?: "LAK" | "THB" | null;
  tenderAmountMinor?: number | null;
  exchangeRate?: number | null;
  taxRate?: number;
  taxAmount?: number;
  refundAmount?: number;
  returnedCost?: number;
  idempotencyKey?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  registerId?: string | null;
  registerName?: string | null;
  shiftId?: string | null;
  voidReason?: string | null;
  voidNote?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  voidedAt?: Date | null;
  restockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SalePayment = {
  method: Exclude<SalePaymentMethod, "SPLIT">;
  amount: number;
  reference?: string | null;
};

export type SaleReturnItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
};

export type SaleReturn = {
  id: string;
  returnNo: string;
  saleId: string;
  saleNo?: string | null;
  items: SaleReturnItem[];
  refundAmount: number;
  returnedCost: number;
  paymentMethod: SalePaymentMethod;
  reason: string;
  note?: string | null;
  processedById: string;
  processedByName: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  createdAt: Date;
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
  physicalCashLak?: number | null;
  cashThb?: number | null;
  countedThb?: number | null;
  differenceThb?: number | null;
  note?: string | null;
  closedById?: string | null;
  closedByName?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Branch = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Register = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CashShift = {
  id: string;
  shiftNo: string;
  branchId?: string | null;
  branchName?: string | null;
  registerId?: string | null;
  registerName?: string | null;
  cashierId: string;
  cashierName: string;
  status: ShiftStatus;
  openingCash: number;
  openingThb?: number | null;
  expectedThb?: number | null;
  countedThb?: number | null;
  differenceThb?: number | null;
  expectedCash?: number | null;
  countedCash?: number | null;
  cashDifference?: number | null;
  note?: string | null;
  openedAt: Date;
  closedAt?: Date | null;
  closedById?: string | null;
  closedByName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CashMovement = {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  currency?: "LAK" | "THB" | null;
  source?: string | null;
  referenceId?: string | null;
  reason: string;
  note?: string | null;
  userId: string;
  userName: string;
  createdAt: Date;
};

export type Expense = {
  id: string;
  expenseNo: string;
  category: string;
  amount: number;
  paymentMethod: SalePaymentMethod;
  description: string;
  note?: string | null;
  shiftId?: string | null;
  userId: string;
  userName: string;
  expenseAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type StockMovement = {
  id: string;
  productId: string;
  variantId?: string | null;
  sku: string;
  productName: string;
  variantName?: string | null;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitCost?: number | null;
  purchaseCurrency?: "LAK" | "THB" | null;
  purchaseAmountMinor?: number | null;
  purchaseRate?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  reason?: string | null;
  note?: string | null;
  userId: string;
  userName: string;
  branchId?: string | null;
  createdAt: Date;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityNo?: string | null;
  description: string;
  userId: string;
  userName: string;
  userRole: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  purchaseCurrency?: "LAK" | "THB" | null;
  purchaseAmountMinor?: number | null;
  purchaseRate?: number | null;
};

export type PurchaseOrder = {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  note?: string | null;
  orderedAt?: Date | null;
  receivedAt?: Date | null;
  createdById: string;
  createdByName: string;
  receivedById?: string | null;
  receivedByName?: string | null;
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
    expiryAlerts: number;
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
  taxEnabled: boolean;
  taxRate: number;
  taxId: string;
  receiptAddress: string;
  defaultBranchName: string;
  defaultRegisterName: string;
  staffMaxDiscountPercent: number;
  requireShiftForSale: boolean;
  thbEnabled?: boolean;
  thbPaymentRate?: number;
  thbPurchaseRate?: number;
};
