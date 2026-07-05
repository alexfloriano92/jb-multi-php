<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('app.adminEmail')    ?? 'admin@jbmultimarcas.com.br';
        $password = env('app.adminPassword') ?? 'admin123';

        $exists = $this->db->table('users')->where('email', $email)->countAllResults();
        if ($exists > 0) return;

        $this->db->table('users')->insert([
            'name'       => 'Administrador JB',
            'email'      => $email,
            'password'   => password_hash($password, PASSWORD_BCRYPT),
            'role'       => 'admin',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}