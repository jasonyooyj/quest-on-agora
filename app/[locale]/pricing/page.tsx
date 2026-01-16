import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PricingSection } from "@/components/landing/PricingSection";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      <Navbar />
      <main>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
