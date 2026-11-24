import { checkout, removeFromCart } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const user = await requireUser();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { listing: { include: { product: true, seller: true } } } } },
  });
  const items = cart?.items ?? [];
  const total = items.reduce((s, i) => s + i.listing.priceMinor * i.qty, 0);

  if (items.length === 0) return <p className="text-zinc-500">Your cart is empty.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cart</h1>
      {error && (
        <p className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
          {error === "address" ? "Please complete the shipping address." : "Some items are out of stock or unavailable. Please review your cart."}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 rounded-lg border bg-white p-3">
            <div className="flex-1">
              <p className="font-semibold">{i.listing.product.title}</p>
              <p className="text-sm text-zinc-500">{i.listing.condition.toLowerCase()} · sold by {i.listing.seller.shopName} · qty {i.qty}</p>
            </div>
            <p className="font-semibold">{formatMoney(i.listing.priceMinor * i.qty, i.listing.currency)}</p>
            <form action={removeFromCart}>
              <input type="hidden" name="itemId" value={i.id} />
              <button className="text-sm text-red-600 hover:underline">Remove</button>
            </form>
          </li>
        ))}
      </ul>
      <p className="text-right text-lg font-bold">Total: {formatMoney(total)}</p>
      <form action={checkout} className="grid max-w-md gap-2 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Shipping address</h2>
        <input name="fullName" placeholder="Full name" required className="rounded border px-3 py-2" />
        <input name="line1" placeholder="Address" required className="rounded border px-3 py-2" />
        <div className="flex gap-2">
          <input name="city" placeholder="City" required className="w-full rounded border px-3 py-2" />
          <input name="postalCode" placeholder="Postal code" required className="w-full rounded border px-3 py-2" />
        </div>
        <input name="country" placeholder="Country" required className="rounded border px-3 py-2" />
        <p className="text-xs text-zinc-500">Demo mode: no real payment is taken.</p>
        <button className="rounded bg-zinc-900 px-4 py-2 text-white">Place order</button>
      </form>
    </div>
  );
}
