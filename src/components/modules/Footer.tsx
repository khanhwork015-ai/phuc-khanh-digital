import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { contactConfig, siteConfig } from "@/data/site-config";

export function Footer() {
  return (
    <footer className="bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Link href="#main" aria-label={`${siteConfig.name} - Về đầu trang`} className="inline-flex rounded-lg">
              <Logo />
            </Link>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-fg-2">{siteConfig.description}</p>
          </div>

          <div>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-fg-3">Điều hướng</p>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-fg-2 transition-colors hover:text-fg">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={siteConfig.cta.href} className="text-accent transition-colors hover:text-accent-hover">
                  {siteConfig.cta.label}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-fg-3">Liên hệ</p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-fg-2">
              <li>
                <a href={contactConfig.phoneHref} className="transition-colors hover:text-fg">
                  Hotline / Zalo: {contactConfig.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${contactConfig.email}`} className="transition-colors hover:text-fg">
                  {contactConfig.email}
                </a>
              </li>
              <li className="text-fg-3">{contactConfig.workingHours}</li>
              <li className="text-fg-3">{contactConfig.address}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-line pt-6 text-[13px] text-fg-3 sm:flex-row sm:items-center">
          <p>© 2026 Phúc Khánh Digital. Dịch vụ vận hành Fanpage trọn gói cho SME.</p>
          <div className="flex items-center gap-5">
            <a href={contactConfig.zaloUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg-2">
              Zalo
            </a>
            <a href={contactConfig.messengerUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg-2">
              Messenger
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
