import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "./_reportPage";

export default function Discounts({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Discount Analysis" orgName={orgName}>
      {(data) => {
        const { topProducts, summary } = data;
        const discountRate = summary.revenue + summary.totalDiscount > 0
          ? (summary.totalDiscount / (summary.revenue + summary.totalDiscount)) * 100
          : 0;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Discounts Given" value={fmt(summary.totalDiscount)} color="text-orange-500 dark:text-orange-400" />
              <StatCard label="Net Revenue" value={fmt(summary.revenue)} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Discount Rate" value={`${discountRate.toFixed(1)}%`} sub="Of gross sales" color="text-red-500 dark:text-red-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Discounts by Product</p>
              <ReportTable
                headers={["Product", "Units Sold", "Revenue", "Discount"]}
                rows={topProducts.filter((p) => p.discount > 0).map((p) => [p.name, p.qty, fmt(p.revenue), fmt(p.discount)])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
