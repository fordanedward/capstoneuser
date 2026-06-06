<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { writable, derived } from 'svelte/store';
    import { fade, scale } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';

    import { coveredMedicines as coveredMedicinesData, fetchCoveredMedicines } from '$lib/data/coveredMedicines';

    type CoveredMedicine = { name: string; info: string; dosage?: string };
    type ServiceInfo = { name: string; description: string; icon: string };

    let coveredMedicines: CoveredMedicine[] = coveredMedicinesData;

    // Load from CSV at runtime (fallback to embedded list on failure)
    fetchCoveredMedicines().then((list) => { coveredMedicines = list as CoveredMedicine[]; });
    let ourServices: ServiceInfo[] = [
        { 
            name: "Lab Test", 
            description: "Routine lab testing is a key part of annual health check-ups to assess overall well-being. Our comprehensive lab services include blood tests, urinalysis, and specialized diagnostic testing.",
            icon: "/images/blood-test.png"
        },
        { 
            name: "Doctor Consultation", 
            description: "Doctor consultations further support patient health by providing accurate diagnoses, personalized treatment plans, and ongoing medical guidance to promote long-term wellness.",
            icon: "/images/doctor-consultation.png"
        },
        { 
            name: "Imaging (ECG, X-Ray & Ultrasound)", 
            description: "Imaging also plays a vital role by allowing healthcare providers to detect internal issues early, supporting timely and effective treatment.",
            icon: "/images/x-rays.png"
        },
        { 
            name: "Vaccination", 
            description: "Vaccination helps reduce healthcare costs by minimizing hospitalizations from preventable diseases.",
            icon: "/images/syringe.png"
        },
        { 
            name: "Pharmacy", 
            description: "Pharmacists are essential in medical services, offering medication counseling to ensure proper use.",
            icon: "/images/medicine.png"
        }
    ];

    // Use writable stores for search
    const medicineSearch = writable('');

    function normalize(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Use derived stores for filtered lists
    const filteredMedicines = derived(
        [medicineSearch],
        ([$medicineSearch]: [string]): CoveredMedicine[] => {
            const normalizedQuery = normalize($medicineSearch);
            if (!normalizedQuery) return coveredMedicines;

            const queryTokens = normalizedQuery.split(' ').filter(Boolean);

            return coveredMedicines.filter((m) => {
                const haystack = normalize(`${m.name} ${m.info} ${m.dosage ?? ''}`);
                // Match full phrase OR all tokens
                return haystack.includes(normalizedQuery) || queryTokens.every((tok) => haystack.includes(tok));
            });
        }
    );


    // Modal state
    let showModal = false;
    let modalType: 'medicine' | 'service' = 'medicine';
    let selectedMedicine: CoveredMedicine | null = null;
    let selectedService: ServiceInfo | null = null;
    let activeListItemKey: string | null = null;

    function triggerItemClickAnimation(key: string) {
        activeListItemKey = key;
        setTimeout(() => {
            if (activeListItemKey === key) {
                activeListItemKey = null;
            }
        }, 260);
    }

    function showMedicineInfo(med: CoveredMedicine) {
        triggerItemClickAnimation(`medicine-${med.name}`);
        selectedMedicine = med;
        modalType = 'medicine';
        showModal = true;
    }

    function showServiceInfo(svc: ServiceInfo) {
        triggerItemClickAnimation(`service-${svc.name}`);
        selectedService = svc;
        modalType = 'service';
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedMedicine = null;
        selectedService = null;
    }

    // Close modal when clicking outside
    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    }

    // Mobile carousel controls for blood pressure tips
    let bpTipIndex = 0;
    const totalBpTips = 6;
    let touchStartX = 0;
    let touchEndX = 0;
    let dragOffset = 0;
    let isDragging = false;

    function nextBpTip() {
        bpTipIndex = (bpTipIndex + 1) % totalBpTips;
    }

    function prevBpTip() {
        bpTipIndex = (bpTipIndex - 1 + totalBpTips) % totalBpTips;
    }

    function handleTouchStart(e: TouchEvent) {
        touchStartX = e.changedTouches[0].screenX;
        isDragging = true;
        dragOffset = 0;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging) return;
        dragOffset = e.changedTouches[0].screenX - touchStartX;
    }

    function handleTouchEnd(e: TouchEvent) {
        isDragging = false;
        touchEndX = e.changedTouches[0].screenX;
        dragOffset = 0;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) nextBpTip();
            else prevBpTip();
        }
    }

    const cholesterolTips = [
        {
            title: 'Eat Properly',
            image: '/images/healthy%20habits/much%20needed%20foods%20cholesterol.png',
            alt: 'Foods that help lower cholesterol',
            points: [
                'Try to eat more oatmeal, beans, mung beans, and vegetables.',
                'Avoid eating fatty pork.',
                'Avoid cakes, pastries, croissants, ensaymada, butter, and cookies.',
                'If you like fried rice, choose newly cooked plain rice instead.'
            ]
        },
        {
            title: 'Exercise',
            image: '/images/healthy%20habits/creating-a-fitness-plan.jpg',
            alt: 'Creating a fitness plan to lower cholesterol',
            description: 'Exercising 3 to 5 times a week, for 30 minutes to 1 hour, greatly helps reduce cholesterol.'
        }
    ];

    let cholesterolTipIndex = 0;
    const totalCholesterolTips = cholesterolTips.length;
    let cholesterolTouchStartX = 0;
    let cholesterolTouchEndX = 0;
    let cholesterolDragOffset = 0;
    let isCholesterolDragging = false;

    function nextCholesterolTip() {
        cholesterolTipIndex = (cholesterolTipIndex + 1) % totalCholesterolTips;
    }

    function prevCholesterolTip() {
        cholesterolTipIndex = (cholesterolTipIndex - 1 + totalCholesterolTips) % totalCholesterolTips;
    }

    function handleCholesterolTouchStart(e: TouchEvent) {
        cholesterolTouchStartX = e.changedTouches[0].screenX;
        isCholesterolDragging = true;
        cholesterolDragOffset = 0;
    }

    function handleCholesterolTouchMove(e: TouchEvent) {
        if (!isCholesterolDragging) return;
        cholesterolDragOffset = e.changedTouches[0].screenX - cholesterolTouchStartX;
    }

    function handleCholesterolTouchEnd(e: TouchEvent) {
        isCholesterolDragging = false;
        cholesterolTouchEndX = e.changedTouches[0].screenX;
        cholesterolDragOffset = 0;
        const diff = cholesterolTouchStartX - cholesterolTouchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) nextCholesterolTip();
            else prevCholesterolTip();
        }
    }

    // Mobile carousel controls for schedule cards
    let scheduleSlideIndex = 0;
    const totalScheduleSlides = 3;
    let scheduleTouchStartX = 0;
    let scheduleTouchEndX = 0;
    let scheduleDragOffset = 0;
    let isScheduleDragging = false;

    function nextScheduleSlide() {
        scheduleSlideIndex = (scheduleSlideIndex + 1) % totalScheduleSlides;
    }

    function prevScheduleSlide() {
        scheduleSlideIndex = (scheduleSlideIndex - 1 + totalScheduleSlides) % totalScheduleSlides;
    }

    function handleScheduleTouchStart(e: TouchEvent) {
        scheduleTouchStartX = e.changedTouches[0].screenX;
        isScheduleDragging = true;
        scheduleDragOffset = 0;
    }

    function handleScheduleTouchMove(e: TouchEvent) {
        if (!isScheduleDragging) return;
        scheduleDragOffset = e.changedTouches[0].screenX - scheduleTouchStartX;
    }

    function handleScheduleTouchEnd(e: TouchEvent) {
        isScheduleDragging = false;
        scheduleTouchEndX = e.changedTouches[0].screenX;
        scheduleDragOffset = 0;
        const diff = scheduleTouchStartX - scheduleTouchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) nextScheduleSlide();
            else prevScheduleSlide();
        }
    }

    // Mobile carousel controls for diagnostic packages
    let packageSlideIndex = 0;
    const totalPackageSlides = 5;
    let packageTouchStartX = 0;
    let packageTouchEndX = 0;
    let packageDragOffset = 0;
    let isPackageDragging = false;
    let packageViewportHeight = 'auto';

    function nextPackageSlide() {
        packageSlideIndex = (packageSlideIndex + 1) % totalPackageSlides;
    }

    function prevPackageSlide() {
        packageSlideIndex = (packageSlideIndex - 1 + totalPackageSlides) % totalPackageSlides;
    }

    function handlePackageTouchStart(e: TouchEvent) {
        packageTouchStartX = e.changedTouches[0].screenX;
        isPackageDragging = true;
        packageDragOffset = 0;
    }

    function handlePackageTouchMove(e: TouchEvent) {
        if (!isPackageDragging) return;
        packageDragOffset = e.changedTouches[0].screenX - packageTouchStartX;
    }

    function handlePackageTouchEnd(e: TouchEvent) {
        isPackageDragging = false;
        packageTouchEndX = e.changedTouches[0].screenX;
        packageDragOffset = 0;
        const diff = packageTouchStartX - packageTouchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) nextPackageSlide();
            else prevPackageSlide();
        }
    }

    async function syncPackageViewportHeight() {
        await tick();
        if (typeof window === 'undefined' || window.innerWidth > 550) {
            packageViewportHeight = 'auto';
            return;
        }

        const card = document.querySelector(
            `.packages-carousel-track .package-card:nth-child(${packageSlideIndex + 1})`
        ) as HTMLElement | null;

        if (card) {
            packageViewportHeight = `${card.offsetHeight}px`;
        }
    }

    $: if (typeof packageSlideIndex === 'number') {
        void syncPackageViewportHeight();
    }

    onMount(() => {
        void syncPackageViewportHeight();

        const onResize = () => {
            void syncPackageViewportHeight();
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    });
</script>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    
    * {
        font-family: 'Poppins', sans-serif;
    }
    
    .prescription-page-container {
        padding: 15px;
        max-width: 1200px;
        margin: 0 auto;
        height: 100%;
        overflow-y: auto;
        box-sizing: border-box;
    }
    .prescription-page-container::-webkit-scrollbar { display: none; }
    .prescription-page-container { -ms-overflow-style: none; scrollbar-width: none; }
    .clinic-header-card {
        background: linear-gradient(90deg, #dfdfdf, #f4c542);
        border-radius: 10px;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 25px;
        gap: 25px;
    }
    .clinic-header-card .logo {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }
    .clinic-header-card .header-info { color: #005b80; flex-grow: 1; }
    .clinic-header-card .clinic-name {
        font-size: 1.4rem;
        font-weight: bold;
        margin: 0 0 2px 0;
        color: #003d50;
    }
    .clinic-header-card .clinic-details {
        margin: 1px 0;
        font-size: 0.9rem;
        color: #005b80;
        line-height: 1.3;
    }
    .lists-container {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
        align-items: stretch;
    }
    .scroll-list {
        max-height: 20rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 0.25rem;
    }
    .services-subtitle {
        margin: 0.25rem 0 1rem 0;
        color: #526277;
        font-size: 0.95rem;
        line-height: 1.5;
        font-weight: 500;
    }
    h2 {
        font-weight: 800;
    }
    @media (max-width: 700px) {
        .prescription-page-container { padding: 10px; }
        .clinic-header-card { flex-direction: column; text-align: center; padding: 15px; gap: 10px; }
        .clinic-header-card .logo { width: 60px; height: 60px; margin-right: 0; margin-bottom: 5px; }
        .clinic-name { font-size: 1.2rem; }
        .clinic-details { font-size: 0.85rem; }
        .lists-container {
            flex-direction: column;
            gap: 1rem;
        }
        .container {
            padding: 1rem !important;
            border-radius: 1rem !important;
        }
        h2 {
            font-size: 1.5rem !important;
        }
        input {
            font-size: 1rem !important;
            height: 2.5rem !important;
        }
        .list-item {
            font-size: 1rem !important;
            padding: 0.75rem !important;
        }
        .scroll-list {
            max-height: 14rem;
        }
        .services-subtitle {
            font-size: 0.9rem;
            margin-bottom: 0.85rem;
        }
    }
    .container {
        min-width: 0;
        flex: 1 1 0;
        box-sizing: border-box;
    }
    .search-wrap {
        position: relative;
        margin-bottom: 1rem;
    }
    .search-field {
        width: 100%;
        padding-left: 2.75rem;
        height: 2.75rem;
        line-height: 2.75rem;
        font-size: 1rem;
        border: 1px solid #cfd8dc;
        border-radius: 0.75rem;
        outline: none;
        box-sizing: border-box;
        transition: border 0.2s;
    }
    .search-field:focus {
        border: 1.5px solid #0a3761;
    }
    .search-icon {
        position: absolute;
        left: 0.9rem;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 1.125rem;
        width: 1.125rem;
    }
    .list-item {
        background: #0a3761;
        color: #fff;
        margin-bottom: 0.5rem;
        padding: 0.75rem;
        border-radius: 1rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.1rem;
        transition: background 0.2s, transform 0.15s ease, box-shadow 0.15s ease;
        touch-action: manipulation;
        gap: 0.75rem;
        position: relative;
        overflow: hidden;
    }
    .list-item:hover {
        background: #0b457e;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(10, 55, 97, 0.2);
    }
    .list-item:active {
        background: #08406e;
    }
    .list-item.clicked {
        animation: listItemPop 260ms cubic-bezier(0.22, 0.8, 0.3, 1);
    }

    .list-item::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at center, rgba(244, 197, 66, 0.22) 0%, rgba(244, 197, 66, 0) 62%);
        opacity: 0;
        transform: scale(0.85);
        transition: opacity 0.2s ease, transform 0.25s ease;
        pointer-events: none;
    }

    .list-item.clicked::after {
        opacity: 1;
        transform: scale(1.08);
    }

    @keyframes listItemPop {
        0% { transform: scale(1); }
        40% { transform: scale(0.965); }
        100% { transform: scale(1); }
    }
    .service-icon-img {
        width: 1.75rem;
        height: 1.75rem;
        object-fit: contain;
        flex: 0 0 auto;
    }
    .list-item-name {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 700;
    }
    .info-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 9999px;
        background: #0b457e;
        border: 2px solid #073055;
        font-size: 0.95rem;
        flex: 0 0 auto;
        transition: transform 0.15s ease, background-color 0.2s ease;
    }
    .list-item:hover .info-icon {
        transform: scale(1.05);
        background: #0c4f90;
    }

    /* Diagnostic Packages */
    .packages-section {
        margin-top: 2rem;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        border: 1px solid #dbe6f4;
        border-radius: 1.5rem;
        box-shadow: 0 10px 28px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .packages-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.1rem;
    }
    .packages-carousel-outer {
        position: relative;
    }
    .packages-carousel-track {
        display: contents;
    }
    .packages-dots-row {
        display: none;
    }
    .packages-scroll {
        max-height: none;
        overflow: visible;
        padding-right: 0;
    }
    .package-card {
        border: 1px solid #d6e0ee;
        border-radius: 1rem;
        padding: 1rem 1rem 1.15rem;
        height: 100%;
        background: #ffffff;
        box-shadow: 0 4px 14px rgba(10, 55, 97, 0.06);
        position: relative;
    }
    .package-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 5px;
        border-radius: 1rem 1rem 0 0;
        background: linear-gradient(90deg, #f4c542 0%, #ffd566 100%);
    }
    .package-title {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.65rem;
        color: #0a3761;
        font-weight: 800;
        font-size: 1.05rem;
        line-height: 1.25;
    }
    .package-title span:first-child {
        flex: 1;
        padding-top: 0.15rem;
    }
    .price-badge {
        background: #ffe6a5;
        color: #0a3761;
        font-weight: 900;
        border: 1px solid #f4c542;
        border-radius: 9999px;
        padding: 0.25rem 0.65rem;
        white-space: nowrap;
        font-size: 0.95rem;
        letter-spacing: 0.01em;
    }
    .package-list {
        margin: 0;
        padding-left: 1.25rem;
        color: #0a3761;
        line-height: 1.45;
        font-weight: 600;
    }
    .packages-notes {
        margin-top: 1.25rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        color: #0a3761;
        font-weight: 700;
    }
    .note {
        background: #fffdfa;
        border: 1px solid #f4c542;
        border-radius: 0.75rem;
        padding: 0.55rem 0.85rem;
        box-shadow: inset 0 0 0 1px rgba(244, 197, 66, 0.18);
    }

    @media (min-width: 901px) {
        .packages-notes {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, max-content));
            justify-content: center;
            align-items: start;
            gap: 0.75rem;
            margin-inline: auto;
        }

        .packages-notes .note:last-child {
            grid-column: 1 / -1;
            justify-self: center;
        }
    }

    .section-heading {
        text-align: center;
    }
    .packages-subtitle {
        text-align: center;
        color: #526277;
        font-size: 0.95rem;
        margin: 0.5rem 0 1.1rem;
        font-weight: 400;
    }

    /* Blood Pressure Prevention */
    .bp-prevention-section {
        margin-top: 2rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 1.5rem;
        box-shadow: 0 2px 8px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .bp-prevention-header {
        text-align: center;
        margin-bottom: 1.25rem;
    }
    .bp-prevention-title {
        color: #0a3761;
        font-size: clamp(1.4rem, 2.2vw, 2rem);
        margin: 0;
        font-weight: 800;
        letter-spacing: 0;
    }
    .bp-prevention-subtitle {
        margin: 0.5rem 0 0;
        color: #526277;
        font-size: 0.95rem;
    }
    .bp-prevention-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
    }
    .bp-tip-card {
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        background: #f4f7fb;
        padding: 1rem;
        text-align: center;
        cursor: default;
        will-change: transform, opacity;
        overflow: hidden;
        opacity: 1;
        transform: translateX(0);
        transition: transform 0.16s ease-out, box-shadow 0.16s ease-out;
    }
    .bp-tip-card:hover,
    .bp-tip-card:focus-within {
        transform: translateY(-3px);
        box-shadow: 0 7px 14px rgba(10,55,97,0.12);
    }
    @media (max-width: 550px) {
        .bp-tip-card:hover,
        .bp-tip-card:focus-within {
            transform: none;
            box-shadow: none;
        }
    }
    .bp-tip-icon {
        width: calc(100% + 2rem);
        height: 12rem;
        margin: -1rem -1rem 1.1rem;
        border-radius: 1rem 1rem 0 0;
        border: 0;
        display: block;
        overflow: hidden;
        background: #dbe7f5;
        box-shadow: none;
    }
    .bp-tip-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transform: translateZ(0);
        transition: transform 0.2s ease-out;
    }
    .bp-tip-card:hover .bp-tip-icon img,
    .bp-tip-card:focus-within .bp-tip-icon img {
        transform: scale(1.06);
    }
    .bp-tip-name {
        color: #0a3761;
        font-size: 1.65rem;
        font-weight: 800;
        margin: 0 0 0.45rem;
    }
    .bp-tip-desc {
        color: #0b457e;
        font-size: 0.95rem;
        line-height: 1.35;
        margin: 0;
    }
    .bp-tip-desc ul {
        text-align: left;
        margin: 0;
        padding-left: 1.15rem;
        list-style: disc;
    }
    .bp-tip-desc li + li {
        margin-top: 0.4rem;
    }
    .cholesterol-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    /* Carousel desktop base — invisible wrappers */
    .bp-carousel-outer {
        position: relative;
    }
    .carousel-track {
        display: contents;
    }
    .carousel-dots-row {
        display: none;
    }
    .bp-prevention-grid {
        touch-action: pan-y;
    }
    /* Schedule & Hours Section */
    .schedule-section {
        margin-top: 2rem;
        background: #ffffff;
        border: 1px solid #dbe6f4;
        border-radius: 1.5rem;
        box-shadow: 0 10px 28px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .schedule-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.25rem;
        margin-top: 1.25rem;
        position: relative;
        z-index: 1;
        touch-action: pan-y;
    }
    .schedule-carousel-track {
        display: contents;
    }
    .schedule-dots-row {
        display: none;
    }
    .schedule-card {
        border: 1px solid #d6e0ee;
        border-radius: 1rem;
        padding: 1rem 1rem 1.15rem;
        background: #ffffff;
        transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        box-shadow: 0 4px 14px rgba(10, 55, 97, 0.06);
        position: relative;
        overflow: hidden;
        min-height: 240px;
    }
    .schedule-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 22px rgba(10, 55, 97, 0.12);
        border-color: #b8cbe5;
    }
    .schedule-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 5px;
        border-radius: 1rem 1rem 0 0;
        background: linear-gradient(90deg, #f4c542 0%, #ffd566 100%);
    }
    .schedule-title {
        color: #0a3761;
        font-weight: 800;
        font-size: 1.1rem;
        margin-bottom: 0.9rem;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        line-height: 1.25;
    }
    .schedule-icon {
        width: 1.55rem;
        height: 1.55rem;
        color: #f4c542;
        flex-shrink: 0;
        margin-top: 0.1rem;
    }
    .schedule-title-text {
        flex: 1;
    }
    .schedule-content {
        color: #0b457e;
        line-height: 1.55;
        font-size: 0.98rem;
    }
    .schedule-hours {
        font-weight: 800;
        color: #003d50;
        margin-bottom: 0.7rem;
        font-size: 1.05rem;
    }
    .schedule-details {
        font-weight: 500;
        margin-bottom: 0.35rem;
    }
    .schedule-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border-radius: 9999px;
        padding: 0.45rem 0.8rem;
        background: #edf5ff;
        color: #0a3761;
        font-weight: 700;
        font-size: 0.86rem;
        margin-bottom: 0.85rem;
        border: 1px solid #d8e6f7;
    }
    .schedule-pill-dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 9999px;
        background: #f4c542;
        box-shadow: 0 0 0 4px rgba(244, 197, 66, 0.16);
    }
    .schedule-callout {
        margin-top: 0.95rem;
        padding: 0.75rem 0.85rem;
        border-radius: 0.95rem;
        background: #fffdfa;
        border: 1px solid rgba(244, 197, 66, 0.28);
        color: #0a3761;
        font-weight: 600;
        font-size: 0.92rem;
    }
    
    /* Contact/Message Section */
    .contact-section {
        margin-top: 2rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 1.5rem;
        box-shadow: 0 2px 8px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .contact-section h2 {
        font-family: 'Poppins', sans-serif;
    }
    .contact-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
    }
    .contact-card {
        border: 1px solid #e2e8f0;
        border-radius: 1.25rem;
        padding: 2rem 1.5rem;
        background: #ffffff;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
        min-height: 260px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .contact-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #f4c542, #d4a835);
        transform: scaleX(0);
        transition: transform 0.3s ease;
    }
    .contact-card:hover::before {
        transform: scaleX(1);
    }
    .contact-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(10, 55, 97, 0.12);
        border-color: #f4c542;
    }
    .contact-logo-container {
        width: 100px;
        height: 100px;
        margin: 0 auto 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        border-radius: 50%;
        padding: 15px;
        transition: all 0.3s ease;
    }
    .contact-card:hover .contact-logo-container {
        background: linear-gradient(135deg, #f4c542, #d4a835);
        transform: scale(1.05);
    }
    .contact-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .contact-phone-icon {
        width: 50px;
        height: 50px;
        color: #f4c542;
    }
    .contact-facebook-icon {
        width: 50px;
        height: 50px;
        color: #1877f2;
    }
    .contact-type {
        color: #0a3761;
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
        font-family: 'Poppins', sans-serif;
        letter-spacing: 0.02em;
    }
    .contact-number {
        color: #1e293b;
        font-weight: 600;
        font-size: 1.25rem;
        font-family: 'Poppins', sans-serif;
        letter-spacing: 0.01em;
    }
    .contact-link {
        color: #1e293b;
        font-weight: 600;
        font-size: 1rem;
        font-family: 'Poppins', sans-serif;
        letter-spacing: 0.01em;
        text-decoration: none;
        transition: color 0.2s ease;
    }
    .contact-link:hover {
        color: #1877f2;
    }
    
    @media (max-width: 900px) {
        .schedule-grid { grid-template-columns: 1fr; }
        .contact-grid { 
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.25rem;
        }
        .contact-card {
            padding: 1.75rem 1.25rem;
        }
        .contact-logo-container {
            width: 85px;
            height: 85px;
        }
        .bp-prevention-grid {
            grid-template-columns: 1fr 1fr;
        }
        .bp-tip-name {
            font-size: 1.4rem;
        }
        .bp-tip-icon {
            height: 10rem;
        }
    }
    @media (max-width: 900px) {
        .packages-grid { grid-template-columns: 1fr 1fr; }
        .package-title {
            font-size: 1rem;
        }
    }
    @media (max-width: 550px) {
        .packages-grid { grid-template-columns: 1fr; }
        .packages-section {
            padding: 1.25rem;
        }
        .packages-notes {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.7rem;
            margin-top: 1rem;
        }
        .note {
            width: 100%;
            box-sizing: border-box;
            padding: 0.8rem 0.95rem;
            line-height: 1.4;
        }
        .packages-scroll { max-height: none; }
        .package-title {
            font-size: 0.98rem;
        }
        .price-badge {
            font-size: 0.9rem;
        }
        .packages-carousel-grid {
            overflow: hidden;
            display: block;
            width: 100%;
            height: var(--pkg-active-height, auto);
            transition: height 0.22s ease;
            touch-action: pan-y;
        }
        .packages-carousel-track {
            display: flex;
            align-items: flex-start;
            width: calc(5 * 100%);
            transform: translateX(calc(-1 * var(--pkg-index, 0) * 100% / 5 + var(--pkg-drag-offset, 0px)));
            transition: transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: transform;
        }
        .packages-carousel-track.dragging {
            transition: none;
        }
        .packages-carousel-grid .package-card {
            flex: 0 0 calc(100% / 5);
            width: calc(100% / 5);
            box-sizing: border-box;
            height: auto;
            min-height: 0;
        }
        .packages-dots-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.42rem;
            margin-top: 0.9rem;
        }
        .packages-notes {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.7rem;
            margin-top: 1rem;
        }
        .packages-notes .note {
            width: 100%;
            box-sizing: border-box;
            text-align: left;
            border-radius: 0.85rem;
            padding: 0.62rem 0.8rem;
            line-height: 1.35;
        }
        .packages-carousel-dot {
            width: 0.45rem;
            height: 0.45rem;
            border-radius: 9999px;
            background: #cbd5e1;
            border: none;
            cursor: pointer;
            padding: 0;
            transition: background 0.22s ease, width 0.25s ease;
        }
        .packages-carousel-dot.active {
            background: #0a3761;
            width: 1.3rem;
        }
        .bp-prevention-section {
            padding: 1.25rem;
        }
        /* Strip carousel viewport */
        .bp-prevention-grid {
            overflow: hidden;
            display: block;
            min-height: unset;
            width: 100%;
            touch-action: pan-y;
        }
        /* The sliding strip — 6 cards wide */
        .carousel-track {
            display: flex;
            width: calc(6 * 100%);
            transform: translateX(calc(-1 * var(--bp-index, 0) * 100% / 6 + var(--drag-offset, 0px)));
            transition: transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: transform;
        }
        .carousel-track.dragging {
            transition: none;
        }
        /* Each card fills exactly one viewport width */
        .bp-tip-card {
            flex: 0 0 calc(100% / 6);
            width: calc(100% / 6);
            position: static;
            opacity: 1;
            transform: none;
            box-sizing: border-box;
            transition: none;
        }
        .bp-tip-card:hover,
        .bp-tip-card:focus-within {
            transform: none;
            box-shadow: none;
        }
        /* Dot indicators */
        .carousel-dots-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.42rem;
            margin-top: 0.9rem;
        }
        .carousel-dot {
            width: 0.45rem;
            height: 0.45rem;
            border-radius: 9999px;
            background: #cbd5e1;
            border: none;
            cursor: pointer;
            padding: 0;
            transition: background 0.22s ease, width 0.25s ease;
        }
        .carousel-dot.active {
            background: #0a3761;
            width: 1.3rem;
        }
        .bp-tip-name {
            font-size: 1.2rem;
        }
        .bp-tip-icon {
            height: 9.5rem;
        }
        .cholesterol-carousel-track {
            display: flex;
            width: calc(2 * 100%);
            transform: translateX(calc(-1 * var(--cholesterol-index, 0) * 100% / 2 + var(--cholesterol-drag-offset, 0px)));
            transition: transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: transform;
        }
        .cholesterol-carousel-track.dragging {
            transition: none;
        }
        .cholesterol-carousel-grid .bp-tip-card {
            flex: 0 0 calc(100% / 2);
            width: calc(100% / 2);
        }
        .cholesterol-grid {
            grid-template-columns: 1fr;
        }

        .schedule-grid {
            overflow: hidden;
            display: block;
            width: 100%;
            margin-top: 1rem;
        }
        .schedule-carousel-track {
            display: flex;
            width: calc(3 * 100%);
            transform: translateX(calc(-1 * var(--schedule-index, 0) * 100% / 3 + var(--schedule-drag-offset, 0px)));
            transition: transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: transform;
        }
        .schedule-carousel-track.dragging {
            transition: none;
        }
        .schedule-card {
            flex: 0 0 calc(100% / 3);
            width: calc(100% / 3);
            box-sizing: border-box;
            min-height: 0;
        }
        .schedule-dots-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.42rem;
            margin-top: 0.9rem;
        }
        .schedule-carousel-dot {
            width: 0.45rem;
            height: 0.45rem;
            border-radius: 9999px;
            background: #cbd5e1;
            border: none;
            cursor: pointer;
            padding: 0;
            transition: background 0.22s ease, width 0.25s ease;
        }
        .schedule-carousel-dot.active {
            background: #0a3761;
            width: 1.3rem;
        }
    }

    @media (max-width: 640px) {
        .contact-grid {
            grid-template-columns: 1fr;
        }
        .schedule-section {
            padding: 1.25rem;
            border-radius: 1.25rem;
        }
        .schedule-card {
            min-height: unset;
            padding: 1.15rem;
        }
        .schedule-title {
            font-size: 1rem;
        }
        .schedule-hours {
            font-size: 1rem;
        }
    }

    /* Modal Styles */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(5, 18, 34, 0.52);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-container {
        background: white;
        border-radius: 16px;
        box-shadow: 0 24px 40px rgba(3, 18, 38, 0.24), 0 10px 18px rgba(3, 18, 38, 0.16);
        border: 1px solid rgba(219, 234, 254, 0.85);
        max-width: 550px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        transform: translateY(0);
        transform-origin: center;
    }

    .modal-header {
        background: linear-gradient(135deg, #0a3761, #0b457e);
        color: white;
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .close-button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .modal-content {
        padding: 2rem;
    }

    .service-content-wrapper {
        display: flex;
        gap: 1.75rem;
        align-items: flex-start;
    }

    .service-icon-container {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 9.5rem;
        height: 9.5rem;
        background: linear-gradient(135deg, #0a3761, #0b457e);
        border-radius: 1.5rem;
        padding: 0.75rem;
        flex-shrink: 0;
        min-width: 9.5rem;
    }

    .service-large-icon {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .service-info-container {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
    }

    .service-name {
        color: #0a3761;
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0.25rem 0 0.75rem 0;
        line-height: 1.2;
    }

    .service-description {
        color: #505050;
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0;
    }

    .medicine-name {
        color: #0a3761;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        line-height: 1.3;
    }

    .medicine-info {
        color: #4a5568;
        font-size: 1.1rem;
        line-height: 1.6;
        margin: 0;
        background: #f7fafc;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #0a3761;
    }

    /* Mobile responsive styles */
    @media (max-width: 700px) {
        .modal-container {
            width: 95%;
            margin: 1rem;
        }

        .modal-header {
            padding: 1rem;
        }

        .modal-title {
            font-size: 1.1rem;
        }

        .modal-content {
            padding: 1.5rem;
        }

        .medicine-name {
            font-size: 1.3rem;
        }

        .medicine-info {
            font-size: 1rem;
        }

        .service-content-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            text-align: center;
        }

        .service-icon-container {
            width: 7rem;
            height: 7rem;
            min-width: 7rem;
        }

        .service-info-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .service-name {
            font-size: 1.2rem;
            margin: 0.5rem 0 0.5rem 0;
        }

        .service-description {
            font-size: 0.9rem;
            line-height: 1.5;
            text-align: left;
        }
    }
</style>

<div class="prescription-page-container">
    <div class="clinic-header-card">
        <img src="/images/digital member portal.png" alt="Clinic Logo" class="logo"/>
        <div class="header-info">
            <h1 class="clinic-name">The Permanente Health Plan Corp.</h1>
            <p class="clinic-details">Multi-Specialty Health Plan</p>
            <p class="clinic-details">Lot 19, Blk. 7, Mayumi St. Sta. Rita, Olongapo City</p>
            <p class="clinic-details">customerservice@permanentehealthplan.org</p>
            <p class="clinic-details">0968 856 1807</p>
        </div>
    </div>
<div class="lists-container">
    <div class="container medicines-list" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1.5rem; box-shadow: 0 2px 8px rgba(10,55,97,0.08); padding: 2rem;">
        <h2 style="color: #0a3761; font-size: 2rem;">Covered Medicines</h2>
        <div class="search-wrap">
            <input
                type="text"
                placeholder="Search medicines or info (e.g., pain reliever)"
                class="search-field"
                bind:value={$medicineSearch}
            />
            <span class="search-icon">
                <svg width="18" height="18" fill="none" stroke="#0a3761" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </span>
        </div>
        <div class="scroll-list">
            {#each $filteredMedicines as med}
                <div
                    class="list-item"
                    class:clicked={activeListItemKey === `medicine-${med.name}`}
                    role="button"
                    tabindex="0"
                    aria-label={`Show information for ${med.name}`}
                    on:click={() => showMedicineInfo(med)}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showMedicineInfo(med); } }}
                >
                    <span class="list-item-name">{med.name}</span>
                    <span class="info-icon">i</span>
                </div>
            {/each}
        </div>
    </div>
    <div class="container services-list" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1.5rem; box-shadow: 0 2px 8px rgba(10,55,97,0.08); padding: 2rem;">
        <h2 style="color: #0a3761; font-size: 2rem; margin-bottom: 0.25rem;">Our Services</h2>
        <p class="services-subtitle">Comprehensive care services designed to support prevention, diagnosis, and everyday wellness.</p>
        <div class="scroll-list">
            {#each ourServices as svc}
                <div
                    class="list-item"
                    class:clicked={activeListItemKey === `service-${svc.name}`}
                    role="button"
                    tabindex="0"
                    aria-label={`Show information for ${svc.name}`}
                    on:click={() => showServiceInfo(svc)}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showServiceInfo(svc); } }}
                >
                    <img src={svc.icon} alt={svc.name} class="service-icon-img" />
                    <span class="list-item-name">{svc.name}</span>
                    <span class="info-icon">i</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<div class="packages-section">
    <h2 class="section-heading" style="color: #0a3761; font-size: 2rem; margin-bottom: 0.5rem;">Diagnostic Laboratory (Packages)</h2>
    <p class="packages-subtitle">We offer affordable and reliable diagnostic packages designed for your needs</p>

    <div class="packages-carousel-outer">
        <div class="packages-grid packages-scroll packages-carousel-grid"
             style="--pkg-active-height: {packageViewportHeight}"
             role="region"
             aria-label="Diagnostic laboratory packages carousel"
             on:touchstart={handlePackageTouchStart}
             on:touchmove={handlePackageTouchMove}
             on:touchend={handlePackageTouchEnd}>
            <div
                class="packages-carousel-track"
                class:dragging={isPackageDragging}
                style="--pkg-index: {packageSlideIndex}; --pkg-drag-offset: {packageDragOffset}px"
            >
                <div class="package-card">
                    <div class="package-title">
                        <span>Package A</span>
                        <span class="price-badge">₱1,060</span>
                    </div>
                    <ul class="package-list">
                        <li>Lipid Profile</li>
                        <li>Creatinine</li>
                        <li>FBS</li>
                        <li>SGPT</li>
                        <li>SGOT</li>
                    </ul>
                </div>
                <div class="package-card">
                    <div class="package-title">
                        <span>Package B</span>
                        <span class="price-badge">₱1,900</span>
                    </div>
                    <ul class="package-list">
                        <li>FBS</li>
                        <li>Lipid Profile</li>
                        <li>Creatinine</li>
                        <li>BUN</li>
                        <li>BUA</li>
                        <li>SGPT</li>
                        <li>SGOT</li>
                        <li>Urinalysis</li>
                        <li>Fecalysis</li>
                        <li>CBC w/ Platelet Count</li>
                    </ul>
                </div>
                <div class="package-card">
                    <div class="package-title">
                        <span>Package C (For Child only)</span>
                        <span class="price-badge">₱614</span>
                    </div>
                    <ul class="package-list">
                        <li>Urinalysis</li>
                        <li>Fecalysis</li>
                        <li>CBC w/ Platelet Count</li>
                    </ul>
                </div>
                <div class="package-card">
                    <div class="package-title">
                        <span>Liver Function Test Package</span>
                        <span class="price-badge">₱764</span>
                    </div>
                    <ul class="package-list">
                        <li>BUN</li>
                        <li>BUA</li>
                        <li>Creatinine</li>
                        <li>SGOT</li>
                        <li>SGPT</li>
                    </ul>
                </div>
                <div class="package-card">
                    <div class="package-title">
                        <span>Kidney Function Test Package</span>
                        <span class="price-badge">₱1,032</span>
                    </div>
                    <ul class="package-list">
                        <li>BUN</li>
                        <li>BUA</li>
                        <li>Creatinine</li>
                        <li>Electrolytes</li>
                    </ul>
                </div>
            </div>
        </div>

    </div>

    <div class="packages-dots-row">
        {#each [0,1,2,3,4] as i}
            <button class="packages-carousel-dot" class:active={packageSlideIndex === i} on:click={() => packageSlideIndex = i} aria-label="Package {i + 1}"></button>
        {/each}
    </div>

    <div class="packages-notes">
        <div class="note">Fasting Hours: FBS and Lipid — 10 to 12 hours</div>
        <div class="note">Open: Monday to Saturday</div>
        <div class="note">All packages come with a FREE DOCTOR CONSULTATION.</div>
    </div>
</div>

<div class="bp-prevention-section">
    <div class="bp-prevention-header">
        <h2 class="bp-prevention-title">How Can You Prevent High Blood Pressure?</h2>
        <p class="bp-prevention-subtitle">You can help prevent high blood pressure by maintaining a healthy lifestyle.</p>
    </div>
    <div class="bp-carousel-outer">
        <div class="bp-prevention-grid"
             role="region" aria-label="Blood pressure prevention tips carousel"
             on:touchstart={handleTouchStart}
             on:touchmove={handleTouchMove}
             on:touchend={handleTouchEnd}>
            <div class="carousel-track"
                 class:dragging={isDragging}
                 style="--bp-index: {bpTipIndex}; --drag-offset: {dragOffset}px">
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/exercise.jpg" alt="Exercise" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Exercise</h3>
                    <p class="bp-tip-desc">Enjoy regular physical activity to improve heart health and blood circulation.</p>
                </article>
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/healthy%20diet.jpg" alt="Healthy diet" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Eat a Healthy Diet</h3>
                    <p class="bp-tip-desc">Choose balanced meals that are rich in fruits and vegetables and low in salt.</p>
                </article>
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/weight.jpg" alt="Maintain healthy weight" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Maintain Healthy Weight</h3>
                    <p class="bp-tip-desc">Keeping a healthy weight lowers strain on your heart and blood vessels.</p>
                </article>
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/limit%20alcohol.jpg" alt="Limit alcohol" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Limit Alcohol</h3>
                    <p class="bp-tip-desc">Drinking too much alcohol can raise your blood pressure over time.</p>
                </article>
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/quit%20smoking.jpg" alt="Quit smoking" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Quit Smoking</h3>
                    <p class="bp-tip-desc">Stopping smoking helps protect your blood vessels and overall cardiovascular health.</p>
                </article>
                <article class="bp-tip-card">
                    <div class="bp-tip-icon"><img src="/images/healthy%20habits/manage%20stress.jpeg" alt="Manage stress" loading="lazy" decoding="async" width="640" height="360" /></div>
                    <h3 class="bp-tip-name">Manage Stress</h3>
                    <p class="bp-tip-desc">Practice healthy coping habits like rest, breathing, and movement.</p>
                </article>
            </div>
        </div>
    </div>
    <div class="carousel-dots-row">
        {#each [0,1,2,3,4,5] as i}
            <button class="carousel-dot" class:active={bpTipIndex === i} on:click={() => bpTipIndex = i} aria-label="Tip {i + 1}"></button>
        {/each}
    </div>
</div>

<div class="bp-prevention-section">
    <div class="bp-prevention-header">
        <h2 class="bp-prevention-title">What to Do if Cholesterol is High?</h2>
        <p class="bp-prevention-subtitle">Simple lifestyle changes can help lower your cholesterol.</p>
    </div>
    <div class="bp-carousel-outer">
        <div class="bp-prevention-grid cholesterol-grid cholesterol-carousel-grid"
             role="region" aria-label="High cholesterol tips carousel"
             on:touchstart={handleCholesterolTouchStart}
             on:touchmove={handleCholesterolTouchMove}
             on:touchend={handleCholesterolTouchEnd}>
            <div class="carousel-track cholesterol-carousel-track"
                 class:dragging={isCholesterolDragging}
                 style="--cholesterol-index: {cholesterolTipIndex}; --cholesterol-drag-offset: {cholesterolDragOffset}px">
                {#each cholesterolTips as tip}
                    <article class="bp-tip-card">
                        <div class="bp-tip-icon"><img src={tip.image} alt={tip.alt} loading="lazy" decoding="async" width="640" height="360" /></div>
                        <h3 class="bp-tip-name">{tip.title}</h3>
                        {#if tip.points}
                            <div class="bp-tip-desc">
                                <ul>
                                    {#each tip.points as point}
                                        <li>{point}</li>
                                    {/each}
                                </ul>
                            </div>
                        {:else if tip.description}
                            <p class="bp-tip-desc">{tip.description}</p>
                        {/if}
                    </article>
                {/each}
            </div>
        </div>
    </div>
    <div class="carousel-dots-row">
        {#each cholesterolTips as tip, i}
            <button class="carousel-dot" class:active={cholesterolTipIndex === i} on:click={() => cholesterolTipIndex = i} aria-label="Cholesterol tip: {tip.title}"></button>
        {/each}
    </div>
</div>

<div class="schedule-section">
    <h2 class="section-heading" style="color: #0a3761; font-size: 2rem; margin-bottom: 0.5rem;">Schedule & Hours</h2>
    <div class="schedule-carousel-outer">
        <div class="schedule-grid"
             role="region"
             aria-label="Schedule and hours carousel"
             on:touchstart={handleScheduleTouchStart}
             on:touchmove={handleScheduleTouchMove}
             on:touchend={handleScheduleTouchEnd}>
            <div
                class="schedule-carousel-track"
                class:dragging={isScheduleDragging}
                style="--schedule-index: {scheduleSlideIndex}; --schedule-drag-offset: {scheduleDragOffset}px"
            >
                <div class="schedule-card">
                    <div class="schedule-title">
                        <svg class="schedule-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        <span class="schedule-title-text">Pharmacy & Clinic Hours</span>
                    </div>
                    <div class="schedule-content">
                        <div class="schedule-pill"><span class="schedule-pill-dot"></span>Open window</div>
                        <div class="schedule-hours">Monday to Saturday</div>
                        <div class="schedule-details">8:00 AM - 9:00 PM</div>
                        <div class="schedule-callout">Pharmacy support and clinic services are available throughout the day.</div>
                    </div>
                </div>

                <div class="schedule-card">
                    <div class="schedule-title">
                        <svg class="schedule-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 4 2V7l-5-5z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        <span class="schedule-title-text">Laboratory Hours</span>
                    </div>
                    <div class="schedule-content">
                        <div class="schedule-pill"><span class="schedule-pill-dot"></span>Diagnostics</div>
                        <div class="schedule-hours">Monday to Saturday</div>
                        <div class="schedule-details">8:00 AM - 5:00 PM</div>
                        <div class="schedule-callout">For laboratory testing and routine diagnostic services.</div>
                    </div>
                </div>

                <div class="schedule-card">
                    <div class="schedule-title">
                        <svg class="schedule-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11.5h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        <span class="schedule-title-text">Consultation Schedule</span>
                    </div>
                    <div class="schedule-content">
                        <div class="schedule-pill"><span class="schedule-pill-dot"></span>Internal Medicine</div>
                        <div class="schedule-hours">Monday to Friday</div>
                        <div class="schedule-details">8:00 AM - 5:00 PM</div>
                        <div class="schedule-callout">Face-to-face and online coordination available during clinic hours.</div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <div class="schedule-dots-row">
        {#each [0,1,2] as i}
            <button class="schedule-carousel-dot" class:active={scheduleSlideIndex === i} on:click={() => scheduleSlideIndex = i} aria-label="Schedule card {i + 1}"></button>
        {/each}
    </div>
</div>

<div class="contact-section">
    <h2 class="section-heading" style="color: #0a3761; font-size: 2rem; margin-bottom: 0.5rem;">Contact/Message Us</h2>
    <div class="contact-grid">
        <div class="contact-card">
            <div class="contact-logo-container">
                <img src="/images/Globe logo.png" alt="Globe" class="contact-logo" />
            </div>
            <div class="contact-type">Globe</div>
            <div class="contact-number">0917-132-1756</div>
        </div>
        <div class="contact-card">
            <div class="contact-logo-container">
                <img src="/images/Smart telecom logo.png" alt="Smart" class="contact-logo" />
            </div>
            <div class="contact-type">Smart</div>
            <div class="contact-number">0968-856-1807</div>
        </div>
        <div class="contact-card">
            <div class="contact-logo-container">
                <svg class="contact-phone-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
            </div>
            <div class="contact-type">Landline</div>
            <div class="contact-number">(047) 222-4441</div>
        </div>
        <div class="contact-card">
            <div class="contact-logo-container">
                <svg class="contact-facebook-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.49v-9.294H9.692V11.08h3.124V8.41c0-3.1 1.893-4.787 4.659-4.787 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.312h3.59l-.467 3.626h-3.123V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                </svg>
            </div>
            <div class="contact-type">Facebook</div>
            <a class="contact-link" href="https://www.facebook.com/permanentehealthplan" target="_blank" rel="noopener noreferrer">Message us on Facebook</a>
        </div>
    </div>
</div>

<!-- Information Modal -->
{#if showModal}
    <div class="modal-backdrop" role="button" tabindex="0" aria-label="Close modal" on:click={handleBackdropClick} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeModal(); } }} transition:fade={{ duration: 170 }}>
        <div class="modal-container" class:show={showModal} in:scale={{ duration: 260, start: 0.92, easing: cubicOut }} out:scale={{ duration: 150, start: 1 }}>
            <div class="modal-header">
                <h3 class="modal-title">{modalType === 'medicine' ? 'Medicine Information' : 'Service Information'}</h3>
                <button class="close-button" on:click={closeModal} aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-content">
                {#if modalType === 'medicine' && selectedMedicine}
                    <h4 class="medicine-name">{selectedMedicine.name}</h4>
                    <p class="medicine-info">{selectedMedicine.info}</p>
                    {#if selectedMedicine.dosage}
                        <p class="medicine-info" style="margin-top: 0.75rem;">
                            <strong>Dosage:</strong> {selectedMedicine.dosage}
                        </p>
                    {/if}
                {:else if modalType === 'service' && selectedService}
                    <div class="service-content-wrapper">
                        <div class="service-icon-container">
                            <img src={selectedService.icon} alt={selectedService.name} class="service-large-icon" />
                        </div>
                        <div class="service-info-container">
                            <h4 class="service-name">{selectedService.name}</h4>
                            <p class="service-description">{selectedService.description}</p>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
</div>