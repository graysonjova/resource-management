import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : "/";
  const nextPath =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-10">
      <section className="panel w-full max-w-md overflow-hidden">
        <div className="h-2 bg-ey-yellow" />
        <div className="p-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-ey-black">EY</span>
            <span className="h-8 w-px bg-ey-gray-200" />
            <span className="text-sm font-semibold text-ey-ink">
              Resource Management
            </span>
          </div>
          <h1 className="mt-8 font-display text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-ey-gray">
            Use an email address on the application whitelist.
          </p>
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </div>
  );
}
