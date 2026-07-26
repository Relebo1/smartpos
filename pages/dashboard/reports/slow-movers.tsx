import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "@/components/_reportPage";

export default function SlowMovers({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Slow Movers" orgName={orgName}>
      {(data) => {
        const { slowMovers } = data;
        return (
          <div className="flex flex-col gap-4">
            <StatCard label="Slow Moving Products" value={String(slowMovers.length)} sub="Lowest sales velocity in period" color="text-orange-500 dark:text-orange-400" />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Lowest Performing Products</p>
              <ReportTable
                headers={["Product", "Units Sold", "Revenue"]}
                rows={slowMovers.map((p) => [p.name, p.qty, fmt(p.revenue)])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
