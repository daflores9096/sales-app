import { useState } from 'react';
import * as XLSX from 'xlsx';
import { importProducts } from '../api.js';

const REQUIRED_COLUMNS = ['nombre_producto', 'barcode', 'marca', 'precio_compra', 'precio_venta'];

export default function ProductImportPage() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      alert('Solo se permiten archivos Excel (.xlsx, .xls)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) {
        alert('El archivo está vacío');
        return;
      }
      const columns = Object.keys(rows[0]);
      if (!REQUIRED_COLUMNS.every((col) => columns.includes(col))) {
        alert(`El Excel debe tener estas columnas:\n${REQUIRED_COLUMNS.join(', ')}`);
        return;
      }
      setPreview(rows);
      setError('');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function confirmImport() {
    if (!preview.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await importProducts(preview);
      const result = res.data;
      let message = `Productos importados: ${result.imported}`;
      if (result.failed?.length) {
        message += `\n\nFallidos:\n${result.failed.map((f) => `Fila ${f.row}: ${f.error}`).join('\n')}`;
      }
      alert(message);
      setPreview([]);
    } catch (err) {
      setError(err.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar productos</h1>
        <p className="text-sm text-slate-500">
          Columnas requeridas: {REQUIRED_COLUMNS.join(', ')}
        </p>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <input type="file" accept=".xlsx,.xls" onChange={onFileSelected} className="text-sm" />
      </div>
      {preview.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 font-medium">Vista previa ({preview.length} filas)</p>
          <div className="mb-4 max-h-64 overflow-auto text-xs">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-600">
                  {REQUIRED_COLUMNS.map((c) => (
                    <th key={c} className="px-2 py-1">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t">
                    {REQUIRED_COLUMNS.map((c) => (
                      <td key={c} className="px-2 py-1">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && <p className="mt-2 text-slate-500">… y {preview.length - 10} más</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={confirmImport}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Importando…' : 'Confirmar importación'}
            </button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setPreview([])}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
