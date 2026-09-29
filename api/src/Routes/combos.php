<?php
use App\Controllers\ComboController;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (str_starts_with($path, '/api/combos')) {
    $user = AuthMiddleware::verifyToken();
    AuthMiddleware::authorize(['user', 'admin', 'superadmin'], $user);

    $controller = new ComboController();

    if ($path === '/api/combos' && $method === 'GET') {
        $controller->list();
    } elseif ($path === '/api/combos' && $method === 'POST') {
        $controller->create();
    } elseif (preg_match('#^/api/combos/(\d+)/status$#', $path, $matches) && $method === 'PATCH') {
        $controller->setStatus((int)$matches[1]);
    } elseif (preg_match('#^/api/combos/(\d+)$#', $path, $matches)) {
        $id = (int)$matches[1];
        if ($method === 'GET') {
            $controller->show($id);
        } elseif ($method === 'PUT') {
            $controller->update($id);
        } elseif ($method === 'DELETE') {
            $controller->delete($id);
        } else {
            Response::error('Método no permitido', 405);
        }
    } else {
        Response::error('Ruta no encontrada', 404);
    }

    exit;
}
