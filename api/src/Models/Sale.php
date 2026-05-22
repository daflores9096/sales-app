<?php
namespace App\Models;

class Sale {
    public $id;
    public $user_id;
    public $total;
    public $created_at;

    public function __construct($data = []) {
        foreach ($data as $k => $v) $this->$k = $v;
    }
}
