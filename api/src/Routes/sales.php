<?php
use App\Controllers\SaleController;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (str_starts_with($path, '/api/sales')) {

    $user = AuthMiddleware::verifyToken();
    AuthMiddleware::authorize(['user', 'admin', 'superadmin'], $user);

    $controller = new SaleController();

    // POST /api/sales → crear venta
    if ($path === '/api/sales' && $method === 'POST') {
        $controller->create($user);
        exit;
    }

    // GET /api/sales → listar ventas
    if ($path === '/api/sales' && $method === 'GET') {
        $controller->list($user);
        exit;
    }

    // GET /api/sales/{id} → detalle de venta
    if (preg_match('#^/api/sales/(\d+)$#', $path, $matches) && $method === 'GET') {
        $saleId = (int)$matches[1];
        $controller->detail($saleId, $user);
        exit;
    }

    elseif (preg_match('#^/api/sales/(\d+)/cancel$#', $path, $m) && $method === 'POST') {
        $controller->cancel((int)$m[1], $user);
    }

    Response::error('Ruta no encontrada', 404);
}
