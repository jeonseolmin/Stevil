import HeroSection from
        "../../components/home/hero/HeroSection.jsx";

import FeaturesSection from
        "../../components/home/features/FeaturesSection.jsx";

import HowItWorksSection from
        "../../components/home/howItWorks/HowItWorksSection.jsx";

import SafetySection from
        "../../components/home/safety/SafetySection.jsx";

import PartnershipSection from
        "../../components/home/partnership/PartnershipSection.jsx";

import "./HomePage.css";

export default function HomePage() {
    return (
        <main className="home-page">
            <HeroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <SafetySection />
            <PartnershipSection />
        </main>
    );
}