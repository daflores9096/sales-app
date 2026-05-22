<?php
namespace App\Controllers;

use App\Services\ProductService;
use App\Utils\Response;
use Exception;

class ProductController
{
    private ProductService $productService;

    public function __construct()
    {
        $this->productService = new ProductService();
    }

    /**
     * Lista todos los productos
     * GET /api/products
     */
    public function list(object $user): void
    {
        try {
            $search = isset($_GET['search'])
                ? (is_array($_GET['search']) ? trim($_GET['search'][0]) : trim($_GET['search']))
                : '';

            if ($search !== '') {
                $products = $this->productService->search($search);
            } else {
                $products = $this->productService->getAll();
            }

            Response::json(['status' => 'success', 'data' => $products]);

        } catch (Exception $e) {
            Response::error('Error al obtener productos: ' . $e->getMessage(), 500);
        }
    }


    /**
     * Crea un nuevo producto
     * POST /api/products
     */
    public function create(): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        $name = $input['name'] ?? null;
        $price = $input['price'] ?? null;
        $priceSale = $input['price_sale'] ?? null;
        $stock = $input['stock'] ?? 0;
        $barcode = $input['barcode'] ?? null;
        $brand = $input['brand'] ?? null;

        if (!$name || $price === null || $priceSale === null) {
            Response::error(
                'Campos obligatorios: name, price, price_sale',
                422
            );
            return;
        }

        try {
            $product = $this->productService->create(
                $name,
                $price,
                $priceSale,
                $stock,
                $barcode,
                $brand
            );

            Response::json([
                'status' => 'success',
                'data' => $product
            ], 201);

        } catch (Exception $e) {
            Response::error(
                'Error al crear producto: ' . $e->getMessage(),
                500
            );
        }
    }


    /**
     * Actualiza un producto existente
     * PUT /api/products/{id}
     */
    public function update(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? null;
        $price = $input['price'] ?? null;
        $stock = $input['stock'] ?? null;
        $barcode = $input['barcode'] ?? null;

        try {
            $updated = $this->productService->update($id, $name, $price, $stock, $barcode);

            if (!$updated) {
                Response::error('Producto no encontrado o sin cambios', 404);
                return;
            }

            Response::json(['status' => 'success', 'message' => 'Producto actualizado']);
        } catch (Exception $e) {
            Response::error('Error al actualizar producto: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Elimina un producto
     * DELETE /api/products/{id}
     */
    public function delete(int $id): void
    {
        try {
            $deleted = $this->productService->delete($id);
            if (!$deleted) {
                Response::error('Producto no encontrado', 404);
                return;
            }

            Response::noContent(204);
        } catch (Exception $e) {
            Response::error('Error al eliminar producto: ' . $e->getMessage(), 500);
        }
    }

    public function import(): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['products']) || !is_array($input['products'])) {
            Response::error('Formato inválido', 422);
            return;
        }

        $service = new ProductService();

        try {
            $result = $service->importFromExcel($input['products']);

            Response::json([
                'status' => 'success',
                'data' => $result
            ], 200);

        } catch (\Throwable $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Error al importar productos',
                'detail' => $e->getMessage()
            ], 500);
        }
    }

}
