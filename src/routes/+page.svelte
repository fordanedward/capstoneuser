<style>
    header {
        display: flex;
        justify-content: center;
        padding: 20px;
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        background-color: #0b2d56;
        z-index: 1000;
    }

    .nav-container {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .navbar-logo {
        height: 50px;
        margin-left: 20px;
    }

    nav {
        display: flex;
        gap: 25px;
        margin-right: 20px;
    }

    nav a {
        text-decoration: none;
        color: #f4c542;
        font-weight: bold;
        font-size: 1rem;
        padding: 8px 16px;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    nav a:hover {
        background-color: #f4c542; /* gold from logo */
        color: #0b2d56; /* dark blue text */
        transform: scale(1.05);
    }

    main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        height: 100vh;
        box-sizing: border-box;
        overflow: hidden;
        padding: 0;
    }

    .left-section {
        flex: 1;
        max-width: 50%;
        overflow: hidden;
    }

    .left-section h1 {
        margin-top: 16rem;
        margin-left: 2rem;
        font-size: 5rem;
        color: #0b2d56;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -1px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);

        opacity: 0;
        transform: translateY(40px);
        animation: fadeUp 1.4s ease-out forwards;
        animation-delay: 0.5s;
    }

    .left-section h2 {
        margin-left: 2rem;
        margin-top: 1rem;
        font-size: 1.5rem;
        color: #0b2d56;
        font-weight: 400;
        line-height: 1.5;
        max-width: 90%;

        opacity: 0;
        transform: translateY(30px);
        animation: fadeUp 1.2s ease-out forwards;
        animation-delay: 0.5s;
    }

    .right-section {
        flex: 1;
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;
        overflow: hidden;
        padding: 0;
    }

    .right-section img {
        max-width: 100%;
        max-height: 80%;
        object-fit: contain;
        margin-left: 10rem;
        margin-top: 2rem;
        animation: slideInFromRight 1.2s ease-out;
    }

    .about-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #fff;
        padding-top: 7rem;
        gap: 2rem;
        animation: fadeIn 1.2s ease;
    }

    .about-image {
        width: 750px;         /* Increased from 480px */
        height: 560px;        /* Increased from 480px */
        object-fit: cover;
        border-top-left-radius: 25%;
        border-bottom-left-radius: 25%;
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
        animation: imageBounceIn 1.5s cubic-bezier(.68,-0.55,.27,1.55);
    }

    .about-content {
        max-width: 600px;
        padding: 2rem 1rem;
        animation: fadeUp 1.2s 0.5s both;
    }

    .about-content h1 {
        font-size: 2.8rem;
        font-weight: 800;
        color: #0b2d56;
        margin-bottom: 1.2rem;
        letter-spacing: -1px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.08);
        animation: fadeUp 1.2s 0.7s both;
    }

    .about-content p {
        font-size: 1.25rem;
        color: #1e3a66;
        margin-bottom: 1.5rem;
        line-height: 1.6;
        animation: fadeUp 1.2s 0.9s both;
    }

    .about-content a {
        color: #0b2d56;
        font-weight: bold;
        font-size: 1.25rem;
        text-decoration: none;
        transition: color 0.3s;
    }
    .about-content a:hover {
        color: #f4c542;
    }

    .about-contact {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        margin-top: 1.2rem;
        font-size: 1.1rem;
        animation: fadeUp 1.2s 1.1s both;
    }

    .about-contact span {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        color: #0b2d56;
        font-weight: 500;
    }

    .about-contact svg {
        width: 1.5em;
        height: 1.5em;
        color: #f4c542;
        flex-shrink: 0;
        animation: iconPop 1.2s 1.2s both;
    }

    /* Social links below hero subtitle */
    .social-links {
        margin-left: 2rem;
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        opacity: 0;
        transform: translateY(20px);
        animation: fadeUp 1.2s ease-out forwards;
        animation-delay: 1.0s;
        flex-wrap: wrap;
    }
    .social-links a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background-color: #0b2d56;
        color: white;
        text-decoration: none;
        transition: transform 0.2s ease, background-color 0.2s ease;
    }
    .social-links a:hover {
        transform: translateY(-2px);
        background-color: #123a6e;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(40px);}
        to { opacity: 1; transform: translateY(0);}
    }
    @keyframes fadeInBounce {
        0% {
            opacity: 0;
            transform: scale(0.8) translateY(-50px);
        }
        50% {
            opacity: 1;
            transform: scale(1.05) translateY(10px);
        }
        100% {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    @keyframes slideInFromRight {
        0% {
            opacity: 0;
            transform: translateX(100px);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes imageBounceIn {
        0% { opacity: 0; transform: scale(0.8) translateY(-60px);}
        60% { opacity: 1; transform: scale(1.05) translateY(10px);}
        100% { opacity: 1; transform: scale(1) translateY(0);}
    }
    @keyframes iconPop {
        0% { opacity: 0; transform: scale(0.5);}
        80% { opacity: 1; transform: scale(1.2);}
        100% { opacity: 1; transform: scale(1);}
    }

    @media (max-width: 900px) {
        .about-container {
            flex-direction: column;
            padding-top: 6rem;
        }
        .about-image {
            width: 98vw;      /* Make it almost full width on small screens */
            height: auto;     /* Maintain aspect ratio */
            border-radius: 40% 40% 0 0;
        }
        .about-content {
            max-width: 95vw;
        }
    }

    /* Mobile landing adjustments */
    @media (max-width: 900px) {
        header {
            padding: 14px;
        }
        .nav-container {
            padding: 0 6px;
        }
        nav {
            gap: 12px;
        }
        nav a {
            font-size: 0.95rem;
            padding: 6px 10px;
        }

        main {
            flex-direction: column;
            align-items: center;
            height: auto;
            overflow: visible;
            padding-top: 5.5rem; /* account for fixed header */
        }
        .left-section {
            max-width: 100%;
            text-align: left;
            padding: 0 1rem;
        }
        .left-section h1 {
            margin-top: 1rem;
            margin-left: 0;
            font-size: 2.4rem;
            line-height: 1.15;
        }
        .left-section h2 {
            margin-left: 0;
            margin-top: 1rem;
            font-size: 1rem;
            max-width: 100%;
        }
        .social-links {
            margin-left: 0;
            gap: 0.4rem;
        }
        .social-links a {
            width: 38px;
            height: 38px;
        }
        .right-section {
            width: 100%;
            justify-content: center;
            align-items: center;
            margin-top: 1rem;
        }
        .right-section img {
            max-width: 85%;
            max-height: none;
            height: auto;
            margin-left: 0;
            margin-top: 0.5rem;
        }
    }

    /* Extra-small phones */
    @media (max-width: 480px) {
        .left-section h1 {
            font-size: 2rem;
        }
        .left-section h2 {
            font-size: 0.95rem;
        }
        .right-section img {
            max-width: 90%;
        }
    }

    /* Locations section */
    .locations-section {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        min-height: 520px;
        width: 100%;
        margin: 0;
    }
    .location-left {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #e1a800; /* gold tone */
        padding: 2.5rem 1rem;
        text-align: center;
    }
    .location-left img {
        width: 180px;
        height: 180px;
        object-fit: contain;
        margin-bottom: 1.25rem;
    }
    .location-left h3 {
        margin: 0.25rem 0 0.75rem 0;
        color: #0b2d56;
        font-size: 2rem;
        letter-spacing: 2px;
    }
    .location-left p {
        max-width: 560px;
        color: #0b2d56;
        line-height: 1.6;
        font-weight: 500;
    }
    .location-right {
        position: relative;
        min-height: 520px;
        width: 100%;
    }
    .location-right iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
    }
    .locations-title {
        width: 100%;
        text-align: center;
        margin: 3rem 0 1rem 0;
        color: #0b2d56;
        font-weight: 800;
        font-size: 2rem;
        letter-spacing: 3px;
    }
    @media (max-width: 900px) {
        .locations-section {
            grid-template-columns: 1fr;
        }
        .location-left {
            padding: 2rem 1.25rem;
        }
        .location-left img {
            width: 140px;
            height: 140px;
        }
        .locations-title {
            margin-top: 2rem;
        }
        .location-right, .location-right iframe {
            min-height: 380px;
            height: 380px;
        }
    }
</style>

<script>
    import { onMount } from 'svelte';
    let aboutVisible = false;

    onMount(() => {
        const aboutSection = document.querySelector('.about-container');
        const observer = new window.IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    aboutVisible = true;
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );
        if (aboutSection) observer.observe(aboutSection);
    });
</script>

<header>
    <div class="nav-container">
        <a href="/">
            <img src="/images/digital member portal.png" alt="PHP DGMP" class="navbar-logo" />
        </a>
        <nav>
            <a href="/loginPatient">Member Login</a>
        </nav>
    </div>
</header>

<main>
    <div class="left-section">
        <h1>Welcome to PHP Digital Member Portal</h1>
        <h2>We provide health solutions so we can achieve healthy, happy, and productive lives.</h2>
        <div class="social-links" aria-label="Social media links">
            <span>Like us on Facebook</span>
            <a href="https://www.facebook.com/permanentehealthplan" target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook Page">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.49v-9.294H9.692V11.08h3.124V8.41c0-3.1 1.893-4.787 4.659-4.787 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.312h3.59l-.467 3.626h-3.123V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/>
                </svg>
            </a>
        </div>
    </div>
    <div class="right-section">
        <img src="/images/digital member portal.png" alt="Landing Logo" height="400" />
    </div>
</main>

<div class="about-container">
    <img src="/images/php building.jpg" alt="PHP Building" class="about-image" />
    <div class="about-content">
        <h1>About PHP</h1>
        <p>
            Permanente Health Plan was founded in 2019 with a mission to provide an affordable, trusted outpatient, labs, pharmacy, diagnostic imaging, dental, optometry, mental health and urgent care membership for the residents of the Philippines. Our vision is to build a future of health and wellness to all residents of the Philippines through preventive care. PHP was founded by Filipinos for Filipinos. Our contracted physician and medical health providers are all local in Olongapo. We also telemedicine option to our urgent care members.
        </p>
        <p>
            For a detailed list of our services and contracted providers, please visit our website at
            <a href="https://www.permanentehealthplan.org" target="_blank">www.permanentehealthplan.org</a>
        </p>
        <div class="about-contact">
            <span>
                <!-- Phone Icon SVG -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a.75.75 0 00.75-.75v-3.003a.75.75 0 00-.593-.73l-3.248-.65a.75.75 0 00-.788.347l-.853 1.279a11.25 11.25 0 01-5.58-5.58l1.279-.853a.75.75 0 00.347-.788l-.65-3.248a.75.75 0 00-.73-.593H3a.75.75 0 00-.75.75v1.5z" />
                </svg>
                0968 856 1807/ 0917 132 1756
            </span>
            <span>
                <!-- Location Icon SVG -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 0c-4.418 0-8 2.239-8 5v5h16v-5c0-2.761-3.582-5-8-5z" />
                </svg>
                Lot 19-23, Blk 7, Mayumi St, Sta Rita, Olongapo City
            </span>
        </div>
    </div>
</div>


<!-- Locations -->
<h2 class="locations-title">LOCATION</h2>
<section class="locations-section" aria-label="PHP Locations">
    <div class="location-left">
        <img src="/images/logo(landing).png" alt="PHP Seal" />
        <h3>HEADQUARTERS</h3>
        <p>
            Block 7, Lot 19-23 Mayumi Street, Barangay Santa Rita,<br/>
            Olongapo City, Zambales 2200
        </p>
    </div>
    <div class="location-right">
        <iframe
            title="PHP Headquarters Map"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d616.321993588706!2d120.279708!3d14.857400!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3396702d6b6f0a1b%3A0x0!2sMayumi%20St%2C%20Santa%20Rita%2C%20Olongapo%20City%2C%20Zambales!5e0!3m2!1sen!2sPH!4v1700000000000">
        </iframe>
    </div>
    
</section>
