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

    /**
     * Ventas totales agrupadas por fecha.
     */
    public function salesByDay(): array
    {
        $stmt = $this->db->query("
            SELECT DATE(created_at) AS date, 
                   COUNT(*) AS total_sales,
                   SUM(total) AS total_amount
            FROM sales
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ventas agrupadas por producto.
     */
    public function salesByProduct(): array
    {
        $stmt = $this->db->query("
            SELECT p.name AS product_name,
                   SUM(si.quantity) AS total_quantity,
                   SUM(si.price * si.quantity) AS total_revenue
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            GROUP BY p.id
            ORDER BY total_revenue DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ventas agrupadas por usuario.
     */
    public function salesByUser(): array
    {
        $stmt = $this->db->query("
            SELECT u.username,
                   COUNT(s.id) AS total_sales,
                   SUM(s.total) AS total_revenue
            FROM sales s
            JOIN users u ON u.id = s.user_id
            GROUP BY u.id
            ORDER BY total_revenue DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Total general de ventas.
     */
    public function totalSales(): array
    {
        $stmt = $this->db->query("
            SELECT 
                COUNT(id) AS total_sales,
                SUM(total) AS total_revenue
            FROM sales
        ");
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_sales' => 0, 'total_revenue' => 0];
    }
}
