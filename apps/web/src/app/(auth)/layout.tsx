export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top,0px))] sm:px-6">
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}
