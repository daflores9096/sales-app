-- Migracion: pagos multiples por venta
-- Ejemplo:
--   Get-Content database\05-sale-payments.sql | docker compose exec -T db mysql -uapp_user -papp_password app_db

USE app_db;

-- Ampliar ENUM de payment_method para soportar ventas mixtas
ALTER TABLE sales
  MODIFY COLUMN payment_method ENUM('cash', 'qr', 'card', 'mixed') NOT NULL DEFAULT 'cash';

CREATE TABLE IF NOT EXISTS sale_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  payment_method ENUM('cash', 'qr', 'card') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill: ventas existentes sin filas en sale_payments
INSERT INTO sale_payments (sale_id, payment_method, amount)
SELECT s.id, s.payment_method, s.total
FROM sales s
WHERE s.payment_method IN ('cash', 'qr', 'card')
  AND NOT EXISTS (
    SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id
  );
