<?php
namespace App\Controllers;

use App\Services\SaleService;
use App\Utils\Response;
use App\Utils\AuthMiddleware;
use Exception;

class SaleController
{
    private SaleService $saleService;

    public function __construct()
    {
        $this->saleService = new SaleService();
    }

    /**
     * Registrar una venta
     * POST /api/sales
     */
    public function create(object $user): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        $items = $input['items'] ?? [];
        if (empty($items)) {
            Response::error('Debe incluir al menos un producto en la venta', 400);
        }

        try {
            $saleId = $this->saleService->createSale($user->sub, $items);
            Response::json([
                'status' => 'success',
                'data' => ['sale_id' => $saleId]
            ], 201);
        } catch (Exception $e) {
            Response::error('Error al registrar la venta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener las ventas del usuario autenticado
     * GET /api/sales
     */
    public function list(object $user): void
    {
        try {
            $filters = [
                'page' => (int)($_GET['page'] ?? 1),
                'limit' => (int)($_GET['limit'] ?? 10),
                'status' => $_GET['status'] ?? null,
                'from' => $_GET['from'] ?? null,
                'to' => $_GET['to'] ?? null,
                'q' => $_GET['q'] ?? null,
                'user_id' => (int)$user->sub,
                'role_id' => (int)$user->role_id,
            ];

            $data = $this->saleService->paginate($filters);

            Response::json([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * Obtener detalle de una venta
     * GET /api/sales/{id}
     */
    public function detail(int $id, object $user): void
    {
        try {
            $sale = $this->saleService->getSaleDetail($id, $user->sub, $user->role_id);

            Response::json([
                'status' => 'success',
                'data' => $sale
            ]);
        } catch (Exception $e) {
            Response::error('Error al obtener detalle de venta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Anular venta
     * POST /api/sales/{id}/cancel
     */
    public function cancel(int $id, object $user): void
    {
        try {
            // Solo admin / superadmin pueden anular
            AuthMiddleware::authorize(['admin', 'superadmin'], $user);

            // Llamada a la función del servicio, pasando el usuario
            $this->saleService->cancelSale($id, $user);

            Response::json([
                'status' => 'success',
                'message' => 'Venta anulada correctamente'
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }


}
