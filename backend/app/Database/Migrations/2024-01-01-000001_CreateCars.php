<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCars extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'           => ['type' => 'CHAR', 'constraint' => 36],
            'brand'        => ['type' => 'VARCHAR', 'constraint' => 80],
            'model'        => ['type' => 'VARCHAR', 'constraint' => 120],
            'year'         => ['type' => 'SMALLINT', 'unsigned' => true],
            'km'           => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'price'        => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => true],
            'color'        => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
            'fuel'         => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'transmission' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'category'     => ['type' => 'VARCHAR', 'constraint' => 80, 'default' => 'seminovo'],
            'image_url'    => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'images'       => ['type' => 'JSON', 'null' => true],
            'description'  => ['type' => 'TEXT', 'null' => true],
            'sold'         => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'featured'     => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'sort_order'   => ['type' => 'INT', 'default' => 0],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['sort_order', 'created_at']);
        $this->forge->addKey('featured');
        $this->forge->addKey('sold');
        $this->forge->createTable('cars');
    }

    public function down(): void
    {
        $this->forge->dropTable('cars');
    }
}