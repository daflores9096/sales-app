<?php
namespace App\Services;

use App\Repositories\ProductRepository;
use Exception;

class ProductService
{
    private ProductRepository $productRepository;

    public function __construct()
    {
        $this->productRepository = new ProductRepository();
    }

    public function getAll(): array
    {
        return $this->productRepository->findAll();
    }

    public function create(
        string $name,
        float $price,
        float $priceSale,
        int $stock = 0,
        ?string $barcode = null,
        ?string $brand = null
    ): array {
        return $this->productRepository->create([
            'name' => $name,
            'price' => $price,
            'price_sale' => $priceSale,
            'stock' => $stock,
            'barcode' => $barcode,
            'brand' => $brand
        ]);
    }


    public function update(int $id, ?string $name, ?float $price, ?int $stock, ?string $barcode): bool
    {
        return $this->productRepository->update($id, $name, $price, $stock, $barcode);
    }

    public function delete(int $id): bool
    {
        return $this->productRepository->delete($id);
    }

    public function search(string $query): array
    {
        return $this->productRepository->search($query);
    }

    public function importFromExcel(array $rows): array
    {
        $imported = 0;
        $created = 0;
        $updated = 0;
        $unchanged = 0;
        $failed = [];

        foreach ($rows as $index => $row) {
            $name = trim((string)($row['nombre_producto'] ?? ''));
            $barcode = $this->nullableString($row['barcode'] ?? null);
            $brand = $this->nullableString($row['marca'] ?? null);

            // Validaciones de negocio (Excel estricto)
            if (
                $name === '' ||
                !isset($row['precio_compra']) ||
                !isset($row['precio_venta']) ||
                !isset($row['stock'])
            ) {
                $failed[] = [
                    'row' => $index + 2,
                    'error' => 'Campos obligatorios faltantes'
                ];
                continue;
            }

            if (!is_numeric($row['precio_compra']) || !is_numeric($row['precio_venta']) || !is_numeric($row['stock'])) {
                $failed[] = [
                    'row' => $index + 2,
                    'error' => 'Precios o stock inválidos'
                ];
                continue;
            }

            $stock = (int)$row['stock'];

            if ($stock < 0) {
                $failed[] = [
                    'row' => $index + 2,
                    'error' => 'Stock inválido'
                ];
                continue;
            }

            // Mapping Excel → BD
            $productData = [
                'name'       => $name,
                'price'      => (float)$row['precio_compra'],
                'price_sale' => (float)$row['precio_venta'],
                'stock'      => $stock,
                'barcode'    => $barcode,
                'brand'      => $brand
            ];

            $existingProduct = $this->findExistingProduct($name, $barcode);

            if ($existingProduct) {
                $changes = $this->getChangedImportFields($existingProduct, $productData);

                if (empty($changes)) {
                    $unchanged++;
                } else {
                    $this->productRepository->updateImportFields((int)$existingProduct['id'], $changes);
                    $updated++;
                }
            } else {
                $this->productRepository->bulkInsert($productData);
                $created++;
            }

            $imported++;
        }

        return [
            'imported' => $imported,
            'created' => $created,
            'updated' => $updated,
            'unchanged' => $unchanged,
            'failed'   => $failed
        ];
    }

    private function findExistingProduct(string $name, ?string $barcode): ?array
    {
        if ($barcode !== null) {
            $product = $this->productRepository->findByBarcode($barcode);

            if ($product) {
                return $product;
            }
        }

        return $this->productRepository->findByName($name);
    }

    private function getChangedImportFields(array $existingProduct, array $newData): array
    {
        $changes = [];

        foreach ($newData as $field => $newValue) {
            $currentValue = $existingProduct[$field] ?? null;

            if ($field === 'price' || $field === 'price_sale') {
                if ((float)$currentValue !== (float)$newValue) {
                    $changes[$field] = $newValue;
                }

                continue;
            }

            if ($field === 'stock') {
                if ((int)$currentValue !== (int)$newValue) {
                    $changes[$field] = $newValue;
                }

                continue;
            }

            if ($this->nullableString($currentValue) !== $this->nullableString($newValue)) {
                $changes[$field] = $newValue;
            }
        }

        return $changes;
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string)($value ?? ''));

        return $normalized === '' ? null : $normalized;
    }


}
