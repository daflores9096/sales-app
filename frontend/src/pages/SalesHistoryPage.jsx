import { useEffect, useMemo, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { cancelSale, getSaleDetail, getSales, getUsers } from '../api.js';
import { useAuth } from '../auth.jsx';

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  qr: 'QR',
  card: 'Tarjeta',
};

function toIsoDate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function rangeForPeriod(period, customFrom, customTo) {
  const now = new Date();
  const today = toIsoDate(now);

  if (period === 'all') {
    return { from: undefined, to: undefined };
  }

  if (period === 'today') {
    return { from: today, to: today };
  }

  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return { from: toIsoDate(start), to: today };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIsoDate(start), to: today };
  }

  return { from: customFrom || today, to: customTo || today };
}

export default function SalesHistoryPage({ adminView = true }) {
  const { isAdminLike } = useAuth();
  const showAdminActions = adminView && isAdminLike;
  const title = showAdminActions ? 'Histórico de ventas' : 'Mis ventas';

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState(() => toIsoDate(new Date()));
  const [customTo, setCustomTo] = useState(() => toIsoDate(new Date()));
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const dateRange = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSales({
        page,
        limit,
        q: search.trim() || undefined,
        status: status || undefined,
        from: dateRange.from || undefined,
        to: dateRange.to || undefined,
        payment_method: paymentMethod || undefined,
        seller_id: showAdminActions && sellerId ? sellerId : undefined,
      });
      setSales(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showAdminActions) return;
    (async () => {
      try {
        const res = await getUsers();
        setUsers(res.data ?? []);
      } catch {
        // Si no se pueden cargar usuarios, el filtro simplemente queda vacío.
        setUsers([]);
      }
    })();
  }, [showAdminActions]);

  useEffect(() => {
    load();
  }, [page, limit, search, status, paymentMethod, sellerId, dateRange.from, dateRange.to, showAdminActions]);

  useEffect(() => {
    setPage(1);
  }, [limit, search, status, paymentMethod, sellerId, period, customFrom, customTo]);

  async function openDetail(id) {
    setShowModal(true);
    setSelectedSale(null);
    try {
      const res = await getSaleDetail(id);
      setSelectedSale(res.data);
    } catch {
      setShowModal(false);
      setError('No se pudo cargar el detalle');
    }
  }

  async function handleCancel(id) {
    if (!confirm('¿Anular esta venta?')) return;
    try {
      await cancelSale(id);
      alert('Venta anulada y stock restaurado');
      await load();
    } catch (err) {
      alert(err.message || 'Error al anular venta');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ListToolbar
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          sellerId={sellerId}
          setSellerId={setSellerId}
          users={users}
          showUserFilter={showAdminActions}
          period={period}
          setPeriod={setPeriod}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          limit={limit}
          setLimit={setLimit}
          total={total}
        />
        {loading ? (
          <p className="p-6 text-slate-500">Cargando ventas…</p>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay ventas registradas para el periodo seleccionado.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{s.id}</td>
                    <td className="px-4 py-3">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{s.username ?? '—'}</td>
                    <td className="px-4 py-3">{PAYMENT_LABELS[s.payment_method] ?? 'Efectivo'}</td>
                    <td className="px-4 py-3 font-semibold">${s.total}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {s.status === 'cancelled' ? 'Anulada' : 'Activa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <IconButton label="Ver detalle" onClick={() => openDetail(s.id)}>
                        <Eye size={16} />
                      </IconButton>
                      {showAdminActions && s.status !== 'cancelled' && (
                        <IconButton label="Anular" danger onClick={() => handleCancel(s.id)}>
                          <Ban size={16} />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`${total} venta${total === 1 ? '' : 's'}`}
            />
          </>
        )}
      </div>
      {showModal && (
        <Modal
          title={selectedSale ? `Venta #${selectedSale.sale.id}` : 'Cargando venta…'}
          onClose={() => {
            setShowModal(false);
            setSelectedSale(null);
          }}
          wide
        >
          {!selectedSale ? (
            <p className="text-slate-500">Cargando detalle…</p>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Fecha: {new Date(selectedSale.sale.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">Usuario: {selectedSale.sale.username}</p>
              <p className="text-sm text-slate-500">
                Tipo de venta: {PAYMENT_LABELS[selectedSale.sale.payment_method] ?? 'Efectivo'}
              </p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2">Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((i) => (
                    <tr key={i.product_id} className="border-t">
                      <td className="py-2">{i.name}</td>
                      <td>{i.quantity}</td>
                      <td>${i.price}</td>
                      <td className="font-semibold">${i.quantity * i.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-right text-lg font-bold">Total: ${selectedSale.sale.total}</p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function ListToolbar({
  search,
  setSearch,
  status,
  setStatus,
  paymentMethod,
  setPaymentMethod,
  sellerId,
  setSellerId,
  users,
  showUserFilter,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  limit,
  setLimit,
  total,
}) {
  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Periodo
          </label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="today">Día actual</option>
            <option value="week">Semana actual</option>
            <option value="month">Mes actual</option>
            <option value="range">Rango de fechas</option>
          </select>
        </div>

        {period === 'range' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Desde
              </label>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hasta
              </label>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado
          </label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="active">Activas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tipo de pago
          </label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="qr">QR</option>
            <option value="card">Tarjeta</option>
          </select>
        </div>

        {showUserFilter && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Usuario
            </label>
            <select
              className="min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por venta, usuario o producto..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{total} resultados</span>
          <select
            className="rounded-lg border border-slate-300 px-2 py-1.5"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value} por página
              </option>
            ))}
          </select>
        </div>
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
        <button type="button" disabled={page <= 1} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
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
        <button type="button" disabled={page >= totalPages} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">
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
