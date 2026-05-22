import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { cancelSale, getSaleDetail, getSales } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function SalesHistoryPage({ adminView = true }) {
  const { isAdminLike } = useAuth();
  const showAdminActions = adminView && isAdminLike;
  const title = showAdminActions ? 'Histórico de ventas' : 'Mis ventas';

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSales({ page, limit });
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
  }, [page]);

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
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Cargando ventas…</p>
      ) : sales.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No hay ventas registradas.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
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
                      <button type="button" className="mr-2 text-indigo-600 hover:underline" onClick={() => openDetail(s.id)}>
                        Ver
                      </button>
                      {showAdminActions && s.status !== 'cancelled' && (
                        <button type="button" className="text-red-600 hover:underline" onClick={() => handleCancel(s.id)}>
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="text-slate-500">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page * limit >= total}
              className="rounded-lg border px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
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
