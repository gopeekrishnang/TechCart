import { confirmDelivery } from "@/lib/actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { sellerOrders: { include: { seller: true, items: true } } },
  });

  if (orders.length === 0) return <p className="text-zinc-500">No orders yet.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your orders</h1>
      {orders.map((o) => (
        <section key={o.id} className="space-y-2 rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">
            {o.createdAt.toLocaleDateString()} · {formatMoney(o.totalMinor, o.currency)} · #{o.id.slice(-6)}
          </p>
          {o.sellerOrders.map((so) => (
            <div key={so.id} className="rounded border p-3 text-sm">
              <p className="font-semibold">
                {so.seller.shopName} — {so.status.replace("_", " ").toLowerCase()}
              </p>
              <ul className="my-1 list-disc pl-5">
                {so.items.map((i) => (
                  <li key={i.id}>{i.qty} × {i.titleSnapshot} ({formatMoney(i.unitPriceMinor)})</li>
                ))}
              </ul>
              {so.trackingNumber && <p className="text-zinc-500">Tracking: {so.trackingNumber}</p>}
              {so.status === "SHIPPED" && (
                <form action={confirmDelivery} className="mt-2">
                  <input type="hidden" name="sellerOrderId" value={so.id} />
                  <button className="rounded bg-zinc-900 px-3 py-1.5 text-white">Confirm delivery</button>
                </form>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
