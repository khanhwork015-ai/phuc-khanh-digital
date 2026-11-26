import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { brandAssets, contentItems, customers } from "@/db/schema";
import { requireSessionApi } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  if (!auth.user.customerId) {
    return NextResponse.json(
      { ok: false, message: "Tài khoản này chưa được liên kết với hồ sơ khách hàng nào." },
      { status: 404 },
    );
  }

  const db = getDb();
  const [customerRows, assets, items] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, auth.user.customerId)).limit(1),
    db
      .select()
      .from(brandAssets)
      .where(eq(brandAssets.customerId, auth.user.customerId))
      .orderBy(desc(brandAssets.updatedAt)),
    db
      .select()
      .from(contentItems)
      .where(eq(contentItems.customerId, auth.user.customerId))
      .orderBy(desc(contentItems.updatedAt)),
  ]);

  const customer = customerRows[0];
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ khách hàng." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    customer: {
      code: customer.code,
      businessName: customer.businessName,
      fullName: customer.fullName,
      plan: customer.plan,
      contractStatus: customer.contractStatus,
      fanpageUrl: customer.fanpageUrl,
    },
    brandAssets: assets,
    contentItems: items,
  });
}
