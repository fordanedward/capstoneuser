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
        font-weight: 900;
        text-transform: uppercase;
        color: #0b2d56;
        margin-bottom: 1.2rem;
        letter-spacing: 0.06em;
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

    .why-choose-us {
        --choose-primary: #0b2d56;
        --choose-accent: #f4c542;
        --choose-ink: #10233f;
        --choose-muted: #4b5c76;
        --choose-surface: #ffffff;
        position: relative;
        padding: 5rem 1.25rem;
        overflow: hidden;
        background:
            radial-gradient(circle at 8% 0%, rgba(244, 197, 66, 0.2), transparent 42%),
            radial-gradient(circle at 92% 100%, rgba(11, 45, 86, 0.14), transparent 48%),
            linear-gradient(150deg, #f8fbff 0%, #eef4ff 52%, #ffffff 100%);
    }

    .choose-wrap {
        width: min(1180px, 100%);
        margin: 0 auto;
    }

    .choose-header {
        text-align: center;
        max-width: 760px;
        margin: 0 auto 2.25rem;
    }

    .choose-header h2 {
        margin: 0;
        color: var(--choose-primary);
        font-size: clamp(1.9rem, 2.8vw, 3rem);
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .choose-header p {
        margin: 0.9rem auto 0;
        color: var(--choose-muted);
        line-height: 1.65;
        font-size: clamp(0.95rem, 1.4vw, 1.1rem);
    }

    .choose-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
    }

    .choose-card {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        background: var(--choose-surface);
        border: 1px solid rgba(11, 45, 86, 0.1);
        border-radius: 18px;
        padding: 1.2rem;
        box-shadow: 0 10px 22px rgba(16, 35, 63, 0.07);
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    }

    .choose-card:hover {
        transform: translateY(-5px);
        border-color: rgba(11, 45, 86, 0.25);
        box-shadow: 0 16px 30px rgba(16, 35, 63, 0.16);
    }

    .choose-icon {
        width: 48px;
        height: 48px;
        min-width: 48px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        background: linear-gradient(145deg, var(--choose-primary), #144884);
        box-shadow: 0 10px 18px rgba(11, 45, 86, 0.26);
    }

    .choose-icon svg {
        width: 22px;
        height: 22px;
    }

    .choose-copy h3 {
        margin: 0;
        color: var(--choose-ink);
        font-size: 1.12rem;
        font-weight: 800;
        letter-spacing: 0.03em;
        text-transform: uppercase;
    }

    .choose-copy p {
        margin: 0.45rem 0 0;
        color: var(--choose-muted);
        line-height: 1.55;
        font-size: 0.97rem;
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
        transition: transform 0.3s cubic-bezier(.68,-0.55,.27,1.55), background-color 0.2s;
        box-shadow: 0 2px 8px rgba(11,45,86,0.08);
        animation: fbPopIn 0.8s cubic-bezier(.68,-0.55,.27,1.55);
    }
    .social-links a:hover {
        transform: scale(1.15) translateY(-4px) rotate(-6deg);
        background-color: #0b2d56;
        box-shadow: 0 4px 16px rgba(11,45,86,0.18);
        animation: fbBounce 0.4s;
    }

    @keyframes fbPopIn {
        0% { opacity: 0; transform: scale(0.5) translateY(20px); }
        80% { opacity: 1; transform: scale(1.1) translateY(-2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fbBounce {
        0% { transform: scale(1) translateY(0) rotate(0deg); }
        40% { transform: scale(1.18) translateY(-6px) rotate(-8deg); }
        60% { transform: scale(0.98) translateY(-2px) rotate(2deg); }
        100% { transform: scale(1.15) translateY(-4px) rotate(-6deg); }
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
            padding-top: 4rem;
            gap: 1.5rem;
            padding-bottom: 2rem;
        }
        .about-image {
            width: 95vw;
            max-width: 500px;
            height: auto;
            border-radius: 40px 40px 0 0;
            object-fit: cover;
        }
        .about-content {
            max-width: 95vw;
            padding: 1.5rem 1rem;
            text-align: left;
        }
        .about-content h1 {
            font-size: 2.2rem;
            margin-bottom: 1rem;
        }
        .about-content p {
            font-size: 1rem;
            margin-bottom: 1rem;
            line-height: 1.6;
        }
        .about-content a {
            font-size: 1rem;
        }
        .about-contact {
            gap: 1rem;
            margin-top: 1rem;
            font-size: 0.95rem;
        }
        .about-contact span {
            gap: 0.8rem;
        }
        .about-contact svg {
            width: 1.3em;
            height: 1.3em;
        }
    }

    @media (max-width: 640px) {
        .about-container {
            padding-top: 3rem;
            gap: 1rem;
        }
        .about-image {
            width: 100%;
            height: 280px;
            border-radius: 30px 30px 0 0;
        }
        .about-content {
            padding: 1.25rem;
        }
        .about-content h1 {
            font-size: 1.75rem;
        }
        .about-content p {
            font-size: 0.95rem;
            margin-bottom: 0.75rem;
        }
        .about-contact {
            gap: 0.75rem;
            font-size: 0.85rem;
        }
        .about-contact svg {
            width: 1.2em;
            height: 1.2em;
        }

        .why-choose-us {
            padding: 3.2rem 0.85rem;
        }

        .choose-card {
            padding: 1rem;
            border-radius: 14px;
        }

        .choose-icon {
            width: 42px;
            height: 42px;
            min-width: 42px;
            border-radius: 12px;
        }

        .choose-copy h3 {
            font-size: 0.98rem;
        }

        .choose-copy p {
            font-size: 0.9rem;
        }
    }

    @media (max-width: 1024px) {
        .choose-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 700px) {
        .choose-grid {
            grid-template-columns: 1fr;
        }
    }

    /* Mobile landing adjustments */
    @media (max-width: 900px) {
        header {
            padding: 12px 16px;
            z-index: 1001;
        }
        .nav-container {
            padding: 0;
        }
        nav {
            gap: 10px;
        }
        nav a {
            font-size: 0.9rem;
            padding: 8px 14px;
            border-radius: 6px;
        }

        main {
            flex-direction: column;
            align-items: center;
            height: auto;
            overflow: visible;
            padding-top: 5.5rem;
            padding-bottom: 2rem;
        }
        .left-section {
            max-width: 100%;
            text-align: left;
            padding: 0 1.25rem;
            width: 100%;
        }
        .left-section h1 {
            margin-top: 1.5rem;
            margin-left: 0;
            font-size: 2.2rem;
            line-height: 1.2;
            word-spacing: 0.1em;
        }
        .left-section h2 {
            margin-left: 0;
            margin-top: 1rem;
            font-size: 1.05rem;
            max-width: 100%;
            line-height: 1.5;
        }
        .social-links {
            margin-left: 0;
            gap: 0.6rem;
            margin-top: 1.5rem;
            align-items: center;
        }
        .social-links span {
            font-size: 0.95rem;
            color: #0b2d56;
            font-weight: 500;
        }
        .social-links a {
            width: 40px;
            height: 40px;
            box-shadow: 0 2px 6px rgba(11, 45, 86, 0.12);
        }
        .right-section {
            width: 100%;
            justify-content: center;
            align-items: center;
            margin-top: 1.5rem;
            padding-bottom: 1rem;
        }
        .right-section img {
            max-width: 70%;
            max-height: none;
            height: auto;
            margin-left: 0;
            margin-top: 0;
        }
    }

    /* Extra-small phones */
    @media (max-width: 480px) {
        header {
            padding: 10px 12px;
        }
        .navbar-logo {
            height: 42px;
            margin-left: 8px;
        }
        nav {
            gap: 8px;
            margin-right: 8px;
        }
        nav a {
            font-size: 0.85rem;
            padding: 6px 10px;
        }
        main {
            padding-top: 4.8rem;
        }
        .left-section {
            padding: 0 1rem;
        }
        .left-section h1 {
            font-size: 1.75rem;
            margin-top: 1rem;
            line-height: 1.25;
        }
        .left-section h2 {
            font-size: 0.95rem;
            margin-top: 0.75rem;
        }
        .social-links span {
            font-size: 0.85rem;
        }
        .social-links a {
            width: 36px;
            height: 36px;
        }
        .right-section img {
            max-width: 80%;
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
        background-color: #f4c542; /* gold tone */
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
            min-height: auto;
        }
        .location-left {
            padding: 2rem 1rem;
        }
        .location-left img {
            width: 140px;
            height: 140px;
        }
        .location-left h3 {
            font-size: 1.5rem;
        }
        .location-left p {
            font-size: 0.95rem;
        }
        .locations-title {
            margin-top: 2rem;
            font-size: 1.75rem;
            letter-spacing: 2px;
        }
        .location-right, .location-right iframe {
            min-height: 380px;
            height: 380px;
        }
    }

    @media (max-width: 640px) {
        .locations-section {
            margin: 0;
        }
        .location-left {
            padding: 1.5rem 1rem;
        }
        .location-left img {
            width: 110px;
            height: 110px;
            margin-bottom: 1rem;
        }
        .location-left h3 {
            font-size: 1.25rem;
            letter-spacing: 1px;
            margin-bottom: 0.5rem;
        }
        .location-left p {
            font-size: 0.85rem;
            line-height: 1.5;
            max-width: 95vw;
        }
        .locations-title {
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
            letter-spacing: 1.5px;
        }
        .location-right, .location-right iframe {
            min-height: 300px;
            height: 300px;
        }
    }
</style>

<script>
    import Footer from '$lib/components/Footer.svelte';
    let aboutVisible = true;
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
    <img src="/images/php animated.gif" alt="Permanente Health Plan Facility" class="about-image" />
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

<section class="why-choose-us" aria-labelledby="why-choose-us-title">
    <div class="choose-wrap">
        <div class="choose-header">
            <h2 id="why-choose-us-title">Why Choose Us?</h2>
            <p>
                From preventive services to secure digital care tools, PHP combines trusted local providers, modern diagnostics,
                and member-first support to keep your family healthier.
            </p>
        </div>

        <div class="choose-grid">
            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25v12.5A2.25 2.25 0 0118.75 20H5.25A2.25 2.25 0 013 17.75V5.25zm8 1.5v3.5H7.5a.75.75 0 000 1.5H11v3.5a.75.75 0 001.5 0v-3.5H16a.75.75 0 000-1.5h-3.5v-3.5a.75.75 0 00-1.5 0z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Diagnostic Laboratory</h3>
                    <p>Complete blood chemistry, hematology, microscopy, serology, and drug testing in one convenient network.</p>
                </div>
            </article>

            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.25a.75.75 0 01.75.75v1.348c2.292.31 4.19 2.086 4.72 4.383h1.28a.75.75 0 010 1.5h-1.16a5.752 5.752 0 01-5.59 4.5 5.752 5.752 0 01-5.59-4.5H5.25a.75.75 0 010-1.5h1.28c.53-2.297 2.428-4.072 4.72-4.383V3a.75.75 0 01.75-.75zm0 3.5a4.25 4.25 0 100 8.5 4.25 4.25 0 000-8.5zm-3 11.5a.75.75 0 01.75.75v.25A2.25 2.25 0 0012 20.5a2.25 2.25 0 002.25-2.25V18a.75.75 0 011.5 0v.25A3.75 3.75 0 0112 22a3.75 3.75 0 01-3.75-3.75V18a.75.75 0 01.75-.75z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Diagnostic Imaging</h3>
                    <p>Reliable ultrasound and X-ray services that help identify issues early and support faster treatment decisions.</p>
                </div>
            </article>

            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.5 3A3.5 3.5 0 004 6.5v11A3.5 3.5 0 007.5 21h9a3.5 3.5 0 003.5-3.5v-11A3.5 3.5 0 0016.5 3h-9zm2 5.25a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Consultation</h3>
                    <p>Access to physicians who guide preventive care, monitor your health trends, and answer concerns with care.</p>
                </div>
            </article>

            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.5 2.5a.75.75 0 011.5 0v1.09a7.002 7.002 0 016.41 6.41h1.09a.75.75 0 010 1.5h-1.09a7.002 7.002 0 01-6.41 6.41v1.09a.75.75 0 01-1.5 0v-1.09a7.002 7.002 0 01-6.41-6.41H3a.75.75 0 010-1.5h1.09a7.002 7.002 0 016.41-6.41V2.5zm.75 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm-.75 3.25a.75.75 0 011.5 0v2h2a.75.75 0 010 1.5h-2v2a.75.75 0 01-1.5 0v-2h-2a.75.75 0 010-1.5h2v-2z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Heart Monitoring</h3>
                    <p>EKG/ECG support for timely heart checks, helping members and clinicians respond before symptoms worsen.</p>
                </div>
            </article>

            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a8 8 0 018 8v3.2c0 .57.23 1.12.64 1.52l.84.84a1.5 1.5 0 01-1.06 2.56H3.58a1.5 1.5 0 01-1.06-2.56l.84-.84A2.14 2.14 0 004 13.2V10a8 8 0 018-8zm2.5 17.25a2.5 2.5 0 11-5 0h5z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Automated Health Information</h3>
                    <p>WELLNESS securely manages member records, helping keep healthcare data protected, organized, and accessible.</p>
                </div>
            </article>

            <article class="choose-card">
                <span class="choose-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.25l7.5 3v6.13c0 4.63-3 8.93-7.5 10.37-4.5-1.44-7.5-5.74-7.5-10.37V5.25l7.5-3zm-1.06 6.44a.75.75 0 10-1.38.6l1.6 3.7a.75.75 0 001.23.23l3.6-4.2a.75.75 0 00-1.14-.97l-2.83 3.3-1.08-2.66z" />
                    </svg>
                </span>
                <div class="choose-copy">
                    <h3>Trusted Local Care</h3>
                    <p>Founded by Filipinos for Filipinos, with contracted local providers in Olongapo and member-focused support.</p>
                </div>
            </article>
        </div>
    </div>
</section>

<!-- Locations -->
<h2 class="locations-title">LOCATION</h2>
<section class="locations-section" aria-label="PHP Locations">
    <div class="location-left">
        <img src="/images/logo(landing).png" alt="PHP Seal" />
        <h3><b>HEADQUARTERS</b></h3>
        <p>
            Block 7, Lot 19-23 Mayumi Street, Barangay Santa Rita,<br/>
            Olongapo City, Zambales 2200
        </p>
    </div>
    <div class="location-right">
        <iframe
            title="PHP Headquarters Map"
            referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d616.321993588706!2d120.279708!3d14.857400!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3396702d6b6f0a1b%3A0x0!2sMayumi%20St%2C%20Santa%20Rita%2C%20Olongapo%20City%2C%20Zambales!5e0!3m2!1sen!2sPH!4v1700000000000">
        </iframe>
    </div>
    
</section>

<Footer />