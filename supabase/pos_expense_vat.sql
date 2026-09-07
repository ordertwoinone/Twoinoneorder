-- "How much of that fifty was VAT?"
--
-- pos_expenses has carried a vat_included boolean since pos_operations.sql, and
-- the expense form never offered a control for it — so every row ever written
-- says false, and the one report that shows a VAT figure has been deriving it
-- as amount x 5/105 for rows that all claim to carry none.
--
-- Deriving it was never right anyway. A supplier's invoice states its own VAT,
-- and it is not always five per cent of the line: zero-rated goods, a mixed
-- basket, an unregistered supplier charging none at all, and plain rounding all
-- put the real figure somewhere other than the formula. What is reclaimable is
-- what the invoice says, and that is a number somebody has to be able to type.
--
-- So the amount is stored beside the flag rather than instead of it. NULL means
-- nobody said — which is a different fact from a supplier who charged nothing,
-- and the reason this is nullable while amount is not.
--
-- Safe to re-run.

ALTER TABLE pos_expenses
  ADD COLUMN IF NOT EXISTS vat_amount numeric(10,2);

COMMENT ON COLUMN pos_expenses.vat_amount IS
  'VAT inside amount, as stated on the invoice. NULL means it was not recorded; 0 means the supplier charged none.';

COMMENT ON COLUMN pos_expenses.vat_included IS
  'Whether amount carries VAT at all. True with a NULL vat_amount means the standard 5/105 is assumed.';
