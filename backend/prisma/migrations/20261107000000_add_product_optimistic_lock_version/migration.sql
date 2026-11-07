-- Add an optimistic-lock version without changing existing product stock.
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
