<?php
namespace App\Controllers;

use App\Repositories\UserRepository;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class UserController {
    private $repo;

    public function __construct() {
        $this->repo = new UserRepository();
    }

    /**
     * Comprueba que el actor (admin/superadmin) pueda gestionar al usuario objetivo.
     */
    private function assertActorCanManageTarget(object $actor, array $target): void {
        $actorId = (int)$actor->sub;
        $actorRoleId = (int)$actor->role_id;
        $targetId = (int)$target['id'];
        $targetRoleId = (int)$target['role_id'];

        if ($actorRoleId === 2) {
            if ($targetRoleId !== 3) {
                Response::error('Solo puedes gestionar usuarios vendedores', 403);
            }
        } elseif ($actorRoleId === 1) {
            if ($targetRoleId === 1 && $targetId !== $actorId) {
                Response::error('No puedes modificar a otro superadmin', 403);
            }
        } else {
            Response::error('No autorizado', 403);
        }
    }

    public function list() {
        AuthMiddleware::requireRole(['admin', 'superadmin']);
        $data = $this->repo->listAll();
        Response::json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    public function create() {
        $actor = AuthMiddleware::requireRole(['admin', 'superadmin']);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        if (!isset($input['username'], $input['password'], $input['email'], $input['role_id'])) {
            Response::error('username, password, email, role_id required', 400);
        }

        $username = trim((string)$input['username']);
        $email = trim((string)$input['email']);
        $password = (string)$input['password'];
        $roleId = (int)$input['role_id'];

        if ($username === '' || $email === '' || $password === '') {
            Response::error('Campos inválidos', 400);
        }

        if ($this->repo->findByUsername($username)) {
            Response::error('El nombre de usuario ya existe', 409);
        }

        if ($this->repo->emailExists($email)) {
            Response::error('El email ya está registrado', 409);
        }

        $actorRoleId = (int)$actor->role_id;
        if ($actorRoleId === 2) {
            if ($roleId !== 3) {
                Response::error('Solo puedes crear usuarios vendedores (role_id=3)', 403);
            }
        } elseif ($actorRoleId === 1) {
            if (!in_array($roleId, [2, 3], true)) {
                Response::error('role_id inválido', 400);
            }
        } else {
            Response::error('No autorizado', 403);
        }

        $input['username'] = $username;
        $input['email'] = $email;
        $input['password'] = password_hash($password, PASSWORD_BCRYPT);
        $input['role_id'] = $roleId;

        $id = $this->repo->create($input);
        Response::json([
            'status' => 'success',
            'data' => ['id' => $id],
        ], 201);
    }

    public function update(int $id): void {
        $actor = AuthMiddleware::requireRole(['admin', 'superadmin']);
        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        $this->assertActorCanManageTarget($actor, $target);

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!isset($input['username'], $input['email'], $input['role_id'])) {
            Response::error('username, email, role_id required', 400);
        }

        $username = trim((string)$input['username']);
        $email = trim((string)$input['email']);
        $roleId = (int)$input['role_id'];

        if ($username === '' || $email === '') {
            Response::error('Campos inválidos', 400);
        }

        if ($this->repo->usernameExistsExcept($id, $username)) {
            Response::error('El nombre de usuario ya está en uso', 409);
        }
        if ($this->repo->emailExistsExcept($id, $email)) {
            Response::error('El email ya está en uso', 409);
        }

        $actorRoleId = (int)$actor->role_id;
        if ($actorRoleId === 2) {
            if ($roleId !== 3) {
                Response::error('Solo puedes asignar rol vendedor', 403);
            }
        } elseif ($actorRoleId === 1) {
            if ((int)$target['role_id'] === 1 && $roleId !== 1) {
                Response::error('No puedes cambiar el rol del superadmin', 403);
            }
            if (!in_array($roleId, [1, 2, 3], true)) {
                Response::error('role_id inválido', 400);
            }
            if ($roleId === 1 && (int)$target['role_id'] !== 1) {
                Response::error('No puedes promover a superadmin', 403);
            }
        }

        $this->repo->update($id, $username, $email, $roleId);
        Response::json(['status' => 'success', 'message' => 'Usuario actualizado']);
    }

    public function delete(int $id): void {
        $actor = AuthMiddleware::requireRole(['admin', 'superadmin']);
        $actorId = (int)$actor->sub;

        if ($id === $actorId) {
            Response::error('No puedes eliminar tu propio usuario', 403);
        }

        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        $this->assertActorCanManageTarget($actor, $target);

        if ($this->repo->countSalesForUser($id) > 0) {
            Response::error('No se puede eliminar: el usuario tiene ventas registradas', 409);
        }

        $this->repo->delete($id);
        Response::noContent(204);
    }

    public function resetPassword(int $id): void {
        $actor = AuthMiddleware::requireRole(['admin', 'superadmin']);
        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        $this->assertActorCanManageTarget($actor, $target);

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $password = (string)($input['password'] ?? '');
        if (strlen($password) < 6) {
            Response::error('La contraseña debe tener al menos 6 caracteres', 400);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->repo->updatePassword($id, $hash);
        Response::json(['status' => 'success', 'message' => 'Contraseña actualizada']);
    }
}
