<script lang="ts">
    import { writable, derived } from 'svelte/store';
    import type { PageData } from '../information/$types';

    import { coveredMedicines as coveredMedicinesData, fetchCoveredMedicines } from '$lib/data/coveredMedicines';
    let coveredMedicines = coveredMedicinesData;

    // Load from CSV at runtime (fallback to embedded list on failure)
    fetchCoveredMedicines().then((list) => { coveredMedicines = list; });
    let availableServices = [
        { name: "Complete Blood Count (CBC)" },
        { name: "Urinalysis" },
        { name: "Chest X-Ray" },
        { name: "Physical Examination" },
        { name: "Drug Screening" },
        { name: "Serum hCG" },
        { name: "Consultations" },
        { name: "Ultrasound" },
        { name: "Laboratory" },
        { name: "Fecalysis" }
    ];

    // Use writable stores for search
    const medicineSearch = writable('');
    const serviceSearch = writable('');

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
        ([$medicineSearch]) => {
            const normalizedQuery = normalize($medicineSearch);
            if (!normalizedQuery) return coveredMedicines;

            const queryTokens = normalizedQuery.split(' ').filter(Boolean);

            return coveredMedicines.filter((m: { name: string; info: string; dosage?: string }) => {
                const haystack = normalize(`${m.name} ${m.info} ${m.dosage ?? ''}`);
                // Match full phrase OR all tokens
                return haystack.includes(normalizedQuery) || queryTokens.every((tok) => haystack.includes(tok));
            });
        }
    );
    const filteredServices = derived(
        [serviceSearch],
        ([$serviceSearch]) =>
            availableServices.filter((s: { name: string }) =>
                s.name.toLowerCase().includes($serviceSearch.toLowerCase())
            )
    );

    // Modal state
    let showModal = false;
    let selectedMedicine: { name: string; info: string; dosage?: string } | null = null;

    function showMedicineInfo(med: { name: string; info: string; dosage?: string }) {
        selectedMedicine = med;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedMedicine = null;
    }

    // Close modal when clicking outside
    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    }
</script>

<style>
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
    }
    .list-item:hover {
        background: #0b457e;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(10, 55, 97, 0.2);
    }
    .list-item:active {
        background: #08406e;
    }
    .list-item-name {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 700;
    }
    .list-item.static {
        cursor: default;
    }
    .list-item.static:active {
        background: #0a3761;
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
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 1.5rem;
        box-shadow: 0 2px 8px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .packages-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
    }
    .packages-scroll {
        max-height: 24rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 0.25rem;
    }
    .package-card {
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 1rem;
        height: 100%;
        background: #f9fbfd;
    }
    .package-title {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        color: #0a3761;
        font-weight: 800;
        font-size: 1.15rem;
    }
    .price-badge {
        background: #f4c542;
        color: #0a3761;
        font-weight: 900;
        border-radius: 0.5rem;
        padding: 0.25rem 0.5rem;
        white-space: nowrap;
    }
    .package-list {
        margin: 0;
        padding-left: 1.25rem;
        color: #0a3761;
        line-height: 1.5;
    }
    .packages-notes {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        color: #0a3761;
        font-weight: 700;
    }
    .note {
        background: #fff7e0;
        border: 1px solid #f4c542;
        border-radius: 0.75rem;
        padding: 0.5rem 0.75rem;
    }

    /* Schedule & Hours Section */
    .schedule-section {
        margin-top: 2rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 1.5rem;
        box-shadow: 0 2px 8px rgba(10,55,97,0.08);
        padding: 2rem;
    }
    .schedule-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }
    .schedule-card {
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 1.5rem;
        background: #f9fbfd;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .schedule-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(10, 55, 97, 0.1);
    }
    .schedule-title {
        color: #0a3761;
        font-weight: 800;
        font-size: 1.25rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .schedule-icon {
        width: 1.5rem;
        height: 1.5rem;
        color: #f4c542;
    }
    .schedule-content {
        color: #005b80;
        line-height: 1.6;
        font-size: 1rem;
    }
    .schedule-hours {
        font-weight: 700;
        color: #003d50;
        margin-bottom: 0.5rem;
    }
    .schedule-details {
        font-weight: 500;
        margin-bottom: 0.25rem;
    }
    @media (max-width: 900px) {
        .schedule-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 900px) {
        .packages-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 550px) {
        .packages-grid { grid-template-columns: 1fr; }
        .packages-scroll { max-height: none; }
    }
    /* Modal Styles */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    .modal-container {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        transform: translateY(0);
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

    /* Animations */
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
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
        <h2 style="color: #0a3761; font-size: 2rem;">Available Services</h2>
        <div class="search-wrap">
            <input
                type="text"
                placeholder="Search services"
                class="search-field"
                bind:value={$serviceSearch}
            />
            <span class="search-icon">
                <svg width="18" height="18" fill="none" stroke="#0a3761" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </span>
        </div>
        <div class="scroll-list">
            {#each $filteredServices as svc}
                <div
                    class="list-item static"
                >
                    <span class="list-item-name">{svc.name}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<div class="packages-section">
    <h2 style="color: #0a3761; font-size: 2rem; margin-bottom: 0.5rem;">Diagnostic Laboratory (Packages)</h2>
    <div class="packages-grid packages-scroll">
        <div class="package-card">
            <div class="package-title">
                <span>Package A</span>
                <span class="price-badge">₱332</span>
            </div>
            <ul class="package-list">
                <li>FBS</li>
                <li>Cholesterol</li>
                <li>Creatinine</li>
                <li>SGPT</li>
            </ul>
        </div>
        <div class="package-card">
            <div class="package-title">
                <span>Package B</span>
                <span class="price-badge">₱900</span>
            </div>
            <ul class="package-list">
                <li>FBS</li>
                <li>Lipid Profile</li>
                <li>Creatinine</li>
                <li>Cholesterol</li>
                <li>SGPT</li>
                <li>SGOT</li>
                <li>Urinalysis</li>
            </ul>
        </div>
        <div class="package-card">
            <div class="package-title">
                <span>Package C</span>
                <span class="price-badge">₱1,300</span>
            </div>
            <ul class="package-list">
                <li>FBS</li>
                <li>Lipid Profile</li>
                <li>Creatinine</li>
                <li>BUN</li>
                <li>SGPT/ALS</li>
                <li>SGOT/AST</li>
                <li>Urinalysis</li>
                <li>Fecalysis</li>
                <li>CBC with Platelet Count</li>
            </ul>
        </div>
        <div class="package-card">
            <div class="package-title">
                <span>Package D (Child Health)</span>
                <span class="price-badge">₱380</span>
            </div>
            <ul class="package-list">
                <li>Urinalysis</li>
                <li>Fecalysis</li>
                <li>CBC with Platelet Count</li>
            </ul>
        </div>
    </div>
    <div class="packages-notes">
        <div class="note">Fasting Hours: FBS and Lipid — 10 to 12 hours</div>
        <div class="note">Open: Monday to Sunday</div>
        <div class="note">Free Consultation</div>
    </div>
</div>

<div class="schedule-section">
    <h2 style="color: #0a3761; font-size: 2rem; margin-bottom: 0.5rem;">Schedule & Hours</h2>
    <div class="schedule-grid">
        <div class="schedule-card">
            <div class="schedule-title">
                <svg class="schedule-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                Clinic Hours
            </div>
            <div class="schedule-content">
                <div class="schedule-hours">Open Daily</div>
                <div class="schedule-details">Monday to Sunday</div>
                <div class="schedule-details">8:00 AM - 2:00 AM</div>
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
                Laboratory Hours
            </div>
            <div class="schedule-content">
                <div class="schedule-hours">Laboratory Services</div>
                <div class="schedule-details">8:00 AM - 5:00 PM</div>
                <div class="schedule-details">For diagnostic tests</div>
            </div>
        </div>
        
        <div class="schedule-card">
            <div class="schedule-title">
                <svg class="schedule-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11.5h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Consultation Schedule
            </div>
            <div class="schedule-content">
                <div class="schedule-hours">Internal Medicine</div>
                <div class="schedule-details">Face-to-face: Mon-Fri</div>
                <div class="schedule-details">8:00 AM - 5:00 PM</div>
                <div class="schedule-details">Viber Consultation:</div>
                <div class="schedule-details">Daily (Morning-Night)</div>
            </div>
        </div>
    </div>
</div>

<!-- Medicine Information Modal -->
{#if showModal}
    <div class="modal-backdrop" role="button" tabindex="0" aria-label="Close modal" on:click={handleBackdropClick} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeModal(); } }}>
        <div class="modal-container" class:show={showModal}>
            <div class="modal-header">
                <h3 class="modal-title">Medicine Information</h3>
                <button class="close-button" on:click={closeModal} aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-content">
                {#if selectedMedicine}
                    <h4 class="medicine-name">{selectedMedicine.name}</h4>
                    <p class="medicine-info">{selectedMedicine.info}</p>
                    {#if selectedMedicine.dosage}
                        <p class="medicine-info" style="margin-top: 0.75rem;">
                            <strong>Dosage:</strong> {selectedMedicine.dosage}
                        </p>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
{/if}
</div>