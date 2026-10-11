import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getReportByProduct } from '../api.js';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatMoneyList(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace('.', ',');
}

export default function ProductsSoldPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const periodLabel = useMemo(() => {
    if (!from && !to) return 'Periodo no indicado';
    if (from && to && from === to) return `Día ${from}`;
    if (from && to) return `${from} al ${to}`;
    if (from) return `Desde ${from}`;
    return `Hasta ${to}`;
  }, [from, to]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await getReportByProduct(params);
        const ranking = [...(res.data ?? [])]
          .map((row) => ({
            name: row.product_name ?? 'Producto',
            quantity: Number(row.total_quantity ?? 0),
            revenue: Number(row.total_revenue ?? 0),
          }))
          .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
        setItems(ranking);
      } catch (err) {
        setError(err.message || 'No se pudo cargar el ranking de productos');
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  const totals = useMemo(
    () => ({
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      revenue: items.reduce((sum, item) => sum + item.revenue, 0),
    }),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos vendidos</h1>
          <p className="text-sm text-white/75">{periodLabel}</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-white hover:bg-indigo-50 hover:text-[#0b2545]"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0b2545]">Ranking completo</h2>
            <p className="text-sm text-slate-500">
              {loading
                ? 'Cargando…'
                : `${items.length} producto${items.length === 1 ? '' : 's'} · ${totals.quantity} unidades · ${formatMoney(totals.revenue)}`}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-slate-500">Cargando productos…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">No hay productos vendidos en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0b2545] text-left text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Cantidad vendida</th>
                  <th className="px-4 py-3 text-right">Total venta</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#c45c4a]">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoneyList(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
