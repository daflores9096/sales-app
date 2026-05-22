<?php
use App\Controllers\AuthController;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($path === '/api/auth/login' && $method === 'POST') {
    (new AuthController())->login();
    exit;
}

if ($path === '/api/auth/register' && $method === 'POST') {
    (new AuthController())->register();
    exit;
}
