import "./HomePage.css"
import HeroSection from "../../components/home/HeroSection.jsx";
import HomeContent from "../../components/home/HomeContent.jsx";

export default function HomePage() {
    return (
        <div className="home-page">
            <HeroSection/>
            <HomeContent/>

        </div>
    );
}