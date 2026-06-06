<?php
namespace App\Services;

use App\Utils\Database;
use Exception;
use PDO;

class BackupService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function createBackup(): array
    {
        $databaseName = (string)$this->db->query('SELECT DATABASE()')->fetchColumn();
        $tables = $this->getTables();
        $backupTables = [];

        foreach ($tables as $table) {
            $stmt = $this->db->query('SELECT * FROM ' . $this->quoteIdentifier($table));
            $backupTables[$table] = [
                'columns' => $this->getColumns($table),
                'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            ];
        }

        return [
            'format' => 'sales-app-db-backup',
            'version' => 1,
            'created_at' => gmdate('c'),
            'database' => $databaseName,
            'tables' => $backupTables,
        ];
    }

    public function restoreBackup(array $backup): array
    {
        $this->validateBackup($backup);

        $tables = array_keys($backup['tables']);
        $restoredRows = 0;

        try {
            $this->db->beginTransaction();
            $this->db->exec('SET FOREIGN_KEY_CHECKS = 0');

            foreach ($tables as $table) {
                $this->assertTableExists($table);
                $this->db->exec('DELETE FROM ' . $this->quoteIdentifier($table));
            }

            foreach ($tables as $table) {
                $rows = $backup['tables'][$table]['rows'];
                foreach ($rows as $row) {
                    $this->insertRow($table, $row);
                    $restoredRows++;
                }
            }

            $this->db->exec('SET FOREIGN_KEY_CHECKS = 1');
            $this->db->commit();

            return [
                'tables' => count($tables),
                'rows' => $restoredRows,
            ];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->db->exec('SET FOREIGN_KEY_CHECKS = 1');
            throw $e;
        }
    }

    private function getTables(): array
    {
        $stmt = $this->db->query("
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        ");

        return array_map(static fn ($row) => $row['TABLE_NAME'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function getColumns(string $table): array
    {
        $stmt = $this->db->query('SHOW COLUMNS FROM ' . $this->quoteIdentifier($table));
        return array_map(static fn ($row) => $row['Field'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function validateBackup(array $backup): void
    {
        if (($backup['format'] ?? '') !== 'sales-app-db-backup') {
            throw new Exception('Formato de respaldo inválido');
        }

        if (($backup['version'] ?? null) !== 1) {
            throw new Exception('Versión de respaldo no soportada');
        }

        if (!isset($backup['tables']) || !is_array($backup['tables']) || empty($backup['tables'])) {
            throw new Exception('El respaldo no contiene tablas');
        }

        foreach ($backup['tables'] as $table => $tableData) {
            if (!is_string($table) || !$this->isValidIdentifier($table)) {
                throw new Exception('Nombre de tabla inválido en respaldo');
            }

            if (!isset($tableData['columns'], $tableData['rows']) || !is_array($tableData['columns']) || !is_array($tableData['rows'])) {
                throw new Exception("Estructura inválida para la tabla {$table}");
            }

            foreach ($tableData['columns'] as $column) {
                if (!is_string($column) || !$this->isValidIdentifier($column)) {
                    throw new Exception("Nombre de columna inválido en la tabla {$table}");
                }
            }

            foreach ($tableData['rows'] as $row) {
                if (!is_array($row)) {
                    throw new Exception("Fila inválida en la tabla {$table}");
                }
            }
        }
    }

    private function assertTableExists(string $table): void
    {
        $stmt = $this->db->prepare("
            SELECT 1
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND TABLE_TYPE = 'BASE TABLE'
            LIMIT 1
        ");
        $stmt->execute(['table' => $table]);

        if (!$stmt->fetchColumn()) {
            throw new Exception("La tabla {$table} no existe en la base de datos actual");
        }
    }

    private function insertRow(string $table, array $row): void
    {
        if (empty($row)) {
            return;
        }

        $columns = array_keys($row);
        foreach ($columns as $column) {
            if (!$this->isValidIdentifier((string)$column)) {
                throw new Exception("Columna inválida para restaurar en {$table}");
            }
        }

        $quotedColumns = array_map(fn ($column) => $this->quoteIdentifier((string)$column), $columns);
        $placeholders = array_map(fn ($column) => ':' . $column, $columns);

        $stmt = $this->db->prepare(
            'INSERT INTO ' . $this->quoteIdentifier($table) .
            ' (' . implode(', ', $quotedColumns) . ') VALUES (' . implode(', ', $placeholders) . ')'
        );

        foreach ($row as $column => $value) {
            $stmt->bindValue(':' . $column, $value);
        }

        $stmt->execute();
    }

    private function isValidIdentifier(string $identifier): bool
    {
        return (bool)preg_match('/^[A-Za-z0-9_]+$/', $identifier);
    }

    private function quoteIdentifier(string $identifier): string
    {
        if (!$this->isValidIdentifier($identifier)) {
            throw new Exception("Identificador inválido: {$identifier}");
        }

        return '`' . str_replace('`', '``', $identifier) . '`';
    }
}
