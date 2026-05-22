import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { getReportByProduct, getReportDaily, getReportTotals } from '../api.js';

export default function DashboardPage() {
  const [totals, setTotals] = useState({ sales: 0, revenue: 0, productsSold: 0 });
  const [dailyOption, setDailyOption] = useState(null);
  const [productOption, setProductOption] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [t, d, p] = await Promise.all([
          getReportTotals(),
          getReportDaily(),
          getReportByProduct(),
        ]);
        setTotals({
          sales: Number(t.data?.total_sales ?? 0),
          revenue: Number(t.data?.total_revenue ?? 0),
          productsSold: (p.data ?? []).reduce((a, row) => a + Number(row.total_quantity), 0),
        });

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
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen de ventas</p>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ventas" value={totals.sales} />
        <KpiCard label="Ingresos" value={`$${totals.revenue.toFixed(2)}`} />
        <KpiCard label="Productos vendidos" value={totals.productsSold} />
      </div>
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

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}
