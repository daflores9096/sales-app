<?php
namespace App\Controllers;

use App\Services\ReportService;
use App\Utils\Response;
use App\Utils\AuthMiddleware;
use Exception;

class ReportController
{
    private ReportService $reportService;

    public function __construct()
    {
        $this->reportService = new ReportService();
    }

    /**
     * Reporte: Ventas totales por día
     * GET /api/reports/daily
     */
    public function daily(object $user): void
    {
        try {
            $data = $this->reportService->getSalesByDay();
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al generar reporte diario: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reporte: Ventas por producto
     * GET /api/reports/products
     */
    public function byProduct(object $user): void
    {
        try {
            $data = $this->reportService->getSalesByProduct();
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al generar reporte por producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reporte: Ventas por usuario
     * GET /api/reports/users
     */
    public function byUser(object $user): void
    {
        try {
            $data = $this->reportService->getSalesByUser();
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al generar reporte por usuario: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reporte: Total general
     * GET /api/reports/total
     */
    public function total(object $user): void
    {
        try {
            $data = $this->reportService->getTotalSales();
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al obtener total general: ' . $e->getMessage(), 500);
        }
    }
}
