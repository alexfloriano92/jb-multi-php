<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@jbmultimarcas.com.br')],
            [
                'name'     => 'Administrador JB',
                'password' => env('ADMIN_PASSWORD', 'admin123'),
                'role'     => 'admin',
            ]
        );
    }
}
