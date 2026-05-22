<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;
use Exception;

class UserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Busca un usuario por nombre de usuario.
     */
    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare("
        SELECT users.*, roles.name AS role
        FROM users
        JOIN roles ON roles.id = users.role_id
        WHERE username = :username
        LIMIT 1");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    /**
     * Crea un nuevo usuario y retorna su ID.
     */
    public function create(array $data): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO users (username, password, email, role_id)
            VALUES (:username, :password, :email, :role_id)
        ");
        $stmt->execute([
            'username' => $data['username'],
            'password' => $data['password'],
            'email' => $data['email'],
            'role_id' => $data['role_id']
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function listAll(): array
    {
        $stmt = $this->db->query("
            SELECT
                u.id,
                u.username,
                u.email,
                u.role_id,
                r.name AS role,
                u.created_at
            FROM users u
            JOIN roles r ON r.id = u.role_id
            ORDER BY u.id ASC
        ");

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        return (bool)$stmt->fetchColumn();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT u.*, r.name AS role
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function emailExistsExcept(int $excludeUserId, string $email): bool
    {
        $stmt = $this->db->prepare("
            SELECT 1 FROM users WHERE email = :email AND id != :id LIMIT 1
        ");
        $stmt->execute(['email' => $email, 'id' => $excludeUserId]);
        return (bool)$stmt->fetchColumn();
    }

    public function usernameExistsExcept(int $excludeUserId, string $username): bool
    {
        $stmt = $this->db->prepare("
            SELECT 1 FROM users WHERE username = :username AND id != :id LIMIT 1
        ");
        $stmt->execute(['username' => $username, 'id' => $excludeUserId]);
        return (bool)$stmt->fetchColumn();
    }

    public function countSalesForUser(int $userId): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM sales WHERE user_id = :uid");
        $stmt->execute(['uid' => $userId]);
        return (int)$stmt->fetchColumn();
    }

    public function update(int $id, string $username, string $email, int $roleId): void
    {
        $stmt = $this->db->prepare("
            UPDATE users SET username = :username, email = :email, role_id = :role_id
            WHERE id = :id
        ");
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'role_id' => $roleId,
            'id' => $id,
        ]);
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $stmt = $this->db->prepare("UPDATE users SET password = :password WHERE id = :id");
        $stmt->execute(['password' => $passwordHash, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }
}
