<?php
use App\Controllers\ReportController;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (str_starts_with($path, '/api/reports')) {
    $user = AuthMiddleware::verifyToken();
    AuthMiddleware::authorize(['user', 'admin', 'superadmin'], $user);

    $controller = new ReportController();

    if ($path === '/api/reports/daily' && $method === 'GET') {
        $controller->daily($user);
    } elseif ($path === '/api/reports/products' && $method === 'GET') {
        $controller->byProduct($user);
    } elseif ($path === '/api/reports/payment-methods' && $method === 'GET') {
        $controller->byPaymentMethod($user);
    } elseif ($path === '/api/reports/users' && $method === 'GET') {
        $controller->byUser($user);
    } elseif ($path === '/api/reports/total' && $method === 'GET') {
        $controller->total($user);
    } else {
        Response::error('Ruta no encontrada', 404);
    }

    exit;
}
