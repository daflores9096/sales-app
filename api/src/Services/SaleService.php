<?php
namespace App\Services;

use App\Repositories\SaleRepository;
use App\Repositories\ProductRepository;
use App\Repositories\ComboRepository;
use App\Utils\Database;
use PDO;
use Exception;

class SaleService
{
    private SaleRepository $saleRepository;
    private ProductRepository $productRepository;
    private ComboRepository $comboRepository;
    private PDO $db;

    public function __construct()
    {
        $this->saleRepository = new SaleRepository();
        $this->productRepository = new ProductRepository();
        $this->comboRepository = new ComboRepository();
        $this->db = Database::getInstance();
    }

    /**
     * Crea una venta con varios productos.
     * Si el ítem es un combo, descuenta el stock de cada producto componente.
     */
    public function createSale(int $userId, array $items, string $paymentMethod = 'cash'): int
    {
        try {
            $this->db->beginTransaction();

            $total = 0;
            $productsCache = [];
            $componentStockUpdates = [];

            foreach ($items as $item) {

                if (!isset($item['product_id'], $item['quantity'])) {
                    throw new Exception('Formato de ítem inválido');
                }

                $saleQty = (int)$item['quantity'];
                if ($saleQty <= 0) {
                    throw new Exception('La cantidad debe ser mayor a 0');
                }

                // 🔒 Bloquear producto vendido
                $stmt = $this->db->prepare("
                SELECT id, name, price_sale, stock, active, is_combo
                FROM products
                WHERE id = :id
                FOR UPDATE
            ");
                $stmt->execute(['id' => $item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    throw new Exception("Producto ID {$item['product_id']} no existe");
                }

                if ((int)($product['active'] ?? 1) !== 1) {
                    throw new Exception("El producto {$product['name']} no está disponible");
                }

                $isCombo = (int)($product['is_combo'] ?? 0) === 1;

                if ($isCombo) {
                    $componentDeltas = $this->reserveComboComponents(
                        (int)$product['id'],
                        $saleQty,
                        $componentStockUpdates
                    );
                    foreach ($componentDeltas as $productId => $delta) {
                        $componentStockUpdates[$productId] = ($componentStockUpdates[$productId] ?? 0) + $delta;
                    }
                    // El stock del producto-combo se sincroniza luego con lo armable
                    $newComboStock = max(0, (int)$product['stock'] - $saleQty);
                } else {
                    $pendingAsComponent = (int)($componentStockUpdates[(int)$product['id']] ?? 0);
                    $available = (int)$product['stock'] - $pendingAsComponent;
                    if ($available < $saleQty) {
                        throw new Exception("Stock insuficiente para {$product['name']}");
                    }
                    $newComboStock = (int)$product['stock'] - $saleQty;
                }

                $total += $product['price_sale'] * $saleQty;

                $productsCache[] = [
                    'id' => $product['id'],
                    'price' => $product['price_sale'],
                    'quantity' => $saleQty,
                    'new_stock' => $newComboStock,
                    'is_combo' => $isCombo,
                ];
            }

            // Crear venta
            $saleId = $this->saleRepository->createSale($userId, $total, $paymentMethod);

            // Registrar items y actualizar stock del producto vendido (combo o normal)
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

            // Descontar stock de componentes de combos
            foreach ($componentStockUpdates as $productId => $delta) {
                $locked = $this->lockProduct((int)$productId);
                $this->productRepository->updateStock(
                    (int)$productId,
                    (int)$locked['stock'] - (int)$delta
                );
            }

            // Recalcular stock visible de combos afectados (por si compartían componentes)
            $this->refreshComboStocksAfterSale($productsCache, $componentStockUpdates);

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
                $product = $this->lockProduct((int)$item['product_id']);
                $qty = (int)$item['quantity'];

                if ((int)($product['is_combo'] ?? 0) === 1) {
                    $this->restoreComboComponents((int)$product['id'], $qty);
                    $available = $this->calculateComboAvailableStock((int)$product['id']);
                    $this->productRepository->updateStock((int)$product['id'], $available);
                } else {
                    $this->productRepository->updateStock(
                        (int)$item['product_id'],
                        (int)$product['stock'] + $qty
                    );
                }
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

    /**
     * Valida y reserva stock de componentes. Devuelve mapa product_id => cantidad a descontar.
     *
     * @param array<int,int> $pendingDeltas cantidades ya reservadas en esta misma venta
     * @return array<int,int>
     */
    private function reserveComboComponents(int $comboProductId, int $saleQty, array $pendingDeltas = []): array
    {
        $combo = $this->comboRepository->findByProductId($comboProductId);
        if (!$combo) {
            throw new Exception('El combo vendido no tiene definición de componentes');
        }

        if (($combo['status'] ?? '') !== 'active') {
            throw new Exception('El combo no está activo');
        }

        $components = $this->comboRepository->getItems((int)$combo['id']);
        if (empty($components)) {
            throw new Exception('El combo no tiene productos asociados');
        }

        $deltas = [];

        foreach ($components as $component) {
            $componentProductId = (int)$component['product_id'];
            $perComboQty = (int)$component['quantity'];
            $needed = $perComboQty * $saleQty;

            $locked = $this->lockProduct($componentProductId);

            if ((int)($locked['active'] ?? 1) !== 1) {
                throw new Exception("El componente {$locked['name']} no está disponible");
            }

            $alreadyReserved = (int)($pendingDeltas[$componentProductId] ?? 0);
            $available = (int)$locked['stock'] - $alreadyReserved;

            if ($available < $needed) {
                throw new Exception(
                    "Stock insuficiente de {$locked['name']} para armar el combo (necesario: {$needed}, disponible: {$available})"
                );
            }

            $deltas[$componentProductId] = ($deltas[$componentProductId] ?? 0) + $needed;
        }

        return $deltas;
    }

    private function restoreComboComponents(int $comboProductId, int $saleQty): void
    {
        $combo = $this->comboRepository->findByProductId($comboProductId);
        if (!$combo) {
            return;
        }

        $components = $this->comboRepository->getItems((int)$combo['id']);
        foreach ($components as $component) {
            $componentProductId = (int)$component['product_id'];
            $restoreQty = ((int)$component['quantity']) * $saleQty;
            $locked = $this->lockProduct($componentProductId);
            $this->productRepository->updateStock(
                $componentProductId,
                (int)$locked['stock'] + $restoreQty
            );
        }
    }

    private function calculateComboAvailableStock(int $comboProductId): int
    {
        $combo = $this->comboRepository->findByProductId($comboProductId);
        if (!$combo) {
            return 0;
        }

        $components = $this->comboRepository->getItems((int)$combo['id']);
        if (empty($components)) {
            return 0;
        }

        $min = PHP_INT_MAX;
        foreach ($components as $component) {
            $product = $this->productRepository->findById((int)$component['product_id']);
            if (!$product) {
                return 0;
            }
            $perComboQty = max(1, (int)$component['quantity']);
            $available = intdiv((int)$product['stock'], $perComboQty);
            $min = min($min, $available);
        }

        return max(0, $min === PHP_INT_MAX ? 0 : $min);
    }

    /**
     * Tras vender, deja el stock del producto-combo alineado con lo armable.
     */
    private function refreshComboStocksAfterSale(array $productsCache, array $componentStockUpdates): void
    {
        $comboProductIds = [];
        foreach ($productsCache as $p) {
            if (!empty($p['is_combo'])) {
                $comboProductIds[(int)$p['id']] = true;
            }
        }

        // También refrescar otros combos que usen los mismos componentes
        if (!empty($componentStockUpdates)) {
            $placeholders = implode(',', array_fill(0, count($componentStockUpdates), '?'));
            $stmt = $this->db->prepare("
                SELECT DISTINCT c.product_id
                FROM combo_items ci
                INNER JOIN combos c ON c.id = ci.combo_id
                WHERE ci.product_id IN ($placeholders)
                  AND c.product_id IS NOT NULL
                  AND c.status = 'active'
            ");
            $stmt->execute(array_keys($componentStockUpdates));
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $productId) {
                $comboProductIds[(int)$productId] = true;
            }
        }

        foreach (array_keys($comboProductIds) as $comboProductId) {
            $available = $this->calculateComboAvailableStock((int)$comboProductId);
            $this->productRepository->updateStock((int)$comboProductId, $available);
        }
    }

    private function lockProduct(int $productId): array
    {
        $stmt = $this->db->prepare("
            SELECT id, name, price_sale, stock, active, is_combo
            FROM products
            WHERE id = :id
            FOR UPDATE
        ");
        $stmt->execute(['id' => $productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new Exception("Producto ID {$productId} no existe");
        }

        return $product;
    }

}
