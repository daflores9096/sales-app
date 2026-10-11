import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createSale, getProducts } from '../api.js';
import Modal from '../components/Modal.jsx';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'qr', label: 'QR' },
  { value: 'card', label: 'Tarjeta' },
];

function parseMoney(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [amountReceived, setAmountReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const amountReceivedRef = useRef(null);

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

  const cartTotal = roundMoney(
    cart.reduce((sum, p) => sum + p.qty * Number(p.price_sale ?? p.price), 0),
  );

  const paymentAmounts = useMemo(
    () => payments.map((p) => parseMoney(p.amount)),
    [payments],
  );

  const paidTotal = useMemo(
    () => roundMoney(paymentAmounts.reduce((sum, amount) => sum + (amount ?? 0), 0)),
    [paymentAmounts],
  );

  const remaining = roundMoney(cartTotal - paidTotal);

  const cashPortion = useMemo(
    () =>
      roundMoney(
        payments.reduce((sum, payment, index) => {
          if (payment.method !== 'cash') return sum;
          return sum + (paymentAmounts[index] ?? 0);
        }, 0),
      ),
    [payments, paymentAmounts],
  );

  const hasCashPayment = cashPortion > 0;
  const receivedValue = useMemo(() => parseMoney(amountReceived), [amountReceived]);
  const changeDue = useMemo(() => {
    if (!hasCashPayment || receivedValue === null) return null;
    return roundMoney(receivedValue - cashPortion);
  }, [hasCashPayment, receivedValue, cashPortion]);

  const paymentsReady =
    payments.length > 0 &&
    paymentAmounts.every((amount) => amount !== null && amount > 0) &&
    Math.abs(remaining) < 0.009 &&
    (!hasCashPayment || (receivedValue !== null && receivedValue >= cashPortion - 0.009));

  function openCheckoutConfirm() {
    if (!cart.length) return;
    setPayments([{ method: 'cash', amount: cartTotal.toFixed(2) }]);
    setAmountReceived('');
    setError('');
    setShowConfirmModal(true);
  }

  // Solo al abrir el modal: no reenfocar cuando el usuario edita montos de pago
  // (antes, al escribir el 1er dígito en efectivo, hasCashPayment pasaba a true y robaba el foco).
  useEffect(() => {
    if (!showConfirmModal) return;
    const t = setTimeout(() => {
      const hasCashMethod = payments.some((p) => p.method === 'cash');
      if (hasCashMethod) amountReceivedRef.current?.focus();
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir el modal
  }, [showConfirmModal]);

  function updatePayment(index, patch) {
    setPayments((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setError('');
  }

  function addPaymentRow() {
    const nextAmount = remaining > 0 ? remaining.toFixed(2) : '';
    setPayments((prev) => [...prev, { method: 'qr', amount: nextAmount }]);
    setError('');
  }

  function removePaymentRow(index) {
    setPayments((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setError('');
  }

  async function checkout() {
    if (!cart.length) return;

    if (!paymentsReady) {
      if (Math.abs(remaining) >= 0.009) {
        setError(
          remaining > 0
            ? `Falta por pagar $${remaining.toFixed(2)}`
            : `Los pagos exceden el total en $${Math.abs(remaining).toFixed(2)}`,
        );
      } else if (hasCashPayment && (receivedValue === null || receivedValue < cashPortion)) {
        setError('El monto recibido en efectivo es insuficiente');
        amountReceivedRef.current?.focus();
      } else {
        setError('Completa todos los montos de pago');
      }
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createSale({
        payments: payments.map((p) => ({
          payment_method: p.method,
          amount: parseMoney(p.amount),
        })),
        items: cart.map((p) => ({
          product_id: p.id,
          quantity: p.qty,
          price: Number(p.price_sale ?? p.price),
        })),
      });
      setCart([]);
      setSearch('');
      setAmountReceived('');
      setPayments([{ method: 'cash', amount: '' }]);
      setShowConfirmModal(false);
      await loadProducts();
      searchRef.current?.focus();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta');
    } finally {
      setSaving(false);
    }
  }

  function clearCart() {
    if (!cart.length) return;
    setCart([]);
    setSearch('');
    searchRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Ventas (TPV)</h1>
        <p className="text-sm text-white/75">Selecciona productos y registra la venta</p>
      </div>
      {error && !showConfirmModal && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
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
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={openCheckoutConfirm}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
                >
                  Registrar venta
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpiar carrito
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showConfirmModal && (
        <Modal title="Confirmar venta" onClose={() => setShowConfirmModal(false)} wide>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0b2545] text-left text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Cant.</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const price = Number(item.price_sale ?? item.price);
                    return (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{item.name}</td>
                        <td className="px-3 py-2 text-slate-700">{item.qty}</td>
                        <td className="px-3 py-2 text-slate-700">${price.toFixed(2)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          ${(price * item.qty).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-right text-xl font-bold text-slate-800">Total: ${cartTotal.toFixed(2)}</p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Pagos</h3>
                  <p className="text-xs text-slate-500">
                    Puedes combinar métodos (ej. QR + Efectivo). La suma debe igualar el total.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPaymentRow}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Plus size={16} />
                  Agregar pago
                </button>
              </div>

              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={payment.method}
                      onChange={(e) => updatePayment(index, { method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      type="text"
                      inputMode="decimal"
                      placeholder="Monto"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, { amount: e.target.value })}
                    />
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                      onClick={() => removePaymentRow(index)}
                      disabled={payments.length === 1}
                      title="Quitar pago"
                      aria-label="Quitar pago"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">Pagado</div>
                  <div className="font-semibold text-slate-800">${paidTotal.toFixed(2)}</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">Pendiente</div>
                  <div
                    className={`font-semibold ${
                      Math.abs(remaining) < 0.009
                        ? 'text-emerald-700'
                        : remaining > 0
                          ? 'text-amber-700'
                          : 'text-red-600'
                    }`}
                  >
                    ${remaining.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">Total venta</div>
                  <div className="font-semibold text-slate-800">${cartTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {hasCashPayment && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Monto recibido en efectivo
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Parte en efectivo de la venta: ${cashPortion.toFixed(2)}
                </p>
                <input
                  ref={amountReceivedRef}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 100"
                  value={amountReceived}
                  onChange={(e) => {
                    setAmountReceived(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && paymentsReady && !saving) {
                      e.preventDefault();
                      checkout();
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-500">Cambio a devolver</span>
                  <span
                    className={`text-xl font-bold ${
                      changeDue === null
                        ? 'text-slate-400'
                        : changeDue < 0
                          ? 'text-red-600'
                          : 'text-emerald-700'
                    }`}
                  >
                    {changeDue === null
                      ? '—'
                      : changeDue < 0
                        ? `Faltan $${Math.abs(changeDue).toFixed(2)}`
                        : `$${changeDue.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            {error && showConfirmModal && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={checkout}
                disabled={saving || !paymentsReady}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Registrando…' : 'Aceptar registro'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
