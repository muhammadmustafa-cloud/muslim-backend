/**
 * Syncs payments/receipts created from Payments or Expenses pages to Daily Cash Memo
 * so that the same transaction appears everywhere and money management numbers match.
 */
import DailyCashMemo from '../models/DailyCashMemo.model.js';
import Account from '../models/Account.model.js';
import Expense from '../models/Expense.model.js';
import Payment from '../models/Payment.model.js';
import Customer from '../models/Customer.model.js';
import Mazdoor from '../models/Mazdoor.model.js';
import Supplier from '../models/Supplier.model.js';
import { ENTRY_TYPES } from '../utils/constants.js';
import { ValidationError } from '../utils/errors.js';

function expensePaymentMethod(pm) {
  if (pm === 'bank_transfer') return 'bank';
  return pm || 'cash';
}

async function getPreviousDayClosingBalance(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  const prev = await DailyCashMemo.findOne({ date: { $lte: d } }).sort({ date: -1 }).limit(1);
  return prev?.closingBalance ?? 0;
}

/**
 * Get or create Daily Cash Memo for a given date.
 * Uses same date range as getDailyCashMemoByDate so we always match the memo for that day.
 */
export async function getOrCreateMemoForDate(paymentDate, userId) {
  const targetDate = new Date(paymentDate);
  targetDate.setHours(0, 0, 0, 0);
  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  let memo = await DailyCashMemo.findOne({ date: { $gte: targetDate, $lte: endDate } });
  if (memo) return memo;

  const openingBalance = await getPreviousDayClosingBalance(targetDate);
  memo = await DailyCashMemo.create({
    date: targetDate,
    openingBalance,
    previousBalance: openingBalance,
    creditEntries: [],
    debitEntries: [],
    status: 'draft',
    createdBy: userId,
    updatedBy: userId
  });
  return memo;
}

/**
 * Sync a Payment (created from Payments page) to Daily Cash Memo.
 * Also updates Customer/Mazdoor/Supplier balance so numbers match everywhere.
 * Call this only when payment.source !== 'daily_cash_memo'.
 */
export async function syncPaymentToDailyCashMemo(payment, userId) {
  if (payment.source === 'daily_cash_memo') return;
  if (payment.status !== 'posted') return; // only sync when account balance was updated
  const amount = parseFloat(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const memo = await getOrCreateMemoForDate(payment.date, userId);
  if (memo.status === 'posted') return; // do not add to posted memo
  const alreadyInMemo = [...(memo.creditEntries || []), ...(memo.debitEntries || [])].some(
    e => e.paymentReference && e.paymentReference.toString() === payment._id.toString()
  );
  if (alreadyInMemo) return;

  const paymentMethod = payment.paymentMethod || 'cash';

  if (payment.type === 'receipt') {
    const name = payment.receivedFrom || payment.description || 'Receipt';
    const creditEntry = {
      name,
      description: payment.description || '',
      amount,
      account: payment.toAccount,
      customer: payment.customer || null,
      paymentMethod,
      receiptType: 'general',
      entryType: ENTRY_TYPES.CREDIT,
      paymentReference: payment._id,
      createdAt: payment.date || new Date()
    };
    memo.creditEntries.push(creditEntry);
    if (payment.customer) {
      await Customer.findByIdAndUpdate(payment.customer, { $inc: { currentBalance: -amount } });
    }
  } else {
    const name = payment.paidTo || payment.description || 'Payment';
    const category = payment.category || 'other';
    const expenseCategories = ['mazdoor', 'electricity', 'rent', 'transport', 'raw_material', 'maintenance', 'other', 'supplier_payment'];
    let expenseRef = null;
    if (expenseCategories.includes(category)) {
      const expense = await Expense.create({
        category,
        description: payment.description || `Payment: ${name}`,
        amount,
        date: payment.date || new Date(),
        paymentMethod: expensePaymentMethod(paymentMethod),
        mazdoor: payment.mazdoor || null,
        supplier: payment.supplier || null,
        source: 'manual',
        createdBy: userId
      });
      expenseRef = expense._id;
    }
    const debitEntry = {
      name,
      description: payment.description || '',
      amount,
      category,
      mazdoor: payment.mazdoor || null,
      supplier: payment.supplier || null,
      paymentMethod,
      entryType: ENTRY_TYPES.DEBIT,
      paymentReference: payment._id,
      expenseReference: expenseRef,
      createdAt: payment.date || new Date()
    };
    memo.debitEntries.push(debitEntry);
    if (category === 'mazdoor' && payment.mazdoor) {
      await Mazdoor.findByIdAndUpdate(payment.mazdoor, { $inc: { currentBalance: -amount } });
    }
    if ((category === 'supplier_payment' || category === 'raw_material') && payment.supplier) {
      await Supplier.findByIdAndUpdate(payment.supplier, { $inc: { currentBalance: -amount } });
    }
  }

  memo.updatedBy = userId;
  await memo.save();
}

/**
 * When an Expense is created from the Expenses page:
 * 1) Create a Payment (so account balance updates)
 * 2) Add debit entry to Daily Cash Memo
 * 3) Link expense to payment for audit
 * Returns { payment, memo } for caller to use.
 */
export async function syncExpenseToPaymentAndMemo(expense, userId) {
  const amount = parseFloat(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('Expense amount must be a positive number');
  }

  const cashAccount = await Account.findOne({ isCashAccount: true });
  if (!cashAccount) {
    throw new ValidationError('No cash account found. Set up a cash account to record expenses with cash movement.');
  }

  const date = expense.date ? new Date(expense.date) : new Date();
  const paymentMethod = expense.paymentMethod === 'bank' ? 'bank_transfer' : (expense.paymentMethod || 'cash');
  const name = expense.description || `Expense: ${expense.category}`;

  const payment = await Payment.create({
    type: 'payment',
    date,
    description: name,
    amount,
    paymentMethod,
    fromAccount: cashAccount._id,
    mazdoor: expense.mazdoor || null,
    supplier: expense.supplier || null,
    category: expense.category,
    paidTo: name,
    status: 'posted',
    source: 'manual',
    createdBy: userId
  });

  const memo = await getOrCreateMemoForDate(date, userId);
  if (memo.status !== 'posted') {
    const debitEntry = {
      name,
      description: expense.description || '',
      amount,
      category: expense.category,
      mazdoor: expense.mazdoor || null,
      supplier: expense.supplier || null,
      paymentMethod,
      entryType: ENTRY_TYPES.DEBIT,
      paymentReference: payment._id,
      expenseReference: expense._id,
      createdAt: date
    };
    memo.debitEntries.push(debitEntry);
    memo.updatedBy = userId;
    if (expense.category === 'mazdoor' && expense.mazdoor) {
      await Mazdoor.findByIdAndUpdate(expense.mazdoor, { $inc: { currentBalance: -amount } });
    }
    if ((expense.category === 'supplier_payment' || expense.category === 'raw_material') && expense.supplier) {
      await Supplier.findByIdAndUpdate(expense.supplier, { $inc: { currentBalance: -amount } });
    }
    await memo.save();
  }

  return { payment, memo };
}

