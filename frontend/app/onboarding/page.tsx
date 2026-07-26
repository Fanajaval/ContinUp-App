"use client";

import DashboardPage from "@/app/dashboard/page";
import OnboardingModal from "@/components/onboarding/OnboardingModal";

/**
 * Route /onboarding — Affiche le Dashboard en arrière-plan
 * et la Pop-up Modale d'onboarding par-dessus.
 */
export default function OnboardingPage() {
  return (
    <div className="relative min-h-screen">
      {/* L'interface du Dashboard reste toujours en arrière-plan */}
      <DashboardPage />

      {/* Pop-up Modale par-dessus */}
      <OnboardingModal isOpen={true} />
    </div>
  );
}
