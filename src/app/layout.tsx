import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { siteConfig } from "@/data/site-config";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Vận hành Fanpage trọn gói cho SME`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - Vận hành Fanpage trọn gói cho SME`,
    description: siteConfig.description,
    images: [
      {
        url: "/brand/og-thumbnail.jpg",
        width: 1200,
        height: 800,
        alt: `${siteConfig.name} - Vận hành Fanpage trọn gói cho SME`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Vận hành Fanpage trọn gói cho SME`,
    description: siteConfig.description,
    images: ["/brand/og-thumbnail.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
  colorScheme: "dark light",
};

const themeInitScript = `(function(){try{var p=localStorage.getItem('pkd-theme');var r=(p==='light'||p==='dark')?p:(p==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):'dark');document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;}catch(e){}try{var clean=function(root){if(!root||!root.querySelectorAll)return;var els=root.querySelectorAll('[bis_skin_checked]');for(var i=0;i<els.length;i++)els[i].removeAttribute('bis_skin_checked');};clean(document);var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var m=muts[i];if(m.type==='attributes'&&m.attributeName==='bis_skin_checked'){m.target.removeAttribute('bis_skin_checked');}else if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(n.nodeType===1){if(n.hasAttribute&&n.hasAttribute('bis_skin_checked'))n.removeAttribute('bis_skin_checked');clean(n);}}}}});obs.observe(document.documentElement,{attributes:true,attributeFilter:['bis_skin_checked'],childList:true,subtree:true});setTimeout(function(){obs.disconnect();},4000);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning className={`${beVietnam.variable} ${ibmPlexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
