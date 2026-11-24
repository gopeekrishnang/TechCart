import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

type SpecField = { key: string; label: string; type: "text" | "number" | "select"; options?: string[]; filterable: boolean };

const categories: { name: string; slug: string; specSchema: SpecField[] }[] = [
  {
    name: "Laptops",
    slug: "laptops",
    specSchema: [
      { key: "cpu", label: "Processor", type: "text", filterable: true },
      { key: "ramGb", label: "RAM (GB)", type: "select", options: ["8", "16", "32", "64"], filterable: true },
      { key: "storageGb", label: "Storage (GB)", type: "select", options: ["256", "512", "1024", "2048"], filterable: true },
      { key: "screenIn", label: "Screen (in)", type: "number", filterable: true },
    ],
  },
  {
    name: "Smartphones",
    slug: "smartphones",
    specSchema: [
      { key: "storageGb", label: "Storage (GB)", type: "select", options: ["64", "128", "256", "512"], filterable: true },
      { key: "ramGb", label: "RAM (GB)", type: "select", options: ["4", "6", "8", "12"], filterable: true },
      { key: "screenIn", label: "Screen (in)", type: "number", filterable: true },
      { key: "os", label: "OS", type: "select", options: ["iOS", "Android"], filterable: true },
    ],
  },
  {
    name: "Headphones",
    slug: "headphones",
    specSchema: [
      { key: "type", label: "Type", type: "select", options: ["Over-ear", "On-ear", "In-ear"], filterable: true },
      { key: "wireless", label: "Wireless", type: "select", options: ["Yes", "No"], filterable: true },
      { key: "anc", label: "Noise cancelling", type: "select", options: ["Yes", "No"], filterable: true },
    ],
  },
];

async function main() {
  const catBySlug: Record<string, string> = {};
  for (const c of categories) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, specSchema: c.specSchema },
      create: { name: c.name, slug: c.slug, specSchema: c.specSchema },
    });
    catBySlug[c.slug] = row.id;
  }

  // Demo accounts for local development only.
  const hash = await bcrypt.hash("password123", 10);
  await db.user.upsert({
    where: { email: "admin@techcart.test" },
    update: {},
    create: { email: "admin@techcart.test", name: "Admin", role: "ADMIN", passwordHash: hash },
  });
  await db.user.upsert({
    where: { email: "buyer@techcart.test" },
    update: {},
    create: { email: "buyer@techcart.test", name: "Demo Buyer", role: "BUYER", passwordHash: hash },
  });
  const sellerUser = await db.user.upsert({
    where: { email: "seller@techcart.test" },
    update: {},
    create: { email: "seller@techcart.test", name: "Demo Seller", role: "SELLER", passwordHash: hash },
  });
  const seller = await db.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: { userId: sellerUser.id, shopName: "Refurb Hub", status: "ACTIVE" },
  });

  const products = [
    { cat: "laptops", brand: "Lenovo", model: "ThinkPad T14", title: "Lenovo ThinkPad T14", slug: "lenovo-thinkpad-t14",
      specs: { cpu: "Ryzen 5 PRO", ramGb: "16", storageGb: "512", screenIn: 14 }, price: 54900, condition: "REFURBISHED" as const },
    { cat: "smartphones", brand: "Apple", model: "iPhone 13", title: "Apple iPhone 13", slug: "apple-iphone-13",
      specs: { storageGb: "128", ramGb: "4", screenIn: 6.1, os: "iOS" }, price: 44900, condition: "REFURBISHED" as const },
    { cat: "headphones", brand: "Sony", model: "WH-1000XM5", title: "Sony WH-1000XM5", slug: "sony-wh-1000xm5",
      specs: { type: "Over-ear", wireless: "Yes", anc: "Yes" }, price: 29900, condition: "NEW" as const },
  ];

  for (const p of products) {
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        categoryId: catBySlug[p.cat], brand: p.brand, model: p.model, title: p.title,
        slug: p.slug, specs: p.specs, imageUrls: [],
      },
    });
    const existing = await db.listing.findFirst({ where: { productId: product.id, sellerId: seller.id } });
    if (!existing) {
      await db.listing.create({
        data: {
          productId: product.id, sellerId: seller.id, condition: p.condition,
          priceMinor: p.price, stock: 5, warrantyMonths: 12, status: "ACTIVE",
        },
      });
    }
  }

  console.log("Seeded:", {
    categories: await db.category.count(),
    users: await db.user.count(),
    products: await db.product.count(),
    listings: await db.listing.count(),
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
