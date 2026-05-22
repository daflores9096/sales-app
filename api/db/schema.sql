-- =====================================
-- Base de datos: sysventas
-- =====================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_db;

-- =====================================
-- Tabla: roles
-- =====================================
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
                       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                       name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (name) VALUES ('superadmin'), ('admin'), ('user');

-- =====================================
-- Tabla: users
-- =====================================
DROP TABLE IF EXISTS users;

CREATE TABLE users (
                       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       role_id INT UNSIGNED NOT NULL DEFAULT 3,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================
-- Tabla: products
-- =====================================
DROP TABLE IF EXISTS products;

CREATE TABLE products (
                          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                          name VARCHAR(100) NOT NULL,
                          price DECIMAL(10,2) NOT NULL,
                          price_sale DECIMAL(10,2) NOT NULL,
                          stock INT DEFAULT 0,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          barcode VARCHAR(100) NULL,
                          brand VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Productos iniciales (demo)
INSERT INTO products (name, price, price_sale, stock, barcode, brand) VALUES
                                              ('Laptop Lenovo', 1200.00, 1500.00, 50, 10001, 'Lenovo'),
                                              ('Mouse inalámbrico', 25.50, 32.00, 20, 10002, 'Logitech'),
                                              ('Teclado mecánico', 80.00, 95.50, 10, 10003, 'Razer'),
                                              ('Monitor 24"', 250.00, 290.00, 7, 10004, 'Samsung');

-- =====================================
-- Tabla: sales
-- =====================================
DROP TABLE IF EXISTS sales;

CREATE TABLE sales (
                       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                       user_id INT UNSIGNED NOT NULL,
                       total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       status ENUM('active', 'cancelled') DEFAULT 'active',
                       FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================
-- Tabla: sale_items
-- =====================================
DROP TABLE IF EXISTS sale_items;

CREATE TABLE sale_items (
                            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                            sale_id INT UNSIGNED NOT NULL,
                            product_id INT UNSIGNED NOT NULL,
                            quantity INT NOT NULL,
                            price DECIMAL(10,2) NOT NULL,
                            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Estos son 2 campos que se añadieron posteriormente (si no estan fallan las Ventas)
-- ALTER TABLE products ADD COLUMN barcode VARCHAR(100) NULL;
-- ALTER TABLE sales ADD COLUMN status ENUM('active', 'cancelled') DEFAULT 'active';

-- correr el siguiente comando para crear superadmin:StrongP@ssw0rd
-- docker exec -it php_app php scripts/create_admin.php
