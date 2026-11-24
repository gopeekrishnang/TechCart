import Link from "next/link";
import { register } from "@/lib/actions";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const msg = sp.error === "exists" ? "That email is already registered." : sp.error ? "Please check your details (password needs 8+ characters)." : "";
  return (
    <form action={register} className="mx-auto grid max-w-sm gap-3">
      <h1 className="text-2xl font-bold">Create account</h1>
      {msg && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">{msg}</p>}
      <input name="name" placeholder="Your name" required className="rounded border bg-white px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded border bg-white px-3 py-2" />
      <input name="password" type="password" placeholder="Password (8+ characters)" required minLength={8} className="rounded border bg-white px-3 py-2" />
      <input name="shopName" placeholder="Shop name (fill in to register as a seller)" className="rounded border bg-white px-3 py-2" />
      <button className="rounded bg-zinc-900 px-4 py-2 text-white">Sign up</button>
      <p className="text-sm text-zinc-500">Have an account? <Link href="/login" className="underline">Log in</Link></p>
    </form>
  );
}
