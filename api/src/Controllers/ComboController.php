<?php
namespace App\Controllers;

use App\Services\ComboService;
use App\Utils\Response;
use Exception;

class ComboController
{
    private ComboService $comboService;

    public function __construct()
    {
        $this->comboService = new ComboService();
    }

    /**
     * GET /api/combos
     */
    public function list(): void
    {
        try {
            $combos = $this->comboService->getAll();
            Response::json(['status' => 'success', 'data' => $combos]);
        } catch (Exception $e) {
            Response::error('Error al obtener combos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/combos/{id}
     */
    public function show(int $id): void
    {
        try {
            $combo = $this->comboService->getById($id);
            if (!$combo) {
                Response::error('Combo no encontrado', 404);
                return;
            }

            Response::json(['status' => 'success', 'data' => $combo]);
        } catch (Exception $e) {
            Response::error('Error al obtener combo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/combos
     */
    public function create(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $combo = $this->comboService->create($input);
            Response::json(['status' => 'success', 'data' => $combo], 201);
        } catch (Exception $e) {
            $code = $this->statusFromMessage($e->getMessage());
            Response::error($e->getMessage(), $code);
        }
    }

    /**
     * PUT /api/combos/{id}
     */
    public function update(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $combo = $this->comboService->update($id, $input);
            Response::json(['status' => 'success', 'data' => $combo]);
        } catch (Exception $e) {
            if ($e->getMessage() === 'Combo no encontrado') {
                Response::error($e->getMessage(), 404);
                return;
            }
            $code = $this->statusFromMessage($e->getMessage());
            Response::error($e->getMessage(), $code);
        }
    }

    /**
     * PATCH /api/combos/{id}/status
     * Body: { "status": "active" | "disabled" }
     */
    public function setStatus(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['status'] ?? null;

        if ($status === null || $status === '') {
            Response::error('Campo obligatorio: status', 422);
            return;
        }

        try {
            $combo = $this->comboService->setStatus($id, (string)$status);
            Response::json(['status' => 'success', 'data' => $combo]);
        } catch (Exception $e) {
            if ($e->getMessage() === 'Combo no encontrado') {
                Response::error($e->getMessage(), 404);
                return;
            }
            $code = $this->statusFromMessage($e->getMessage());
            Response::error($e->getMessage(), $code);
        }
    }

    /**
     * DELETE /api/combos/{id}
     */
    public function delete(int $id): void
    {
        try {
            $deleted = $this->comboService->delete($id);
            if (!$deleted) {
                Response::error('Combo no encontrado', 404);
                return;
            }

            Response::noContent(204);
        } catch (Exception $e) {
            Response::error('Error al eliminar combo: ' . $e->getMessage(), 500);
        }
    }

    private function statusFromMessage(string $message): int
    {
        $validationHints = [
            'obligatorio',
            'debe',
            'inválido',
            'invalido',
            'no puede',
            'ya está en uso',
            'no se puede',
            'no está activo',
            'no existe',
        ];

        $lower = mb_strtolower($message);
        foreach ($validationHints as $hint) {
            if (str_contains($lower, $hint)) {
                return 422;
            }
        }

        return 500;
    }
}
