-- Asegura que los scripts de inicialización se ejecuten interpretando UTF-8 correctamente.
-- Sin esto, MySQL puede usar latin1 por defecto y "romper" acentos al importar datos UTF-8.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;
