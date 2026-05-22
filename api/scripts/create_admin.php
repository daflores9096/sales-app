<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config/config.php';

use App\Utils\Database;

// ✅ Ya no se necesita ->getConnection()
$db = Database::getInstance();

$username = $argv[1] ?? 'superadmin';
$passwordPlain = $argv[2] ?? 'StrongP@ssw0rd';
$email = $argv[3] ?? 'super@local';
$role_id = 1;

$hash = password_hash($passwordPlain, PASSWORD_BCRYPT);

$stmt = $db->prepare("INSERT INTO users (username, email, password, role_id) VALUES (:u, :e, :p, :r)");
$stmt->execute([
    ':u' => $username,
    ':e' => $email,
    ':p' => $hash,
    ':r' => $role_id
]);

echo "✅ Superadmin created: {$username}\n";
