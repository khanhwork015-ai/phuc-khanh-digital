import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  linkBrandToPage,
  listBrandLinks,
  requestMetaPagesSync,
  unlinkBrandFromPage,
} from "@/lib/approval-bridge";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link"), slug: z.string().min(1).max(80), pageId: z.string().regex(/^\d{5,25}$/) }),
  z.object({ action: z.literal("unlink"), slug: z.string().min(1).max(80) }),
  z.object({ action: z.literal("sync") }),
]);

function engineError(err: unknown) {
  const message = err instanceof Error ? err.message : "Không gọi được hệ thống duyệt bài.";
  return NextResponse.json({ ok: false, message }, { status: 502 });
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  try {
    const data = await listBrandLinks();
    return NextResponse.json({
      ok: true,
      brands: data.brands ?? [],
      pages: data.pages ?? [],
      syncedAt: data.synced_at ?? "",
    });
  } catch (err) {
    return engineError(err);
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const actor = auth.user.username;
  try {
    const input = parsed.data;
    const result =
      input.action === "link"
        ? await linkBrandToPage(input.slug, input.pageId, actor)
        : input.action === "unlink"
          ? await unlinkBrandFromPage(input.slug, actor)
          : await requestMetaPagesSync(actor);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error ?? "Thao tác không thành công." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message ?? "", heldPosts: result.held_posts ?? 0 });
  } catch (err) {
    return engineError(err);
  }
}
