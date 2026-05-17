import { redirect } from "next/navigation";

type UserRegisterAliasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UserRegisterAliasPage({
  searchParams,
}: UserRegisterAliasPageProps) {
  const params = await searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;
  if (next && typeof next === "string" && next.startsWith("/")) {
    redirect(`/register?next=${encodeURIComponent(next)}`);
  }
  redirect("/register");
}
