import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "./_reportPage";

export default function DailySales({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Daily Sales" orgName={orgName}>
      {(data) => {
        const { dailySeries, summary } = data;
        const best = [...dailySeries].sort((a, b) => b.revenue - a.revenue)[0];
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Revenue" value={fmt(summary.revenue)} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Total Transactions" value={String(summary.totalTransactions)} color="text-green-600 dark:text-green-400" />
              {best && <StatCard label="Best Day" value={best.date} sub={fmt(best.revenue)} color="text-purple-600 dark:text-purple-400" />}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Day-by-Day Revenue</p>
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
