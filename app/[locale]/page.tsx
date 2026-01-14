import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarqueeSection } from "@/components/landing/MarqueeSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AiModesSection } from "@/components/landing/AiModesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { QuoteSection } from "@/components/landing/QuoteSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      <Navbar />
      <HeroSection />
      <MarqueeSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <AiModesSection />
      <StatsSection />
      <UseCasesSection />
      <QuoteSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
