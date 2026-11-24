import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { logout } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "TechCart",
  description: "Marketplace for new and refurbished electronics",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="text-lg font-bold">TechCart</Link>
            <span className="flex-1" />
            {user ? (
              <>
                {user.seller && <Link href="/sell" className="hover:underline">Sell</Link>}
                <Link href="/orders" className="hover:underline">Orders</Link>
                <Link href="/cart" className="hover:underline">Cart</Link>
                <span className="text-zinc-500">{user.name ?? user.email}</span>
                <form action={logout}><button className="hover:underline">Log out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:underline">Log in</Link>
                <Link href="/register" className="rounded bg-zinc-900 px-3 py-1.5 text-white">Sign up</Link>
              </>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
