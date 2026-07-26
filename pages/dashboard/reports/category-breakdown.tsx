import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "@/components/_reportPage";

export default function CategoryBreakdown({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Category Breakdown" orgName={orgName}>
      {(data) => {
        const { topProducts, summary } = data;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Revenue" value={fmt(summary.revenue)} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Units Sold" value={String(summary.unitsSold)} color="text-green-600 dark:text-green-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Top Products by Revenue</p>
              <ReportTable
                headers={["Product", "Units Sold", "Revenue", "Transactions"]}
                rows={topProducts.map((p) => [p.name, p.qty, fmt(p.revenue), p.transactions])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
