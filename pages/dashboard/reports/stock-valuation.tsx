import { ReportPage, StatCard, fmt, makeGSSP } from "./_reportPage";

export default function StockValuation({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Stock Valuation" orgName={orgName}>
      {(data) => {
        const { stock } = data;
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Stock Value (Cost)" value={fmt(stock.stockValue)} sub="Total buying price of current stock" color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Retail Value" value={fmt(stock.retailValue)} sub="Total selling price of current stock" color="text-green-600 dark:text-green-400" />
              <StatCard label="Potential Profit" value={fmt(stock.potentialProfit)} sub="Retail minus cost" color="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Low Stock Items" value={String(stock.lowStockCount)} color="text-orange-500 dark:text-orange-400" />
              <StatCard label="Out of Stock Items" value={String(stock.outOfStockCount)} color="text-red-600 dark:text-red-400" />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
