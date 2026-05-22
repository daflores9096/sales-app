<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class SaleRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /* =======================
       CREAR VENTA
    ======================= */

    public function createSale(int $userId, float $total): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO sales (user_id, total, status)
            VALUES (:user_id, :total, 'active')
        ");
        $stmt->execute([
            'user_id' => $userId,
            'total' => $total
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function addSaleItem(
        int $saleId,
        int $productId,
        int $quantity,
        float $price
    ): void {
        $stmt = $this->db->prepare("
            INSERT INTO sale_items (sale_id, product_id, quantity, price)
            VALUES (:sale_id, :product_id, :quantity, :price)
        ");
        $stmt->execute([
            'sale_id' => $saleId,
            'product_id' => $productId,
            'quantity' => $quantity,
            'price' => $price
        ]);
    }

    /* =======================
       CONSULTAS
    ======================= */

    public function findAll(): array
    {
        $stmt = $this->db->query("
            SELECT
                s.id,
                s.total,
                s.status,
                s.created_at,
                u.username
            FROM sales s
            JOIN users u ON u.id = s.user_id
            ORDER BY s.created_at DESC
        ");

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByUser(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT
                id,
                total,
                status,
                created_at
            FROM sales
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        ");

        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT
                s.id,
                s.total,
                s.status,
                s.created_at,
                u.username
            FROM sales s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = :id
            LIMIT 1
        ");

        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /* =======================
       DETALLE DE VENTA
    ======================= */

    // Para UI (detalle)
    public function getSaleItems(int $saleId): array
    {
        $stmt = $this->db->prepare("
            SELECT
                p.name,
                si.quantity,
                si.price,
                (si.quantity * si.price) AS subtotal
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            WHERE si.sale_id = :sale_id
        ");
        $stmt->execute(['sale_id' => $saleId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Para rollback de stock (CRÍTICO)
    public function getItemsWithProductId(int $saleId): array
    {
        $stmt = $this->db->prepare("
        SELECT
            si.product_id,
            si.quantity
        FROM sale_items si
        WHERE si.sale_id = :sale_id
    ");

        $stmt->execute(['sale_id' => $saleId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


    /* =======================
       VALIDACIONES
    ======================= */

    public function belongsToUser(int $saleId, int $userId): bool
    {
        $stmt = $this->db->prepare("
            SELECT 1
            FROM sales
            WHERE id = :id AND user_id = :user_id
        ");
        $stmt->execute([
            'id' => $saleId,
            'user_id' => $userId
        ]);

        return (bool) $stmt->fetchColumn();
    }

    /* =======================
       ANULAR VENTA
    ======================= */

    public function cancelSale(int $saleId): void
    {
        $stmt = $this->db->prepare("
            UPDATE sales
            SET status = 'cancelled'
            WHERE id = :id
        ");
        $stmt->execute(['id' => $saleId]);
    }


    public function paginate(
        int $page,
        int $limit,
        ?string $status,
        ?string $from,
        ?string $to,
        ?string $q,
        ?int $userId = null,
        bool $isAdmin = false
    ): array {

        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if (!$isAdmin) {
            if ($userId === null) {
                throw new \Exception('userId requerido para listar ventas');
            }
            $where[] = 's.user_id = :user_id';
            $params['user_id'] = $userId;
        }

        if ($status) {
            $where[] = 's.status = :status';
            $params['status'] = $status;
        }

        if ($from) {
            $where[] = 'DATE(s.created_at) >= :from';
            $params['from'] = $from;
        }

        if ($to) {
            $where[] = 'DATE(s.created_at) <= :to';
            $params['to'] = $to;
        }

        if ($q) {
            $where[] = '(u.username LIKE :q OR s.id LIKE :q)';
            $params['q'] = "%$q%";
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
        SELECT SQL_CALC_FOUND_ROWS
            s.id, s.total, s.created_at, s.status,
            u.username
        FROM sales s
        JOIN users u ON u.id = s.user_id
        $whereSql
        ORDER BY s.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

        $stmt = $this->db->prepare($sql);

        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();

        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total = $this->db->query("SELECT FOUND_ROWS()")->fetchColumn();

        return [
            'data' => $data,
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit
        ];
    }

}
