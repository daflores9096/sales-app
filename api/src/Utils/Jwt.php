<?php
namespace App\Utils;

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;
use Exception;

class Jwt
{
    /**
     * Crea un token JWT firmado.
     */
    public static function encode(array $payload): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? 'super_secret_key_123';
        $issuer = $_ENV['APP_URL'] ?? 'http://localhost';
        $expiration = time() + (int)($_ENV['JWT_TTL'] ?? 3600); // 1 h por defecto

        $tokenData = array_merge([
            'iss' => $issuer,
            'iat' => time(),
            'exp' => $expiration
        ], $payload);

        return FirebaseJWT::encode($tokenData, $secret, 'HS256');
    }

    /**
     * Decodifica y valida un token JWT.
     */
    public static function decode(string $token): object|false
    {
        $secret = $_ENV['JWT_SECRET'] ?? 'super_secret_key_123';

        try {
            return FirebaseJWT::decode($token, new Key($secret, 'HS256'));
        } catch (Exception $e) {
            error_log('JWT decode failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Valida un token y retorna sus datos o lanza una excepción.
     */
    public static function verify(string $token): object
    {
        $decoded = self::decode($token);
        if (!$decoded) {
            throw new Exception('Token inválido o expirado');
        }
        return $decoded;
    }
}
