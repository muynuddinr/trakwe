"use client";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { LoginForm } from "@/features/auth/login-form";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function LoginPage() {
  const { account, ready, login } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && account) router.replace("/dashboard");
  }, [account, ready, router]);
  if (!ready || account) return <LoadingScreen />;
  return <LoginForm onLogin={login} />;
}
