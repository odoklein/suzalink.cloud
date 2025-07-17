"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  // Optionally, show a message if not redirecting immediately.
  return (
    <div className="p-8 text-center text-red-500">
      Registration is disabled. Please contact your administrator.
    </div>
  );
}