-- Usuario superadmin (role_id=1) creado al iniciar un volumen MySQL vacío
-- Misma lógica que api/scripts/create_admin.php (bcrypt, rol superadmin)
-- Contraseña por defecto: StrongP@ssw0rd

USE app_db;

INSERT INTO users (username, email, password, role_id)
SELECT 'superadmin', 'super@local', '$2y$10$0TY8QMLzpt42G1yoOPaX8uITuhHGL6.3VYUoYKURLlfFNBrkisA.6', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'superadmin' LIMIT 1);
