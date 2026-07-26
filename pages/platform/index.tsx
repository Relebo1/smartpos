import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";

const PLATFORM_ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN"];

type Stat = { label: string; value: string; sub: string; color: string };
type Props = { name: string; role: string; stats: Stat[] };

export default function PlatformDashboard({ name, stats }: Props) {
  return (
    <>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Welcome back, <span className="font-medium text-gray-800 dark:text-slate-100">{name}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session || !PLATFORM_ROLES.includes(session.user.role))
    return { redirect: { destination: "/dashboard", permanent: false } };

  const { prisma } = await import("@/lib/prisma");
  const [totalOrgs, activeOrgs, totalOrgUsers, platformUsers] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "ORGANIZATION_ADMIN" } }),
    prisma.user.count({ where: { role: { in: ["SUPER_ADMIN", "SUPPORT_ADMIN"] } } }),
  ]);

  const stats: Stat[] = [
    { label: "Total Organizations", value: String(totalOrgs),     sub: `${activeOrgs} active`,          color: "text-blue-600 dark:text-blue-400" },
    { label: "Org Admins",          value: String(totalOrgUsers),  sub: "Across all organizations",      color: "text-green-600 dark:text-green-400" },
    { label: "Trial Organizations", value: String(totalOrgs - activeOrgs), sub: "Pending upgrade",       color: "text-orange-500 dark:text-orange-400" },
    { label: "Platform Users",      value: String(platformUsers),  sub: "SmartPOS team",                 color: "text-purple-600 dark:text-purple-400" },
  ];

  return { props: { name: session.user.name, role: session.user.role, stats } };
};
