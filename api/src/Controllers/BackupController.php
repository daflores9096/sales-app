<?php
namespace App\Controllers;

use App\Services\BackupService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;
use Exception;

class BackupController
{
    private BackupService $backupService;

    public function __construct()
    {
        $this->backupService = new BackupService();
    }

    public function create(): void
    {
        AuthMiddleware::requireRole('superadmin');

        try {
            $backup = $this->backupService->createBackup();
            Response::json([
                'status' => 'success',
                'data' => $backup,
            ]);
        } catch (Exception $e) {
            Response::error('Error al crear respaldo: ' . $e->getMessage(), 500);
        }
    }

    public function restore(): void
    {
        AuthMiddleware::requireRole('superadmin');

        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['backup']) || !is_array($input['backup'])) {
            Response::error('Debe enviar un respaldo válido', 422);
        }

        try {
            $result = $this->backupService->restoreBackup($input['backup']);
            Response::json([
                'status' => 'success',
                'message' => 'Respaldo restaurado correctamente',
                'data' => $result,
            ]);
        } catch (Exception $e) {
            Response::error('Error al restaurar respaldo: ' . $e->getMessage(), 500);
        }
    }
}
