-- Migracion para instalaciones existentes: Combos
-- Ejecutar manualmente sobre app_db antes de desplegar el codigo que usa Combos.
-- Ejemplo:
--   docker compose exec db mysql -uapp_user -papp_password app_db < database/04-combos.sql

USE app_db;

-- Columnas nuevas en products (ignorar error si ya existen)
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE products ADD COLUMN is_combo TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'is_combo'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE products ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'active'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS combos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(6) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extra_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  product_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_combos_code (code),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS combo_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combo_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_combo_product (combo_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
