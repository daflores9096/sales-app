<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class ProductRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findAll(bool $onlyActive = true): array
    {
        $sql = "SELECT * FROM products";
        if ($onlyActive) {
            $sql .= " WHERE active = 1";
        }
        $sql .= " ORDER BY id DESC";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product ?: null;
    }

    public function findByBarcode(string $barcode): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE barcode = :barcode LIMIT 1");
        $stmt->execute(['barcode' => $barcode]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product ?: null;
    }

    public function findByName(string $name): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE name = :name LIMIT 1");
        $stmt->execute(['name' => $name]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product ?: null;
    }

    public function create(array $data): array
    {
        $payload = [
            'name' => $data['name'],
            'price' => $data['price'],
            'price_sale' => $data['price_sale'],
            'stock' => $data['stock'] ?? 0,
            'barcode' => $data['barcode'] ?? null,
            'brand' => $data['brand'] ?? null,
            'is_combo' => (int)($data['is_combo'] ?? 0),
            'active' => (int)($data['active'] ?? 1),
        ];

        $stmt = $this->db->prepare("
        INSERT INTO products (name, price, price_sale, stock, barcode, brand, is_combo, active)
        VALUES (:name, :price, :price_sale, :stock, :barcode, :brand, :is_combo, :active)
    ");

        $stmt->execute($payload);

        return [
            'id' => (int)$this->db->lastInsertId(),
            'name' => $payload['name'],
            'price' => $payload['price'],
            'price_sale' => $payload['price_sale'],
            'stock' => $payload['stock'],
            'barcode' => $payload['barcode'],
            'brand' => $payload['brand'],
            'is_combo' => $payload['is_combo'],
            'active' => $payload['active'],
        ];
    }

    public function update(
        int $id,
        ?string $name,
        ?float $price,
        ?float $priceSale,
        ?int $stock,
        ?string $barcode,
        ?string $brand,
        ?int $isCombo = null,
        ?int $active = null
    ): bool
    {
        if (!$this->findById($id)) {
            return false;
        }

        $fields = [];
        $params = ['id' => $id];

        if ($name !== null) { $fields[] = "name = :name"; $params['name'] = $name; }
        if ($price !== null) { $fields[] = "price = :price"; $params['price'] = $price; }
        if ($priceSale !== null) { $fields[] = "price_sale = :price_sale"; $params['price_sale'] = $priceSale; }
        if ($stock !== null) { $fields[] = "stock = :stock"; $params['stock'] = $stock; }
        $fields[] = "barcode = :barcode"; $params['barcode'] = $barcode;
        $fields[] = "brand = :brand"; $params['brand'] = $brand;
        if ($isCombo !== null) { $fields[] = "is_combo = :is_combo"; $params['is_combo'] = $isCombo; }
        if ($active !== null) { $fields[] = "active = :active"; $params['active'] = $active; }

        if (empty($fields)) return true;

        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return true;
    }

    public function updateStock(int $id, int $newStock): bool
    {
        $stmt = $this->db->prepare("UPDATE products SET stock = :stock WHERE id = :id");
        $stmt->execute(['id' => $id, 'stock' => $newStock]);
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function search(string $query, bool $onlyActive = true): array
    {
        $sql = "
        SELECT *
        FROM products
        WHERE (name LIKE :s1 OR (barcode IS NOT NULL AND barcode LIKE :s2))
    ";

        if ($onlyActive) {
            $sql .= " AND active = 1";
        }

        $sql .= " ORDER BY id DESC";

        $stmt = $this->db->prepare($sql);

        $value = "%$query%";

        $stmt->execute([
            's1' => $value,
            's2' => $value
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function barcodeExists(string $barcode): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM products WHERE barcode = :barcode LIMIT 1"
        );
        $stmt->execute(['barcode' => $barcode]);

        return (bool) $stmt->fetchColumn();
    }

    public function bulkInsert(array $data): void
    {
        $stmt = $this->db->prepare("
        INSERT INTO products (name, price, price_sale, stock, barcode, brand, is_combo, active)
        VALUES (:name, :price, :price_sale, :stock, :barcode, :brand, :is_combo, :active)
    ");

        $stmt->execute([
            'name'       => $data['name'],
            'price'      => $data['price'],
            'price_sale' => $data['price_sale'],
            'stock'      => $data['stock'],
            'barcode'    => $data['barcode'],
            'brand'      => $data['brand'],
            'is_combo'   => (int)($data['is_combo'] ?? 0),
            'active'     => (int)($data['active'] ?? 1),
        ]);
    }

    public function updateImportFields(int $id, array $data): bool
    {
        $allowedFields = ['name', 'price', 'price_sale', 'stock', 'barcode', 'brand', 'is_combo', 'active'];
        $fields = [];
        $params = ['id' => $id];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
    }
}
