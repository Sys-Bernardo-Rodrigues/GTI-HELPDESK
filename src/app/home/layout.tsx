import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/");
  }
  return <>{children}</>;
}