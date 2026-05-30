-- Make net_amount a regular column so it can be set manually.
-- The UI auto-computes gross - taxes but allows the user to override.
ALTER TABLE income ALTER COLUMN net_amount DROP EXPRESSION;
