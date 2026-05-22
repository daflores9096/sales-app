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

    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM products ORDER BY id DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product ?: null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare("
        INSERT INTO products (name, price, price_sale, stock, barcode, brand)
        VALUES (:name, :price, :price_sale, :stock, :barcode, :brand)
    ");

        $stmt->execute($data);

        return [
            'id' => (int)$this->db->lastInsertId(),
            'name' => $data['name'],
            'price' => $data['price'],
            'price_sale' => $data['price_sale'],
            'stock' => $data['stock'],
            'barcode' => $data['barcode'],
            'brand' => $data['brand']
        ];
    }

    public function update(int $id, ?string $name, ?float $price, ?int $stock, ?int $barcode): bool
    {
        $fields = [];
        $params = ['id' => $id];

        if ($name !== null) { $fields[] = "name = :name"; $params['name'] = $name; }
        if ($price !== null) { $fields[] = "price = :price"; $params['price'] = $price; }
        if ($stock !== null) { $fields[] = "stock = :stock"; $params['stock'] = $stock; }
        if ($barcode !== null) { $fields[] = "barcode = :barcode"; $params['barcode'] = $barcode; }

        if (empty($fields)) return false;

        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
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

    public function search(string $query): array
    {
        $stmt = $this->db->prepare("
        SELECT *
        FROM products
        WHERE name LIKE :s1
        OR (barcode IS NOT NULL AND barcode LIKE :s2)
        ORDER BY id DESC
    ");

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
        INSERT INTO products (name, price, price_sale, stock, barcode, brand)
        VALUES (:name, :price, :price_sale, :stock, :barcode, :brand)
    ");

        $stmt->execute([
            'name'       => $data['name'],
            'price'      => $data['price'],
            'price_sale' => $data['price_sale'],
            'stock'      => $data['stock'],
            'barcode'    => $data['barcode'],
            'brand'      => $data['brand']
        ]);
    }
}
