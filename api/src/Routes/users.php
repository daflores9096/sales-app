<?php
use App\Controllers\UserController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/users')) {
    return;
}

$controller = new UserController();

if ($path === '/api/users' && $method === 'GET') {
    $controller->list();
    exit;
}

if ($path === '/api/users' && $method === 'POST') {
    $controller->create();
    exit;
}

if (preg_match('#^/api/users/(\d+)/password$#', $path, $matches) && $method === 'POST') {
    $controller->resetPassword((int)$matches[1]);
    exit;
}

if (preg_match('#^/api/users/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    if ($method === 'PUT') {
        $controller->update($id);
    } elseif ($method === 'DELETE') {
        $controller->delete($id);
    } else {
        Response::error('Método no permitido', 405);
    }
    exit;
}

Response::error('Ruta no encontrada', 404);
