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


    public function update(int $id, ?string $name, ?float $price, ?int $stock, ?int $barcode): bool
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
        $failed = [];

        foreach ($rows as $index => $row) {

            // Validaciones de negocio (Excel estricto)
            if (
                empty($row['nombre_producto']) ||
                !isset($row['precio_compra']) ||
                !isset($row['precio_venta'])
            ) {
                $failed[] = [
                    'row' => $index + 2,
                    'error' => 'Campos obligatorios faltantes'
                ];
                continue;
            }

            if (!is_numeric($row['precio_compra']) || !is_numeric($row['precio_venta'])) {
                $failed[] = [
                    'row' => $index + 2,
                    'error' => 'Precios inválidos'
                ];
                continue;
            }

            // Validar barcode duplicado
            if (!empty($row['barcode']) && $this->productRepository->barcodeExists($row['barcode'])) {
                $failed[] = [
                    'row' => $index + 2,
                    'barcode' => $row['barcode'],
                    'error' => 'Barcode duplicado'
                ];
                continue;
            }

            // Mapping Excel → BD
            $this->productRepository->bulkInsert([
                'name'       => $row['nombre_producto'],
                'price'      => (float)$row['precio_compra'],
                'price_sale' => (float)$row['precio_venta'],
                'stock'      => 0,
                'barcode'    => $row['barcode'] ?? null,
                'brand'      => $row['marca'] ?? null
            ]);

            $imported++;
        }

        return [
            'imported' => $imported,
            'failed'   => $failed
        ];
    }


}
