import { createListing, markShipped } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireSeller } from "@/lib/session";

export default async function SellPage({ searchParams }: PageProps<"/sell">) {
  const { seller } = await requireSeller();
  const sp = await searchParams;
  const [categories, listings, orders] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.listing.findMany({ where: { sellerId: seller.id }, include: { product: true }, orderBy: { createdAt: "desc" } }),
    db.sellerOrder.findMany({
      where: { sellerId: seller.id },
      include: { items: true, order: true },
      orderBy: { order: { createdAt: "desc" } },
    }),
  ]);
  const input = "rounded border bg-white px-3 py-2";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{seller.shopName}</h1>

      <section>
        <h2 className="mb-2 font-semibold">Orders to fulfil</h2>
        {orders.length === 0 ? <p className="text-sm text-zinc-500">No orders yet.</p> : (
          <ul className="space-y-2">
            {orders.map((so) => {
              const addr = so.order.shippingAddress as Record<string, string>;
              return (
                <li key={so.id} className="rounded-lg border bg-white p-3 text-sm">
                  <p className="font-semibold">
                    {so.status.replace("_", " ").toLowerCase()} · {formatMoney(so.subtotalMinor)} (you receive {formatMoney(so.subtotalMinor - so.commissionMinor)})
                  </p>
                  <p>{so.items.map((i) => `${i.qty} × ${i.titleSnapshot}`).join(", ")}</p>
                  <p className="text-zinc-500">Ship to: {addr.fullName}, {addr.line1}, {addr.city} {addr.postalCode}, {addr.country}</p>
                  {so.status === "AWAITING_SHIPMENT" && (
                    <form action={markShipped} className="mt-2 flex gap-2">
                      <input type="hidden" name="sellerOrderId" value={so.id} />
                      <input name="trackingNumber" placeholder="Tracking number" className={input} />
                      <button className="rounded bg-zinc-900 px-3 py-2 text-white">Mark shipped</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Your listings</h2>
        {listings.length === 0 ? <p className="text-sm text-zinc-500">Nothing listed yet.</p> : (
          <ul className="space-y-1 text-sm">
            {listings.map((l) => (
              <li key={l.id} className="rounded border bg-white px-3 py-2">
                {l.product.title} — {formatMoney(l.priceMinor, l.currency)} · {l.condition.toLowerCase()} · {l.stock} in stock
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">New listing</h2>
        {sp.error && <p className="mb-2 rounded bg-red-100 px-3 py-2 text-sm text-red-800">Please check the form values.</p>}
        <form action={createListing} className="grid max-w-lg gap-2">
          <select name="categoryId" required className={input}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="title" placeholder="Title (e.g. Dell XPS 13 9310)" required className={input} />
          <div className="flex gap-2">
            <input name="brand" placeholder="Brand" required className={`${input} w-full`} />
            <input name="model" placeholder="Model" required className={`${input} w-full`} />
          </div>
          <select name="condition" className={input}>
            <option value="NEW">New</option>
            <option value="REFURBISHED">Refurbished</option>
            <option value="USED">Used</option>
          </select>
          <div className="flex gap-2">
            <input name="price" type="number" step="0.01" min="0.01" placeholder="Price" required className={`${input} w-full`} />
            <input name="stock" type="number" min="1" placeholder="Stock" required className={`${input} w-full`} />
            <input name="warrantyMonths" type="number" min="0" defaultValue="0" placeholder="Warranty (months)" className={`${input} w-full`} />
          </div>
          <textarea name="specs" rows={4} placeholder={"Specs, one per line:\nRAM: 16 GB\nStorage: 512 GB"} className={input} />
          <button className="rounded bg-zinc-900 px-4 py-2 text-white">Publish listing</button>
        </form>
      </section>
    </div>
  );
}
