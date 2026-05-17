import { redirect } from "next/navigation";

type UserLoginAliasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UserLoginAliasPage({
  searchParams,
}: UserLoginAliasPageProps) {
  const params = await searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;
  if (next && typeof next === "string" && next.startsWith("/")) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  redirect("/login");
}
