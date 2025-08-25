<script lang="ts">
    import { writable, derived } from 'svelte/store';
    import type { PageData } from './$types';

    let coveredMedicines = [
        { name: "Acetaminophen (Paracetamol)", info: "Pain reliever and fever reducer." },
        { name: "Acetylcysteine (Fluimucil)", info: "Mucolytic agent." },
        { name: "Acyclovir", info: "Antiviral medication." },
        { name: "Allopurinol", info: "Reduces uric acid." },
        { name: "Budenoside", info: "Steroid for inflammation." },
        { name: "Carbamazepine", info: "Anticonvulsant." }
        // ...add more as needed...
    ];
    let availableServices = [
        { name: "Complete Blood Count (CBC)", info: " " },
        { name: "Urinalysis", info: " " },
        { name: "Chest X-Ray", info: " ." },
        { name: "Physical Examination", info: " " },
        { name: "Drug Screening", info: " " },
        { name: "Fecalysis", info: " " }
        // ...add more as needed...
    ];

    // Use writable stores for search
    const medicineSearch = writable('');
    const serviceSearch = writable('');

    // Use derived stores for filtered lists
    const filteredMedicines = derived(
        [medicineSearch],
        ([$medicineSearch]) =>
            coveredMedicines.filter((m: { name: string; info: string }) =>
                m.name.toLowerCase().includes($medicineSearch.toLowerCase())
            )
    );
    const filteredServices = derived(
        [serviceSearch],
        ([$serviceSearch]) =>
            availableServices.filter((s: { name: string; info: string }) =>
                s.name.toLowerCase().includes($serviceSearch.toLowerCase())
            )
    );

    function showMedicineInfo(med: { name: string; info: string }) {
        alert(`${med.name}\n\n${med.info}`);
    }
</script>

<style>
    .lists-container {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
        align-items: stretch;
    }
    h2 {
        font-weight: 800;
    }
    @media (max-width: 700px) {
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
        transition: background 0.2s;
        touch-action: manipulation;
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
    }
</style>

<div class="lists-container">
    <div class="container medicines-list" style="background: #f5f8fa; border-radius: 1.5rem; box-shadow: 0 2px 8px rgba(10,55,97,0.08); padding: 2rem;">
        <h2 style="color: #0a3761; font-size: 2rem;">Covered Medicines</h2>
        <div class="search-wrap">
            <input
                type="text"
                placeholder="Search medicines"
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
        <div style="overflow-x: auto;">
            {#each $filteredMedicines as med}
                <div
                    class="list-item"
                    on:click={() => showMedicineInfo(med)}
                >
                    <span class="list-item-name">{med.name}</span>
                    <span class="info-icon">i</span>
                </div>
            {/each}
        </div>
    </div>
    <div class="container services-list" style="background: #f5f8fa; border-radius: 1.5rem; box-shadow: 0 2px 8px rgba(10,55,97,0.08); padding: 2rem;">
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
        <div style="overflow-x: auto;">
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