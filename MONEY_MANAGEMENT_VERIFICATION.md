# Money Management – Verification & Safeguards

This document lists the checks and safeguards in place so that money-related flows are correct and consistent.

---

## 1. Amount validation (no invalid numbers)

- **Daily Cash Memo – add credit / add debit**  
  `amount` is validated: must be a finite number (`Number.isFinite(amountNum)`) and `> 0`. Otherwise `ValidationError('Amount must be a positive number')` is thrown. All uses of the amount (entry, payment, customer/mazdoor/supplier balance) use this validated `amountNum`.

- **Sync service – sync payment to memo**  
  Only runs when `payment.status === 'posted'` (so account was updated). `amount` is checked: must be finite and `> 0`; otherwise sync is skipped (no memo entry added).

- **Sync service – expense to payment/memo**  
  `amount` is validated: must be finite and `> 0`. Otherwise `ValidationError` is thrown. If there is no cash account, `ValidationError` is thrown and the expense is **rolled back** (deleted) so no orphan expense exists without a payment.

- **Payment / Expense models**  
  Schema uses `min: [0.01]` (Payment) and `min: [0]` (Expense) so invalid amounts are rejected at the model level as well.

---

## 2. One source of truth for account balance

- **Account balance** is updated **only** by the **Payment** model’s post-`save` hook:
  - `type === 'payment'` and `status === 'posted'` → `fromAccount.currentBalance -= amount`
  - `type === 'receipt'` and `status === 'posted'` → `toAccount.currentBalance += amount`
- No other code path updates `Account.currentBalance` for these flows. So there is no double update or missing update from Payment create/save.

---

## 3. Customer / Mazdoor / Supplier balances

- **Customer**  
  Decreased when we record a **receipt from that customer** (they paid us):
  - Daily Cash Memo add credit (with customer) → `Customer.currentBalance -= amount`
  - Sync from Payments page (receipt with customer) → same update in sync service
- **Mazdoor**  
  Decreased when we record a **payment to that mazdoor** (salary):
  - Daily Cash Memo add debit (category mazdoor + mazdoor) → `Mazdoor.currentBalance -= amount`
  - Sync from Payments page (payment, category mazdoor + mazdoor) → same in sync
  - Sync from Expenses page (expense category mazdoor + mazdoor) → same in sync
- **Supplier**  
  Decreased when we record a **payment to that supplier** (supplier_payment or raw_material):
  - Same pattern in Daily Cash Memo add debit and in both sync paths.

Each balance is updated in a single place per transaction (either in Daily Cash Memo controller or in the sync service), so no double or missing update.

---

## 4. Daily Cash Memo – no double sync

- Entries created **from** Daily Cash Memo create a Payment with `source: 'daily_cash_memo'`. The sync service **does not** run for such payments (`if (payment.source === 'daily_cash_memo') return`), so the memo is not updated again from that payment.
- When syncing a payment from the Payments page, we check that the memo does **not** already contain an entry with this `paymentReference`; if it does, we skip adding again.

---

## 5. Memo date and totals

- **Finding memo by date**  
  Uses the same logic as `getDailyCashMemoByDate`: date range `$gte` start of day, `$lte` end of day. So the memo for “that day” is always the same, regardless of how the date is stored (avoiding timezone mismatches).
- **Totals**  
  Memo’s `closingBalance` is recalculated in a `pre('save')` hook: `totalCredit - totalDebit`, with `totalCredit` = `openingBalance + sum(creditEntries.amount)` and `totalDebit` = `sum(debitEntries.amount)`. So any new entry (from memo or from sync) is included in the totals.

---

## 6. Expense from Expenses page – rollback on sync failure

- When creating an **Expense** from the Expenses page, we:
  1. Create the Expense.
  2. Call `syncExpenseToPaymentAndMemo` (creates Payment + memo entry, updates balances).
- If sync fails (e.g. no cash account, or validation error), we **delete the expense** and rethrow the error. So we never leave an expense without a corresponding payment and memo entry; the user gets a clear error and can fix (e.g. set up a cash account) and try again.

---

## 7. Error handling

- Custom **ValidationError** (e.g. “Amount must be a positive number”, “No cash account found”) is thrown with status 400. The error middleware only treats **Mongoose** validation as a special case when `err.errors` exists, so our custom `ValidationError` is still returned with the correct message and status code.

---

## 8. Payment delete

- When a payment is **deleted** from the Payments page, the controller **reverses the account balance** (adds back for payment, subtracts for receipt) before calling `payment.deleteOne()`. So the account is correct after delete.  
- The memo is **not** automatically updated (entry is not removed). So if you delete a payment that was synced from the Payments page, the memo for that date will still show the entry; the “single source of truth” for balance is the account, which is corrected. To keep the memo in sync, the user would need to remove the entry from the Daily Cash Memo manually or we could add a follow-up to remove memo entries by `paymentReference` on payment delete.

---

## Summary

- All amounts are validated (finite, positive) before any write.
- Account balance is updated only by the Payment hook; no double or missing account update.
- Customer/Mazdoor/Supplier balances are updated in one place per transaction.
- Sync runs only for posted payments and avoids duplicate memo entries.
- Memo date lookup matches `getDailyCashMemoByDate`; memo totals are recalculated on save.
- Expense-from-Expenses-page is rolled back if sync fails; errors are returned correctly.
