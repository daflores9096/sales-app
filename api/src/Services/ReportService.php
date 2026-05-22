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

    public function getSalesByDay(): array
    {
        return $this->reportRepository->salesByDay();
    }

    public function getSalesByProduct(): array
    {
        return $this->reportRepository->salesByProduct();
    }

    public function getSalesByUser(): array
    {
        return $this->reportRepository->salesByUser();
    }

    public function getTotalSales(): array
    {
        return $this->reportRepository->totalSales();
    }
}
