"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "./db";
import { commissionMinor } from "./money";
import { clearSession, requireSeller, requireUser, setSession } from "./session";

// Every action re-checks auth/ownership itself: Server Actions are reachable by direct POST.

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  shopName: z.string().trim().max(80).optional(),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    shopName: formData.get("shopName") || undefined,
  });
  if (!parsed.success) redirect("/register?error=invalid");
  const { name, email, password, shopName } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) redirect("/register?error=exists");

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: shopName ? "SELLER" : "BUYER",
      // MVP: sellers are active immediately (no admin approval step).
      seller: shopName ? { create: { shopName, status: "ACTIVE" } } : undefined,
    },
  });
  await setSession(user.id);
  redirect(shopName ? "/sell" : "/");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) redirect("/login?error=1");
  await setSession(user.id);
  redirect(user.role === "SELLER" ? "/sell" : "/");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function addToCart(formData: FormData) {
  const user = await requireUser();
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { seller: true } });
  if (!listing || listing.status !== "ACTIVE" || listing.stock < 1) redirect("/?error=unavailable");
  if (listing.seller.userId === user.id) redirect("/?error=own");

  const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  const existing = await db.cartItem.findUnique({ where: { cartId_listingId: { cartId: cart.id, listingId } } });
  const qty = Math.min((existing?.qty ?? 0) + 1, listing.stock);
  await db.cartItem.upsert({
    where: { cartId_listingId: { cartId: cart.id, listingId } },
    update: { qty },
    create: { cartId: cart.id, listingId, qty },
  });
  redirect("/cart");
}

export async function removeFromCart(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  await db.cartItem.deleteMany({ where: { id: itemId, cart: { userId: user.id } } });
  revalidatePath("/cart");
}

const addressSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(60),
});

// Mock payment: the order is marked PAID immediately. Stripe is a post-MVP swap-in here.
export async function checkout(formData: FormData) {
  const user = await requireUser();
  const address = addressSchema.safeParse(Object.fromEntries(formData));
  if (!address.success) redirect("/cart?error=address");

  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { listing: { include: { product: true } } } } },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  try {
    await db.$transaction(async (tx) => {
      const bySeller = new Map<string, typeof cart.items>();
      for (const item of cart.items) {
        if (item.listing.status !== "ACTIVE") throw new Error("unavailable");
        const list = bySeller.get(item.listing.sellerId) ?? [];
        list.push(item);
        bySeller.set(item.listing.sellerId, list);
        // Atomic stock decrement: fails if another buyer took the stock first.
        const res = await tx.listing.updateMany({
          where: { id: item.listingId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (res.count !== 1) throw new Error("stock");
      }

      let total = 0;
      const sellerOrders = [...bySeller.entries()].map(([sellerId, items]) => {
        const subtotal = items.reduce((s, i) => s + i.listing.priceMinor * i.qty, 0);
        total += subtotal;
        return {
          sellerId,
          subtotalMinor: subtotal,
          commissionMinor: commissionMinor(subtotal),
          items: {
            create: items.map((i) => ({
              listingId: i.listingId,
              qty: i.qty,
              unitPriceMinor: i.listing.priceMinor,
              titleSnapshot: i.listing.product.title,
              conditionSnapshot: i.listing.condition,
            })),
          },
        };
      });

      await tx.order.create({
        data: {
          buyerId: user.id,
          status: "PAID",
          totalMinor: total,
          shippingAddress: address.data,
          sellerOrders: { create: sellerOrders },
        },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
  } catch {
    redirect("/cart?error=stock");
  }
  redirect("/orders");
}

const listingSchema = z.object({
  categoryId: z.string().min(1),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]),
  price: z.coerce.number().positive().max(1_000_000),
  stock: z.coerce.number().int().min(1).max(10_000),
  warrantyMonths: z.coerce.number().int().min(0).max(120),
  specs: z.string().max(2000).optional(),
});

export async function createListing(formData: FormData) {
  const { seller } = await requireSeller();
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sell?error=invalid");
  const d = parsed.data;
  if (!(await db.category.findUnique({ where: { id: d.categoryId } }))) redirect("/sell?error=invalid");

  // Specs are entered as "key: value" lines.
  const specs: Record<string, string> = {};
  for (const line of (d.specs ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const slug =
    d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) +
    "-" + randomBytes(3).toString("hex");

  await db.product.create({
    data: {
      categoryId: d.categoryId, brand: d.brand, model: d.model, title: d.title, slug, specs, imageUrls: [],
      listings: {
        create: {
          sellerId: seller.id, condition: d.condition, priceMinor: Math.round(d.price * 100),
          stock: d.stock, warrantyMonths: d.warrantyMonths, status: "ACTIVE",
        },
      },
    },
  });
  revalidatePath("/sell");
  redirect("/sell");
}

export async function markShipped(formData: FormData) {
  const { seller } = await requireSeller();
  const id = String(formData.get("sellerOrderId") ?? "");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim().slice(0, 100);
  await db.sellerOrder.updateMany({
    where: { id, sellerId: seller.id, status: "AWAITING_SHIPMENT" },
    data: { status: "SHIPPED", trackingNumber: trackingNumber || null, shippedAt: new Date() },
  });
  revalidatePath("/sell");
}

export async function confirmDelivery(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("sellerOrderId") ?? "");
  await db.sellerOrder.updateMany({
    where: { id, status: "SHIPPED", order: { buyerId: user.id } },
    data: { status: "COMPLETED", deliveredAt: new Date() },
  });
  revalidatePath("/orders");
}
