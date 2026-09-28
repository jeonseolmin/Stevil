import "./Footer.css";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <span className="footer-brand">Stevil</span>
                <span className="footer-copyright">
                    © {new Date().getFullYear()} Stevil. All rights reserved.
                </span>
            </div>
        </footer>
    );
}
