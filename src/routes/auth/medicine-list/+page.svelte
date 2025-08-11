<script lang="ts">
    import { onMount } from "svelte";
    import { getFirestore, collection, getDocs } from "firebase/firestore";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";

    type Medicine = {
        name: string;
        quantity: number;
        description: string;
        imageUrl?: string;
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const firestore = getFirestore(app);

    let medicines: Medicine[] = [];

    onMount(async () => {
        const medicinesCollection = collection(firestore, "medicines");
        const medicineSnapshot = await getDocs(medicinesCollection);
        medicines = medicineSnapshot.docs.map(doc => doc.data() as Medicine);
    });
</script>

<style>
    .header-section {
        background: linear-gradient(90deg, #ffffff, #ffff, #eaee00, #eaee00, #08B8F3, #08B8F3, #005b80);
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        padding: 16px;
        height: 168px;
        display: flex;
        align-items: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.301);
    }

    .logo {
        width: 10rem;
        height: 10rem;
        border-radius: 50%;
        margin-right: 16px;
        object-fit: cover;
    }

    .header-info {
        color: #000000;
    }

    .patient-name {
        font-size: 1.3rem;
        font-weight: bold;
        margin: 0;
    }

    .patient-details {
        margin: 2px 0;
        font-size: 1rem;
        color: #000000;
        line-height: 1.2;
    }

    /* Responsive Styles */
    @media (max-width: 768px) {
        .header-section {
            flex-direction: column;
            align-items: flex-start;
            padding: 12px;
        }

        .logo {
            width: 8rem;
            height: 8rem;
            margin-bottom: 12px;
        }

        .patient-name {
            font-size: 1.25rem;
        }

        .patient-details {
            font-size: 0.875rem;
        }
    }
    .container {
        padding: 1rem;
        margin: 0 auto;
        max-width: 1200px;
        height: 100%;
        overflow-y: auto;
        transition: background-color 0.3s, box-shadow 0.3s;
    }

    .grid {
        display: grid;
        gap: 20px;
        margin-bottom: 20px;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .card {
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        overflow: hidden;
    }

    .card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 6px;
        background: linear-gradient(90deg, #08B8F3, #005b80);
    }

    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
    }

   

   

    .image-preview {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: 8px;
        background-color: #f0f0f0;
    }

    .medicine-name {
        font-size: 1.25rem;
        font-weight: bold;
        margin-top: 10px;
    }

    .medicine-description {
        color: #666;
        margin-top: 10px;
        flex-grow: 1;
        text-align: justify;
    }

   
    /* Responsive Styles */
    @media (max-width: 768px) {
        .grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
    }
    .section-title {
    font-size: 1.5rem; /* Larger font size for the main title */
    font-weight: bold; /* Bold text */
    color: #000000; /* Use a color that matches your theme */
    margin-bottom: -0.5rem; /* Space below the title */
    text-align: center; /* Center the title */
}

.section-subtitle {
    font-size: 1.1rem; /* Slightly smaller than the title */
    font-weight: 600; /* Semi-bold text */
    color: #666; /* Lighter color for the subtitle */
    margin-bottom: 1rem; /* Space below the subtitle */
    text-align: center; /* Center the subtitle */
}
</style>

<div style="max-height: 100vh; overflow-y: auto;">
    <header style="
    padding-top: 1rem;

  padding-left: 1rem;
  
">
<div class="header-section" style="background-color: #08B8F3; border-top-left-radius: 8px; border-top-right-radius: 8px; padding: 16px; height: 168px; display: flex; align-items: center; width: 1000px; margin-top: 10px;">
            <div class="flex items-center">
                <img 
                    src="/images/logo(landing).png" 
                    alt="Sun with dental logo" 
                    class="logo" 
                />
                <div class="header-info">
                    <h1 class="patient-name">AFDomingo</h1>
                    <p class="patient-details">DENTAL CLINIC</p>
                    <p class="patient-details">#46 12th Street, Corner Gordon Ave New Kalalake</p>
                    <p class="patient-details">afdomingodentalclinic@gmail.com</p>
                    <p class="patient-details">0932 984 9554</p>
                </div>
            </div>
        </div>
    </header>

    <div class="container">
        <h1 class="section-title">Over-the-counter medicines</h1>
        <h3 class="section-subtitle">Dentist-approved medicines for toothaches and pain</h3>
    
        <div class="grid">
            {#each medicines as medicine}
                <div class="card medicine-card">
                    {#if medicine.imageUrl}
                        <img src={medicine.imageUrl} alt={medicine.name} class="image-preview" />
                    {:else}
                        <div class="image-preview"></div>
                    {/if}
                    <div class="medicine-name">{medicine.name}</div>
                    <div class="medicine-description">{medicine.description}</div>
                </div>
            {/each}
        </div>
    </div>
</div>