<script lang="ts">
	import { onMount } from 'svelte';
	import { firebaseConfig } from "$lib/firebaseConfig";
	import { initializeApp, getApps, getApp } from 'firebase/app'; // Import getApps/getApp for check
	import { getFirestore, doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'; // Import Timestamp
	import { getAuth, onAuthStateChanged } from 'firebase/auth';
	// import { goto } from '$app/navigation'; // Usually not needed here if layout handles auth redirects
	import jsPDF from 'jspdf';
	import { browser } from '$app/environment'; // Import browser check
	import Swal from 'sweetalert2';

	// --- Firebase Initialization (safe check) ---
	const app = browser && !getApps().length ? initializeApp(firebaseConfig) : (browser ? getApp() : null);
	const db = app ? getFirestore(app) : null;
	const auth = app ? getAuth(app) : null;

	// --- State Variables ---
	let patientId: string = '';
	let patientName: string = ''; // Combined name for PDF
	let patientLastName: string = ''; // Keep separate if needed elsewhere, otherwise combine early
	// Removed address, age, email, gender, phone, birthday as they are not displayed directly on this page, only used in PDF
	let prescriptions: any[] = []; // Consider creating a specific type/interface
	let loading: boolean = true;
	let error: string = '';

	// --- Helper Function: Format Firestore Timestamp or Date String ---
	function formatDate(dateInput: any): string {
        try {
            let date: Date;
            if (dateInput instanceof Timestamp) {
                date = dateInput.toDate();
            } else if (typeof dateInput === 'string' || typeof dateInput === 'number' || dateInput instanceof Date) {
                date = new Date(dateInput);
            } else {
                // console.warn("Invalid date type received:", typeof dateInput, dateInput);
                return 'Invalid Date'; // Handle unexpected types
            }

            if (isNaN(date.getTime())) {
                 // console.warn("Parsed date is invalid:", dateInput);
                return 'Invalid Date'; // Handle cases where parsing fails
            }

            // Format the date as MM/DD/YYYY
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;

        } catch (e) {
            console.error("Error formatting date:", e, "Input:", dateInput);
            return 'Date Error';
        }
	}


	// --- Fetch Patient Data and Prescriptions ---
	async function fetchPrescriptionData() {
		if (!browser || !auth || !db) {
            error = "Application not ready.";
            loading = false;
            return;
        }

		loading = true;
		error = ''; // Reset error on new fetch

		try {
			const user = auth.currentUser;
			if (user) {
				patientId = user.uid;

				// 1. Fetch patient profile (needed for PDF name)
				const patientDocRef = doc(db, "patientProfiles", patientId);
				const patientDoc = await getDoc(patientDocRef);

				if (patientDoc.exists()) {
					const patient = patientDoc.data();
					// Store names needed for PDF generation
					patientName = patient.name || 'N/A';
					patientLastName = patient.lastName || '';
				} else {
					// Allow fetching prescriptions even if profile is minimal/missing
					console.warn("Patient profile not found, proceeding with prescription fetch.");
					patientName = 'Patient'; // Default name for PDF
					patientLastName = '';
					// Optional: Set a non-blocking warning instead of 'error'
					// error = "Patient profile details missing.";
				}

				// 2. Fetch completed appointments for the patient
				const appointmentsRef = collection(db, "appointments");
				const qAppointments = query(
					appointmentsRef,
					where("patientId", "==", patientId),
					where("status", "==", "Completed")
				);
				const appointmentsSnapshot = await getDocs(qAppointments);

                // Extract IDs and dates, handling potential missing dates
				const completedAppointments = appointmentsSnapshot.docs.map(doc => ({
					id: doc.id,
					date: doc.data().date // Keep the original date object/timestamp
				}));

				// console.log("Fetched completed appointments: ", completedAppointments); // Debug log

                const appointmentIds = completedAppointments.map(app => app.id);

				// 3. Fetch prescriptions based on completed appointment IDs
				if (appointmentIds.length > 0) {
					const prescriptionsRef = collection(db, "prescriptions");
					const qPrescriptions = query(
						prescriptionsRef,
						where("appointmentId", "in", appointmentIds)
					);
					const prescriptionsSnapshot = await getDocs(qPrescriptions);

                    // Map prescriptions and associate the appointment date
					prescriptions = prescriptionsSnapshot.docs.map(docSnap => {
						const data = docSnap.data();
						const appointmentId = data.appointmentId;
						// Find the corresponding completed appointment
						const relatedAppointment = completedAppointments.find(app => app.id === appointmentId);
						return {
							id: docSnap.id, // Prescription document ID
							appointmentId: appointmentId,
							// Use the date from the fetched appointment, format later
							appointmentDate: relatedAppointment ? relatedAppointment.date : null,
							medicines: data.medicines || [], // Ensure medicines is an array
							prescriber: data.prescriber || 'N/A'
						};
					}).sort((a, b) => {
                        // Sort by date descending (newest first)
                        const dateA = a.appointmentDate ? (a.appointmentDate instanceof Timestamp ? a.appointmentDate.toMillis() : new Date(a.appointmentDate).getTime()) : 0;
                        const dateB = b.appointmentDate ? (b.appointmentDate instanceof Timestamp ? b.appointmentDate.toMillis() : new Date(b.appointmentDate).getTime()) : 0;
                        return dateB - dateA;
                    });

					// console.log("Loaded and sorted prescriptions: ", prescriptions); // Debug log

				} else {
					console.log("No completed appointments found for this patient.");
					prescriptions = []; // Ensure prescriptions is empty
				}

			} else {
				error = "No authenticated user found. Please log in."; // More specific error
				// Layout should ideally handle redirect, but we set error state here
			}
		} catch (err: any) {
			console.error("Error loading prescription data: ", err);
			error = `An error occurred: ${err.message || 'Failed to fetch data.'}`;
            prescriptions = []; // Clear any partial data on error
		} finally {
			loading = false;
		}
	}

	// --- PDF Generation Function ---
	function generatePDF(prescription: any, index: number) {
        if (!patientName) {
            Swal.fire('Error', 'Patient name is missing. Cannot generate PDF.', 'error');
            return;
        }

		const doc = new jsPDF({ orientation: "landscape" }); // landscape orientation

        // --- Reusable Header ---
        const addHeader = () => {
            doc.addImage('/images/af dominic.jpg', 'JPG', 20, 8, 30, 30); // Adjust path if needed
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(67, 56, 202); // Blue color
            doc.text("AFDomingo", 55, 15);
            doc.setTextColor(0, 0, 0); // Reset to black
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("DENTAL CLINIC", 55, 20);
            doc.text("#46 12th Street, Corner Gordon Ave, New Kalalake", 55, 25);
            doc.text("afdomingodentalclinic@gmail.com", 55, 30);
            doc.text("0932 984 9554", 55, 35);
            doc.line(20, 40, 277, 40); // Horizontal line below header (adjust x2 for landscape)
        };

        // --- Reusable Footer ---
        const addFooter = (pageNumber: number, totalPages: number) => {
            doc.line(20, 190, 277, 190); // Horizontal line above footer (adjust x2 for landscape)
            doc.setFontSize(10);
            doc.text("Promoting Healthy Teeth & Smiles", 148.5, 197, { align: "center" }); // Centered text
            doc.setFontSize(8);
            doc.text(`Page ${pageNumber} of ${totalPages}`, 277, 205, { align: 'right'}); // Page number
        };

		addHeader();

		doc.setFontSize(12);
		doc.setFont("helvetica", "bold");
		doc.text("Prescription", 20, 48);

		// Patient Details
		const pdfPatientFirstName = patientName.toUpperCase();
		const pdfPatientLastName = patientLastName.toUpperCase();
		const formattedDate = formatDate(prescription.appointmentDate);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(11);
		doc.text(`Date: ${formattedDate}`, 20, 55);
		doc.text(`Patient Name: ${pdfPatientFirstName} ${pdfPatientLastName}`, 20, 62);

		// Prescription Details Table Header
		doc.setFont("helvetica", "bold");
        doc.text("Medicine", 20, 75);
        doc.text("Qty/Dosage", 100, 75);
        doc.text("Instructions", 160, 75);
		doc.line(20, 77, 277, 77); // Line below header

		let yPosition = 85; // Starting Y for first medicine
        const pageHeight = doc.internal.pageSize.height;
        const bottomMargin = 25; // Space needed for footer + prescriber
        let currentPage = 1;
        const totalPages = 1; // Calculate if needed, but start with 1

		doc.setFont("helvetica", "normal");
        doc.setFontSize(10); // Slightly smaller font for table content

		prescription.medicines.forEach((medicine: any) => {
			const medicineName = medicine.medicine || 'N/A';
			const dosage = medicine.dosage || 'N/A';
			const instructions = medicine.instructions || 'N/A';

            // Estimate height needed for this entry (simple estimate)
            const nameLines = doc.splitTextToSize(medicineName, 75); // Width of medicine column
            const dosageLines = doc.splitTextToSize(dosage, 55); // Width of dosage column
            const instructionLines = doc.splitTextToSize(instructions, 110); // Width of instructions column
            const maxLines = Math.max(nameLines.length, dosageLines.length, instructionLines.length);
            const textHeight = maxLines * (doc.getLineHeight() / doc.internal.scaleFactor) + 4; // Add padding

			// Check if content exceeds page height
			if (yPosition + textHeight > pageHeight - bottomMargin) {
				// Add Footer to current page
                addFooter(currentPage, totalPages); // Need to calculate totalPages if multi-page is possible

				// Add New Page
				doc.addPage();
                currentPage++;
                // Add Header to new page
                addHeader();
				// Reset Y position for new page
				yPosition = 55; // Reset Y position (adjust as needed for header space)
                 // Redraw table header on new page
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.text("Medicine", 20, yPosition);
                doc.text("Qty/Dosage", 100, yPosition);
                doc.text("Instructions", 160, yPosition);
                doc.line(20, yPosition + 2, 277, yPosition + 2);
                yPosition += 10;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
			}

            // Draw text using multi-line support if needed
            doc.text(nameLines, 20, yPosition);
            doc.text(dosageLines, 100, yPosition);
            doc.text(instructionLines, 160, yPosition);

			yPosition += textHeight; // Move Y down for the next item
		});

        // --- Prescriber Signature and Info (Position near bottom right) ---
        let finalY = Math.max(yPosition + 10, pageHeight - 55); // Ensure enough space from bottom or last item

        // Check if signature needs to go to next page
        if (finalY + 30 > pageHeight - 15) { // 30 for signature height + text + buffer
             addFooter(currentPage, totalPages);
             doc.addPage();
             currentPage++;
             addHeader();
             finalY = 55; // Reset Y near top
        }

		const signaturePath = '/images/signature.jpg'; // Ensure this path is correct in 'static' folder
		const signatureWidth = 40;
		const signatureHeight = 16;
		const signatureX = doc.internal.pageSize.width - 20 - signatureWidth; // Position from right edge
		const signatureY = finalY; // Position above the text

		try {
            doc.addImage(signaturePath, 'JPG', signatureX, signatureY, signatureWidth, signatureHeight);
        } catch (imgError) {
            console.error("Error adding signature image:", imgError);
            doc.text("[Signature Image Error]", signatureX, signatureY + signatureHeight / 2);
        }

        const prescriberText = `Prescriber: ${prescription.prescriber || 'N/A'}`;
        doc.setFontSize(10);
        doc.text(prescriberText, signatureX, signatureY + signatureHeight + 5); // Text below signature

        // Add footer to the last page
		addFooter(currentPage, totalPages); // Update totalPages if calculated

		// --- Save the PDF ---
		const filename = `${patientName}_${patientLastName}_Prescription_${formattedDate.replace(/\//g, '-')}.pdf`;
		doc.save(filename);
	}

	// --- Lifecycle Hook ---
	onMount(() => {
		if (!browser) return; // Ensure runs only in browser

		if (!auth) {
			console.error("Firebase Auth not initialized on mount.");
			error = "Initialization error. Please refresh.";
			loading = false;
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				fetchPrescriptionData(); // Fetch data when user is confirmed
			} else {
				error = "You are not logged in. Please log in to view prescriptions.";
				loading = false;
				prescriptions = []; // Clear data if user logs out
				// Note: Layout component might handle redirection already
			}
		});

		// Cleanup listener on component destroy
		return () => unsubscribe();
	});

</script>

<!-- HTML Content -->
<div class="prescription-page-container">

	<!-- Clinic Header Card -->
	<div class="clinic-header-card">
		<img src="/images/logo(landing) copy.png" alt="Clinic Logo" class="logo"/>
		<div class="header-info">
			<h1 class="clinic-name">AFDomingo</h1>
			<p class="clinic-details">DENTAL CLINIC</p>
			<p class="clinic-details">#46 12th Street, Corner Gordon Ave New Kalalake</p>
			<p class="clinic-details">afdomingodentalclinic@gmail.com</p>
			<p class="clinic-details">0932 984 9554</p>
		</div>
	</div>

	<!-- Prescriptions Section -->
	<section class="prescriptions-section">
		<h2 class="section-title">Your Prescriptions</h2>

		{#if loading}
			<p class="status-message loading">Loading prescriptions...</p>
		{:else if error}
			<p class="status-message error">{error}</p>
		{:else if prescriptions.length > 0}
			<div class="prescription-list">
				{#each prescriptions as prescription, index}
					<div class="prescription-card">
						<div class="card-header">
							<h3 class="prescription-title">Prescription #{prescriptions.length - index}</h3>
							<p class="prescription-date">
								Date: {formatDate(prescription.appointmentDate) || 'N/A'}
							</p>
						</div>

						<div class="card-body">
							<h4 class="medication-heading">Medications:</h4>
							{#if prescription.medicines && prescription.medicines.length > 0}
								{#each prescription.medicines as medicine, medIndex}
									<div class="medicine-info">
										<p><strong>{medIndex + 1}. {medicine.medicine || 'N/A'}</strong></p>
										<p class="detail">Qty/Dosage: {medicine.dosage || 'N/A'}</p>
										<p class="detail">Instructions: {medicine.instructions || 'N/A'}</p>
									</div>
								{/each}
							{:else}
								<p>No medication details available for this prescription.</p>
							{/if}
						</div>

						<div class="card-footer">
							<p class="prescriber-info">Prescriber: {prescription.prescriber || 'N/A'}</p>
							<button
								class="download-button"
								on:click={() => generatePDF(prescription, index)}
								title="Download Prescription as PDF"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
                                </svg>
								<span>Download PDF</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="status-message">No prescriptions found.</p>
		{/if}
	</section>

</div>

<!-- Scoped Styles -->
<style>
	.prescription-page-container {
		padding: 15px; /* Add padding around the whole page content */
        max-width: 1200px; /* Optional: constrain max width */
        margin: 0 auto; /* Center content if max-width is set */
        height: 100%; /* Allow container to fill height provided by layout */
        overflow-y: auto; /* Allow scrolling only for this container if needed */
        box-sizing: border-box;
	}
     /* Hide scrollbar */
    .prescription-page-container::-webkit-scrollbar {
        display: none;
    }
    .prescription-page-container {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

	/* Clinic Header Styling */
	.clinic-header-card {
		background: linear-gradient(90deg, #eef2ff, #a2b6ff); 
		border-radius: 10px;
		padding: 15px 20px;
		display: flex;
		align-items: center;
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 25px; /* Space below header */
		gap: 20px; /* Space between logo and text */
	}

	.clinic-header-card .logo {
		width: 70px; /* Adjusted size */
		height: 70px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0; /* Prevent logo from shrinking */
        border: 2px solid white;
	}

	.clinic-header-card .header-info {
		color: #005b80; /* Darker blue text */
        flex-grow: 1;
	}

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

	/* Prescriptions Section */
	.prescriptions-section {
		margin-top: 20px;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #005b80; /* Match theme color */
		margin-bottom: 15px;
		border-bottom: 2px solid #00a2e8; /* Theme color accent */
		padding-bottom: 5px;
	}

	/* Status Messages (Loading, Error, No Data) */
	.status-message {
		text-align: center;
		padding: 20px;
		border-radius: 5px;
		margin-top: 15px;
		font-size: 1.1rem;
	}
	.status-message.loading {
		color: #005b80;
		background-color: #e0f7fa;
	}
	.status-message.error {
		color: #d32f2f; /* Red color for errors */
		background-color: #ffebee;
		font-weight: bold;
	}

    /* Prescription List and Cards */
	.prescription-list {
		display: grid;
		gap: 20px;
        /* Responsive grid columns */
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	}

	.prescription-card {
		background-color: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
        transition: box-shadow 0.3s ease;
	}
    .prescription-card:hover {
         box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
    }

    .card-header {
        background-color: #f8f9fa; /* Light header background */
        padding: 10px 15px;
        border-bottom: 1px solid #e0e0e0;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .prescription-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #005b80;
        margin: 0;
    }

    .prescription-date {
        font-size: 0.85rem;
        color: #555;
        margin: 0;
    }

	.card-body {
        padding: 15px;
        flex-grow: 1; /* Allow body to take available space */
	}

	.medication-heading {
		font-size: 1rem;
		font-weight: bold;
		color: #333;
		margin-bottom: 10px;
	}

	.medicine-info {
		background: #f8f9fa; /* Subtle background for each medicine */
		padding: 10px;
		border-left: 3px solid #00a2e8; /* Theme color accent */
		margin-bottom: 10px;
		border-radius: 4px;
	}
    .medicine-info:last-child {
         margin-bottom: 0;
    }

	.medicine-info p {
		margin: 2px 0;
		font-size: 0.9rem;
		color: #444;
		line-height: 1.4;
	}
    .medicine-info p.detail {
         padding-left: 10px; /* Indent details */
         font-size: 0.85rem;
         color: #555;
    }
	.medicine-info p strong {
		color: #003d50; /* Darker theme color for medicine name */
	}

    .card-footer {
        padding: 10px 15px;
        border-top: 1px solid #e0e0e0;
        background-color: #f8f9fa;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

	.prescriber-info {
		font-size: 0.85rem;
		color: #555;
        margin: 0;
	}

	/* Download Button */
	.download-button {
		background-color: #007bb5; /* Button color */
		color: white;
		padding: 6px 12px;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		display: inline-flex; /* Align icon and text */
        align-items: center;
        gap: 5px; /* Space between icon and text */
		transition: background-color 0.2s ease;
	}

	.download-button:hover {
		background-color: #005b80; /* Darker hover */
	}
    .download-button svg {
        vertical-align: middle;
    }

	/* Responsive Adjustments */
	@media (max-width: 768px) {
        .prescription-page-container {
            padding: 10px;
        }
		.clinic-header-card {
            flex-direction: column; /* Stack logo and info */
            text-align: center;
            padding: 15px;
            gap: 10px;
		}
        .clinic-header-card .logo {
            width: 60px;
            height: 60px;
            margin-right: 0;
            margin-bottom: 5px; /* Space below logo */
        }
        .clinic-name {
             font-size: 1.2rem;
        }
        .clinic-details {
            font-size: 0.85rem;
        }

		.prescription-list {
            grid-template-columns: 1fr; /* Stack cards on smaller screens */
            gap: 15px;
        }
        .section-title {
             font-size: 1.3rem;
        }
        .card-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }
	}

</style>