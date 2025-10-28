import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import ProfileClient from "./ProfileClient";
import HeaderBar from "../home/HeaderBar";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/");
  return (
    <div className="home-page">
      <HeaderBar user={user} />
      <ProfileClient initialUser={user} />
    </div>
  );
}