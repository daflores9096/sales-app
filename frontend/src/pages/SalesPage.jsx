import { useEffect, useRef, useState } from 'react';
import { createSale, getProducts } from '../api.js';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function loadProducts() {
    try {
      const res = await getProducts();
      const list = res.data ?? [];
      setProducts(list);
      setFiltered(list);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar productos');
    }
  }

  function onSearchChange(value) {
    setSearch(value);
    if (!value.trim()) {
      setFiltered([...products]);
      return;
    }
    if (scannerMode) {
      const found = products.find((p) => p.barcode && String(p.barcode) === value.trim());
      if (found) {
        addToCart(found);
        setFiltered([found]);
      }
      setSearch('');
      searchRef.current?.focus();
      return;
    }
    const s = value.toLowerCase();
    setFiltered(
      products.filter(
        (p) => p.name.toLowerCase().includes(s) || String(p.barcode ?? '').includes(value),
      ),
    );
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function changeQty(item, delta) {
    setCart((prev) => {
      const next = prev
        .map((p) => (p.id === item.id ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0);
      return next;
    });
  }

  const cartTotal = cart.reduce((sum, p) => sum + p.qty * Number(p.price_sale ?? p.price), 0);

  async function checkout() {
    if (!cart.length) return;
    setError('');
    try {
      await createSale({
        items: cart.map((p) => ({
          product_id: p.id,
          quantity: p.qty,
          price: Number(p.price_sale ?? p.price),
        })),
      });
      setCart([]);
      setSearch('');
      await loadProducts();
      searchRef.current?.focus();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ventas (TPV)</h1>
        <p className="text-sm text-slate-500">Selecciona productos y registra la venta</p>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={searchRef}
              className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={scannerMode}
                onChange={(e) => setScannerMode(e.target.checked)}
              />
              Modo escáner
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="font-medium text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500">Stock: {p.stock}</div>
                <div className="mt-1 font-bold text-emerald-700">${p.price_sale ?? p.price}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-3 font-semibold">Carrito</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-500">No hay productos.</p>
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {cart.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2 text-sm">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-slate-500">
                        ${c.price_sale ?? c.price} × {c.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="rounded border px-2" onClick={() => changeQty(c, -1)}>
                        −
                      </button>
                      <span className="w-6 text-center">{c.qty}</span>
                      <button type="button" className="rounded border px-2" onClick={() => changeQty(c, 1)}>
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mb-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={checkout}
                className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
              >
                Registrar venta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
