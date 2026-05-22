<?php
use App\Controllers\ProductController;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (str_starts_with($path, '/api/products')) {
    $user = AuthMiddleware::verifyToken(); // Verifica token JWT

    // Vendedores pueden consultar catálogo (GET/search), pero no administrar inventario.
    $isWrite =
        ($method !== 'GET') ||
        ($path === '/api/products/import' && $method === 'POST');

    if ($isWrite) {
        AuthMiddleware::authorize(['admin', 'superadmin'], $user);
    } else {
        AuthMiddleware::authorize(['user', 'admin', 'superadmin'], $user);
    }

    $controller = new ProductController();

    // 👉 NUEVA RUTA: importación desde Excel
    if ($path === '/api/products/import' && $method === 'POST') {
        $controller->import();
    }
    // Rutas existentes
    elseif ($path === '/api/products' && $method === 'GET') {
        $controller->list($user);
    } elseif ($path === '/api/products' && $method === 'POST') {
        $controller->create();
    } elseif (preg_match('#^/api/products/(\d+)$#', $path, $matches)) {
        $id = (int)$matches[1];
        if ($method === 'PUT') {
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
