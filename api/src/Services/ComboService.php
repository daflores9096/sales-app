<?php
namespace App\Services;

use App\Repositories\ComboRepository;
use App\Repositories\ProductRepository;
use App\Utils\Database;
use Exception;
use PDO;

class ComboService
{
    private ComboRepository $comboRepository;
    private ProductRepository $productRepository;
    private PDO $db;

    public function __construct()
    {
        $this->comboRepository = new ComboRepository();
        $this->productRepository = new ProductRepository();
        $this->db = Database::getInstance();
    }

    public function getAll(): array
    {
        $combos = $this->comboRepository->findAll();

        return array_map(function (array $combo) {
            $combo['items'] = $this->comboRepository->getItems((int)$combo['id']);
            return $this->normalizeCombo($combo);
        }, $combos);
    }

    public function getById(int $id): ?array
    {
        $combo = $this->comboRepository->findById($id);
        if (!$combo) {
            return null;
        }

        $combo['items'] = $this->comboRepository->getItems($id);
        return $this->normalizeCombo($combo);
    }

    /**
     * @param array{name:string,code?:?string,extra_cost?:float|int|string,status?:string,items:array} $payload
     */
    public function create(array $payload): array
    {
        $name = trim((string)($payload['name'] ?? ''));
        $extraCost = $this->parseMoney($payload['extra_cost'] ?? 0);
        $status = $this->normalizeStatus($payload['status'] ?? 'active');
        $itemsInput = $payload['items'] ?? [];

        if ($name === '') {
            throw new Exception('El nombre del combo es obligatorio');
        }

        if ($extraCost < 0) {
            throw new Exception('El costo extra no puede ser negativo');
        }

        if (!is_array($itemsInput) || count($itemsInput) === 0) {
            throw new Exception('El combo debe incluir al menos un producto');
        }

        $resolvedItems = $this->resolveItems($itemsInput);
        $price = $this->calculatePrice($resolvedItems, $extraCost);
        $costPrice = $this->calculateCostPrice($resolvedItems, $extraCost);
        $stock = $this->calculateAvailableStock($resolvedItems);
        $code = $this->resolveCode($payload['code'] ?? null);

        try {
            $this->db->beginTransaction();

            $product = $this->productRepository->create([
                'name' => $name,
                'price' => $costPrice,
                'price_sale' => $price,
                'stock' => $stock,
                'barcode' => $code,
                'brand' => 'Combo',
                'is_combo' => 1,
                'active' => $status === 'active' ? 1 : 0,
            ]);

            $combo = $this->comboRepository->create([
                'name' => $name,
                'code' => $code,
                'price' => $price,
                'extra_cost' => $extraCost,
                'status' => $status,
                'product_id' => $product['id'],
            ]);

            $this->comboRepository->replaceItems((int)$combo['id'], $resolvedItems);
            $this->db->commit();

            return $this->getById((int)$combo['id']);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @param array{name?:string,code?:?string,extra_cost?:float|int|string,status?:string,items?:array} $payload
     */
    public function update(int $id, array $payload): array
    {
        $existing = $this->comboRepository->findById($id);
        if (!$existing) {
            throw new Exception('Combo no encontrado');
        }

        $name = array_key_exists('name', $payload)
            ? trim((string)$payload['name'])
            : (string)$existing['name'];
        $extraCost = array_key_exists('extra_cost', $payload)
            ? $this->parseMoney($payload['extra_cost'])
            : (float)$existing['extra_cost'];
        $status = array_key_exists('status', $payload)
            ? $this->normalizeStatus($payload['status'])
            : (string)$existing['status'];

        if ($name === '') {
            throw new Exception('El nombre del combo es obligatorio');
        }

        if ($extraCost < 0) {
            throw new Exception('El costo extra no puede ser negativo');
        }

        if (array_key_exists('items', $payload)) {
            $itemsInput = $payload['items'];
            if (!is_array($itemsInput) || count($itemsInput) === 0) {
                throw new Exception('El combo debe incluir al menos un producto');
            }
            $resolvedItems = $this->resolveItems($itemsInput);
        } else {
            $currentItems = $this->comboRepository->getItems($id);
            $resolvedItems = array_map(static function (array $item): array {
                return [
                    'product_id' => (int)$item['product_id'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'cost_price' => (float)($item['product_cost'] ?? 0),
                    'stock' => (int)($item['product_stock'] ?? 0),
                ];
            }, $currentItems);
        }

        $price = $this->calculatePrice($resolvedItems, $extraCost);
        $costPrice = $this->calculateCostPrice($resolvedItems, $extraCost);
        $stock = $this->calculateAvailableStock($resolvedItems);

        $code = (string)$existing['code'];
        if (array_key_exists('code', $payload)) {
            $code = $this->resolveCode($payload['code'] ?? null, $id);
        }

        $productId = $existing['product_id'] !== null ? (int)$existing['product_id'] : null;

        try {
            $this->db->beginTransaction();

            if ($productId) {
                $this->productRepository->update(
                    $productId,
                    $name,
                    $costPrice,
                    $price,
                    $stock,
                    $code,
                    'Combo',
                    1,
                    $status === 'active' ? 1 : 0
                );
            } else {
                $product = $this->productRepository->create([
                    'name' => $name,
                    'price' => $costPrice,
                    'price_sale' => $price,
                    'stock' => $stock,
                    'barcode' => $code,
                    'brand' => 'Combo',
                    'is_combo' => 1,
                    'active' => $status === 'active' ? 1 : 0,
                ]);
                $productId = (int)$product['id'];
            }

            $this->comboRepository->update($id, [
                'name' => $name,
                'code' => $code,
                'price' => $price,
                'extra_cost' => $extraCost,
                'status' => $status,
                'product_id' => $productId,
            ]);

            $this->comboRepository->replaceItems($id, $resolvedItems);
            $this->db->commit();

            return $this->getById($id);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function setStatus(int $id, string $status): array
    {
        $existing = $this->comboRepository->findById($id);
        if (!$existing) {
            throw new Exception('Combo no encontrado');
        }

        $normalized = $this->normalizeStatus($status);

        try {
            $this->db->beginTransaction();
            $this->comboRepository->setStatus($id, $normalized);

            if ($existing['product_id'] !== null) {
                $product = $this->productRepository->findById((int)$existing['product_id']);
                if ($product) {
                    $this->productRepository->update(
                        (int)$existing['product_id'],
                        null,
                        null,
                        null,
                        null,
                        $product['barcode'] ?? null,
                        $product['brand'] ?? null,
                        1,
                        $normalized === 'active' ? 1 : 0
                    );
                }
            }

            $this->db->commit();
            return $this->getById($id);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function delete(int $id): bool
    {
        $existing = $this->comboRepository->findById($id);
        if (!$existing) {
            return false;
        }

        try {
            $this->db->beginTransaction();

            $productId = $existing['product_id'] !== null ? (int)$existing['product_id'] : null;
            $this->comboRepository->delete($id);

            if ($productId) {
                // Desactivar el producto vinculado para no romper historicos de venta.
                $product = $this->productRepository->findById($productId);
                if ($product) {
                    $this->productRepository->update(
                        $productId,
                        null,
                        null,
                        null,
                        null,
                        $product['barcode'] ?? null,
                        $product['brand'] ?? null,
                        1,
                        0
                    );
                }
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function resolveItems(array $itemsInput): array
    {
        $resolved = [];
        $seen = [];

        foreach ($itemsInput as $index => $item) {
            $productId = (int)($item['product_id'] ?? 0);
            $quantity = (int)($item['quantity'] ?? 0);

            if ($productId <= 0 || $quantity <= 0) {
                throw new Exception('Cada ítem del combo requiere product_id y quantity válidos (fila ' . ($index + 1) . ')');
            }

            if (isset($seen[$productId])) {
                throw new Exception('No se puede repetir el mismo producto dentro del combo');
            }
            $seen[$productId] = true;

            $product = $this->productRepository->findById($productId);
            if (!$product) {
                throw new Exception("Producto ID {$productId} no existe");
            }

            if ((int)($product['is_combo'] ?? 0) === 1) {
                throw new Exception("No se puede incluir otro combo como componente ({$product['name']})");
            }

            if ((int)($product['active'] ?? 1) !== 1) {
                throw new Exception("El producto {$product['name']} no está activo");
            }

            $resolved[] = [
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => (float)$product['price_sale'],
                'cost_price' => (float)$product['price'],
                'stock' => (int)$product['stock'],
            ];
        }

        return $resolved;
    }

    private function calculatePrice(array $items, float $extraCost): float
    {
        $total = 0.0;
        foreach ($items as $item) {
            $total += ((float)$item['unit_price']) * ((int)$item['quantity']);
        }

        return round($total + $extraCost, 2);
    }

    private function calculateCostPrice(array $items, float $extraCost): float
    {
        $total = 0.0;
        foreach ($items as $item) {
            $total += ((float)$item['cost_price']) * ((int)$item['quantity']);
        }

        return round($total + $extraCost, 2);
    }

    private function calculateAvailableStock(array $items): int
    {
        if (empty($items)) {
            return 0;
        }

        $min = PHP_INT_MAX;
        foreach ($items as $item) {
            $qty = max(1, (int)$item['quantity']);
            $available = intdiv((int)$item['stock'], $qty);
            $min = min($min, $available);
        }

        return max(0, $min === PHP_INT_MAX ? 0 : $min);
    }

    private function resolveCode(?string $manualCode, ?int $excludeComboId = null): string
    {
        $manual = trim((string)($manualCode ?? ''));

        if ($manual !== '') {
            if (!preg_match('/^\d{6}$/', $manual)) {
                throw new Exception('El código debe tener exactamente 6 dígitos numéricos');
            }

            if ($this->isCodeTaken($manual, $excludeComboId)) {
                throw new Exception('El código ya está en uso');
            }

            return $manual;
        }

        for ($attempt = 0; $attempt < 50; $attempt++) {
            $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            if (!$this->isCodeTaken($code, $excludeComboId)) {
                return $code;
            }
        }

        throw new Exception('No se pudo generar un código único de 6 dígitos');
    }

    private function isCodeTaken(string $code, ?int $excludeComboId = null): bool
    {
        if ($this->comboRepository->codeExists($code, $excludeComboId)) {
            return true;
        }

        $product = $this->productRepository->findByBarcode($code);
        if (!$product) {
            return false;
        }

        if ($excludeComboId !== null) {
            $combo = $this->comboRepository->findById($excludeComboId);
            if ($combo && (int)($combo['product_id'] ?? 0) === (int)$product['id']) {
                return false;
            }
        }

        return true;
    }

    private function normalizeStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        if (!in_array($normalized, ['active', 'disabled'], true)) {
            throw new Exception('Estado inválido. Use active o disabled');
        }

        return $normalized;
    }

    private function parseMoney(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        if (!is_numeric($value)) {
            throw new Exception('El costo extra debe ser numérico');
        }

        return round((float)$value, 2);
    }

    private function normalizeCombo(array $combo): array
    {
        $combo['id'] = (int)$combo['id'];
        $combo['price'] = (float)$combo['price'];
        $combo['extra_cost'] = (float)$combo['extra_cost'];
        $combo['product_id'] = $combo['product_id'] !== null ? (int)$combo['product_id'] : null;
        $combo['items_count'] = isset($combo['items_count'])
            ? (int)$combo['items_count']
            : (isset($combo['items']) ? count($combo['items']) : 0);

        if (isset($combo['items']) && is_array($combo['items'])) {
            $combo['items'] = array_map(static function (array $item): array {
                return [
                    'id' => (int)$item['id'],
                    'combo_id' => (int)$item['combo_id'],
                    'product_id' => (int)$item['product_id'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'product_name' => $item['product_name'] ?? null,
                    'product_barcode' => $item['product_barcode'] ?? null,
                    'line_total' => round(((float)$item['unit_price']) * ((int)$item['quantity']), 2),
                ];
            }, $combo['items']);
        }

        return $combo;
    }
}
