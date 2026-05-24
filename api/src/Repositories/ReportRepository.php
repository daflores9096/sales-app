<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class ReportRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    private function reportWhere(string $column, ?string $from, ?string $to, array &$params, ?int $userId = null, string $userColumn = 'user_id'): string
    {
        $where = [];

        if ($from) {
            $where[] = "DATE($column) >= :from";
            $params['from'] = $from;
        }

        if ($to) {
            $where[] = "DATE($column) <= :to";
            $params['to'] = $to;
        }

        if ($userId !== null) {
            $where[] = "$userColumn = :user_id";
            $params['user_id'] = $userId;
        }

        return $where ? 'WHERE ' . implode(' AND ', $where) : '';
    }

    private function executeReport(string $sql, array $params): array
    {
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ventas totales agrupadas por fecha.
     */
    public function salesByDay(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        $params = [];
        $whereSql = $this->reportWhere('created_at', $from, $to, $params, $userId);

        return $this->executeReport("
            SELECT DATE(created_at) AS date, 
                   COUNT(*) AS total_sales,
                   SUM(total) AS total_amount
            FROM sales
            $whereSql
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ", $params);
    }

    /**
     * Ventas agrupadas por producto.
     */
    public function salesByProduct(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        $params = [];
        $whereSql = $this->reportWhere('s.created_at', $from, $to, $params, $userId, 's.user_id');

        return $this->executeReport("
            SELECT p.name AS product_name,
                   SUM(si.quantity) AS total_quantity,
                   SUM(si.price * si.quantity) AS total_revenue
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN products p ON p.id = si.product_id
            $whereSql
            GROUP BY p.id
            ORDER BY total_revenue DESC
        ", $params);
    }

    /**
     * Ventas agrupadas por tipo de pago.
     */
    public function salesByPaymentMethod(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        $params = [];
        $whereSql = $this->reportWhere('created_at', $from, $to, $params, $userId);

        return $this->executeReport("
            SELECT payment_method,
                   COUNT(id) AS total_sales,
                   COALESCE(SUM(total), 0) AS total_revenue
            FROM sales
            $whereSql
            GROUP BY payment_method
        ", $params);
    }

    /**
     * Ventas agrupadas por usuario.
     */
    public function salesByUser(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        $params = [];
        $whereSql = $this->reportWhere('s.created_at', $from, $to, $params, $userId, 's.user_id');

        return $this->executeReport("
            SELECT u.username,
                   COUNT(s.id) AS total_sales,
                   SUM(s.total) AS total_revenue
            FROM sales s
            JOIN users u ON u.id = s.user_id
            $whereSql
            GROUP BY u.id
            ORDER BY total_revenue DESC
        ", $params);
    }

    /**
     * Total general de ventas.
     */
    public function totalSales(?string $from = null, ?string $to = null, ?int $userId = null): array
    {
        $params = [];
        $whereSql = $this->reportWhere('created_at', $from, $to, $params, $userId);

        $stmt = $this->db->prepare("
            SELECT 
                COUNT(id) AS total_sales,
                COALESCE(SUM(total), 0) AS total_revenue
            FROM sales
            $whereSql
        ");
        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_sales' => 0, 'total_revenue' => 0];
    }
}
