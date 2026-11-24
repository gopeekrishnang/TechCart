import Link from "next/link";
import { login } from "@/lib/actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <form action={login} className="mx-auto grid max-w-sm gap-3">
      <h1 className="text-2xl font-bold">Log in</h1>
      {sp.error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">Invalid email or password.</p>}
      <input name="email" type="email" placeholder="Email" required className="rounded border bg-white px-3 py-2" />
      <input name="password" type="password" placeholder="Password" required className="rounded border bg-white px-3 py-2" />
      <button className="rounded bg-zinc-900 px-4 py-2 text-white">Log in</button>
      <p className="text-sm text-zinc-500">No account? <Link href="/register" className="underline">Sign up</Link></p>
    </form>
  );
}
