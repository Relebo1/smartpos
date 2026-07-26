import { ReportPage, StatCard, fmt, makeGSSP } from "@/components/_reportPage";

export default function StockReceived({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Stock Received" orgName={orgName}>
      {(data) => {
        const { stock } = data;
        return (
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Units Received" value={String(stock.stockReceivedUnits)} sub="Total STOCK_IN units in period" color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Value Received" value={fmt(stock.stockReceivedValue)} sub="At buying price" color="text-green-600 dark:text-green-400" />
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
