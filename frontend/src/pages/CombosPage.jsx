import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import {
  createCombo,
  deleteCombo,
  getCombos,
  getProducts,
  setComboStatus,
  updateCombo,
} from '../api.js';

const emptyForm = {
  id: null,
  name: '',
  code: '',
  extra_cost: '0',
  status: 'active',
  items: [],
};

function parseFormNumber(value, { integer = false, defaultValue = null } = {}) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (normalized === '') return defaultValue;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.trunc(parsed) : parsed;
}

function formatMoney(value) {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calcItemsTotal(items) {
  return items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);
}

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detailCombo, setDetailCombo] = useState(null);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const productDropdownRef = useRef(null);
  const productSearchRef = useRef(null);

  const selectableProducts = useMemo(
    () => products.filter((p) => Number(p.is_combo ?? 0) !== 1),
    [products],
  );

  const filteredSelectable = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return selectableProducts;
    return selectableProducts.filter((p) =>
      [p.name, p.barcode, p.brand]
        .some((value) => String(value ?? '').toLowerCase().includes(q)),
    );
  }, [selectableProducts, productQuery]);

  const selectedProduct = useMemo(
    () => selectableProducts.find((p) => String(p.id) === String(selectedProductId)) ?? null,
    [selectableProducts, selectedProductId],
  );

  const itemsTotal = useMemo(() => calcItemsTotal(form.items), [form.items]);
  const extraCost = useMemo(
    () => parseFormNumber(form.extra_cost, { defaultValue: 0 }) ?? 0,
    [form.extra_cost],
  );
  const comboPrice = useMemo(
    () => Math.round((itemsTotal + (Number.isFinite(extraCost) ? extraCost : 0)) * 100) / 100,
    [itemsTotal, extraCost],
  );

  const filteredCombos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return combos;
    return combos.filter((c) =>
      [c.id, c.name, c.code, c.price, c.status, c.extra_cost]
        .some((value) => String(value ?? '').toLowerCase().includes(q)),
    );
  }, [combos, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCombos.length / pageSize));
  const paginatedCombos = filteredCombos.slice((page - 1) * pageSize, page * pageSize);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [combosRes, productsRes] = await Promise.all([getCombos(), getProducts()]);
      setCombos(combosRes.data ?? []);
      setProducts(productsRes.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los combos');
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

  useEffect(() => {
    if (!productDropdownOpen) return undefined;

    function handleClickOutside(event) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setProductDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    const focusTimer = setTimeout(() => productSearchRef.current?.focus(), 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(focusTimer);
    };
  }, [productDropdownOpen]);

  function openDetail(combo) {
    setDetailCombo(combo);
    setError('');
  }

  function startCreate() {
    setEditMode(false);
    setForm(emptyForm);
    setProductQuery('');
    setSelectedProductId('');
    setSelectedQty('1');
    setProductDropdownOpen(false);
    setShowForm(true);
    setError('');
  }

  function startEdit(combo) {
    setEditMode(true);
    setForm({
      id: combo.id,
      name: combo.name ?? '',
      code: combo.code ?? '',
      extra_cost: String(combo.extra_cost ?? 0),
      status: combo.status ?? 'active',
      items: (combo.items ?? []).map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.product_name,
        product_barcode: item.product_barcode,
      })),
    });
    setProductQuery('');
    setSelectedProductId('');
    setSelectedQty('1');
    setProductDropdownOpen(false);
    setShowForm(true);
    setError('');
  }

  function selectProductFromDropdown(product) {
    setSelectedProductId(String(product.id));
    setProductQuery('');
    setProductDropdownOpen(false);
    setError('');
  }

  function addProductToCombo() {
    const productId = Number(selectedProductId);
    const quantity = parseFormNumber(selectedQty, { integer: true, defaultValue: null });

    if (!productId) {
      setError('Selecciona un producto para agregar al combo');
      setProductDropdownOpen(true);
      return;
    }
    if (quantity === null || quantity <= 0) {
      setError('La cantidad debe ser un entero mayor a 0');
      return;
    }

    const product = selectableProducts.find((p) => Number(p.id) === productId);
    if (!product) {
      setError('Producto no encontrado o no disponible');
      return;
    }

    setForm((current) => {
      const existing = current.items.find((item) => Number(item.product_id) === productId);
      if (existing) {
        return {
          ...current,
          items: current.items.map((item) =>
            Number(item.product_id) === productId
              ? { ...item, quantity: Number(item.quantity) + quantity }
              : item,
          ),
        };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            product_id: productId,
            quantity,
            unit_price: Number(product.price_sale),
            product_name: product.name,
            product_barcode: product.barcode,
          },
        ],
      };
    });

    setSelectedProductId('');
    setProductQuery('');
    setSelectedQty('1');
    setProductDropdownOpen(false);
    setError('');
  }

  function updateItemQty(productId, quantity) {
    const qty = parseFormNumber(quantity, { integer: true, defaultValue: 1 });
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        Number(item.product_id) === Number(productId)
          ? { ...item, quantity: qty && qty > 0 ? qty : 1 }
          : item,
      ),
    }));
  }

  function removeItem(productId) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => Number(item.product_id) !== Number(productId)),
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');

    const parsedExtra = parseFormNumber(form.extra_cost, { defaultValue: 0 });
    if (parsedExtra === null || parsedExtra < 0) {
      setError('El costo extra debe ser un número mayor o igual a 0');
      return;
    }

    if (!form.name.trim()) {
      setError('El nombre del combo es obligatorio');
      return;
    }

    if (form.items.length === 0) {
      setError('Agrega al menos un producto al combo');
      return;
    }

    const code = String(form.code ?? '').trim();
    if (code !== '' && !/^\d{6}$/.test(code)) {
      setError('El código debe tener exactamente 6 dígitos, o déjalo vacío para autogenerarlo');
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: code === '' ? null : code,
      extra_cost: parsedExtra,
      status: form.status,
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
    };

    setSaving(true);
    try {
      if (editMode) await updateCombo(form.id, payload);
      else await createCombo(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el combo');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(combo) {
    const next = combo.status === 'active' ? 'disabled' : 'active';
    const label = next === 'disabled' ? 'deshabilitar' : 'habilitar';
    if (!confirm(`¿Deseas ${label} el combo "${combo.name}"?`)) return;

    try {
      await setComboStatus(combo.id, next);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado');
    }
  }

  async function remove(combo) {
    if (!confirm(`¿Eliminar el combo "${combo.name}"? Se ocultará de la lista de productos.`)) return;
    try {
      await deleteCombo(combo.id);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Combos</h1>
          <p className="text-sm text-white/75">
            Empaqueta productos existentes. El precio se calcula automáticamente y el combo se publica en productos.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nuevo combo
        </button>
      </div>

      {error && !showForm && !detailCombo && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-slate-500">Cargando…</p>
        ) : combos.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No hay combos registrados.</p>
        ) : (
          <div>
            <ListToolbar
              search={search}
              setSearch={setSearch}
              pageSize={pageSize}
              setPageSize={setPageSize}
              total={filteredCombos.length}
              placeholder="Buscar por nombre, código, precio o estado..."
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Productos</th>
                    <th className="px-4 py-3">Costo extra</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCombos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No hay combos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedCombos.map((combo) => (
                      <tr key={combo.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono">{combo.code}</td>
                        <td className="px-4 py-3 font-medium">{combo.name}</td>
                        <td className="px-4 py-3">{combo.items_count ?? combo.items?.length ?? 0}</td>
                        <td className="px-4 py-3">{formatMoney(combo.extra_cost)}</td>
                        <td className="px-4 py-3 font-medium">{formatMoney(combo.price)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={combo.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(combo.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <IconButton label="Ver detalle" onClick={() => openDetail(combo)}>
                            <Eye size={16} />
                          </IconButton>
                          <IconButton label="Editar" onClick={() => startEdit(combo)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            label={combo.status === 'active' ? 'Deshabilitar' : 'Habilitar'}
                            onClick={() => toggleStatus(combo)}
                          >
                            <Power size={16} />
                          </IconButton>
                          <IconButton label="Eliminar" danger onClick={() => remove(combo)}>
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
              summary={`${filteredCombos.length} combo${filteredCombos.length === 1 ? '' : 's'}`}
            />
          </div>
        )}
      </div>

      {detailCombo && (
        <Modal title="Detalle del combo" onClose={() => setDetailCombo(null)} wide>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Nombre" value={detailCombo.name} />
              <DetailField label="Código" value={detailCombo.code} mono />
              <DetailField label="Fecha creado" value={formatDate(detailCombo.created_at)} />
              <DetailField
                label="Estado"
                value={detailCombo.status === 'active' ? 'Activo' : 'Deshabilitado'}
              />
              <DetailField label="Costo extra" value={formatMoney(detailCombo.extra_cost)} />
              <DetailField label="Precio total" value={formatMoney(detailCombo.price)} emphasize />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Productos incluidos</h3>
              {(detailCombo.items ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                  Este combo no tiene productos asociados.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Precio unit.</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCombo.items.map((item) => (
                        <tr key={item.id ?? item.product_id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{item.product_name}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {item.product_barcode || '—'}
                          </td>
                          <td className="px-3 py-2">{formatMoney(item.unit_price)}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2 font-semibold">
                            {formatMoney(
                              item.line_total ??
                                Number(item.unit_price) * Number(item.quantity),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm text-slate-600">
                          Subtotal productos
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {formatMoney(
                            (detailCombo.items ?? []).reduce(
                              (sum, item) =>
                                sum +
                                (Number(item.line_total) ||
                                  Number(item.unit_price) * Number(item.quantity) ||
                                  0),
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm text-slate-600">
                          Costo extra
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {formatMoney(detailCombo.extra_cost)}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-800">
                          Total combo
                        </td>
                        <td className="px-3 py-2 text-base font-bold text-emerald-700">
                          {formatMoney(detailCombo.price)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setDetailCombo(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                onClick={() => {
                  const combo = detailCombo;
                  setDetailCombo(null);
                  startEdit(combo);
                }}
              >
                Editar combo
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal
          title={editMode ? 'Editar combo' : 'Nuevo combo'}
          onClose={() => setShowForm(false)}
          wide
        >
          <form onSubmit={save} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nombre"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                required
              />
              <Field
                label="Código (6 dígitos, opcional)"
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="Vacío = autogenerar"
              />
              <Field
                label="Costo extra (armado / materiales)"
                value={form.extra_cost}
                onChange={(v) => setForm((f) => ({ ...f, extra_cost: v }))}
                inputMode="decimal"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Activo</option>
                  <option value="disabled">Deshabilitado</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Productos del combo</h3>
                  <p className="text-xs text-slate-500">Selecciona productos existentes y define la cantidad.</p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-500">Subtotal productos: {formatMoney(itemsTotal)}</div>
                  <div className="font-semibold text-slate-800">Precio combo: {formatMoney(comboPrice)}</div>
                </div>
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                <div ref={productDropdownRef} className="relative">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Producto</label>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-slate-400"
                    onClick={() => {
                      setProductDropdownOpen((open) => {
                        const next = !open;
                        if (next) setProductQuery('');
                        return next;
                      });
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={productDropdownOpen}
                  >
                    <span className={selectedProduct ? 'text-slate-800' : 'text-slate-400'}>
                      {selectedProduct
                        ? `${selectedProduct.name} — ${formatMoney(selectedProduct.price_sale)}`
                        : 'Seleccionar producto…'}
                    </span>
                    <ChevronDown size={16} className="shrink-0 text-slate-400" />
                  </button>

                  {productDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            size={15}
                          />
                          <input
                            ref={productSearchRef}
                            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm"
                            value={productQuery}
                            onChange={(e) => {
                              setProductQuery(e.target.value);
                              setError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setProductDropdownOpen(false);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredSelectable.length === 1) {
                                  selectProductFromDropdown(filteredSelectable[0]);
                                }
                              }
                            }}
                            placeholder='Buscar, ej: "chocolate"'
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <ul className="max-h-52 overflow-y-auto" role="listbox">
                        {filteredSelectable.length === 0 ? (
                          <li className="px-3 py-3 text-sm text-slate-500">
                            {productQuery.trim()
                              ? `No hay productos que coincidan con “${productQuery.trim()}”.`
                              : 'No hay productos disponibles.'}
                          </li>
                        ) : (
                          filteredSelectable.map((p) => {
                            const isSelected = String(p.id) === String(selectedProductId);
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                                    isSelected ? 'bg-indigo-50 text-[#0b2545]' : 'text-slate-700'
                                  }`}
                                  onClick={() => selectProductFromDropdown(p)}
                                >
                                  <span>
                                    <span className="font-medium">{p.name}</span>
                                    {(p.barcode || p.brand) && (
                                      <span className="mt-0.5 block text-xs text-slate-500">
                                        {[p.barcode, p.brand].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 font-semibold text-emerald-700">
                                    {formatMoney(p.price_sale)}
                                  </span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    type="number"
                    min="1"
                    step="1"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addProductToCombo}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#0f3a68] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b2545]"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>
              </div>

              {form.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                  Aún no hay productos en este combo.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Precio unit.</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Subtotal</th>
                        <th className="px-3 py-2 text-right">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item) => (
                        <tr key={item.product_id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <div className="font-medium">{item.product_name}</div>
                            {item.product_barcode && (
                              <div className="text-xs text-slate-500">{item.product_barcode}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">{formatMoney(item.unit_price)}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-20 rounded border border-slate-300 px-2 py-1"
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.product_id, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {formatMoney(Number(item.unit_price) * Number(item.quantity))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <IconButton label="Quitar" danger onClick={() => removeItem(item.product_id)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar combo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Activo' : 'Deshabilitado'}
    </span>
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

function Field({ label, value, onChange, type = 'text', required, inputMode, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        type={type}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function DetailField({ label, value, mono, emphasize }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-0.5 text-sm ${
          emphasize ? 'text-base font-bold text-emerald-700' : 'font-medium text-slate-800'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
