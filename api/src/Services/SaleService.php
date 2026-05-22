<?php
namespace App\Services;

use App\Repositories\SaleRepository;
use App\Repositories\ProductRepository;
use App\Utils\Database;
use PDO;
use Exception;

class SaleService
{
    private SaleRepository $saleRepository;
    private ProductRepository $productRepository;
    private PDO $db;

    public function __construct()
    {
        $this->saleRepository = new SaleRepository();
        $this->productRepository = new ProductRepository();
        $this->db = Database::getInstance();
    }

    /**
     * Crea una venta con varios productos.
     */
    public function createSale(int $userId, array $items): int
    {
        try {
            $this->db->beginTransaction();

            $total = 0;
            $productsCache = [];

            foreach ($items as $item) {

                if (!isset($item['product_id'], $item['quantity'])) {
                    throw new Exception('Formato de ítem inválido');
                }

                // 🔒 Bloquear producto
                $stmt = $this->db->prepare("
                SELECT id, name, price, stock
                FROM products
                WHERE id = :id
                FOR UPDATE
            ");
                $stmt->execute(['id' => $item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    throw new Exception("Producto ID {$item['product_id']} no existe");
                }

                if ($product['stock'] < $item['quantity']) {
                    throw new Exception("Stock insuficiente para {$product['name']}");
                }

                $total += $product['price'] * $item['quantity'];

                // Guardamos en cache para no volver a consultar
                $productsCache[] = [
                    'id' => $product['id'],
                    'price' => $product['price'],
                    'quantity' => $item['quantity'],
                    'new_stock' => $product['stock'] - $item['quantity']
                ];
            }

            // Crear venta
            $saleId = $this->saleRepository->createSale($userId, $total);

            // Registrar items y actualizar stock
            foreach ($productsCache as $p) {

                $this->saleRepository->addSaleItem(
                    $saleId,
                    $p['id'],
                    $p['quantity'],
                    $p['price']
                );

                $this->productRepository->updateStock(
                    $p['id'],
                    $p['new_stock']
                );
            }

            $this->db->commit();
            return $saleId;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Obtiene las ventas de un usuario (o todas si es admin/superadmin).
     */
    public function getSalesByUser(int $userId, int $roleId): array
    {
        if (in_array($roleId, [1, 2])) {
            return $this->saleRepository->findAll();
        }
        return $this->saleRepository->findByUser($userId);
    }

    public function getSaleDetail(int $saleId, int $userId, int $roleId): array
    {
        // Admin y superadmin pueden ver cualquier venta
        if (!in_array($roleId, [1, 2])) {
            // Validar que la venta sea del usuario
            if (!$this->saleRepository->belongsToUser($saleId, $userId)) {
                throw new Exception('No autorizado para ver esta venta');
            }
        }

        $sale = $this->saleRepository->findById($saleId);
        if (!$sale) {
            throw new Exception('Venta no encontrada');
        }

        $items = $this->saleRepository->getSaleItems($saleId);

        return [
            'sale' => $sale,
            'items' => $items
        ];
    }

    public function cancelSale(int $saleId, object $user): void
    {
        try {
            $this->db->beginTransaction();

            // Obtener la venta
            $sale = $this->saleRepository->findById($saleId);
            if (!$sale) {
                throw new Exception('Venta no encontrada');
            }

            // Verificar que el estado de la venta no sea 'cancelled'
            if ($sale['status'] === 'cancelled') {
                throw new Exception('La venta ya fue anulada');
            }

            // Solo admin/superadmin puede anular ventas (vendedor no)
            if (!in_array((int)$user->role_id, [1, 2], true)) {
                throw new Exception('No autorizado para anular ventas');
            }

            // Recuperar los productos de la venta y hacer rollback de stock
            $items = $this->saleRepository->getItemsWithProductId($saleId);
            foreach ($items as $item) {
                $product = $this->productRepository->findById($item['product_id']);
                $this->productRepository->updateStock(
                    $item['product_id'],
                    $product['stock'] + $item['quantity']
                );
            }

            // Marcar la venta como cancelada
            $this->saleRepository->cancelSale($saleId);

            // Confirmar la transacción
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function paginate(array $filters): array
    {
        $roleId = (int)($filters['role_id'] ?? 3);
        $userId = isset($filters['user_id']) ? (int)$filters['user_id'] : null;
        $isAdmin = in_array($roleId, [1, 2], true);

        return $this->saleRepository->paginate(
            $filters['page'],
            $filters['limit'],
            $filters['status'] ?? null,
            $filters['from'] ?? null,
            $filters['to'] ?? null,
            $filters['q'] ?? null,
            $userId,
            $isAdmin
        );
    }

}
