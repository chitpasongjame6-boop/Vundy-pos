import type { Order, Product } from "@/types";
import { calculateOrderTotals, productToOrderItem } from "@/lib/utils";

const now = new Date();
const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30);
const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 15);
const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 11, 0);

export const mockProducts: Product[] = [
  {
    id: "665000000000000000000001",
    name: "VL Coffee Premium",
    sku: "VL-CF-001",
    category: "ເຄື່ອງດື່ມ",
    costPrice: 90000,
    sellPrice: 150000,
    stock: 18,
    lowStockAlert: 5,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    variants: [
      {
        id: "665v00000000000000000101",
        name: "10ml",
        sku: "VL-CF-10",
        unit: "ml",
        costPrice: 30000,
        sellPrice: 55000,
        stock: 25,
        lowStockAlert: 5
      },
      {
        id: "665v00000000000000000102",
        name: "20ml",
        sku: "VL-CF-20",
        unit: "ml",
        costPrice: 55000,
        sellPrice: 95000,
        stock: 12,
        lowStockAlert: 4
      },
      {
        id: "665v00000000000000000103",
        name: "ຂວດເຕັມ",
        sku: "VL-CF-100",
        unit: "ຂວດ",
        costPrice: 90000,
        sellPrice: 150000,
        stock: 18,
        lowStockAlert: 5
      }
    ],
    createdAt: twoDaysAgo,
    updatedAt: todayMorning
  },
  {
    id: "665000000000000000000002",
    name: "VL Tea Original",
    sku: "VL-TE-002",
    category: "ເຄື່ອງດື່ມ",
    costPrice: 65000,
    sellPrice: 120000,
    stock: 4,
    lowStockAlert: 6,
    imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    variants: [
      {
        id: "665v00000000000000000201",
        name: "ມາດຕະຖານ",
        sku: "VL-TE-002",
        unit: "pcs",
        costPrice: 65000,
        sellPrice: 120000,
        stock: 4,
        lowStockAlert: 6
      }
    ],
    createdAt: twoDaysAgo,
    updatedAt: yesterday
  },
  {
    id: "665000000000000000000003",
    name: "VL Snack Box",
    sku: "VL-SN-003",
    category: "ອາຫານ",
    costPrice: 45000,
    sellPrice: 85000,
    stock: 32,
    lowStockAlert: 8,
    imageUrl: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    variants: [
      {
        id: "665v00000000000000000301",
        name: "ກ່ອງນ້ອຍ",
        sku: "VL-SN-S",
        unit: "box",
        costPrice: 45000,
        sellPrice: 85000,
        stock: 32,
        lowStockAlert: 8
      },
      {
        id: "665v00000000000000000302",
        name: "ກ່ອງໃຫຍ່",
        sku: "VL-SN-L",
        unit: "box",
        costPrice: 80000,
        sellPrice: 145000,
        stock: 14,
        lowStockAlert: 5
      }
    ],
    createdAt: twoDaysAgo,
    updatedAt: now
  },
  {
    id: "665000000000000000000004",
    name: "VL Gift Set",
    sku: "VL-GF-004",
    category: "ຂອງຂວັນ",
    costPrice: 180000,
    sellPrice: 280000,
    stock: 3,
    lowStockAlert: 5,
    imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    variants: [
      {
        id: "665v00000000000000000401",
        name: "ມາດຕະຖານ",
        sku: "VL-GF-004",
        unit: "set",
        costPrice: 180000,
        sellPrice: 280000,
        stock: 3,
        lowStockAlert: 5
      }
    ],
    createdAt: yesterday,
    updatedAt: now
  },
  {
    id: "665000000000000000000005",
    name: "VL Family Pack",
    sku: "VL-FM-005",
    category: "ຊຸດສິນຄ້າ",
    costPrice: 260000,
    sellPrice: 390000,
    stock: 12,
    lowStockAlert: 4,
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    variants: [
      {
        id: "665v00000000000000000501",
        name: "ມາດຕະຖານ",
        sku: "VL-FM-005",
        unit: "pack",
        costPrice: 260000,
        sellPrice: 390000,
        stock: 12,
        lowStockAlert: 4
      }
    ],
    createdAt: yesterday,
    updatedAt: now
  }
];

const orderOneItems = [
  productToOrderItem(mockProducts[0], 2),
  productToOrderItem(mockProducts[2], 1)
];
const orderTwoItems = [productToOrderItem(mockProducts[1], 3)];
const orderThreeItems = [productToOrderItem(mockProducts[4], 1)];
const orderFourItems = [productToOrderItem(mockProducts[3], 1)];

export const mockOrders: Order[] = [
  {
    id: "666000000000000000000001",
    customerName: "ນາງ ມະນີ",
    phone: "020 5555 1111",
    province: "ນະຄອນຫຼວງວຽງຈັນ",
    city: "ຈັນທະບູລີ",
    shippingCompany: "ຮຸ່ງອາລຸນ",
    pickupBranch: "ສາຂາໂພນຕ້ອງ",
    paymentStatus: "COD",
    status: "SHIPPED",
    items: orderOneItems,
    ...calculateOrderTotals(orderOneItems),
    note: "ສົ່ງຊ່ວງບ່າຍ",
    createdAt: todayMorning,
    updatedAt: now
  },
  {
    id: "666000000000000000000002",
    customerName: "ທ້າວ ສົມສັກ",
    phone: "020 5555 2222",
    province: "ຈໍາປາສັກ",
    city: "ປາກເຊ",
    shippingCompany: "Unitel",
    pickupBranch: "ສາຂາປາກເຊ",
    paymentStatus: "PAID",
    status: "PENDING_PACK",
    items: orderTwoItems,
    ...calculateOrderTotals(orderTwoItems),
    note: null,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "666000000000000000000003",
    customerName: "ຄຸນ ພອນ",
    phone: "020 5555 3333",
    province: "ສະຫວັນນະເຂດ",
    city: "ໄກສອນ",
    shippingCompany: "ມີໄຊ",
    pickupBranch: "ສາຂາໄກສອນ",
    paymentStatus: "COD",
    status: "PACKED",
    items: orderThreeItems,
    ...calculateOrderTotals(orderThreeItems),
    note: "ລໍຖ້າລົດມາຮັບ",
    createdAt: yesterday,
    updatedAt: now
  },
  {
    id: "666000000000000000000004",
    customerName: "ຄຸນ ດາວ",
    phone: "020 5555 4444",
    province: "ຫຼວງພະບາງ",
    city: "ຫຼວງພະບາງ",
    shippingCompany: "ອານຸສິດ",
    pickupBranch: "ສາຂາຫຼວງພະບາງ",
    paymentStatus: "PAID",
    status: "RETURNED",
    items: orderFourItems,
    ...calculateOrderTotals(orderFourItems),
    note: "ລູກຄ້າບໍ່ຮັບສິນຄ້າ",
    createdAt: twoDaysAgo,
    updatedAt: yesterday
  }
];
