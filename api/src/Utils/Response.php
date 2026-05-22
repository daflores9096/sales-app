<?php
namespace App\Utils;

class Response
{
    /**
     * Envía una respuesta JSON estándar y finaliza la ejecución.
     *
     * @param mixed $data Datos a enviar (array o string)
     * @param int $statusCode Código HTTP (por defecto 200)
     */
    public static function json(mixed $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        // Si el mensaje no está estructurado, lo envolvemos
        if (!is_array($data)) {
            $data = [
                'status' => $statusCode >= 400 ? 'error' : 'success',
                'message' => $data
            ];
        }

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Envía una respuesta vacía (sin cuerpo) con un código HTTP específico.
     */
    public static function noContent(int $statusCode = 204): void
    {
        http_response_code($statusCode);
        exit;
    }

    /**
     * Envía un error en formato JSON.
     */
    public static function error(string $message, int $statusCode = 400): void
    {
        self::json([
            'status' => 'error',
            'message' => $message
        ], $statusCode);
    }
}
