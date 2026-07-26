import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";

export default function Home() { return null; }

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  const isPlatform = ["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(session.user.role);
  const isCashier = session.user.role === "CASHIER";
  const destination = isPlatform ? "/platform" : isCashier ? "/dashboard/sales/pos" : "/dashboard";
  return { redirect: { destination, permanent: false } };
};
