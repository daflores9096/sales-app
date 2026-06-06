<?php
use App\Controllers\BackupController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/backups')) {
    return;
}

$controller = new BackupController();

if ($path === '/api/backups' && $method === 'GET') {
    $controller->create();
    exit;
}

if ($path === '/api/backups/restore' && $method === 'POST') {
    $controller->restore();
    exit;
}

Response::error('Ruta no encontrada', 404);
