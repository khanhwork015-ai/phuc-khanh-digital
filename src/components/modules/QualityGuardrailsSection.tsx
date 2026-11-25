import { SectionHeader } from "@/components/ui/SectionHeader";
import { guardrailItems, guardrailsContent } from "@/data/guardrails";
import { GuardrailsTrack } from "./guardrails/GuardrailsTrack";

export function QualityGuardrailsSection() {
  return (
    <section aria-labelledby="guardrails-title" className="border-b border-line">
      <GuardrailsTrack
        items={guardrailItems}
        header={
          <SectionHeader
            index="05"
            eyebrow={guardrailsContent.eyebrow}
            title={guardrailsContent.title}
            description={guardrailsContent.description}
            id="guardrails-title"
          />
        }
      />
    </section>
  );
}
