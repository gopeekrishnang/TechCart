import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.cat === "string" ? sp.cat : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: {
        listings: { some: { status: "ACTIVE", stock: { gt: 0 } } },
        ...(cat ? { category: { slug: cat } } : {}),
        ...(q ? { OR: [{ title: { contains: q } }, { brand: { contains: q } }, { model: { contains: q } }] } : {}),
      },
      include: { category: true, listings: { where: { status: "ACTIVE", stock: { gt: 0 } }, orderBy: { priceMinor: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
          {error === "own" ? "You can't buy your own listing." : "That item is no longer available."}
        </p>
      )}
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search laptops, phones, headphones…" className="flex-1 rounded border bg-white px-3 py-2" />
        {cat && <input type="hidden" name="cat" value={cat} />}
        <button className="rounded bg-zinc-900 px-4 py-2 text-white">Search</button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={q ? `/?q=${encodeURIComponent(q)}` : "/"} className={`rounded-full border px-3 py-1 ${!cat ? "bg-zinc-900 text-white" : "bg-white"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/?cat=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 ${cat === c.slug ? "bg-zinc-900 text-white" : "bg-white"}`}>
            {c.name}
          </Link>
        ))}
      </div>
      {products.length === 0 ? (
        <p className="text-zinc-500">No products found.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.slug}`} className="block rounded-lg border bg-white p-4 hover:shadow">
                <p className="text-xs uppercase text-zinc-500">{p.category.name} · {p.brand}</p>
                <h2 className="mt-1 font-semibold">{p.title}</h2>
                <p className="mt-3 text-lg font-bold">from {formatMoney(p.listings[0].priceMinor, p.listings[0].currency)}</p>
                <p className="text-xs text-zinc-500">{p.listings.length} offer{p.listings.length > 1 ? "s" : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
