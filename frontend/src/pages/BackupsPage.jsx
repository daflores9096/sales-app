import { useRef, useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { createDatabaseBackup, restoreDatabaseBackup } from '../api.js';

export default function BackupsPage() {
  const fileRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleCreateBackup() {
    setCreating(true);
    setError('');
    setMessage('');

    try {
      const res = await createDatabaseBackup();
      const backup = res.data;
      const createdAt = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sales-app-backup-${createdAt}.json`;
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setMessage(`Respaldo creado: ${filename}`);
    } catch (err) {
      setError(err.message || 'No se pudo crear el respaldo');
    } finally {
      setCreating(false);
    }
  }

  async function handleRestoreBackup() {
    if (!selectedFile) {
      setError('Selecciona un archivo de respaldo');
      return;
    }

    if (!confirm('Esta acción reemplazará los datos actuales por el contenido del respaldo. ¿Continuar?')) {
      return;
    }

    setRestoring(true);
    setError('');
    setMessage('');

    try {
      const text = await selectedFile.text();
      const backup = JSON.parse(text);
      const res = await restoreDatabaseBackup(backup);
      const result = res.data;

      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage(`Respaldo restaurado correctamente. Tablas: ${result.tables}. Filas: ${result.rows}.`);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'El archivo no contiene JSON válido' : err.message || 'No se pudo restaurar el respaldo');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-white">
        <h1 className="text-2xl font-bold">Respaldos</h1>
        <p className="text-sm text-white/75">Crear y restaurar respaldos completos de la base de datos</p>
      </div>

      {message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2545] to-[#1d4ed8] text-white shadow-lg shadow-blue-900/25">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Crear respaldo</h2>
              <p className="text-sm text-slate-500">Descarga todas las tablas con su contenido actual.</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            El archivo generado puede usarse directamente en la opción Restaurar respaldo.
          </p>

          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Database size={18} />
            {creating ? 'Creando respaldo...' : 'Crear respaldo'}
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2545] to-[#1d4ed8] text-white shadow-lg shadow-blue-900/25">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Restaurar respaldo</h2>
              <p className="text-sm text-slate-500">Reemplaza los datos actuales con un respaldo previo.</p>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta acción sobrescribe la información actual de la base de datos. Crea un respaldo antes de restaurar.
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="mb-4 block w-full text-sm text-slate-600"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null);
              setError('');
              setMessage('');
            }}
          />

          <button
            type="button"
            onClick={handleRestoreBackup}
            disabled={restoring || !selectedFile}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Upload size={18} />
            {restoring ? 'Restaurando...' : 'Restaurar respaldo'}
          </button>
        </section>
      </div>
    </div>
  );
}
