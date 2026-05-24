<?php
namespace App\Services;

use App\Repositories\ReportRepository;

class ReportService
{
    private ReportRepository $reportRepository;

    public function __construct()
    {
        $this->reportRepository = new ReportRepository();
    }

    public function getSalesByDay(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        return $this->reportRepository->salesByDay($from, $to, $userId);
    }

    public function getSalesByProduct(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        return $this->reportRepository->salesByProduct($from, $to, $userId);
    }

    public function getSalesByPaymentMethod(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        return $this->reportRepository->salesByPaymentMethod($from, $to, $userId);
    }

    public function getSalesByUser(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        return $this->reportRepository->salesByUser($from, $to, $userId);
    }

    public function getTotalSales(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        return $this->reportRepository->totalSales($from, $to, $userId);
    }
}
