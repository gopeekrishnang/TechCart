import { notFound } from "next/navigation";
import { addToCart } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      listings: {
        where: { status: "ACTIVE", stock: { gt: 0 } },
        include: { seller: true },
        orderBy: { priceMinor: "asc" },
      },
    },
  });
  if (!product) notFound();
  const specs = Object.entries(product.specs as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase text-zinc-500">{product.category.name} · {product.brand}</p>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        {product.description && <p className="mt-2 text-zinc-600">{product.description}</p>}
      </div>
      {specs.length > 0 && (
        <table className="w-full max-w-md text-sm">
          <tbody>
            {specs.map(([k, v]) => (
              <tr key={k} className="border-b">
                <td className="py-1.5 pr-4 text-zinc-500">{k}</td>
                <td className="py-1.5">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <section>
        <h2 className="mb-2 font-semibold">Offers</h2>
        {product.listings.length === 0 ? (
          <p className="text-zinc-500">No sellers have this in stock right now.</p>
        ) : (
          <ul className="space-y-2">
            {product.listings.map((l) => (
              <li key={l.id} className="flex items-center gap-4 rounded-lg border bg-white p-3">
                <div className="flex-1">
                  <p className="font-semibold">{formatMoney(l.priceMinor, l.currency)}</p>
                  <p className="text-sm text-zinc-500">
                    {l.condition.toLowerCase()} · {l.warrantyMonths ? `${l.warrantyMonths} mo warranty` : "no warranty"} · {l.stock} left · sold by {l.seller.shopName}
                  </p>
                </div>
                <form action={addToCart}>
                  <input type="hidden" name="listingId" value={l.id} />
                  <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white">Add to cart</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
