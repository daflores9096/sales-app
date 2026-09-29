<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class ComboRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(): array
    {
        $stmt = $this->db->query("
            SELECT c.*,
                   (SELECT COUNT(*) FROM combo_items ci WHERE ci.combo_id = c.id) AS items_count
            FROM combos c
            ORDER BY c.id DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM combos WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $combo = $stmt->fetch(PDO::FETCH_ASSOC);
        return $combo ?: null;
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM combos WHERE code = :code LIMIT 1");
        $stmt->execute(['code' => $code]);
        $combo = $stmt->fetch(PDO::FETCH_ASSOC);
        return $combo ?: null;
    }

    public function findByProductId(int $productId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM combos WHERE product_id = :product_id LIMIT 1");
        $stmt->execute(['product_id' => $productId]);
        $combo = $stmt->fetch(PDO::FETCH_ASSOC);
        return $combo ?: null;
    }

    public function getItems(int $comboId): array
    {
        $stmt = $this->db->prepare("
            SELECT ci.id,
                   ci.combo_id,
                   ci.product_id,
                   ci.quantity,
                   ci.unit_price,
                   p.name AS product_name,
                   p.barcode AS product_barcode,
                   p.price AS product_cost,
                   p.price_sale AS product_price_sale,
                   p.stock AS product_stock,
                   p.active AS product_active
            FROM combo_items ci
            INNER JOIN products p ON p.id = ci.product_id
            WHERE ci.combo_id = :combo_id
            ORDER BY ci.id ASC
        ");
        $stmt->execute(['combo_id' => $comboId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare("
            INSERT INTO combos (name, code, price, extra_cost, status, product_id)
            VALUES (:name, :code, :price, :extra_cost, :status, :product_id)
        ");

        $stmt->execute([
            'name' => $data['name'],
            'code' => $data['code'],
            'price' => $data['price'],
            'extra_cost' => $data['extra_cost'],
            'status' => $data['status'],
            'product_id' => $data['product_id'],
        ]);

        return $this->findById((int)$this->db->lastInsertId());
    }

    public function update(int $id, array $data): bool
    {
        $stmt = $this->db->prepare("
            UPDATE combos
            SET name = :name,
                code = :code,
                price = :price,
                extra_cost = :extra_cost,
                status = :status,
                product_id = :product_id
            WHERE id = :id
        ");

        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'code' => $data['code'],
            'price' => $data['price'],
            'extra_cost' => $data['extra_cost'],
            'status' => $data['status'],
            'product_id' => $data['product_id'],
        ]);

        return true;
    }

    public function setStatus(int $id, string $status): bool
    {
        $stmt = $this->db->prepare("UPDATE combos SET status = :status WHERE id = :id");
        $stmt->execute(['id' => $id, 'status' => $status]);
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM combos WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function replaceItems(int $comboId, array $items): void
    {
        $delete = $this->db->prepare("DELETE FROM combo_items WHERE combo_id = :combo_id");
        $delete->execute(['combo_id' => $comboId]);

        if (empty($items)) {
            return;
        }

        $insert = $this->db->prepare("
            INSERT INTO combo_items (combo_id, product_id, quantity, unit_price)
            VALUES (:combo_id, :product_id, :quantity, :unit_price)
        ");

        foreach ($items as $item) {
            $insert->execute([
                'combo_id' => $comboId,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
            ]);
        }
    }

    public function codeExists(string $code, ?int $excludeComboId = null): bool
    {
        $sql = "SELECT 1 FROM combos WHERE code = :code";
        $params = ['code' => $code];

        if ($excludeComboId !== null) {
            $sql .= " AND id <> :id";
            $params['id'] = $excludeComboId;
        }

        $sql .= " LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (bool)$stmt->fetchColumn();
    }
}
