import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarqueeSection } from "@/components/landing/MarqueeSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { QuoteSection } from "@/components/landing/QuoteSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      <Navbar />
      <HeroSection />
      <MarqueeSection />
      <FeaturesSection />
      <StatsSection />
      <QuoteSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
