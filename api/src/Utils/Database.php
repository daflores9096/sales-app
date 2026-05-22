<?php
namespace App\Utils;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    /**
     * Retorna una instancia única de PDO (Singleton)
     */
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $host = $_ENV['DB_HOST'] ?? 'db';
            $db   = $_ENV['DB_NAME'] ?? 'app_db';
            $user = $_ENV['DB_USER'] ?? 'app_user';
            $pass = $_ENV['DB_PASSWORD'] ?? 'app_password';
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;dbname=$db;charset=$charset";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND =>
                        "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]);
            } catch (PDOException $e) {
                die(json_encode([
                    'status' => 'error',
                    'message' => 'DB connection failed: ' . $e->getMessage()
                ]));
            }
        }

        return self::$instance;
    }
}
