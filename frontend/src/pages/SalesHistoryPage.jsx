import { useEffect, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { cancelSale, getSaleDetail, getSales } from '../api.js';
import { useAuth } from '../auth.jsx';

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  qr: 'QR',
  card: 'Tarjeta',
};

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
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

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
    load();
  }, [page, limit, search, status]);

  useEffect(() => {
    setPage(1);
  }, [limit, search, status]);

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
          limit={limit}
          setLimit={setLimit}
          total={total}
        />
        {loading ? (
          <p className="p-6 text-slate-500">Cargando ventas…</p>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay ventas registradas.
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

function ListToolbar({ search, setSearch, status, setStatus, limit, setLimit, total }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
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
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="active">Activas</option>
          <option value="cancelled">Anuladas</option>
        </select>
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
