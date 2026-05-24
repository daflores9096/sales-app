import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.id, p.name, p.brand, p.barcode, p.price, p.price_sale, p.stock]
        .some((value) => String(value ?? '').toLowerCase().includes(q)),
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

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

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

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
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-white/75">Gestión de inventario</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/products/import"
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-white hover:bg-indigo-50"
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
          <div>
            <ListToolbar
              search={search}
              setSearch={setSearch}
              pageSize={pageSize}
              setPageSize={setPageSize}
              total={filteredProducts.length}
              placeholder="Buscar por nombre, marca, código o precio..."
            />
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
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No hay productos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">{p.id}</td>
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3">${p.price}</td>
                        <td className="px-4 py-3">${p.price_sale}</td>
                        <td className="px-4 py-3">{p.stock}</td>
                        <td className="px-4 py-3">{p.brand || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <IconButton label="Editar" onClick={() => startEdit(p)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton label="Eliminar" danger onClick={() => remove(p.id)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`${filteredProducts.length} producto${filteredProducts.length === 1 ? '' : 's'}`}
            />
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

function ListToolbar({ search, setSearch, pageSize, setPageSize, total, placeholder }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{total} resultados</span>
        <select
          className="rounded-lg border border-slate-300 px-2 py-1.5"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map((value) => (
            <option key={value} value={value}>
              {value} por página
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange, summary }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">
        Página {page} de {totalPages} · {summary}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, index) => (
          <span key={p} className="flex items-center gap-1">
            {index > 0 && p - pages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              className={`min-w-8 rounded-lg border px-2 py-1 ${p === page ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function IconButton({ label, children, onClick, danger }) {
  return (
    <button
      type="button"
      className={`mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100 ${
        danger ? 'text-red-600' : 'text-indigo-600'
      }`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
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
