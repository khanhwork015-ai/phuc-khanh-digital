#!/usr/bin/env python3
"""Phúc Khánh Digital - Duyệt bài: máy chủ duyệt bài Fanpage chạy liên tục trên máy local.

Có tài khoản Admin / Khách, mã PIN 4 số bắt buộc trước mọi thao tác duyệt,
vòng đời: Chờ duyệt -> (Admin duyệt) -> Chờ khách duyệt -> (Khách duyệt) -> Đã duyệt
-> Chờ đăng (đã hẹn giờ trong Javis) -> Đã đăng. Nhánh phụ: Sửa lại.

Chỉ dùng thư viện chuẩn của Python. Mật khẩu và PIN lưu dạng băm PBKDF2-SHA256
trong data/accounts.json (ngoài thư mục fanpages).
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

UI_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = UI_DIR.parent.parent
BRAIN_ROOT = WORKSPACE_DIR.parent
FANPAGES_DIR = WORKSPACE_DIR / "fanpages"
QUEUE_FILE = FANPAGES_DIR / "_cho-duyet.md"
SOP_FILE = WORKSPACE_DIR / "system" / "sop-tong.md"
CLEAN_SCRIPT = WORKSPACE_DIR / "scripts" / "clean_before_post.py"
INDEX_HTML = UI_DIR / "index.html"
RUNTIME_FILE = UI_DIR / ".runtime.json"
DATA_DIR = UI_DIR / "data"
ACCOUNTS_FILE = DATA_DIR / "accounts.json"
CLIENTS_FILE = DATA_DIR / "clients.json"
META_PAGES_FILE = DATA_DIR / "meta_pages.json"
META_PAGES_INCOMING = DATA_DIR / "meta_pages_incoming.json"
META_SYNC_MARK = DATA_DIR / "meta_sync_requested.txt"
TEMPLATE_DIR = FANPAGES_DIR / "_template"
SETTINGS_FILE = DATA_DIR / "settings.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"
PIN_TOKENS_FILE = DATA_DIR / "pin_tokens.json"
AUDIT_FILE = DATA_DIR / "audit.log"

CLIENT_TYPES = ("customer", "partner")
CLIENT_STATUSES = ("active", "onboarding", "lead", "paused", "ended")
CLIENTS_LOCK = threading.RLock()
SETTINGS_LOCK = threading.RLock()

PUBLIC_URL = "https://admin.phuckhanh.digital"
# Link CONG KHAI cho khach (Tailscale Funnel 8443 -> 127.0.0.1:8766). Admin bi chan tren cong nay.
CUSTOMER_URL = "https://duyet.phuckhanh.digital"
PUBLIC_LOCAL_PORT = 8766
JAVIS_REMINDERS_URL = "http://127.0.0.1:7777/reminders"
DEFAULT_CHAT_ID = "web:f0952ba360ff4e94a1306067edbf3a0a"
PUBLISH_AGENT = "cs-publish-analytics"
REVISION_AGENT = "brain-agency-manager"

SESSION_COOKIE = "shin_sid"
SESSION_IDLE_SEC = 7 * 24 * 3600
PIN_IDLE_SEC = 10 * 60
PBKDF2_ITER = 200_000
MAX_PW_FAILS = 5
PW_LOCK_SEC = 10 * 60
MAX_PIN_FAILS = 5
PIN_LOCK_SEC = 5 * 60

# ---------------------------------------------------------------- trạng thái
STATUS_NHAP = "Nháp"
STATUS_CHO_DUYET = "Chờ duyệt"
STATUS_CHO_KHACH = "Chờ khách duyệt"
STATUS_DA_DUYET = "Đã duyệt"
STATUS_CHO_DANG = "Chờ đăng"
STATUS_DA_DANG = "Đã đăng"
STATUS_SUA_LAI = "Sửa lại"

ALL_STATUSES = [
    STATUS_NHAP,
    STATUS_CHO_DUYET,
    STATUS_CHO_KHACH,
    STATUS_DA_DUYET,
    STATUS_CHO_DANG,
    STATUS_DA_DANG,
    STATUS_SUA_LAI,
]

STATUS_ALIASES = {
    "nhap": STATUS_NHAP,
    "nháp": STATUS_NHAP,
    "bản nháp": STATUS_NHAP,
    "cho-duyet": STATUS_CHO_DUYET,
    "cho-sep-duyet": STATUS_CHO_DUYET,
    "chờ duyệt": STATUS_CHO_DUYET,
    "chờ sếp duyệt": STATUS_CHO_DUYET,
    "chờ admin duyệt": STATUS_CHO_DUYET,
    "cho-khach-duyet": STATUS_CHO_KHACH,
    "chờ khách duyệt": STATUS_CHO_KHACH,
    "can-sua": STATUS_SUA_LAI,
    "sua-lai": STATUS_SUA_LAI,
    "cần sửa": STATUS_SUA_LAI,
    "sửa lại": STATUS_SUA_LAI,
    "da-duyet": STATUS_DA_DUYET,
    "đã duyệt": STATUS_DA_DUYET,
    "cho-dang": STATUS_CHO_DANG,
    "chờ đăng": STATUS_CHO_DANG,
    "da-dang": STATUS_DA_DANG,
    "đã đăng": STATUS_DA_DANG,
}

CUSTOMER_VISIBLE = {STATUS_CHO_KHACH, STATUS_DA_DUYET, STATUS_CHO_DANG, STATUS_DA_DANG}
EDITABLE_STATUSES = {STATUS_CHO_DUYET, STATUS_CHO_KHACH, STATUS_DA_DUYET, STATUS_CHO_DANG}

INTERNAL_SECTION_PREFIXES = (
    "brief media",
    "prompt ảnh",
    "prompt anh",
    "góp ý",
    "gop y",
    "storyboard",
)
LOGO_EXTENSIONS = (".png", ".svg", ".jpg", ".jpeg", ".webp")

FILE_LOCK = threading.RLock()
AUTH_LOCK = threading.RLock()
PIN_TOKENS: dict[str, dict[str, Any]] = {}
IP_FAILS: dict[str, list[float]] = {}


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def audit(actor: str, action: str, detail: str = "") -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(AUDIT_FILE, "a", encoding="utf-8") as fh:
            fh.write(f"{now_str()}\t{actor}\t{action}\t{detail}\n")
    except Exception:
        pass


# ---------------------------------------------------------------- frontmatter
def normalize_status(raw: str) -> str:
    cleaned = re.sub(r"\s+", " ", (raw or "").strip())
    if not cleaned:
        return STATUS_NHAP
    return STATUS_ALIASES.get(cleaned.lower(), cleaned)


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and (
        (value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'")
    ):
        inner = value[1:-1]
        if value[0] == '"':
            inner = inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner
    return value


def parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    """Tách YAML frontmatter đơn giản (scalar + list) và phần thân bài."""
    normalized = raw.replace("\r\n", "\n").replace("\r", "\n")
    if not normalized.startswith("---\n"):
        return {}, normalized.strip()

    end_idx = normalized.find("\n---\n", 4)
    if end_idx == -1:
        if normalized.endswith("\n---"):
            end_idx = len(normalized) - 4
            body = ""
        else:
            return {}, normalized.strip()
    else:
        body = normalized[end_idx + 5 :].strip()

    data: dict[str, Any] = {}
    current_list_key: str | None = None
    for line in normalized[4:end_idx].split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- ") and current_list_key is not None:
            item = strip_quotes(stripped[2:])
            if item:
                data[current_list_key].append(item)
            continue
        if ":" not in line:
            current_list_key = None
            continue
        key, rest = line.split(":", 1)
        key = key.strip()
        val = rest.strip()
        if val == "":
            data[key] = []
            current_list_key = key
        elif val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            data[key] = [strip_quotes(x) for x in inner.split(",") if strip_quotes(x)] if inner else []
            current_list_key = None
        else:
            data[key] = strip_quotes(val)
            current_list_key = None
    return data, body


def yaml_escape(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").strip()
    return f'"{escaped}"'


def dump_frontmatter(meta: dict[str, Any]) -> str:
    lines = ["---"]
    for key, val in meta.items():
        if isinstance(val, list):
            if not val:
                lines.append(f"{key}: []")
            else:
                lines.append(f"{key}:")
                for item in val:
                    lines.append(f"  - {yaml_escape(str(item))}")
        elif isinstance(val, bool):
            lines.append(f"{key}: {'true' if val else 'false'}")
        elif isinstance(val, (int, float)):
            lines.append(f"{key}: {val}")
        else:
            lines.append(f"{key}: {yaml_escape(str(val))}")
    lines.append("---")
    return "\n".join(lines)


def write_post(target: Path, meta: dict[str, Any], body: str) -> None:
    text = f"{dump_frontmatter(meta)}\n\n{body.strip()}\n" if body.strip() else f"{dump_frontmatter(meta)}\n"
    target.write_text(text, encoding="utf-8")


def split_post_body(body: str) -> tuple[str, str]:
    """Tách caption hiển thị chuẩn Facebook và lịch sử mục ## Góp ý."""
    normalized = body.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return "", ""
    matches = list(re.finditer(r"(?m)^##\s+(.+?)\s*$", normalized))
    caption_end = len(normalized)
    feedback_history = ""
    for idx, m in enumerate(matches):
        heading = m.group(1).strip().lower()
        if caption_end == len(normalized) and any(heading.startswith(p) for p in INTERNAL_SECTION_PREFIXES):
            caption_end = m.start()
        if heading.startswith("góp ý") or heading.startswith("gop y"):
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(normalized)
            feedback_history = normalized[m.end() : end].strip()
    caption = normalized[:caption_end].strip()
    caption = re.sub(r"(?is)^##\s+caption\s*\n+", "", caption).strip()
    return caption, feedback_history


def append_feedback_section(post_body: str, line: str) -> str:
    normalized = post_body.replace("\r\n", "\n").replace("\r", "\n").strip()
    entry = f"- {line}"
    if not normalized:
        return f"## Góp ý\n{entry}"
    matches = list(re.finditer(r"(?m)^##\s+(.+?)\s*$", normalized))
    for idx, m in enumerate(matches):
        heading = m.group(1).strip().lower()
        if heading.startswith("góp ý") or heading.startswith("gop y"):
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(normalized)
            before = normalized[:end].rstrip()
            after = normalized[end:].lstrip("\n")
            return f"{before}\n{entry}\n\n{after}" if after else f"{before}\n{entry}"
    return f"{normalized}\n\n## Góp ý\n{entry}"


# ---------------------------------------------------------------- fanpage + bài
def get_page_info(page_dir: Path) -> dict[str, Any]:
    slug = page_dir.name
    page_name = slug.replace("-", " ").title()
    brand_kit = page_dir / "brand-kit.md"
    if brand_kit.is_file():
        meta, body = parse_frontmatter(brand_kit.read_text(encoding="utf-8"))
        if isinstance(meta.get("page_name"), str) and meta["page_name"] and "<" not in meta["page_name"]:
            page_name = meta["page_name"]
        else:
            for line in body.splitlines():
                if line.startswith("# "):
                    candidate = re.sub(r"^#\s*Brand Kit\s*-\s*", "", line).strip()
                    if candidate and "<" not in candidate:
                        page_name = candidate
                    break

    logo_url = None
    logo_dir = page_dir / "assets" / "logo"
    if logo_dir.is_dir():
        for file_path in sorted(logo_dir.iterdir()):
            if file_path.is_file() and file_path.suffix.lower() in LOGO_EXTENSIONS:
                rel = file_path.relative_to(FANPAGES_DIR).as_posix()
                logo_url = f"/media/{urllib.parse.quote(rel)}"
                break

    conn: dict[str, Any] = {}
    conn_file = page_dir / "ket-noi.md"
    if conn_file.is_file():
        conn, _ = parse_frontmatter(conn_file.read_text(encoding="utf-8"))
    return {
        "slug": slug,
        "name": page_name,
        "logo_url": logo_url,
        "page_id": str(conn.get("page_id") or "").strip(),
        "connected": _is_real_page_id(conn.get("page_id")),
        "preferred_post_hours": conn.get("preferred_post_hours") or ["14:00"],
    }


def resolve_image_paths(raw_images: Any, page_dir: Path, post_dir: Path) -> list[Path]:
    if isinstance(raw_images, str):
        candidates = [raw_images] if raw_images else []
    elif isinstance(raw_images, list):
        candidates = [str(item).strip() for item in raw_images if str(item).strip()]
    else:
        candidates = []
    root = FANPAGES_DIR.resolve()
    out: list[Path] = []
    for item in candidates:
        if item.startswith(("http://", "https://")):
            continue
        for base in (post_dir, page_dir, FANPAGES_DIR):
            probe = (base / Path(item)).resolve()
            if probe.is_file() and probe.is_relative_to(root):
                out.append(probe)
                break
    return out


def media_url(path: Path) -> str:
    rel = path.resolve().relative_to(FANPAGES_DIR.resolve()).as_posix()
    return f"/media/{urllib.parse.quote(rel)}"


def list_fanpages() -> list[dict[str, Any]]:
    if not FANPAGES_DIR.is_dir():
        return []
    return [
        get_page_info(d)
        for d in sorted(FANPAGES_DIR.iterdir())
        if d.is_dir() and not d.name.startswith("_")
    ]


def load_all_posts() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    fanpages = list_fanpages()
    posts: list[dict[str, Any]] = []
    for page_info in fanpages:
        page_dir = FANPAGES_DIR / page_info["slug"]
        drafts_dir = page_dir / "bai-nhap"
        if not drafts_dir.is_dir():
            continue
        for post_file in sorted(drafts_dir.glob("*.md")):
            meta, body = parse_frontmatter(post_file.read_text(encoding="utf-8"))
            caption, feedback_history = split_post_body(body)
            images = [media_url(p) for p in resolve_image_paths(meta.get("images"), page_dir, drafts_dir)]
            posts.append(
                {
                    "file": post_file.relative_to(FANPAGES_DIR).as_posix(),
                    "code": post_file.stem,
                    "fanpage_slug": page_info["slug"],
                    "fanpage_name": page_info["name"],
                    "fanpage_logo": page_info["logo_url"],
                    "title": str(meta.get("title") or post_file.stem).strip(),
                    "status": normalize_status(str(meta.get("status") or STATUS_NHAP)),
                    "scheduled_at": str(meta.get("scheduled_at") or "").strip(),
                    "feedback": str(meta.get("feedback") or "").strip(),
                    "feedback_history": feedback_history,
                    "reviewed_at": str(meta.get("reviewed_at") or "").strip(),
                    "admin_approved_at": str(meta.get("admin_approved_at") or "").strip(),
                    "admin_approved_by": str(meta.get("admin_approved_by") or "").strip(),
                    "customer_approved_at": str(meta.get("customer_approved_at") or "").strip(),
                    "customer_approved_by": str(meta.get("customer_approved_by") or "").strip(),
                    "edit_requested_by_role": str(meta.get("edit_requested_by_role") or "").strip(),
                    "publish_at": str(meta.get("publish_at") or "").strip(),
                    "publish_job_id": str(meta.get("publish_job_id") or "").strip(),
                    "schedule_error": str(meta.get("schedule_error") or "").strip(),
                    "post_id": str(meta.get("post_id") or "").strip(),
                    "published_at": str(meta.get("published_at") or "").strip(),
                    "images": images,
                    "body": caption,
                }
            )
    order = {s: i for i, s in enumerate(ALL_STATUSES)}
    posts.sort(key=lambda p: (order.get(p["status"], 99), p["publish_at"] or p["scheduled_at"] or "9999", p["file"]))
    return fanpages, posts


def resolve_post_file(rel_file: str) -> Path | None:
    root = FANPAGES_DIR.resolve()
    rel_file = (rel_file or "").strip().replace("\\", "/").lstrip("/")
    if rel_file.startswith("workspace/fanpages/"):
        rel_file = rel_file[len("workspace/fanpages/") :]
    target = (root / rel_file).resolve()
    if (
        not target.is_relative_to(root)
        or not target.is_file()
        or target.suffix.lower() != ".md"
        or target.parent.name != "bai-nhap"
        or any(part.startswith("_") for part in target.relative_to(root).parts)
    ):
        return None
    return target


# ---------------------------------------------------------------- lịch đăng
def parse_dt(value: str) -> datetime | None:
    value = (value or "").strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def next_slot(page_info: dict[str, Any]) -> datetime:
    raw = page_info.get("preferred_post_hours") or ["14:00"]
    if isinstance(raw, str):
        raw = [raw]
    hours = sorted(h for h in (str(x).strip() for x in raw) if re.match(r"^\d{1,2}:\d{2}$", h)) or ["14:00"]
    now = datetime.now()
    for offset in range(0, 3):
        day = (now + timedelta(days=offset)).date()
        for hhmm in hours:
            hh, mm = map(int, hhmm.split(":"))
            cand = datetime(day.year, day.month, day.day, hh, mm)
            if cand >= now + timedelta(minutes=15):
                return cand
    return now + timedelta(minutes=15)


def resolve_publish_time(meta: dict[str, Any], page_info: dict[str, Any]) -> tuple[datetime | None, str]:
    """Trả (thời điểm đăng, ghi chú). None = đăng ngay."""
    raw = str(meta.get("scheduled_at") or "").strip()
    dt = parse_dt(raw)
    if dt is None:
        if raw and ("ngay" in raw.lower() or "now" in raw.lower()):
            return None, "đăng ngay"
        return next_slot(page_info), "khung giờ ưu tiên kế tiếp"
    if dt <= datetime.now() + timedelta(minutes=2):
        return None, "lịch đã qua, đăng ngay"
    return dt, "đúng lịch đã chốt"


def _post_javis(url: str, payload: dict[str, Any] | None = None, form: dict[str, str] | None = None,
                timeout: float = 10.0) -> dict[str, Any]:
    if form is not None:
        data = urllib.parse.urlencode(form).encode("utf-8")
        ctype = "application/x-www-form-urlencoded"
    else:
        data = json.dumps(payload or {}, ensure_ascii=False).encode("utf-8")
        ctype = "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": ctype})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=timeout) as resp:
        text = resp.read().decode("utf-8", errors="replace").strip()
    try:
        parsed = json.loads(text) if text else {}
        return parsed if isinstance(parsed, dict) else {"raw": parsed}
    except json.JSONDecodeError:
        return {"ok": False, "error": text[:200]}


def create_javis_job(text: str, label: str, agent: str, when: datetime | None, chat_id: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "text": text,
        "label": label,
        "mode": "task",
        "agent": agent,
        "muc_quyen": "full",
        "chat_id": chat_id,
        "brain": str(BRAIN_ROOT),
        "created_by": "approval-ui",
    }
    if when is None:
        payload["delay_min"] = 1
    else:
        payload["at"] = when.strftime("%Y-%m-%d %H:%M")
    try:
        resp = _post_javis(JAVIS_REMINDERS_URL, payload)
        if not resp.get("ok") and resp.get("can_force"):
            payload["allow_no_channel"] = True
            resp = _post_javis(JAVIS_REMINDERS_URL, payload)
    except urllib.error.HTTPError as exc:
        return {"ok": False, "error": f"HTTP {exc.code}"}
    except Exception as exc:
        return {"ok": False, "error": (str(exc) or exc.__class__.__name__)[:180]}
    return resp


def cancel_javis_job(job_id: str) -> bool:
    if not job_id:
        return False
    try:
        resp = _post_javis(JAVIS_REMINDERS_URL + "/cancel", form={"id": job_id, "brain": str(BRAIN_ROOT)})
        return bool(resp.get("ok"))
    except Exception as exc:
        log(f"Không huỷ được lịch {job_id}: {exc}")
        return False


def chat_id_from_sop() -> str:
    try:
        raw = SOP_FILE.read_text(encoding="utf-8")
        m = re.search(r'chat_id:\s*"([^"]+)"', raw)
        if m:
            return m.group(1)
    except Exception:
        pass
    return DEFAULT_CHAT_ID


def build_publish_text(rel_file: str, page_info: dict[str, Any], title: str, token: str) -> str:
    srv = "workspace/tools/approval-ui/server.py"
    return (
        f"ĐĂNG BÀI ĐÃ DUYỆT LÊN FACEBOOK - không hỏi lại, làm ngay.\n"
        f"Bài: workspace/fanpages/{rel_file}\n"
        f"Fanpage: {page_info['name']} (page_id {page_info['page_id'] or 'xem ket-noi.md'})\n"
        f"Tiêu đề: {title}\n\n"
        f"Các bước:\n"
        f"1. Chạy: python {srv} --prepare-publish \"{rel_file}\" --token {token}\n"
        f"   Lệnh này tự kiểm trạng thái 'Chờ đăng', chạy clean_before_post.py (làm sạch chữ, xoá metadata ảnh) "
        f"và in JSON gồm page_id, photo (đường dẫn ảnh đã làm sạch trong vault) và message (caption sạch).\n"
        f"   Nếu JSON có ok=false thì DỪNG, không đăng, báo lại đúng lý do (thường là bài đã bị yêu cầu sửa).\n"
        f"2. Có photo: gọi fb_page_photo(photo=<photo>, message=<message>, page_id=<page_id>). "
        f"Không có ảnh: gọi fb_page_post(message=<message>, page_id=<page_id>).\n"
        f"3. Đăng thành công: chạy python {srv} --mark-published \"{rel_file}\" --post-id <post_id trả về>.\n"
        f"   Đăng lỗi: chạy python {srv} --mark-failed \"{rel_file}\" --reason \"<lỗi ngắn>\".\n"
        f"4. Báo ngắn bằng tiếng Việt: mã bài, Post ID, giờ đăng. Không dùng ký tự gạch dài."
    )


def build_revision_text(rel_file: str, page_info: dict[str, Any], title: str, feedback: str,
                        requested_by: str, role: str) -> str:
    slug = page_info["slug"]
    who = "khách hàng" if role == "customer" else "admin"
    return (
        f"SỬA BÀI THEO GÓP Ý CỦA {who.upper()} - làm ngay, không hỏi lại trừ khi thiếu dữ kiện thật.\n"
        f"Bài: workspace/fanpages/{rel_file}\n"
        f"Fanpage: {page_info['name']} (slug {slug})\n"
        f"Tiêu đề hiện tại: {title}\n"
        f"Góp ý của {requested_by} ({who}): {feedback}\n\n"
        f"Đọc trước: file bài, workspace/fanpages/{slug}/brand-kit.md, ket-noi.md, bai-hoc.md, "
        f"workspace/system/humanizer-rules.md, workspace/system/sop-tong.md, "
        f"agents/cs-content-humanizer.md, agents/cs-image-prompt.md, agents/cs-visual-director.md, agents/cs-qa-approval.md.\n\n"
        f"Quy trình:\n"
        f"1. Giữ dữ kiện đã chốt (giá, ưu đãi, scheduled_at) trừ khi góp ý yêu cầu đổi. Không bịa số liệu.\n"
        f"2. Sửa chữ theo chuẩn cs-content-humanizer (Humanizer 2 lượt, 2-4 hashtag, không ký tự gạch dài). "
        f"Giữ các mục ## Brief media, ## Prompt ảnh, ## Góp ý.\n"
        f"3. Góp ý đụng tới ảnh hoặc thông điệp làm ảnh không còn khớp: cs-image-prompt viết lại prompt, "
        f"cs-visual-director tạo ảnh mới (javis_generate_image, logo theo ket-noi.md), lưu vào bai-nhap và cập nhật images.\n"
        f"4. Chấm lại QA Gate 4 tiêu chí của cs-qa-approval.\n"
        f"5. Xong: chạy python workspace/tools/approval-ui/server.py --mark-revised \"{rel_file}\" --note \"<tóm tắt thay đổi>\" "
        f"(tự đưa bài về 'Chờ duyệt' để admin duyệt lại rồi tới khách).\n"
        f"6. Báo ngắn bằng tiếng Việt kèm đúng 1 link duyệt: {PUBLIC_URL}"
    )


def schedule_publish(target: Path, actor: str) -> dict[str, Any]:
    """Đưa bài 'Đã duyệt' sang 'Chờ đăng' bằng lịch Javis. Gọi khi đã giữ FILE_LOCK."""
    meta, body = parse_frontmatter(target.read_text(encoding="utf-8"))
    page_info = get_page_info(target.parent.parent)
    rel_file = target.relative_to(FANPAGES_DIR).as_posix()
    if not page_info.get("connected"):
        err = "Brand chưa gắn Fanpage thật. Vào tab 'Kết nối Fanpage' để gắn rồi bấm hẹn đăng lại."
        meta["status"] = STATUS_DA_DUYET
        meta["schedule_error"] = err
        write_post(target, meta, body)
        audit(actor, "schedule_blocked", f"{rel_file}: chưa gắn Fanpage")
        return {"ok": False, "error": err}
    when, note = resolve_publish_time(meta, page_info)
    token = secrets.token_hex(6)
    title = str(meta.get("title") or target.stem)
    label = f"Đăng bài {target.stem[:40]} ({page_info['name']})"
    resp = create_javis_job(build_publish_text(rel_file, page_info, title, token), label,
                            PUBLISH_AGENT, when, chat_id_from_sop())
    if resp.get("ok") and resp.get("id"):
        meta["status"] = STATUS_CHO_DANG
        meta["publish_job_id"] = str(resp["id"])
        meta["publish_token"] = token
        meta["publish_at"] = (when or datetime.now() + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M")
        meta["schedule_error"] = ""
        write_post(target, meta, body)
        audit(actor, "schedule", f"{rel_file} -> {meta['publish_at']} job {resp['id']}")
        return {"ok": True, "publish_at": meta["publish_at"], "job_id": resp["id"], "note": note}
    err = str(resp.get("error") or "Javis không trả mã lịch")
    meta["status"] = STATUS_DA_DUYET
    meta["schedule_error"] = err[:200]
    write_post(target, meta, body)
    log(f"Lỗi lên lịch {rel_file}: {err}")
    return {"ok": False, "error": err}


def queue_revision(target: Path, feedback: str, actor: dict[str, Any]) -> dict[str, Any]:
    meta, _ = parse_frontmatter(target.read_text(encoding="utf-8"))
    page_info = get_page_info(target.parent.parent)
    rel_file = target.relative_to(FANPAGES_DIR).as_posix()
    text = build_revision_text(rel_file, page_info, str(meta.get("title") or target.stem), feedback,
                               actor["display_name"], actor["role"])
    resp = create_javis_job(text, f"Sửa bài {target.stem[:40]}", REVISION_AGENT, None, chat_id_from_sop())
    if resp.get("ok"):
        return {"ok": True, "job_id": resp.get("id"), "message": "Đã giao việc sửa cho đội nội dung, bài sẽ quay lại hàng duyệt khi xong."}
    return {"ok": False, "error": str(resp.get("error") or "không rõ"),
            "message": "Đã lưu góp ý, nhưng chưa giao được việc sửa sang Javis: " + str(resp.get("error") or "")}


# ---------------------------------------------------------------- sổ chờ duyệt
def sync_pending_queue_file() -> None:
    _, posts = load_all_posts()
    pending = [p for p in posts if p["status"] in (STATUS_CHO_DUYET, STATUS_CHO_KHACH, STATUS_CHO_DANG, STATUS_SUA_LAI)]
    header = (
        "---\n"
        "type: approval-queue\n"
        f"updated: {datetime.now().strftime('%Y-%m-%d')}\n"
        "---\n\n"
        "# Sổ Tổng Bài Đang Xử Lý\n\n"
        "> Tự đồng bộ từ Web duyệt bài (`workspace/tools/approval-ui/server.py`). Vòng đời: "
        "`Chờ duyệt` -> Admin duyệt -> `Chờ khách duyệt` -> Khách duyệt -> `Đã duyệt` -> `Chờ đăng` -> `Đã đăng`.\n"
        f"> Link duyệt duy nhất: {PUBLIC_URL}\n\n"
    )
    lines = [
        "| STT | Fanpage | Mã bài | Tiêu đề | Trạng thái | Giờ đăng | Ghi chú |",
        "|---|---|---|---|---|---|---|",
    ]
    if not pending:
        lines.append("| - | - | - | _(Không có bài nào đang xử lý)_ | - | - | - |")
    for idx, p in enumerate(pending, start=1):
        when = p["publish_at"] or p["scheduled_at"] or "-"
        note = (p["feedback"] or p["schedule_error"] or "-").replace("|", "/")
        lines.append(
            f"| {idx} | {p['fanpage_name']} | `{p['code']}` | {p['title'].replace('|', '/')} | `{p['status']}` | {when} | {note} |"
        )
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_FILE.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- tài khoản
def _hash_secret(secret: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, PBKDF2_ITER)
    return base64.b64encode(salt).decode(), base64.b64encode(digest).decode()


def _verify_secret(secret: str, salt_b64: str, hash_b64: str) -> bool:
    if not salt_b64 or not hash_b64:
        return False
    try:
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except Exception:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, PBKDF2_ITER)
    return hmac.compare_digest(digest, expected)


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def load_accounts() -> dict[str, Any]:
    data = _read_json(ACCOUNTS_FILE, {"users": {}})
    if not isinstance(data.get("users"), dict):
        data = {"users": {}}
    return data


def save_accounts(data: dict[str, Any]) -> None:
    _write_json(ACCOUNTS_FILE, data)


def _seed_clients_from_fanpages() -> dict[str, Any]:
    registry_rows: dict[str, dict[str, str]] = {}
    reg_file = FANPAGES_DIR / "_khach-hang.md"
    if reg_file.is_file():
        for line in reg_file.read_text(encoding="utf-8").splitlines():
            if not line.strip().startswith("|"):
                continue
            parts = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(parts) >= 8 and parts[1].strip("`") not in ("Slug", "---", ""):
                slug = parts[1].strip("`")
                registry_rows[slug] = {
                    "name": parts[2],
                    "status": parts[4].strip("`"),
                    "package": parts[5],
                    "notes": parts[7],
                }
    items: list[dict[str, Any]] = []
    ts = now_str()
    for fp in list_fanpages():
        slug = fp["slug"]
        row = registry_rows.get(slug, {})
        st = row.get("status", "active")
        if st not in CLIENT_STATUSES:
            st = "active"
        items.append({
            "id": f"cli_{slug}",
            "type": "customer",
            "name": row.get("name") or fp["name"],
            "contact_name": "",
            "phone": "",
            "email": "",
            "status": st,
            "package": row.get("package", ""),
            "contract_value": "",
            "billing_cycle": "",
            "start_date": ts[:10],
            "fanpages": [slug],
            "notes": row.get("notes", ""),
            "created_at": ts,
            "updated_at": ts,
        })
    return {"clients": items}


def load_clients() -> dict[str, Any]:
    with CLIENTS_LOCK:
        if not CLIENTS_FILE.is_file():
            seeded = _seed_clients_from_fanpages()
            _write_json(CLIENTS_FILE, seeded)
            return seeded
        data = _read_json(CLIENTS_FILE, {"clients": []})
        if not isinstance(data.get("clients"), list):
            data = {"clients": []}
        return data


def save_clients(data: dict[str, Any]) -> None:
    with CLIENTS_LOCK:
        _write_json(CLIENTS_FILE, data)


def upsert_client(payload: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    name = re.sub(r"\s+", " ", str(payload.get("name") or "")).strip()[:120]
    if not name:
        raise ValueError("Tên khách hàng / đối tác không được để trống.")
    ctype = str(payload.get("type") or "customer").strip().lower()
    if ctype not in CLIENT_TYPES:
        raise ValueError("Loại phải là Khách hàng hoặc Đối tác.")
    status = str(payload.get("status") or "active").strip().lower()
    if status not in CLIENT_STATUSES:
        raise ValueError("Trạng thái không hợp lệ.")
    valid_pages = {f["slug"] for f in list_fanpages()}
    raw_pages = payload.get("fanpages") or []
    fanpages = list(dict.fromkeys(str(s).strip() for s in raw_pages if isinstance(s, str) and str(s).strip() in valid_pages))
    cid = str(payload.get("id") or "").strip()
    ts = now_str()

    with CLIENTS_LOCK:
        data = load_clients()
        clients = data["clients"]
        existing_idx = next((i for i, c in enumerate(clients) if c.get("id") == cid), -1) if cid else -1
        created = existing_idx < 0
        if created:
            cid = f"cli_{secrets.token_hex(4)}"
            created_at = ts
        else:
            created_at = str(clients[existing_idx].get("created_at") or ts)
        record = {
            "id": cid,
            "type": ctype,
            "name": name,
            "contact_name": str(payload.get("contact_name") or "").strip()[:100],
            "phone": str(payload.get("phone") or "").strip()[:60],
            "email": str(payload.get("email") or "").strip()[:120],
            "status": status,
            "package": str(payload.get("package") or "").strip()[:160],
            "contract_value": str(payload.get("contract_value") or "").strip()[:80],
            "billing_cycle": str(payload.get("billing_cycle") or "").strip()[:80],
            "start_date": str(payload.get("start_date") or "").strip()[:20],
            "fanpages": fanpages,
            "notes": str(payload.get("notes") or "").strip()[:2000],
            "created_at": created_at,
            "updated_at": ts,
        }
        if created:
            clients.insert(0, record)
        else:
            clients[existing_idx] = record
        save_clients(data)
        return record, created


def delete_client(client_id: str) -> bool:
    cid = (client_id or "").strip()
    if not cid:
        raise ValueError("Thiếu mã khách hàng / đối tác.")
    with CLIENTS_LOCK:
        data = load_clients()
        before = len(data["clients"])
        data["clients"] = [c for c in data["clients"] if c.get("id") != cid]
        if len(data["clients"]) == before:
            raise ValueError("Không tìm thấy khách hàng / đối tác.")
        save_clients(data)
        return True


# ---------------------------------------------------------------- gắn brand với Fanpage Meta
BRAND_LOCK = threading.RLock()


def _is_real_page_id(value: Any) -> bool:
    v = str(value or "").strip()
    return bool(v) and v.isdigit()


def load_meta_pages() -> dict[str, Any]:
    data = _read_json(META_PAGES_FILE, {"synced_at": "", "pages": []})
    pages = data.get("pages") if isinstance(data, dict) else []
    clean = [
        {"id": str(p.get("id")).strip(), "name": str(p.get("name") or p.get("id")).strip()}
        for p in (pages or []) if isinstance(p, dict) and _is_real_page_id(p.get("id"))
    ]
    return {"synced_at": str((data or {}).get("synced_at") or ""), "pages": clean}


def import_meta_pages() -> dict[str, Any]:
    """Nhận meta_pages_incoming.json (do cộng sự ghi sau khi gọi fb_pages_list), kiểm tra rồi thay danh sách chính."""
    if not META_PAGES_INCOMING.is_file():
        raise ValueError("Chưa có file danh sách mới.")
    raw = json.loads(META_PAGES_INCOMING.read_text(encoding="utf-8"))
    items = raw.get("pages") if isinstance(raw, dict) else raw
    pages, seen = [], set()
    for p in items or []:
        pid = str((p or {}).get("id") or "").strip()
        if _is_real_page_id(pid) and pid not in seen:
            seen.add(pid)
            pages.append({"id": pid, "name": str(p.get("name") or pid).strip()[:120]})
    if not pages:
        raise ValueError("Danh sách mới rỗng hoặc sai định dạng, giữ nguyên danh sách cũ.")
    _write_json(META_PAGES_FILE, {"synced_at": now_str(), "pages": pages})
    META_PAGES_INCOMING.unlink(missing_ok=True)
    META_SYNC_MARK.unlink(missing_ok=True)
    return {"ok": True, "count": len(pages)}


def request_meta_sync(actor: str) -> dict[str, Any]:
    try:
        last = float(META_SYNC_MARK.read_text(encoding="utf-8").strip()) if META_SYNC_MARK.is_file() else 0.0
    except ValueError:
        last = 0.0
    if time.time() - last < 90:
        return {"ok": True, "already": True, "message": "Đang đồng bộ, đợi thêm chút."}
    srv = "workspace/tools/approval-ui/server.py"
    inc = "workspace/tools/approval-ui/data/meta_pages_incoming.json"
    text = (
        "Đồng bộ danh sách Fanpage Meta cho web duyệt bài.\n"
        "1. Gọi tool fb_pages_list để lấy các Fanpage đã kết nối.\n"
        f"2. Ghi file {inc} (UTF-8) với nội dung JSON dạng {{\"pages\":[{{\"id\":\"...\",\"name\":\"...\"}}]}}, chỉ gồm id và name, "
        "tuyệt đối không ghi token.\n"
        f"3. Chạy: python {srv} --import-meta-pages\n"
        "4. Báo 1 dòng ngắn tiếng Việt: số Fanpage đã đồng bộ. Không dùng ký tự gạch dài."
    )
    resp = create_javis_job(text, "Đồng bộ Fanpage Meta", PUBLISH_AGENT, None, chat_id_from_sop())
    if resp.get("ok") and resp.get("id"):
        META_SYNC_MARK.write_text(str(time.time()), encoding="utf-8")
        audit(actor, "meta_sync_request", str(resp["id"]))
        return {"ok": True, "message": "Đã gửi yêu cầu đồng bộ, khoảng 1 đến 2 phút sẽ có danh sách mới."}
    raise ValueError("Không gửi được yêu cầu cho Javis: " + str(resp.get("error") or "không rõ lỗi"))


def _brand_checklist(page_dir: Path) -> dict[str, Any]:
    info = get_page_info(page_dir)
    kit = page_dir / "brand-kit.md"
    kit_text = kit.read_text(encoding="utf-8") if kit.is_file() else ""
    meta, _ = parse_frontmatter(kit_text) if kit_text else ({}, "")
    has_logo = bool(info.get("logo_url"))
    kit_ok = bool(kit_text) and "<Tên Fanpage>" not in kit_text
    fw = str(meta.get("forbidden_words_status") or "").strip().lower()
    banned_ok = (fw not in ("chưa chốt", "chua chot")) if "forbidden_words_status" in meta else ("từ cấm" in kit_text.lower())
    posts_dir = page_dir / "bai-nhap"
    n_posts = len(list(posts_dir.glob("*.md"))) if posts_dir.is_dir() else 0
    return {"logo": has_logo, "brand_kit": kit_ok, "forbidden_words": banned_ok, "posts": n_posts}


def list_brand_links() -> dict[str, Any]:
    mp = load_meta_pages()
    by_id = {p["id"]: p["name"] for p in mp["pages"]}
    brands = []
    used: dict[str, str] = {}
    for d in sorted(FANPAGES_DIR.iterdir()):
        if not d.is_dir() or d.name.startswith("_"):
            continue
        info = get_page_info(d)
        pid = info["page_id"] if info["connected"] else ""
        if pid:
            used[pid] = d.name
        brands.append({
            "slug": info["slug"], "name": info["name"], "logo_url": info["logo_url"],
            "page_id": pid, "page_name": by_id.get(pid, ""),
            "connected": bool(pid), "known_page": (pid in by_id) if pid else False,
            "checklist": _brand_checklist(d),
        })
    pages = [{"id": p["id"], "name": p["name"], "linked_slug": used.get(p["id"], "")} for p in mp["pages"]]
    return {"brands": brands, "pages": pages, "synced_at": mp["synced_at"]}


def _set_conn_fields(slug: str, page_id: str) -> None:
    """Ghi page_id + trạng thái kết nối vào ket-noi.md của brand (tạo từ mẫu nếu chưa có)."""
    f = FANPAGES_DIR / slug / "ket-noi.md"
    if not f.is_file():
        tpl = TEMPLATE_DIR / "ket-noi.md"
        text = tpl.read_text(encoding="utf-8") if tpl.is_file() else '---\ntype: connection\nslug: "<slug>"\npage_id: ""\n---\n'
        text = text.replace("<slug>", slug)
    else:
        text = f.read_text(encoding="utf-8")
    status = "da-ket-noi" if page_id else "chua-ket-noi"
    if re.search(r'(?m)^page_id:.*$', text):
        text = re.sub(r'(?m)^page_id:.*$', lambda m: f'page_id: "{page_id}"', text, count=1)
    else:
        text = text.replace("---\n", f'---\npage_id: "{page_id}"\n', 1)
    text = re.sub(r'(?m)^updated:.*$', lambda m: f"updated: {now_str()[:10]}", text, count=1)
    shown = f"`{page_id}`" if page_id else "`<page-id>`"
    text = re.sub(r'(?m)^- \*\*Page ID[^\n]*$', lambda m: f"- **Page ID (Graph API):** {shown}", text, count=1)
    text = re.sub(r'(?m)^- \*\*Trạng thái kết nối:\*\*[^\n]*$',
                  lambda m: f"- **Trạng thái kết nối:** `{status}`", text, count=1)
    f.write_text(text, encoding="utf-8")


def _brand_dir(slug: Any) -> Path:
    slug = str(slug or "").strip()
    page_dir = FANPAGES_DIR / slug
    if not slug or slug.startswith("_") or "/" in slug or "\\" in slug or ".." in slug or not page_dir.is_dir():
        raise ValueError("Không tìm thấy brand này.")
    return page_dir


def link_brand(slug: Any, page_id: Any, actor: str) -> dict[str, Any]:
    page_dir = _brand_dir(slug)
    slug = page_dir.name
    page_id = str(page_id or "").strip()
    mp = {p["id"]: p["name"] for p in load_meta_pages()["pages"]}
    if page_id not in mp:
        raise ValueError("Fanpage này chưa nằm trong danh sách đã kết nối Meta.")
    with BRAND_LOCK:
        for d in FANPAGES_DIR.iterdir():
            if d.is_dir() and not d.name.startswith("_") and d.name != slug:
                other = get_page_info(d)
                if other["connected"] and other["page_id"] == page_id:
                    raise ValueError(f"Fanpage này đang gắn với brand “{other['name']}”. Gỡ gắn bên đó trước.")
        _set_conn_fields(slug, page_id)
    held = sum(1 for p in load_all_posts()[1] if p["fanpage_slug"] == slug and p["status"] == STATUS_DA_DUYET)
    audit(actor, "brand_link", f"{slug} -> {page_id} ({mp[page_id]})")
    return {"ok": True, "slug": slug, "page_id": page_id, "page_name": mp[page_id], "held_posts": held}


def unlink_brand(slug: Any, actor: str) -> dict[str, Any]:
    page_dir = _brand_dir(slug)
    slug = page_dir.name
    busy = [p for p in load_all_posts()[1] if p["fanpage_slug"] == slug and p["status"] == STATUS_CHO_DANG]
    if busy:
        raise ValueError(f"Còn {len(busy)} bài đang Chờ đăng. Huỷ hoặc đợi đăng xong rồi mới gỡ gắn.")
    with BRAND_LOCK:
        _set_conn_fields(slug, "")
    audit(actor, "brand_unlink", slug)
    return {"ok": True, "slug": slug}


def _slugify(name: str) -> str:
    import unicodedata
    t = name.replace("đ", "d").replace("Đ", "D")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:48]


def create_brand(name: Any, actor: str) -> dict[str, Any]:
    import shutil
    name = re.sub(r"\s+", " ", str(name or "")).strip()[:100]
    if not name or "<" in name or ">" in name:
        raise ValueError("Tên brand không hợp lệ.")
    slug = _slugify(name)
    if not slug:
        raise ValueError("Tên brand không tạo được mã (slug).")
    dest = FANPAGES_DIR / slug
    if dest.exists():
        raise ValueError(f"Brand “{slug}” đã tồn tại.")
    if not TEMPLATE_DIR.is_dir():
        raise ValueError("Thiếu thư mục mẫu fanpages/_template.")
    with BRAND_LOCK:
        shutil.copytree(TEMPLATE_DIR, dest)
        for f in dest.rglob("*.md"):
            t = f.read_text(encoding="utf-8").replace("<Tên Fanpage>", name).replace("<slug>", slug)
            f.write_text(t, encoding="utf-8")
        _set_conn_fields(slug, "")
        reg = FANPAGES_DIR / "_khach-hang.md"
        if reg.is_file():
            rows = [ln for ln in reg.read_text(encoding="utf-8").splitlines() if ln.strip().startswith("|")]
            n = max(len(rows) - 1, 0) + 1
            with reg.open("a", encoding="utf-8") as fh:
                fh.write(f"| {n} | `{slug}` | {name} | `chưa gắn` | `onboarding` | Chưa chốt | `brain-agency-manager` | Tạo từ web duyệt bài, chưa gắn Fanpage thật |\n")
    audit(actor, "brand_create", f"{slug} ({name})")
    return {"ok": True, "slug": slug, "name": name}


def public_user(u: dict[str, Any]) -> dict[str, Any]:
    return {
        "username": u["username"],
        "display_name": u.get("display_name") or u["username"],
        "role": u.get("role", "customer"),
        "fanpages": u.get("fanpages", []),
        "active": u.get("active", True),
        "pin_set": bool(u.get("pin_hash")),
        "created_at": u.get("created_at", ""),
        "last_login": u.get("last_login", ""),
    }


USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,31}$")


def generate_password() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(12))


def create_user(username: str, role: str, display_name: str, fanpages: list[str], password: str = "") -> tuple[dict[str, Any], str]:
    username = username.strip().lower()
    if not USERNAME_RE.match(username):
        raise ValueError("Tên đăng nhập 3-32 ký tự, chỉ chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.")
    if role not in ("admin", "moderator", "customer"):
        raise ValueError("Vai trò phải là admin, moderator hoặc customer.")
    password = password or generate_password()
    if len(password) < 8:
        raise ValueError("Mật khẩu tối thiểu 8 ký tự.")
    valid_slugs = {p["slug"] for p in list_fanpages()}
    fanpages = [s for s in fanpages if s in valid_slugs]
    fanpages = list(dict.fromkeys(fanpages))
    if role == "customer" and len(fanpages) != 1:
        raise ValueError("Tài khoản khách phải gắn đúng 1 Fanpage (1 brand).")
    with AUTH_LOCK:
        data = load_accounts()
        if username in data["users"]:
            raise ValueError("Tên đăng nhập đã tồn tại.")
        salt, digest = _hash_secret(password)
        user = {
            "username": username,
            "display_name": display_name.strip() or username,
            "role": role,
            "fanpages": fanpages if role in ("customer", "moderator") else [],
            "pw_salt": salt,
            "pw_hash": digest,
            "pin_salt": "",
            "pin_hash": "",
            "active": True,
            "created_at": now_str(),
            "last_login": "",
            "pw_fails": 0,
            "pw_locked_until": 0,
            "pin_fails": 0,
            "pin_locked_until": 0,
        }
        data["users"][username] = user
        save_accounts(data)
    return user, password


def update_user(username: str, **changes: Any) -> dict[str, Any]:
    with AUTH_LOCK:
        data = load_accounts()
        user = data["users"].get(username)
        if not user:
            raise ValueError("Không tìm thấy tài khoản.")
        user.update(changes)
        save_accounts(data)
        return user


def delete_user(username: str) -> dict[str, Any]:
    with AUTH_LOCK:
        data = load_accounts()
        user = data["users"].pop(username, None)
        if not user:
            raise ValueError("Không tìm thấy tài khoản.")
        save_accounts(data)
        return user


def get_user(username: str) -> dict[str, Any] | None:
    return load_accounts()["users"].get((username or "").strip().lower())


def customer_fanpages() -> set[str]:
    out: set[str] = set()
    for u in load_accounts()["users"].values():
        if u.get("role") == "customer" and u.get("active", True):
            out.update(u.get("fanpages", []))
    return out


def load_settings() -> dict[str, Any]:
    with SETTINGS_LOCK:
        data = _read_json(SETTINGS_FILE, {})
        if not isinstance(data, dict):
            data = {}
        if not isinstance(data.get("customer_approval"), dict):
            data["customer_approval"] = {}
        return data


def save_settings(data: dict[str, Any]) -> None:
    with SETTINGS_LOCK:
        _write_json(SETTINGS_FILE, data)


def is_customer_approval_enabled(slug: str) -> bool:
    return bool(load_settings()["customer_approval"].get(slug, True))


def customer_approval_disabled_pages() -> list[str]:
    ca = load_settings()["customer_approval"]
    return sorted(slug for slug, enabled in ca.items() if enabled is False)


def set_customer_approval(slug: str, enabled: bool) -> bool:
    valid_slugs = {p["slug"] for p in list_fanpages()}
    if slug not in valid_slugs:
        raise ValueError("Không tìm thấy Fanpage.")
    with SETTINGS_LOCK:
        data = load_settings()
        data["customer_approval"][slug] = bool(enabled)
        save_settings(data)
    return bool(enabled)


NEEDS_CUSTOMER_OVERRIDE: bool | None = None


def needs_customer_approval(slug: str) -> bool:
    if NEEDS_CUSTOMER_OVERRIDE is not None:
        return NEEDS_CUSTOMER_OVERRIDE and is_customer_approval_enabled(slug)
    return (slug in customer_fanpages()) and is_customer_approval_enabled(slug)


# ---------------------------------------------------------------- phiên đăng nhập
def _sid_key(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    with AUTH_LOCK:
        sessions = _read_json(SESSIONS_FILE, {})
        now = time.time()
        sessions = {k: v for k, v in sessions.items() if now - v.get("last_seen", 0) < SESSION_IDLE_SEC}
        sessions[_sid_key(token)] = {"username": username, "created": now, "last_seen": now}
        _write_json(SESSIONS_FILE, sessions)
    return token


def get_session(token: str) -> tuple[str, dict[str, Any]] | None:
    if not token:
        return None
    key = _sid_key(token)
    with AUTH_LOCK:
        sessions = _read_json(SESSIONS_FILE, {})
        sess = sessions.get(key)
        if not sess:
            return None
        now = time.time()
        if now - sess.get("last_seen", 0) >= SESSION_IDLE_SEC:
            sessions.pop(key, None)
            _write_json(SESSIONS_FILE, sessions)
            return None
        if now - sess.get("last_seen", 0) > 300:
            sess["last_seen"] = now
            _write_json(SESSIONS_FILE, sessions)
        return key, sess


def drop_session(token: str) -> None:
    key = _sid_key(token)
    with AUTH_LOCK:
        sessions = _read_json(SESSIONS_FILE, {})
        sessions.pop(key, None)
        _write_json(SESSIONS_FILE, sessions)
        for t in [t for t, v in PIN_TOKENS.items() if v["sid"] == key]:
            PIN_TOKENS.pop(t, None)
        _save_pin_tokens()


def drop_user_sessions(username: str) -> None:
    with AUTH_LOCK:
        sessions = _read_json(SESSIONS_FILE, {})
        keys = [k for k, v in sessions.items() if v.get("username") == username]
        for k in keys:
            sessions.pop(k, None)
        _write_json(SESSIONS_FILE, sessions)
        for t in [t for t, v in PIN_TOKENS.items() if v["sid"] in keys]:
            PIN_TOKENS.pop(t, None)
        _save_pin_tokens()


def _pin_key(token: str) -> str:
    return hashlib.sha256(("pin:" + (token or "")).encode("utf-8")).hexdigest()


def _load_pin_tokens() -> None:
    """Nạp phiên PIN còn hạn từ file (chỉ lưu băm token) để khởi động lại server không bắt nhập PIN lại."""
    data = _read_json(PIN_TOKENS_FILE, {})
    now = time.time()
    with AUTH_LOCK:
        PIN_TOKENS.clear()
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, dict) and float(v.get("expires", 0)) > now and v.get("sid"):
                    PIN_TOKENS[k] = {"sid": v["sid"], "expires": float(v["expires"]), "saved": float(v["expires"])}


def _save_pin_tokens() -> None:
    now = time.time()
    with AUTH_LOCK:
        for k in [k for k, v in PIN_TOKENS.items() if v["expires"] < now]:
            PIN_TOKENS.pop(k, None)
        for v in PIN_TOKENS.values():
            v["saved"] = v["expires"]
        _write_json(PIN_TOKENS_FILE, {k: {"sid": v["sid"], "expires": v["expires"]} for k, v in PIN_TOKENS.items()})


def issue_pin_token(sid_key: str) -> str:
    token = secrets.token_urlsafe(24)
    with AUTH_LOCK:
        PIN_TOKENS[_pin_key(token)] = {"sid": sid_key, "expires": time.time() + PIN_IDLE_SEC, "saved": 0}
        _save_pin_tokens()
    return token


def check_pin_token(token: str, sid_key: str, touch: bool = True) -> bool:
    """PIN đúng được giữ PIN_IDLE_SEC (10 phút), gia hạn mỗi lần thao tác."""
    with AUTH_LOCK:
        key = _pin_key(token)
        rec = PIN_TOKENS.get(key)
        now = time.time()
        if not token or not rec or rec["sid"] != sid_key or rec["expires"] < now:
            if rec:
                PIN_TOKENS.pop(key, None)
                _save_pin_tokens()
            return False
        if touch:
            rec["expires"] = now + PIN_IDLE_SEC
            if rec["expires"] - rec.get("saved", 0) > 30:
                _save_pin_tokens()
        return True


def pin_token_remaining(token: str) -> int:
    with AUTH_LOCK:
        rec = PIN_TOKENS.get(_pin_key(token))
        return max(0, int(rec["expires"] - time.time())) if rec else 0


def drop_pin_token(token: str) -> None:
    with AUTH_LOCK:
        if PIN_TOKENS.pop(_pin_key(token), None):
            _save_pin_tokens()


def ip_blocked(ip: str, limit: int = 20) -> bool:
    now = time.time()
    with AUTH_LOCK:
        hits = [t for t in IP_FAILS.get(ip, []) if now - t < 600]
        IP_FAILS[ip] = hits
        return len(hits) >= limit


def ip_fail(ip: str) -> None:
    with AUTH_LOCK:
        IP_FAILS.setdefault(ip, []).append(time.time())


# ---------------------------------------------------------------- quyền trên bài
def can_view(user: dict[str, Any], post: dict[str, Any]) -> bool:
    if user["role"] == "admin":
        return True
    if user["role"] == "moderator":
        pages = user.get("fanpages", [])
        return (not pages) or (post["fanpage_slug"] in pages)
    if post["fanpage_slug"] not in user.get("fanpages", []):
        return False
    if post["status"] in CUSTOMER_VISIBLE:
        return True
    return post["status"] == STATUS_SUA_LAI and post.get("edit_requested_by_role") == "customer"


def allowed_actions(user: dict[str, Any], post: dict[str, Any]) -> list[str]:
    if user["role"] == "moderator":
        return []
    st = post["status"]
    acts: list[str] = []
    if user["role"] == "admin":
        if st == STATUS_CHO_DUYET:
            acts.append("approve")
        if st == STATUS_DA_DUYET:
            acts.append("retry_schedule")
        if st in EDITABLE_STATUSES:
            acts.append("request_edit")
    else:
        if st == STATUS_CHO_KHACH:
            acts.append("approve")
        if st in (STATUS_CHO_KHACH, STATUS_DA_DUYET, STATUS_CHO_DANG):
            acts.append("request_edit")
    return acts


def apply_decision(user: dict[str, Any], rel_file: str, action: str, feedback: str) -> dict[str, Any]:
    target = resolve_post_file(rel_file)
    if target is None:
        raise ValueError("Đường dẫn bài không hợp lệ.")
    with FILE_LOCK:
        meta, body = parse_frontmatter(target.read_text(encoding="utf-8"))
        page_slug = target.parent.parent.name
        post_view = {
            "fanpage_slug": page_slug,
            "status": normalize_status(str(meta.get("status") or "")),
            "edit_requested_by_role": str(meta.get("edit_requested_by_role") or ""),
        }
        if not can_view(user, post_view) or action not in allowed_actions(user, post_view):
            raise PermissionError("Bài này không còn ở bước bạn được thao tác. Tải lại trang để xem trạng thái mới.")

        ts = now_str()
        who = user.get("display_name") or user["username"]
        result: dict[str, Any] = {"ok": True}
        rel = target.relative_to(FANPAGES_DIR).as_posix()

        if action == "approve" and user["role"] == "admin":
            meta["admin_approved_at"] = ts
            meta["admin_approved_by"] = who
            meta["reviewed_at"] = ts
            meta["feedback"] = ""
            if needs_customer_approval(page_slug):
                meta["status"] = STATUS_CHO_KHACH
                write_post(target, meta, body)
                result["message"] = "Đã duyệt. Bài chuyển sang Chờ khách duyệt."
            else:
                meta["status"] = STATUS_DA_DUYET
                write_post(target, meta, body)
                sched = schedule_publish(target, user["username"])
                result["schedule"] = sched
                reason = (
                    "Khách đã giao quyền duyệt"
                    if page_slug in customer_fanpages()
                    else "Fanpage chưa có tài khoản khách"
                )
                result["message"] = (
                    f"{reason} nên bài được duyệt luôn và hẹn đăng lúc {sched['publish_at']}."
                    if sched.get("ok") else f"Đã duyệt nhưng chưa hẹn được giờ đăng: {sched.get('error')}"
                )
            audit(user["username"], "admin_approve", rel)

        elif action == "approve":
            meta["customer_approved_at"] = ts
            meta["customer_approved_by"] = who
            meta["reviewed_at"] = ts
            meta["feedback"] = ""
            meta["status"] = STATUS_DA_DUYET
            write_post(target, meta, body)
            audit(user["username"], "customer_approve", rel)
            sched = schedule_publish(target, user["username"])
            result["schedule"] = sched
            result["message"] = (
                f"Cảm ơn Anh/Chị đã duyệt. Bài sẽ tự đăng lúc {sched['publish_at']}."
                if sched.get("ok") else "Đã ghi nhận duyệt. Hệ thống đang xếp giờ đăng, đội Phúc Khánh Digital sẽ kiểm tra."
            )

        elif action == "retry_schedule":
            sched = schedule_publish(target, user["username"])
            result["schedule"] = sched
            result["message"] = (f"Đã hẹn đăng lúc {sched['publish_at']}." if sched.get("ok")
                                 else f"Vẫn chưa hẹn được: {sched.get('error')}")

        elif action == "request_edit":
            if len(feedback) < 3:
                raise ValueError("Vui lòng ghi rõ chỗ cần chỉnh sửa.")
            cancelled = ""
            if meta.get("publish_job_id"):
                cancel_javis_job(str(meta["publish_job_id"]))
                cancelled = str(meta["publish_job_id"])
            meta["status"] = STATUS_SUA_LAI
            meta["feedback"] = feedback
            meta["reviewed_at"] = ts
            meta["edit_requested_by"] = who
            meta["edit_requested_by_role"] = user["role"]
            meta["publish_job_id"] = ""
            meta["publish_token"] = ""
            meta["publish_at"] = ""
            role_label = "Khách" if user["role"] == "customer" else "Admin"
            body = append_feedback_section(body, f"[{ts}] [{role_label}: {who}] {feedback}")
            write_post(target, meta, body)
            audit(user["username"], "request_edit", f"{rel} {feedback[:120]}")
            rev = queue_revision(target, feedback, user)
            result["revision"] = rev
            result["message"] = (
                "Đã gửi yêu cầu chỉnh sửa" + (", lịch đăng cũ đã huỷ" if cancelled else "") + ". " + rev.get("message", "")
            ).strip()
        else:
            raise ValueError("Thao tác không hợp lệ.")

    sync_pending_queue_file()
    return result


# ---------------------------------------------------------------- lệnh cho cộng sự
def cli_prepare_publish(rel_file: str, token: str) -> dict[str, Any]:
    target = resolve_post_file(rel_file)
    if target is None:
        return {"ok": False, "error": "Không tìm thấy file bài."}
    meta, body = parse_frontmatter(target.read_text(encoding="utf-8"))
    status = normalize_status(str(meta.get("status") or ""))
    if status == STATUS_DA_DANG:
        return {"ok": False, "error": f"Bài đã đăng rồi (post_id {meta.get('post_id')})."}
    if status != STATUS_CHO_DANG:
        return {"ok": False, "error": f"Bài đang ở trạng thái '{status}', không phải 'Chờ đăng'. Không đăng."}
    if token and str(meta.get("publish_token") or "") != token:
        return {"ok": False, "error": "Lịch này đã cũ (bài đã được duyệt lại với lịch mới). Không đăng."}
    page_dir = target.parent.parent
    page_info = get_page_info(page_dir)
    out_txt = page_dir / "da-lam-sach" / "bai" / f"{target.stem}.txt"
    out_txt.parent.mkdir(parents=True, exist_ok=True)
    caption, _ = split_post_body(body)
    tmp_md = out_txt.with_suffix(".src.md")
    tmp_md.write_text(caption + "\n", encoding="utf-8")
    try:
        subprocess.run([sys.executable, str(CLEAN_SCRIPT), "--text", str(tmp_md), "--out", str(out_txt)],
                       check=True, capture_output=True, timeout=120)
    finally:
        tmp_md.unlink(missing_ok=True)
    message = out_txt.read_text(encoding="utf-8").strip()
    photo = ""
    images = resolve_image_paths(meta.get("images"), page_dir, target.parent)
    if images:
        src = images[0]
        out_img = page_dir / "da-lam-sach" / "anh" / f"{target.stem}{src.suffix.lower()}"
        out_img.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, str(CLEAN_SCRIPT), "--image", str(src), "--out", str(out_img)],
                       check=True, capture_output=True, timeout=120)
        photo = out_img.resolve().relative_to(BRAIN_ROOT.resolve()).as_posix()
    if "\u2014" in message:
        message = message.replace("\u2014", "-")
    return {"ok": True, "page_id": page_info["page_id"], "photo": photo, "message": message,
            "tool": "fb_page_photo" if photo else "fb_page_post"}


def cli_set_status(rel_file: str, **fields: Any) -> dict[str, Any]:
    target = resolve_post_file(rel_file)
    if target is None:
        return {"ok": False, "error": "Không tìm thấy file bài."}
    with FILE_LOCK:
        meta, body = parse_frontmatter(target.read_text(encoding="utf-8"))
        note = fields.pop("_note", "")
        meta.update(fields)
        if note:
            body = append_feedback_section(body, f"[{now_str()}] [Đã sửa xong] {note}")
        write_post(target, meta, body)
    sync_pending_queue_file()
    return {"ok": True, "file": rel_file, "status": meta.get("status")}


# ---------------------------------------------------------------- HTTP
class ApprovalServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    public = False  # True = cong cong khai (Funnel): chan Admin, siet gioi han IP


CSP = (
    "default-src 'self'; img-src 'self' data: blob:; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; "
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
)


class ApprovalHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "SHINDuyet/2"
    sys_version = ""

    def log_message(self, format: str, *args: Any) -> None:
        return

    # ---- tiện ích
    @property
    def is_public(self) -> bool:
        return bool(getattr(self.server, "public", False))

    def ip_limit(self) -> int:
        return 10 if self.is_public else 20

    def client_ip(self) -> str:
        # Tailscale Serve/Funnel NOI THEM IP that vao cuoi X-Forwarded-For; phan dau do client tu gui nen gia mao duoc.
        fwd = self.headers.get("X-Forwarded-For") or ""
        parts = [x.strip() for x in fwd.split(",") if x.strip()]
        return parts[-1] if parts else self.client_address[0]

    def is_https(self) -> bool:
        host = (self.headers.get("Host") or "").lower()
        return self.headers.get("X-Forwarded-Proto", "").lower() == "https" or ".ts.net" in host

    def _headers_common(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", CSP)

    def send_json(self, status: int, payload: Any, cookie: str | None = None) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self._headers_common()
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(raw)

    def make_cookie(self, token: str, clear: bool = False) -> str:
        parts = [f"{SESSION_COOKIE}={'' if clear else token}", "Path=/", "HttpOnly", "SameSite=Strict"]
        parts.append("Max-Age=0" if clear else f"Max-Age={SESSION_IDLE_SEC}")
        if self.is_https():
            parts.append("Secure")
        return "; ".join(parts)

    def cookie_token(self) -> str:
        raw = self.headers.get("Cookie") or ""
        for chunk in raw.split(";"):
            if "=" in chunk:
                k, v = chunk.strip().split("=", 1)
                if k == SESSION_COOKIE:
                    return v
        return ""

    def read_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > 256 * 1024:
            raise ValueError("Dữ liệu gửi lên không hợp lệ.")
        data = json.loads(self.rfile.read(length).decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("Dữ liệu phải là JSON object.")
        return data

    def current(self) -> tuple[str, str, dict[str, Any]] | None:
        token = self.cookie_token()
        sess = get_session(token)
        if not sess:
            return None
        key, data = sess
        user = get_user(data["username"])
        if not user or not user.get("active", True):
            return None
        if self.is_public and user.get("role") in ("admin", "moderator"):
            return None  # cookie noi bo khong co hieu luc tren link cong khai
        return token, key, user

    # ---- GET
    def do_GET(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        if path in ("/", "/index.html"):
            raw = INDEX_HTML.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self._headers_common()
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/healthz":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return
        if path == "/brand/logo.svg":
            logo = WORKSPACE_DIR / "system" / "brand" / "phuc-khanh-digital-logo.svg"
            if logo.is_file():
                raw = logo.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "image/svg+xml")
                self.send_header("Content-Length", str(len(raw)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(raw)
                return
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Không có logo."})
            return

        cur = self.current()
        if path == "/api/me":
            if not cur:
                self.send_json(HTTPStatus.OK, {"authenticated": False})
                return
            _, _, user = cur
            self.send_json(HTTPStatus.OK, {"authenticated": True, "user": public_user(user),
                                           "pin_setup_required": not user.get("pin_hash")})
            return
        if not cur:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Phiên đăng nhập đã hết, vui lòng đăng nhập lại."})
            return
        _, _, user = cur

        if path == "/api/posts":
            fanpages, posts = load_all_posts()
            is_internal = user["role"] in ("admin", "moderator")
            visible = []
            pending_admin_count = 0
            for p in posts:
                if user["role"] == "customer" and p["fanpage_slug"] in user.get("fanpages", []) and p["status"] == STATUS_CHO_DUYET:
                    pending_admin_count += 1
                if not can_view(user, p):
                    continue
                p["actions"] = allowed_actions(user, p)
                if user["role"] == "customer":
                    for k in ("publish_job_id", "schedule_error", "admin_approved_by"):
                        p.pop(k, None)
                visible.append(p)
            if user["role"] == "customer" or (user["role"] == "moderator" and user.get("fanpages")):
                fanpages = [f for f in fanpages if f["slug"] in user.get("fanpages", [])]
            for f in fanpages:
                f.pop("preferred_post_hours", None)
                if user["role"] == "customer":
                    f.pop("page_id", None)
            self.send_json(HTTPStatus.OK, {
                "fanpages": fanpages,
                "posts": visible,
                "customer_fanpages": sorted(customer_fanpages()) if is_internal else [],
                "customer_approval_disabled": (
                    customer_approval_disabled_pages() if is_internal
                    else [s for s in user.get("fanpages", []) if not is_customer_approval_enabled(s)]
                ),
                "pending_admin_count": pending_admin_count if user["role"] == "customer" else 0,
            })
            return

        if path == "/api/admin/users":
            if user["role"] != "admin":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Chỉ admin."})
                return
            users = [public_user(u) for u in load_accounts()["users"].values()]
            role_rank = {"admin": 0, "moderator": 1, "customer": 2}
            users.sort(key=lambda u: (role_rank.get(u["role"], 9), u["username"]))
            self.send_json(HTTPStatus.OK, {"users": users, "fanpages": [
                {"slug": f["slug"], "name": f["name"]} for f in list_fanpages()]})
            return

        if path == "/api/admin/brand-links":
            if user["role"] != "admin":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Chỉ admin."})
                return
            self.send_json(HTTPStatus.OK, list_brand_links())
            return

        if path == "/api/admin/clients":
            if user["role"] != "admin":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Chỉ admin."})
                return
            data = load_clients()
            self.send_json(HTTPStatus.OK, {
                "clients": data["clients"],
                "fanpages": [{"slug": f["slug"], "name": f["name"]} for f in list_fanpages()],
            })
            return

        if path.startswith("/media/"):
            rel = urllib.parse.unquote(path[len("/media/") :]).lstrip("/")
            root = FANPAGES_DIR.resolve()
            target = (root / rel).resolve()
            ok = target.is_relative_to(root) and target.is_file()
            if ok and user["role"] != "admin":
                allowed_pages = user.get("fanpages", [])
                if user["role"] == "customer" or allowed_pages:
                    first = target.relative_to(root).parts[0]
                    ok = first in allowed_pages and target.suffix.lower() in (
                        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4")
                else:
                    ok = target.suffix.lower() in (
                        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4")
            if not ok:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Không tìm thấy tệp."})
                return
            ctype, _ = mimetypes.guess_type(str(target))
            raw = target.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", ctype or "application/octet-stream")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "private, max-age=600")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(raw)
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Không tìm thấy đường dẫn."})

    # ---- POST
    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        if self.headers.get("X-Requested-With") != "shin-duyet":
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "Yêu cầu không hợp lệ."})
            return
        try:
            body = self.read_body()
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        ip = self.client_ip()

        if path == "/api/login":
            if ip_blocked(ip, self.ip_limit()):
                self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "Thử sai quá nhiều lần, vui lòng đợi 10 phút."})
                return
            username = str(body.get("username") or "").strip().lower()
            password = str(body.get("password") or "")
            user = get_user(username)
            now = time.time()
            if self.is_public and user and user.get("role") in ("admin", "moderator"):
                ip_fail(ip)
                audit(username, "internal_login_blocked_public", ip)
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Sai tên đăng nhập hoặc mật khẩu."})
                return
            if user and user.get("pw_locked_until", 0) > now:
                mins = int((user["pw_locked_until"] - now) // 60) + 1
                self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": f"Tài khoản tạm khoá, thử lại sau {mins} phút."})
                return
            if not user or not user.get("active", True) or not _verify_secret(password, user.get("pw_salt", ""), user.get("pw_hash", "")):
                ip_fail(ip)
                if user:
                    fails = int(user.get("pw_fails", 0)) + 1
                    changes: dict[str, Any] = {"pw_fails": fails}
                    if fails >= MAX_PW_FAILS:
                        changes = {"pw_fails": 0, "pw_locked_until": now + PW_LOCK_SEC}
                    update_user(username, **changes)
                audit(username or "?", "login_fail", ip)
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Sai tên đăng nhập hoặc mật khẩu."})
                return
            update_user(username, pw_fails=0, pw_locked_until=0, last_login=now_str())
            token = create_session(username)
            audit(username, "login", ip)
            user = get_user(username) or user
            self.send_json(HTTPStatus.OK, {"ok": True, "user": public_user(user),
                                           "pin_setup_required": not user.get("pin_hash")},
                           cookie=self.make_cookie(token))
            return

        cur = self.current()
        if not cur:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Phiên đăng nhập đã hết, vui lòng đăng nhập lại."})
            return
        token, sid_key, user = cur
        username = user["username"]

        if path == "/api/logout":
            drop_session(token)
            self.send_json(HTTPStatus.OK, {"ok": True}, cookie=self.make_cookie("", clear=True))
            return

        if path == "/api/pin/setup":
            if user.get("pin_hash"):
                self.send_json(HTTPStatus.CONFLICT, {"error": "Tài khoản đã có mã PIN."})
                return
            pin = str(body.get("pin") or "")
            confirm = str(body.get("pin_confirm") or "")
            if not re.fullmatch(r"\d{4}", pin):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Mã PIN phải gồm đúng 4 chữ số."})
                return
            if pin != confirm:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Hai lần nhập mã PIN chưa khớp."})
                return
            if pin in ("0000", "1111", "1234", "4321", "2222", "9999", "1212"):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Mã PIN quá dễ đoán, vui lòng chọn mã khác."})
                return
            salt, digest = _hash_secret(pin)
            update_user(username, pin_salt=salt, pin_hash=digest, pin_fails=0, pin_locked_until=0)
            audit(username, "pin_setup")
            self.send_json(HTTPStatus.OK, {"ok": True, "pin_token": issue_pin_token(sid_key), "pin_idle_sec": PIN_IDLE_SEC})
            return

        if path == "/api/pin/verify":
            now = time.time()
            if not user.get("pin_hash"):
                self.send_json(HTTPStatus.CONFLICT, {"error": "Chưa thiết lập mã PIN.", "pin_setup_required": True})
                return
            if user.get("pin_locked_until", 0) > now:
                secs = int(user["pin_locked_until"] - now)
                self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": f"Nhập sai nhiều lần, thử lại sau {secs // 60 + 1} phút."})
                return
            if ip_blocked(ip, self.ip_limit()):
                self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "Thử sai quá nhiều lần, vui lòng đợi 10 phút."})
                return
            pin = str(body.get("pin") or "")
            if not re.fullmatch(r"\d{4}", pin) or not _verify_secret(pin, user.get("pin_salt", ""), user.get("pin_hash", "")):
                ip_fail(ip)
                fails = int(user.get("pin_fails", 0)) + 1
                left = MAX_PIN_FAILS - fails
                if fails >= MAX_PIN_FAILS:
                    update_user(username, pin_fails=0, pin_locked_until=now + PIN_LOCK_SEC)
                    msg = "Sai mã PIN 5 lần, tạm khoá 5 phút."
                else:
                    update_user(username, pin_fails=fails)
                    msg = f"Mã PIN chưa đúng. Còn {left} lần thử."
                audit(username, "pin_fail", ip)
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": msg})
                return
            update_user(username, pin_fails=0, pin_locked_until=0)
            self.send_json(HTTPStatus.OK, {"ok": True, "pin_token": issue_pin_token(sid_key), "pin_idle_sec": PIN_IDLE_SEC})
            return

        if path == "/api/pin/status":
            tok = self.headers.get("X-Pin-Token") or ""
            ok = check_pin_token(tok, sid_key, touch=bool(body.get("touch")))
            self.send_json(HTTPStatus.OK, {"valid": ok, "remaining_sec": pin_token_remaining(tok) if ok else 0,
                                           "pin_idle_sec": PIN_IDLE_SEC,
                                           "pin_setup_required": not user.get("pin_hash")})
            return

        if path == "/api/pin/lock":
            drop_pin_token(self.headers.get("X-Pin-Token") or "")
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        # Từ đây mọi thao tác đều cần PIN
        if not check_pin_token(self.headers.get("X-Pin-Token") or "", sid_key):
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "Vui lòng nhập mã PIN để tiếp tục.", "pin_required": True})
            return

        if path == "/api/posts/decision":
            try:
                result = apply_decision(user, str(body.get("file") or ""), str(body.get("action") or ""),
                                        str(body.get("feedback") or "").strip()[:2000])
            except PermissionError as exc:
                self.send_json(HTTPStatus.CONFLICT, {"error": str(exc)})
                return
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            self.send_json(HTTPStatus.OK, result)
            return

        if path == "/api/password":
            old = str(body.get("old_password") or "")
            new = str(body.get("new_password") or "")
            if not _verify_secret(old, user.get("pw_salt", ""), user.get("pw_hash", "")):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Mật khẩu hiện tại chưa đúng."})
                return
            if len(new) < 8:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Mật khẩu mới tối thiểu 8 ký tự."})
                return
            salt, digest = _hash_secret(new)
            update_user(username, pw_salt=salt, pw_hash=digest)
            audit(username, "password_change")
            self.send_json(HTTPStatus.OK, {"ok": True, "message": "Đã đổi mật khẩu."})
            return

        if path.startswith("/api/admin/"):
            if user["role"] != "admin":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Chỉ admin."})
                return
            try:
                if path == "/api/admin/users/create":
                    req_role = str(body.get("role") or "customer").strip().lower()
                    if req_role not in ("customer", "moderator"):
                        raise ValueError("Web chỉ tạo tài khoản Khách hàng hoặc Moderator.")
                    new_user, pw = create_user(
                        str(body.get("username") or ""), req_role,
                        str(body.get("display_name") or ""),
                        [str(s) for s in (body.get("fanpages") or []) if isinstance(s, str)],
                    )
                    audit(username, "user_create", f"{new_user['username']} ({req_role})")
                    self.send_json(HTTPStatus.OK, {"ok": True, "user": public_user(new_user), "password": pw})
                    return
                if path == "/api/admin/users/update":
                    target_name = str(body.get("username") or "").strip().lower()
                    action = str(body.get("action") or "")
                    target_user = get_user(target_name)
                    if not target_user:
                        raise ValueError("Không tìm thấy tài khoản.")
                    if target_name == username and action in ("disable", "delete"):
                        raise ValueError("Không thể tự khoá hoặc xoá tài khoản đang dùng.")
                    out: dict[str, Any] = {"ok": True}
                    if action == "reset_password":
                        pw = generate_password()
                        salt, digest = _hash_secret(pw)
                        update_user(target_name, pw_salt=salt, pw_hash=digest, pw_fails=0, pw_locked_until=0)
                        drop_user_sessions(target_name)
                        out["password"] = pw
                    elif action == "reset_pin":
                        update_user(target_name, pin_salt="", pin_hash="", pin_fails=0, pin_locked_until=0)
                        drop_user_sessions(target_name)
                    elif action == "disable":
                        update_user(target_name, active=False)
                        drop_user_sessions(target_name)
                    elif action == "enable":
                        update_user(target_name, active=True, pw_fails=0, pw_locked_until=0)
                    elif action == "delete":
                        delete_user(target_name)
                        drop_user_sessions(target_name)
                        out["deleted"] = target_name
                    elif action == "set_fanpages":
                        valid = {f["slug"] for f in list_fanpages()}
                        pages = list(dict.fromkeys(s for s in (body.get("fanpages") or []) if s in valid))
                        if target_user.get("role") == "customer" and len(pages) != 1:
                            raise ValueError("Tài khoản khách phải gắn đúng 1 Fanpage (1 brand).")
                        update_user(target_name, fanpages=pages if target_user.get("role") in ("customer", "moderator") else [])
                    elif action == "rename":
                        update_user(target_name, display_name=str(body.get("display_name") or target_name)[:60])
                    else:
                        raise ValueError("Thao tác không hợp lệ.")
                    audit(username, f"user_{action}", target_name)
                    out["user"] = public_user(get_user(target_name) or target_user)
                    self.send_json(HTTPStatus.OK, out)
                    return
                if path == "/api/admin/meta-pages/sync":
                    self.send_json(HTTPStatus.OK, request_meta_sync(username))
                    return
                if path == "/api/admin/brand-links/link":
                    self.send_json(HTTPStatus.OK, link_brand(body.get("slug"), body.get("page_id"), username))
                    return
                if path == "/api/admin/brand-links/unlink":
                    self.send_json(HTTPStatus.OK, unlink_brand(body.get("slug"), username))
                    return
                if path == "/api/admin/brand-links/create":
                    out = create_brand(body.get("name"), username)
                    try:
                        upsert_client({"type": "customer", "name": out["name"], "status": "onboarding",
                                       "fanpages": [out["slug"]]})
                    except ValueError:
                        pass
                    self.send_json(HTTPStatus.OK, out)
                    return
                if path == "/api/admin/clients/save":
                    record, created = upsert_client(body)
                    audit(username, "client_create" if created else "client_update", f"{record['id']} ({record['name']})")
                    self.send_json(HTTPStatus.OK, {"ok": True, "client": record, "created": created})
                    return
                if path == "/api/admin/clients/delete":
                    cid = str(body.get("id") or "").strip()
                    delete_client(cid)
                    audit(username, "client_delete", cid)
                    self.send_json(HTTPStatus.OK, {"ok": True})
                    return
                if path == "/api/admin/fanpages/customer-approval":
                    slug = str(body.get("slug") or "").strip()
                    enabled = bool(body.get("enabled"))
                    set_customer_approval(slug, enabled)
                    audit(username, "toggle_customer_approval", f"{slug}={'on' if enabled else 'off'}")
                    self.send_json(HTTPStatus.OK, {
                        "ok": True,
                        "slug": slug,
                        "enabled": enabled,
                        "customer_approval_disabled": customer_approval_disabled_pages(),
                        "message": f"Đã {'bật' if enabled else 'tắt'} bước khách duyệt cho {slug}.",
                    })
                    return
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Không tìm thấy đường dẫn."})


def configure_streams(log_file: str) -> Any:
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        if log_path.is_file() and log_path.stat().st_size > 2 * 1024 * 1024:
            log_path.replace(log_path.with_suffix(".old.log"))
        handle = open(log_path, mode="a", encoding="utf-8", buffering=1)
        sys.stdout = handle
        sys.stderr = handle
        return handle
    null_handle = None
    if sys.stdout is None or sys.stderr is None:
        null_handle = open(os.devnull, mode="w", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = null_handle
    elif hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = null_handle
    elif hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    return null_handle


def main() -> int:
    parser = argparse.ArgumentParser(description="Phúc Khánh Digital - Duyệt bài: máy chủ duyệt bài chạy liên tục.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--log-file", default="")
    parser.add_argument("--public-port", type=int, default=PUBLIC_LOCAL_PORT,
                        help="Cổng local cho link công khai (Funnel). 0 = tắt.")
    parser.add_argument("--import-meta-pages", action="store_true", help="Nhận data/meta_pages_incoming.json rồi thoát.")
    parser.add_argument("--sync-queue", action="store_true", help="Đồng bộ fanpages/_cho-duyet.md rồi thoát.")
    parser.add_argument("--create-user", metavar="USERNAME")
    parser.add_argument("--role", default="customer", choices=["admin", "moderator", "customer"])
    parser.add_argument("--display-name", default="")
    parser.add_argument("--fanpages", default="", help="Danh sách slug, cách nhau dấu phẩy.")
    parser.add_argument("--password", default="")
    parser.add_argument("--reset-pin", metavar="USERNAME")
    parser.add_argument("--reset-password", metavar="USERNAME")
    parser.add_argument("--list-users", action="store_true")
    parser.add_argument("--schedule", metavar="FILE", help="Hẹn đăng 1 bài đang 'Đã duyệt' (dùng cho cộng sự).")
    parser.add_argument("--prepare-publish", metavar="FILE")
    parser.add_argument("--token", default="")
    parser.add_argument("--mark-published", metavar="FILE")
    parser.add_argument("--post-id", default="")
    parser.add_argument("--mark-failed", metavar="FILE")
    parser.add_argument("--reason", default="")
    parser.add_argument("--mark-revised", metavar="FILE")
    parser.add_argument("--note", default="")
    parser.add_argument("--list-posts", action="store_true", help="In JSON mọi bài (cho web Next.js).")
    parser.add_argument("--decide", metavar="FILE", help="Thực hiện thao tác duyệt (cho web Next.js).")
    parser.add_argument("--action", default="", choices=["", "approve", "request_edit", "retry_schedule"])
    parser.add_argument("--actor-role", default="admin", choices=["admin", "customer"])
    parser.add_argument("--actor-username", default="web")
    parser.add_argument("--actor-name", default="")
    parser.add_argument("--actor-fanpages", default="")
    parser.add_argument("--feedback", default="")
    parser.add_argument("--needs-customer", default="", choices=["", "0", "1"])
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure") and sys.stdout is not None:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    def emit(obj: Any) -> int:
        print(json.dumps(obj, ensure_ascii=False, indent=2))
        return 0 if (not isinstance(obj, dict) or obj.get("ok", True)) else 1

    if args.list_posts:
        _, posts = load_all_posts()
        for p in posts:
            p["images"] = [urllib.parse.unquote(u[len("/media/"):]) if u.startswith("/media/") else u for u in p["images"]]
            if p["fanpage_logo"] and p["fanpage_logo"].startswith("/media/"):
                p["fanpage_logo"] = urllib.parse.unquote(p["fanpage_logo"][len("/media/"):])
        return emit({"ok": True, "posts": posts})
    if args.decide:
        global NEEDS_CUSTOMER_OVERRIDE
        if args.needs_customer:
            NEEDS_CUSTOMER_OVERRIDE = args.needs_customer == "1"
        actor = {
            "username": args.actor_username,
            "display_name": args.actor_name or args.actor_username,
            "role": args.actor_role,
            "fanpages": [x.strip() for x in args.actor_fanpages.split(",") if x.strip()],
        }
        try:
            return emit(apply_decision(actor, args.decide, args.action, (args.feedback or "").strip()))
        except (ValueError, PermissionError) as exc:
            return emit({"ok": False, "error": str(exc), "forbidden": isinstance(exc, PermissionError)})
    if args.import_meta_pages:
        try:
            return emit(import_meta_pages())
        except (ValueError, json.JSONDecodeError) as exc:
            return emit({"ok": False, "error": str(exc)})
    if args.sync_queue:
        sync_pending_queue_file()
        return emit({"ok": True, "message": "Đã đồng bộ fanpages/_cho-duyet.md"})
    if args.list_users:
        return emit([public_user(u) for u in load_accounts()["users"].values()])
    if args.create_user:
        try:
            u, pw = create_user(args.create_user, args.role, args.display_name,
                                [s.strip() for s in args.fanpages.split(",") if s.strip()], args.password)
        except ValueError as exc:
            return emit({"ok": False, "error": str(exc)})
        return emit({"ok": True, "user": public_user(u), "password": pw})
    if args.reset_pin:
        update_user(args.reset_pin.lower(), pin_salt="", pin_hash="", pin_fails=0, pin_locked_until=0)
        return emit({"ok": True, "message": "Đã xoá PIN, lần đăng nhập tới sẽ tạo PIN mới."})
    if args.reset_password:
        pw = generate_password()
        salt, digest = _hash_secret(pw)
        update_user(args.reset_password.lower(), pw_salt=salt, pw_hash=digest, pw_fails=0, pw_locked_until=0)
        drop_user_sessions(args.reset_password.lower())
        return emit({"ok": True, "password": pw})
    if args.schedule:
        target = resolve_post_file(args.schedule)
        if target is None:
            return emit({"ok": False, "error": "Không tìm thấy file bài."})
        with FILE_LOCK:
            res = schedule_publish(target, "cli")
        sync_pending_queue_file()
        return emit(res)
    if args.prepare_publish:
        try:
            return emit(cli_prepare_publish(args.prepare_publish, args.token))
        except subprocess.CalledProcessError as exc:
            return emit({"ok": False, "error": f"clean_before_post.py lỗi: {(exc.stderr or b'').decode('utf-8', 'replace')[:300]}"})
    if args.mark_published:
        if not args.post_id:
            return emit({"ok": False, "error": "Thiếu --post-id."})
        return emit(cli_set_status(args.mark_published, status=STATUS_DA_DANG, post_id=args.post_id,
                                   published_at=now_str(), publish_token="", schedule_error=""))
    if args.mark_failed:
        return emit(cli_set_status(args.mark_failed, status=STATUS_DA_DUYET, publish_job_id="", publish_token="",
                                   schedule_error=f"Đăng lỗi {now_str()}: {args.reason}"[:200]))
    if args.mark_revised:
        return emit(cli_set_status(args.mark_revised, status=STATUS_CHO_DUYET, feedback="",
                                   media_status="ready", _note=args.note or "Đã chỉnh theo góp ý"))

    stream_handle = configure_streams(args.log_file)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _load_pin_tokens()
    server = ApprovalServer((args.host, args.port), ApprovalHandler)
    public_server = None
    if args.public_port:
        try:
            public_server = ApprovalServer(("127.0.0.1", args.public_port), ApprovalHandler)
            public_server.public = True
            threading.Thread(target=public_server.serve_forever, daemon=True).start()
            log(f"Cổng công khai cho khách: http://127.0.0.1:{args.public_port} -> {CUSTOMER_URL} (chặn Admin)")
        except OSError as exc:
            log(f"Không mở được cổng công khai {args.public_port}: {exc}")
    try:
        RUNTIME_FILE.write_text(json.dumps({
            "server_pid": os.getpid(), "port": args.port, "primary_url": PUBLIC_URL,
            "public_port": args.public_port if public_server else 0, "customer_url": CUSTOMER_URL,
            "started_at": now_str(), "mode": "always-on",
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass
    sync_pending_queue_file()
    log(f"Phúc Khánh Digital - Duyệt bài chạy liên tục tại http://{args.host}:{args.port} -> {PUBLIC_URL}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        if stream_handle is not None:
            try:
                stream_handle.close()
            except Exception:
                pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
