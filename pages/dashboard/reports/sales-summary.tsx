import { ReportPage, StatCard, ReportTable, fmt, pct, makeGSSP } from "@/components/_reportPage";

export default function SalesSummary({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Sales Summary" orgName={orgName}>
      {(data) => {
        const { summary, dailySeries } = data;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Revenue" value={fmt(summary.revenue)} sub={`${pct(summary.revenueGrowth)} vs prior period`} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Transactions" value={String(summary.totalTransactions)} sub={`${pct(summary.txGrowth)} vs prior period`} color="text-green-600 dark:text-green-400" />
              <StatCard label="Avg Order Value" value={fmt(summary.avgOrderValue)} sub={`Prior: ${fmt(summary.prevAvgOrder)}`} color="text-purple-600 dark:text-purple-400" />
              <StatCard label="Units Sold" value={String(summary.unitsSold)} color="text-orange-500 dark:text-orange-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Daily Breakdown</p>
              <ReportTable
                headers={["Date", "Revenue", "Transactions", "Discount"]}
                rows={dailySeries.map((d) => [d.date, fmt(d.revenue), d.transactions, fmt(d.discount)])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
