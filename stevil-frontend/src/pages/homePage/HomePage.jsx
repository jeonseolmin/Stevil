import "./HomePage.css"
import HeroSection from "../../components/home/HeroSection.jsx";
import FeaturesSection from "../../components/home/FeaturesSection.jsx";

export default function HomePage() {
    return (
        <div className="home-page">
            <HeroSection/>
            <FeaturesSection/>
        </div>
    );
}