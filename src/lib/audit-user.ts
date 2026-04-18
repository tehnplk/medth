import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function getAuditUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();
  const name = session?.user?.name?.trim();

  return email || name || "system";
}
