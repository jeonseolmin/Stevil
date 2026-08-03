import "./HomePage.css"
import HeroSection from "../../components/home/HeroSection.jsx";
import Header from "../../components/header/Header.jsx";
export default function HomePage() {
    return (
        <div className="home-page">
            <Header/>
            <HeroSection/>

        </div>
    );
}