<?php
namespace App\Factory;

class RepositoryFactory {
    public static function create(string $name) {
        $map = [
            'user' => \App\Repositories\UserRepository::class,
            'product' => \App\Repositories\ProductRepository::class,
            'sale' => \App\Repositories\SaleRepository::class,
            'report' => \App\Repositories\ReportRepository::class
        ];

        if (!isset($map[$name])) throw new \Exception('Unknown repository ' . $name);
        $class = $map[$name];
        return new $class();
    }
}
