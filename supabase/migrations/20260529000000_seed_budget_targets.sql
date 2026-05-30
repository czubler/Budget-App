INSERT INTO budget_targets (category, monthly_target, is_recurring) VALUES
  ('Rent',           1463,  true),
  ('Gas Bill',       0,     true),
  ('Electricity',    0,     true),
  ('Wifi',           0,     true),
  ('Water',          0,     true),
  ('Car Insurance',  0,     true),
  ('Subscriptions',  47.98, true),
  ('Transit',        0,     true),
  ('Social',         0,     false),
  ('Home',           0,     false),
  ('Clothing',       0,     false),
  ('Dining',         0,     false),
  ('Entertainment',  0,     false),
  ('Groceries',      0,     false),
  ('Other',          0,     false)
ON CONFLICT (category) DO UPDATE
  SET monthly_target = EXCLUDED.monthly_target,
      is_recurring   = EXCLUDED.is_recurring;
