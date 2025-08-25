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
        animation: fadeUp 1.8s ease-out forwards;
        animation-delay: 0.5s;
    }

    .left-section h2 {
        margin-left: 2rem;
        margin-top: 3rem;
        font-size: 1.5rem;
        color: #0b2d56;
        font-weight: 400;
        line-height: 1.5;
        max-width: 90%;

        opacity: 0;
        transform: translateY(30px);
        animation: fadeUp 1.5s ease-out forwards;
        animation-delay: 1.3s;
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
        animation: fadeInBounce 2s ease-out;
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
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
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

    .info-panels-container {
        display: flex;
        gap: 2rem;
        justify-content: center;
        align-items: flex-start;
        margin: 2rem 0;
        flex-wrap: wrap;
    }
    .info-panel {
        background: #fff;
        border: 3px solid #0b2d56;
        border-radius: 1.2rem;
        padding: 1.5rem;
        width: 350px;
        min-width: 280px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .info-panel h2 {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: #0b2d56;
        text-align: left;
    }
    .info-search {
        width: 100%;
        padding: 0.5rem 1rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        font-size: 1rem;
        outline: none;
    }
    .info-list {
        flex: 1;
        overflow-y: auto;
        max-height: 260px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        scrollbar-width: thin;
        scrollbar-color: #0b2d56 #f4c542;
    }
    .info-list::-webkit-scrollbar {
        width: 8px;
    }
    .info-list::-webkit-scrollbar-thumb {
        background: #0b2d56;
        border-radius: 8px;
    }
    .info-list::-webkit-scrollbar-track {
        background: #f4c542;
        border-radius: 8px;
    }
    .info-item {
        background: #0b2d56;
        color: #fff;
        padding: 0.7rem 1rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s, transform 0.2s;
    }
    .info-item:hover {
        background: #f4c542;
        color: #0b2d56;
        transform: scale(1.03);
    }
    .info-btn {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        margin-left: 1rem;
    }
    .info-modal {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .info-modal-content {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        min-width: 300px;
        max-width: 90vw;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        text-align: center;
    }
    .info-modal-content h3 {
        font-size: 1.3rem;
        color: #0b2d56;
        margin-bottom: 1rem;
    }
    .close-modal-btn {
        margin-top: 1.5rem;
        padding: 0.5rem 1.2rem;
        background: #0b2d56;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        font-weight: 600;
    }
    .close-modal-btn:hover {
        background: #f4c542;
        color: #0b2d56;
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
        .info-panels-container {
            flex-direction: column;
            align-items: stretch;
        }
        .info-panel {
            width: 100%;
            margin-bottom: 1.5rem;
        }
    }
</style>

<script>
    import { onMount } from 'svelte';
    let aboutVisible = false;

    // Medicines and services data
    const medicines = [
        { name: "Acetaminophen (Paracetamol)", info: "Used to treat pain and fever." },
        { name: "Acetylcysteine (Fluimucil)", info: "Mucolytic agent for respiratory conditions." },
        { name: "Acyclovir", info: "Antiviral for herpes infections." },
        { name: "Allopurinol", info: "Used to treat gout." },
        { name: "Budesonide", info: "Steroid for asthma and allergies." },
        { name: "Carbamazepine", info: "Anticonvulsant for epilepsy." },
        // ...add more medicines as needed
    ];
    const services = [
        { name: "Complete Blood Count (CBC)", info: "Blood test to evaluate overall health." },
        { name: "Urinalysis", info: "Test for urine composition." },
        { name: "Chest X-Ray", info: "Imaging for lungs and chest." },
        { name: "Physical Examination", info: "General health check." },
        { name: "Drug Screening", info: "Test for drugs in the system." },
        { name: "Fecalysis", info: "Stool test for digestive health." },
        // ...add more services as needed
    ];

    let medicineSearch = '';
    let serviceSearch = '';
    let selectedItem = null;

    function showInfo(item) {
        selectedItem = item;
    }
    function closeInfo() {
        selectedItem = null;
    }

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
    </div>
    <div class="right-section">
        <img src="/images/digital member portal.png" alt="Landing Logo" height="400" />
    </div>
</main>

<div class="info-panels-container">
    <div class="info-panel">
        <h2>Covered Medicines</h2>
        <input
            type="text"
            placeholder="Search medicines"
            bind:value={medicineSearch}
            class="info-search"
        />
        <div class="info-list">
            {#each medicines.filter(m => m.name.toLowerCase().includes(medicineSearch.toLowerCase())) as med}
                <div class="info-item" on:click={() => showInfo(med)}>
                    <span>{med.name}</span>
                    <button class="info-btn" title="More info">i</button>
                </div>
            {/each}
        </div>
    </div>
    <div class="info-panel">
        <h2>Available Services</h2>
        <input
            type="text"
            placeholder="Search services"
            bind:value={serviceSearch}
            class="info-search"
        />
        <div class="info-list">
            {#each services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())) as svc}
                <div class="info-item" on:click={() => showInfo(svc)}>
                    <span>{svc.name}</span>
                    <button class="info-btn" title="More info">i</button>
                </div>
            {/each}
        </div>
    </div>
</div>

{#if selectedItem}
    <div class="info-modal">
        <div class="info-modal-content">
            <h3>{selectedItem.name}</h3>
            <p>{selectedItem.info}</p>
            <button class="close-modal-btn" on:click={closeInfo}>Close</button>
        </div>
    </div>
{/if}

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 6.5A16.5 16.5 0 0117.5 22M2 6.5V2a1 1 0 011-1h3.5a1 1 0 011 1v4.5a1 1 0 01-1 1H3a1 1 0 01-1-1z" />
                </svg>
                0968 856 1807
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
