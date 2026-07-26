import { ReportPage, StatCard, ReportTable, makeGSSP } from "@/components/_reportPage";

export default function OutOfStock({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Out of Stock" orgName={orgName}>
      {(data) => {
        const { stock } = data;
        return (
          <div className="flex flex-col gap-4">
            <StatCard label="Out of Stock Products" value={String(stock.outOfStockCount)} sub="Zero quantity on hand" color="text-red-600 dark:text-red-400" />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Products with Zero Stock</p>
              <ReportTable
                headers={["Product", "Category"]}
                rows={stock.outOfStockItems.map((p) => [p.name, p.category])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
