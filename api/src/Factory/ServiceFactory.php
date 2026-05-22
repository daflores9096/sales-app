<?php
namespace App\Factory;

class ServiceFactory {
    public static function create(string $name) {
        $map = [
            'auth' => \App\Services\AuthService::class,
            'sale' => \App\Services\SaleService::class
        ];

        if (!isset($map[$name])) throw new \Exception('Unknown service ' . $name);
        $class = $map[$name];

        switch ($name) {
            case 'auth':
                return new $class(new \App\Repositories\UserRepository());
            case 'sale':
                return new $class(new \App\Repositories\SaleRepository());
            default:
                throw new \Exception('No mapping for service ' . $name);
        }
    }
}
