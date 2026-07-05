<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;

class Auth extends ResourceController
{
    protected $format = 'json';

    public function login(): ResponseInterface
    {
        $data     = $this->request->getJSON(true) ?? $this->request->getPost();
        $email    = trim((string) ($data['email']    ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            return $this->failValidationErrors('E-mail e senha são obrigatórios.');
        }

        $user = (new UserModel())->where('email', $email)->first();
        if (! $user || ! password_verify($password, $user['password'])) {
            return $this->failUnauthorized('Credenciais inválidas.');
        }

        session()->regenerate();
        session()->set([
            'user_id'    => (int) $user['id'],
            'user_email' => $user['email'],
            'user_name'  => $user['name'],
            'user_role'  => $user['role'],
        ]);

        return $this->respond(['user' => $this->publicUser($user)]);
    }

    public function me(): ResponseInterface
    {
        $user = (new UserModel())->find(session()->get('user_id'));
        if (! $user) {
            session()->destroy();
            return $this->failUnauthorized('Sessão expirada.');
        }
        return $this->respond($this->publicUser($user));
    }

    public function logout(): ResponseInterface
    {
        session()->destroy();
        return $this->respond(['ok' => true]);
    }

    private function publicUser(array $u): array
    {
        return [
            'id'    => (int) $u['id'],
            'name'  => $u['name'],
            'email' => $u['email'],
            'role'  => $u['role'],
        ];
    }
}