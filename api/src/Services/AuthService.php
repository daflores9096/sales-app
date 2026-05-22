<?php
namespace App\Services;

use App\Repositories\UserRepository;
use App\Utils\Response;
use App\Utils\Database;
use Exception;

class AuthService
{
    private UserRepository $userRepository;

    public function __construct()
    {
        $this->userRepository = new UserRepository();
    }

    /**
     * Valida las credenciales de un usuario.
     * Retorna los datos del usuario si son válidas, null si no.
     */
    public function validateCredentials(string $username, string $password): ?array
    {
        $user = $this->userRepository->findByUsername($username);

        if (!$user) {
            return null;
        }

        // Verificar contraseña encriptada
        if (!password_verify($password, $user['password'])) {
            return null;
        }

        unset($user['password']); // Nunca exponer el hash
        return $user;
    }

    /**
     * Registra un nuevo usuario en la base de datos.
     */
    public function registerUser(string $username, string $password, string $email, int $role_id = 3): array
    {
        // Validar si ya existe usuario
        $existing = $this->userRepository->findByUsername($username);
        if ($existing) {
            throw new Exception('El nombre de usuario ya existe.');
        }

        // Encriptar contraseña
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $userId = $this->userRepository->create([
            'username' => $username,
            'password' => $hashedPassword,
            'email' => $email,
            'role_id' => $role_id
        ]);

        return [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'role_id' => $role_id
        ];
    }
}
