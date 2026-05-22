import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api.js';

const emptyForm = { id: null, name: '', price: '', price_sale: '', stock: '', barcode: '', brand: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getProducts();
      setProducts(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditMode(false);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function startEdit(p) {
    setEditMode(true);
    setForm({
      id: p.id,
      name: p.name,
      price: p.price ?? '',
      price_sale: p.price_sale ?? p.price ?? '',
      stock: p.stock ?? '',
      barcode: p.barcode ?? '',
      brand: p.brand ?? '',
    });
    setShowForm(true);
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      price: form.price === '' ? null : Number(form.price),
      price_sale: form.price_sale === '' ? Number(form.price) : Number(form.price_sale),
      stock: form.stock === '' ? 0 : Number(form.stock),
      barcode: form.barcode === '' ? null : String(form.barcode),
      brand: form.brand === '' ? null : String(form.brand),
    };
    try {
      if (editMode) await updateProduct(form.id, payload);
      else await createProduct(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">Gestión de inventario</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/products/import"
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
          >
            Importar Excel
          </Link>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-500">Cargando…</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No hay productos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Precio venta</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{p.id}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">${p.price}</td>
                    <td className="px-4 py-3">${p.price_sale}</td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3">{p.brand || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="mr-2 text-indigo-600 hover:underline" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => remove(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editMode ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field label="Precio compra" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} type="number" />
            <Field label="Precio venta" value={form.price_sale} onChange={(v) => setForm((f) => ({ ...f, price_sale: v }))} type="number" />
            <Field label="Stock" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} type="number" />
            <Field label="Código barras" value={form.barcode} onChange={(v) => setForm((f) => ({ ...f, barcode: v }))} />
            <Field label="Marca" value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
