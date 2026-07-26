import { ReportPage, StatCard, ReportTable, makeGSSP } from "@/components/_reportPage";

export default function LowStock({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Low Stock Alerts" orgName={orgName}>
      {(data) => {
        const { stock } = data;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Low Stock Items" value={String(stock.lowStockCount)} sub="At or below minimum threshold" color="text-orange-500 dark:text-orange-400" />
              <StatCard label="Out of Stock" value={String(stock.outOfStockCount)} color="text-red-600 dark:text-red-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Items Needing Restock</p>
              <ReportTable
                headers={["Product", "Category", "Current Qty", "Min Threshold"]}
                rows={stock.lowStockItems.map((p) => [p.name, p.category, p.qty, p.min])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
