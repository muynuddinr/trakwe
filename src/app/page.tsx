"use client";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { canPage } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
// Preserve links to the previous hash-based application during the route migration.
export default function Home() {
  const { account, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const legacy = window.location.hash.slice(1);
    router.replace(
      account
        ? "/" + (canPage(account, legacy) ? legacy : "dashboard")
        : "/login",
    );
  }, [account, ready, router]);
  return <LoadingScreen />;
}
