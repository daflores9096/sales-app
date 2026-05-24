import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { CreditCard, DollarSign, PackageCheck, QrCode, ShoppingCart, Wallet } from 'lucide-react';
import { getReportByPaymentMethod, getReportByProduct, getReportDaily, getReportTotals } from '../api.js';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Efectivo', icon: Wallet },
  { key: 'qr', label: 'QR', icon: QrCode },
  { key: 'card', label: 'Tarjeta', icon: CreditCard },
];

function toIsoDate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function rangeForPeriod(period, customFrom, customTo) {
  const now = new Date();
  const today = toIsoDate(now);

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

export default function DashboardPage() {
  const [totals, setTotals] = useState({ sales: 0, revenue: 0, productsSold: 0 });
  const [paymentTotals, setPaymentTotals] = useState({});
  const [dailyOption, setDailyOption] = useState(null);
  const [productOption, setProductOption] = useState(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(() => toIsoDate(new Date()));
  const [customTo, setCustomTo] = useState(() => toIsoDate(new Date()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const params = rangeForPeriod(period, customFrom, customTo);
      setLoading(true);
      setError('');
      try {
        const [t, d, p, payments] = await Promise.all([
          getReportTotals(params),
          getReportDaily(params),
          getReportByProduct(params),
          getReportByPaymentMethod(params),
        ]);
        setTotals({
          sales: Number(t.data?.total_sales ?? 0),
          revenue: Number(t.data?.total_revenue ?? 0),
          productsSold: (p.data ?? []).reduce((a, row) => a + Number(row.total_quantity), 0),
        });
        setPaymentTotals(
          (payments.data ?? []).reduce((acc, row) => {
            acc[row.payment_method] = {
              sales: Number(row.total_sales ?? 0),
              revenue: Number(row.total_revenue ?? 0),
            };
            return acc;
          }, {}),
        );

        const dailyLabels = (d.data ?? []).map((x) => x.date);
        const dailyValues = (d.data ?? []).map((x) => Number(x.total_amount));
        setDailyOption({
          tooltip: { trigger: 'axis' },
          grid: { left: 40, right: 20, top: 30, bottom: 40 },
          xAxis: { type: 'category', data: dailyLabels, axisLabel: { rotate: 30 } },
          yAxis: { type: 'value' },
          series: [{ name: 'Ventas por día', type: 'line', smooth: true, data: dailyValues, areaStyle: {} }],
        });

        const prodLabels = (p.data ?? []).map((x) => x.product_name);
        const prodQty = (p.data ?? []).map((x) => Number(x.total_quantity));
        setProductOption({
          tooltip: { trigger: 'axis' },
          grid: { left: 40, right: 20, top: 30, bottom: 80 },
          xAxis: { type: 'category', data: prodLabels, axisLabel: { rotate: 35, interval: 0 } },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Unidades',
              type: 'bar',
              data: prodQty,
              itemStyle: { borderRadius: [6, 6, 0, 0] },
            },
          ],
        });
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los reportes');
      } finally {
        setLoading(false);
      }
    })();
  }, [period, customFrom, customTo]);

  return (
    <div className="space-y-6 pt-2">
      <div className="text-white">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-white/75">Resumen de ventas</p>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Periodo
            </label>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="today">Día actual</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
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
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="text-sm text-slate-500">
            {(() => {
              const { from, to } = rangeForPeriod(period, customFrom, customTo);
              return loading ? 'Cargando…' : `Mostrando datos del ${from} al ${to}`;
            })()}
          </div>
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ventas" value={totals.sales} icon={ShoppingCart} />
        <KpiCard label="Ingresos" value={`$${totals.revenue.toFixed(2)}`} icon={DollarSign} />
        <KpiCard label="Productos vendidos" value={totals.productsSold} icon={PackageCheck} />
      </div>
      <PaymentMethodsCard data={paymentTotals} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Ventas por día">
          {dailyOption ? <ReactECharts option={dailyOption} style={{ height: 320 }} /> : <p className="text-slate-500">Sin datos</p>}
        </ChartCard>
        <ChartCard title="Por producto">
          {productOption ? <ReactECharts option={productOption} style={{ height: 320 }} /> : <p className="text-slate-500">Sin datos</p>}
        </ChartCard>
      </div>
    </div>
  );
}

function PaymentMethodsCard({ data }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ventas por tipo de pago</h2>
          <p className="text-sm text-slate-500">Resumen por efectivo, QR y tarjeta</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2545] to-[#1d4ed8] text-white shadow-lg shadow-blue-900/25">
          <DollarSign size={24} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => {
          const item = data[key] ?? { sales: 0, revenue: 0 };
          return (
            <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0b2545] shadow-sm">
                  <Icon size={19} />
                </span>
                {label}
              </div>
              <p className="text-2xl font-bold text-slate-900">{item.sales}</p>
              <p className="text-sm text-slate-500">ventas</p>
              <p className="mt-2 font-semibold text-emerald-700">${item.revenue.toFixed(2)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="relative rounded-xl bg-white p-5 shadow-sm">
      <div className="absolute -top-4 left-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2545] to-[#1d4ed8] text-lg font-bold text-white shadow-lg shadow-blue-900/25">
        <Icon size={26} strokeWidth={2.2} />
      </div>
      <div className="pl-20 text-right">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="-mt-8 mb-5 rounded-xl bg-gradient-to-r from-[#0b2545] to-[#0f3a68] px-4 py-3 font-semibold text-white shadow-lg shadow-blue-900/25">
        {title}
      </div>
      {children}
    </div>
  );
}
