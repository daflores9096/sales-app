<?php
namespace App\Models;

class SaleItem {
    public $id;
    public $sale_id;
    public $product_id;
    public $quantity;
    public $unit_price;
    public $total_price;

    public function __construct($data = []) {
        foreach ($data as $k => $v) $this->$k = $v;
    }
}
