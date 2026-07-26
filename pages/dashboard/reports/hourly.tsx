import { ReportPage, StatCard, ReportTable, fmt, makeGSSP } from "@/components/_reportPage";

function hourLabel(h: number) {
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

export default function HourlyDistribution({ orgName }: { orgName: string }) {
  return (
    <ReportPage title="Hourly Distribution" orgName={orgName}>
      {(data) => {
        const { hourlyDist, peakHour } = data;
        const active = hourlyDist.filter((h) => h.count > 0);
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Peak Hour" value={hourLabel(peakHour.hour)} sub={`${peakHour.count} transactions`} color="text-blue-600 dark:text-blue-400" />
              <StatCard label="Peak Revenue" value={fmt(peakHour.revenue)} color="text-green-600 dark:text-green-400" />
              <StatCard label="Active Hours" value={String(active.length)} sub="Hours with at least 1 sale" color="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Transactions by Hour</p>
              <ReportTable
                headers={["Hour", "Transactions", "Revenue"]}
                rows={hourlyDist.filter((h) => h.count > 0).map((h) => [hourLabel(h.hour), h.count, fmt(h.revenue)])}
              />
            </div>
          </div>
        );
      }}
    </ReportPage>
  );
}

export const getServerSideProps = makeGSSP();
