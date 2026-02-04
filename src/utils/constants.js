/**
 * Application-wide constants
 */

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  ACCOUNTANT: 'accountant'
};

// Item types
export const ITEM_TYPES = {
  RAW_MATERIAL: 'raw_material',
  FINISHED_PRODUCT: 'finished_product',
  PACKAGING: 'packaging',
  OTHER: 'other'
};

// Transaction types
export const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  EXPENSE: 'expense',
  PAYMENT: 'payment',
  RECEIPT: 'receipt'
};

// Inventory operation types
export const INVENTORY_OPERATIONS = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer'
};

// Expense categories
export const EXPENSE_CATEGORIES = {
  MAZDOOR: 'mazdoor',
  ELECTRICITY: 'electricity',
  RENT: 'rent',
  TRANSPORT: 'transport',
  MAINTENANCE: 'maintenance',
  RAW_MATERIAL: 'raw_material',
  PACKAGING: 'packaging',
  OTHER: 'other',
  SUPPLIER_PAYMENT: 'supplier_payment'
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue'
};

// Unit of measurements
export const UNITS = {
  KILOGRAM: 'kg',
  GRAM: 'g',
  TON: 'ton',
  QUINTAL: 'quintal',
  BAG: 'bag',
  PIECE: 'piece',
  LITER: 'liter',
  METER: 'meter'
};

// Account Types
export const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  INCOME: 'income',
  EXPENSE: 'expense',
  EQUITY: 'equity'
};

// Voucher Types
export const VOUCHER_TYPES = {
  BANK_PAYMENT: 'bank_payment',
  BANK_RECEIPT: 'bank_receipt',
  CASH_PAYMENT: 'cash_payment',
  CASH_RECEIPT: 'cash_receipt',
  BANK_TRANSFER: 'bank_transfer',
  JOURNAL_ENTRY: 'journal_entry'
};

// Voucher Status
export const VOUCHER_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  CANCELLED: 'cancelled'
};

// Entry Types (for double-entry bookkeeping)
export const ENTRY_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit'
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

