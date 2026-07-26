import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "./_reportPage";

export default function TopProducts({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Top Selling Products" orgName={orgName}>
      {(data) => {
        const { topProducts, summary } = data;
        const topRevenue = topProducts[0];
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Revenue" value={fmt(summary.revenue)} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Units Sold" value={String(summary.unitsSold)} color="text-green-600 dark:text-green-400" />
              {topRevenue && <StatCard label="Top Product" value={topRevenue.name} sub={fmt(topRevenue.revenue)} color="text-purple-600 dark:text-purple-400" />}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Ranked by Revenue</p>
              <ReportTable
                headers={["#", "Product", "Units Sold", "Revenue", "Discount"]}
                rows={topProducts.map((p, i) => [i + 1, p.name, p.qty, fmt(p.revenue), fmt(p.discount)])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
