import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";
import { useEffect } from "react";

const PUBLIC_ROUTES = ["/login"];
const PLATFORM_ROUTES = ["/platform"];
const ORG_ROUTES = ["/dashboard"];

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const path = router.pathname;
    if (PUBLIC_ROUTES.includes(path)) return;

    // Not logged in → login
    if (!session) { router.replace("/login"); return; }

    const isPlatformRoute = PLATFORM_ROUTES.some((r) => path.startsWith(r));
    const isOrgRoute = ORG_ROUTES.some((r) => path.startsWith(r));

    const isPlatform = ["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(session.user.role);

    // Org user trying to access platform routes
    if (isPlatformRoute && !isPlatform) {
      router.replace("/dashboard"); return;
    }
    // Platform user trying to access org routes
    if (isOrgRoute && isPlatform) {
      router.replace("/platform"); return;
    }
  }, [session, status, router]);

  if (status === "loading") return null;
  return <>{children}</>;
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <NotificationsProvider>
          <RouteGuard>
            {isPublic ? (
              <Component {...pageProps} />
            ) : (
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </RouteGuard>
        </NotificationsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
