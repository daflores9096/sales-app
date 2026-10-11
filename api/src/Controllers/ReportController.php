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
            [$from, $to] = $this->reportDateRange($user);
            $data = $this->reportService->getSalesByDay(
                $from,
                $to,
                $this->reportUserId($user)
            );
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
            [$from, $to] = $this->reportDateRange($user);
            $data = $this->reportService->getSalesByProduct(
                $from,
                $to,
                $this->reportUserId($user)
            );
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al generar reporte por producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reporte: Ventas por tipo de pago
     * GET /api/reports/payment-methods
     */
    public function byPaymentMethod(object $user): void
    {
        try {
            [$from, $to] = $this->reportDateRange($user);
            $data = $this->reportService->getSalesByPaymentMethod(
                $from,
                $to,
                $this->reportUserId($user)
            );
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al generar reporte por tipo de pago: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reporte: Ventas por usuario
     * GET /api/reports/users
     */
    public function byUser(object $user): void
    {
        try {
            [$from, $to] = $this->reportDateRange($user);
            $data = $this->reportService->getSalesByUser(
                $from,
                $to,
                $this->reportUserId($user)
            );
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
            [$from, $to] = $this->reportDateRange($user);
            $data = $this->reportService->getTotalSales(
                $from,
                $to,
                $this->reportUserId($user)
            );
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            Response::error('Error al obtener total general: ' . $e->getMessage(), 500);
        }
    }

    private function isAdminLike(object $user): bool
    {
        return in_array((int)$user->role_id, [1, 2], true);
    }

    private function reportUserId(object $user): ?int
    {
        return $this->isAdminLike($user) ? null : (int)$user->sub;
    }

    /**
     * Admin/superadmin: usan from/to del request.
     * Vendedores (user): solo día actual.
     *
     * @return array{0:?string,1:?string}
     */
    private function reportDateRange(object $user): array
    {
        if ($this->isAdminLike($user)) {
            return [$_GET['from'] ?? null, $_GET['to'] ?? null];
        }

        $today = (new \DateTimeImmutable('today'))->format('Y-m-d');
        return [$today, $today];
    }
}
