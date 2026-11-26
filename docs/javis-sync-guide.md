# Hướng dẫn Đồng bộ Javis OS (Máy trạm) ↔ `phuckhanh.digital`

## 1. Thông tin kết nối API
- **Base URL**:
  - Production: `https://phuckhanh.digital`
  - Test local: `http://localhost:3000` (nếu gọi cùng mạng/máy)
- **Header xác thực**: `Authorization: Bearer <JAVIS_SYNC_API_KEY>` (giá trị `JAVIS_SYNC_API_KEY` nằm trong `.env.local` và Environment Variables trên Vercel).

### `POST /api/integrations/javis/sync` (Đẩy từ Javis lên Web)
```json
{
  "customers": [
    {
      "javisClientSlug": "shin-aios",
      "businessName": "Shin AIOS",
      "fullName": "Anh Minh",
      "phone": "0909123456",
      "fanpageUrl": "https://facebook.com/shinaios",
      "plan": "growth",
      "contractStatus": "active",
      "monthlyFee": 6000000
    }
  ],
  "brandAssets": [
    {
      "javisClientSlug": "shin-aios",
      "title": "Brand Guideline v1",
      "assetType": "guideline",
      "fileUrl": "https://..."
    }
  ],
  "contentItems": [
    {
      "javisClientSlug": "shin-aios",
      "javisItemId": "shin-aios-2026-11-26-01",
      "title": "Bài giới thiệu sản phẩm",
      "caption": "Nội dung bài viết...",
      "mediaType": "image",
      "mediaUrls": ["https://..."],
      "status": "pending_client"
    }
  ],
  "syncedLeadIds": []
}
```
> Giá trị hợp lệ cho `plan`: `standard` | `growth` | `custom`.  
> Giá trị hợp lệ cho `status`: `pending_review` | `pending_client` | `approved` | `changes_requested` | `scheduled` | `published`.

### `GET /api/integrations/javis/sync` (Kéo từ Web về Javis)
Trả về:
- `unsyncedLeads`: Các Lead mới điền form trên Landing Page chưa đồng bộ về Javis.
- `clientDecisions`: Các bài viết khách hàng đã bấm **Duyệt (`approved`)** hoặc **Yêu cầu chỉnh sửa (`changes_requested`)** kèm `clientFeedback`.

---

## 2. Prompt mẫu dán thẳng vào Javis OS trên máy trạm

Mở brain **Phúc Khánh Digital** trên `https://phuckhanhstudio.tail158e96.ts.net/` và gửi cho Javis:

> Hãy đọc các file trong `workspace/fanpages/_khach-hang.md`, `workspace/fanpages/_cho-duyet.md` và các thư mục khách hàng đang hoạt động.
> Sau đó dùng `javis_plugin` tạo cho tôi plugin `phuckhanh-sync` có 2 thao tác:
> 1. `push`: Đọc danh sách khách hàng và các bài đang chờ khách duyệt trong `workspace/fanpages/`, gửi `POST` tới `https://phuckhanh.digital/api/integrations/javis/sync` với header `Authorization: Bearer <JAVIS_SYNC_API_KEY>`.
> 2. `pull`: Gọi `GET` tới `https://phuckhanh.digital/api/integrations/javis/sync` để lấy `unsyncedLeads` và `clientDecisions` (bài khách đã duyệt hoặc yêu cầu sửa), cập nhật lại trạng thái vào `_cho-duyet.md` / thư mục khách hàng tương ứng, rồi gửi `syncedLeadIds` lên lại qua `POST`.
