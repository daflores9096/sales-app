<?php
//require_once __DIR__ . '/../vendor/autoload.php';
//require_once __DIR__ . '/../src/Config/config.php';
//
//use App\Utils\Response;
//
//// =======================
//// 🌐 Habilitar CORS globalmente
//// =======================
//$allowedOrigins = [
//    'http://localhost:4300', // frontend Angular
//    'http://127.0.0.1:4300'
//];
//
//$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
//
//if (in_array($origin, $allowedOrigins)) {
//    header("Access-Control-Allow-Origin: $origin");
//} else {
//    // En desarrollo puedes permitir todos los orígenes temporalmente
//    header("Access-Control-Allow-Origin: *");
//}
//
//header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
//header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With");
//header("Access-Control-Allow-Credentials: true");
//header("Content-Type: application/json; charset=utf-8");
//
//// ✅ Responder correctamente las preflight requests (OPTIONS)
//if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//    http_response_code(200);
//    exit();
//}
//
//// =======================
//// 🧩 Manejo global de errores
//// =======================
//set_exception_handler(function ($e) {
//    header("Access-Control-Allow-Origin: *"); // Repetir cabeceras para errores
//    Response::error($e->getMessage(), 500);
//});
//
//// =======================
//// 🚦 Rutas principales
//// =======================
//require_once __DIR__ . '/../src/Routes/routes.php';
//
//// Si no coincide ninguna ruta
//http_response_code(404);
//echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);
//

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config/config.php';

use App\Utils\Response;

// Manejo global de errores
set_exception_handler(function ($e) {
    Response::error($e->getMessage(), 500);
});

// CORS básico (ajustar en producción)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
    header("Access-Control-Allow-Headers: Authorization,Content-Type");
    exit;
}
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

// Rutas
require_once __DIR__ . '/../src/Routes/routes.php';

http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);
