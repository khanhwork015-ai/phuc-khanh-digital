import { ApprovalPortalDemo } from "@/components/modules/ApprovalPortalDemo";
import { Footer } from "@/components/modules/Footer";
import { HeroSection } from "@/components/modules/HeroSection";
import { LeadCaptureSection } from "@/components/modules/LeadCaptureSection";
import { Navbar } from "@/components/modules/Navbar";
import { PainPointsSection } from "@/components/modules/PainPointsSection";
import { PricingFaqSection } from "@/components/modules/PricingFaqSection";
import { ProcessStepperSection } from "@/components/modules/ProcessStepperSection";
import { QualityGuardrailsSection } from "@/components/modules/QualityGuardrailsSection";
import { ShowcaseBeforeAfter } from "@/components/modules/ShowcaseBeforeAfter";
import { faqItems } from "@/data/faq";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function HomePage() {
  return (
    <>
      <div aria-hidden className="pk-gold-ambient pointer-events-none fixed inset-0 z-0" />
      <Navbar />
      <main id="main" className="relative z-10">
        <HeroSection />
        <PainPointsSection />
        <ProcessStepperSection />
        <ApprovalPortalDemo />
        <ShowcaseBeforeAfter />
        <QualityGuardrailsSection />
        <PricingFaqSection />
        <LeadCaptureSection />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
