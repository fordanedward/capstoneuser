<script lang="ts">
    import { onMount } from "svelte";
    import { getFirestore, setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import type { User } from "firebase/auth";
    import Swal from 'sweetalert2';

    // Firebase setup
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    // State for form inputs and data display
    let formPatientName = "";
    let formLastName = "";
    let formAge = "";
    let formGender = "";
    let formEmail = "";
    let formPhone = "";
    let formHomeAddress = "";
    let formBirthday="";
    let isPrescriptionDropdownOpen = true;
    let prescriptions: any[] = [];

    // Add new state for profile image
    let profileImage: string = '';
    let isUploading = false;

    type PatientProfile = {
        name: string;
        lastName: string;
        id: string;
        age: string;
        gender: string;
        email: string;
        phone: string;
        address: string;
        birthday: string;
        profileImage?: string; // Add profile image to type
    };

    let patientProfile: PatientProfile = {
        name: '',
        lastName: '',
        id: '',
        age: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        birthday: '',
        profileImage: ''
    };

    let currentUser: User | null = null;
    let isEditingProfile = false; 
    let doneAppointments: any[] = [];
    let isDropdownOpen = true;
    let showDetails = false;
    let isMobile = false;

onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser  = user;
            console.log("User  is logged in: ", currentUser );

            try {
                // Fetch user profile from Firestore
                const patientRef = doc(db, "patientProfiles", currentUser .uid);
                const patientDoc = await getDoc(patientRef);

                if (patientDoc.exists()) {
                    patientProfile = patientDoc.data() as PatientProfile;
                    // Get the customUserId from the users collection
                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        patientProfile.id = userData.customUserId || "N/A";
                    }
                    console.log("Loaded patient profile from Firestore: ", patientProfile);
                } else {
                    console.log("No profile found for this user. Using default values.");
                    // Get the customUserId from the users collection
                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    const customUserId = userDoc.exists() ? userDoc.data().customUserId : "N/A";
                    
                    patientProfile = {
                        name: '',
                        lastName: '',
                        id: customUserId,
                        age: '',
                        gender: '',
                        email: '',
                        phone: '',
                        address: '',
                        birthday: '',
                        profileImage: ''
                    };
                }

                const appointmentsRef = collection(db, "appointments");
                const qAppointments = query(
                    appointmentsRef,
                    where("patientId", "==", currentUser.uid),
                    where("status", "==", "Completed")
                );
                const querySnapshot = await getDocs(qAppointments);
                doneAppointments = querySnapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id 
                }));
                console.log("Loaded done appointments: ", doneAppointments); 
                const appointmentIds = doneAppointments
                    .filter(appointment => appointment.id)
                    .map(appointment => appointment.id);

                if (appointmentIds.length > 0) {
                    const prescriptionsRef = collection(db, "prescriptions");
                    const qPrescriptions = query(
                        prescriptionsRef,
                        where("appointmentId", "in", appointmentIds)
                    );
                    const prescriptionsSnapshot = await getDocs(qPrescriptions);
                    prescriptions = prescriptionsSnapshot.docs.map(doc => doc.data());
                    console.log("Loaded prescriptions: ", prescriptions);
                } else {
                    console.log("No valid appointment IDs found.");
                }

            } catch (error) {
                console.error("Error loading data: ", error);
            }
        } else {
            currentUser = null;
            patientProfile = {
                name: '',
                lastName: '',
                id: '',
                age: '',
                gender: '',
                email: '',
                phone: '',
                address: '',
                birthday: '',
                profileImage: ''
            };
            doneAppointments = [];
            prescriptions = [];
            console.log("User is not logged in.");
        }
    });

    const checkMobile = () => {
        isMobile = window.innerWidth <= 640;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
        unsubscribe();
        window.removeEventListener('resize', checkMobile);
    };
});
function calculateAge(birthday: string) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function updateAge(event: Event) {
        const target = event.target as HTMLInputElement;
        formBirthday = target.value;
        formAge = calculateAge(formBirthday).toString(); 
    }
async function savePatientProfile() {
    // Debug logs for form values
    console.log("Form values before save:", {
        formPatientName,
        formLastName,
        formAge,
        formGender,
        formEmail,
        formPhone,
        formHomeAddress,
        formBirthday
    });

    // Clean the phone number
    const cleanedPhone = formPhone.replace(/\D/g, '');
    
    // Debug logs
    console.log("Original phone:", formPhone);
    console.log("Cleaned phone:", cleanedPhone);
    console.log("Phone length:", cleanedPhone.length);

    if (!currentUser) {
        console.log("No current user found");
        Swal.fire({
            icon: 'error',
            title: 'Not Logged In',
            text: 'Please log in to save the profile.'
        });
        return;
    }

    // Check required fields
    const requiredFields = {
        'First Name': formPatientName,
        'Last Name': formLastName,
        'Age': formAge,
        'Email': formEmail,
        'Phone': formPhone,
        'Birthday': formBirthday,
        'Gender': formGender
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

    if (missingFields.length > 0) {
        console.log("Missing required fields:", missingFields);
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Form',
            text: `Please fill out all required fields: ${missingFields.join(', ')}`
        });
        return;
    }

    if (cleanedPhone.length !== 11) {
        console.log("Invalid phone number length:", cleanedPhone.length);
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Phone Number',
            text: 'Phone number must be exactly 11 digits.'
        });
        return;
    }

    try {
        console.log("Attempting to save profile...");
        const patientRef = doc(db, "patientProfiles", currentUser.uid);
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        let customUserId = "N/A";
        if (userDoc.exists() && userDoc.data().customUserId) {
            customUserId = userDoc.data().customUserId;
        }

        const profileData = {
            name: formPatientName,
            lastName: formLastName,
            age: formAge,
            birthday: formBirthday, 
            gender: formGender,
            email: formEmail,
            phone: cleanedPhone,
            address: formHomeAddress,
            id: customUserId,
            profileImage: profileImage
        };

        console.log("Saving profile data:", profileData);
        await setDoc(patientRef, profileData);

        Swal.fire({
            icon: 'success',
            title: 'Profile Saved',
            text: 'Profile updated successfully.'
        });

        patientProfile = profileData;
        isEditingProfile = false;
        console.log("Profile saved successfully");
    } catch (error) {
        console.error("Error saving patient profile: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error saving patient profile. Please try again.'
        });
    }
}

function toggleEditProfile() {
    isEditingProfile = !isEditingProfile; 

    if (isEditingProfile) {
        
        formPatientName = patientProfile.name;
        formLastName = patientProfile.lastName;
        formAge = patientProfile.age;
        formBirthday = patientProfile.birthday; 
        formGender = patientProfile.gender;
        formEmail = patientProfile.email;
        formPhone = patientProfile.phone;
        formHomeAddress = patientProfile.address;
    } else {
        formPatientName = "";
        formLastName = "";
        formAge = "";
        formBirthday = ""; 
        formGender = "";
        formEmail = "";
        formPhone = "";
        formHomeAddress = "";
    }
}

    function togglePrescriptionDropdown() {
        isPrescriptionDropdownOpen = !isPrescriptionDropdownOpen;
    }


    function toggleDropdown(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
        isDropdownOpen = !isDropdownOpen; 
    }

    async function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            Swal.fire('Error', 'Image size should be less than 5MB', 'error');
            return;
        }

        isUploading = true;
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = () => {
                    // Set max dimensions
                    const maxDim = 300;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round(height * (maxDim / width));
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round(width * (maxDim / height));
                            height = maxDim;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Compress to JPEG, quality 0.7
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        profileImage = compressedBase64;
                    }
                    isUploading = false;
                };
                img.onerror = () => {
                    Swal.fire('Error', 'Invalid image file', 'error');
                    isUploading = false;
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            Swal.fire('Error', 'Failed to upload image', 'error');
            isUploading = false;
        }
    }
</script>
<div class="main-container">
    <div class="patient-card">
        <div class="profile-image-container">
            {#if patientProfile.profileImage}
                <img src={patientProfile.profileImage} alt="Profile Picture" class="profile-image" />
            {:else}
                <div class="profile-image-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            {/if}
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button class="edit-pen-btn" on:click={toggleEditProfile} title="Edit Profile">
                <i class="fas fa-pen"></i>
            </button>
        </div>
        <div class="patient-info">
            <h1>{`${patientProfile.name} ${patientProfile.lastName}` || "<Patient Name>"}</h1>
            {#if isMobile}
                <button class="toggle-details-btn" on:click={() => showDetails = !showDetails}>
                    {showDetails ? 'Hide Details' : 'Show Details'}
                    <i class={showDetails ? 'fas fa-chevron-up' : 'fas fa-chevron-down'}></i>
                </button>
                {#if showDetails}
                    <div class="info-grid details-section show">
                        <p><strong>Patient ID:</strong> {patientProfile.id || "N/A"}</p>
                        <p><strong>Age:</strong> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                        <p><strong>Gender:</strong> {patientProfile.gender || "N/A"}</p>
                        <p><strong>Phone:</strong> {patientProfile.phone || "N/A"}</p>
                        <p><strong>Email:</strong> {patientProfile.email || "N/A"}</p>
                        <p class="address"><strong>Address:</strong> {patientProfile.address || "N/A"}</p>
                    </div>
                {/if}
            {:else}
                <div class="info-grid">
                    <p><strong>Patient ID:</strong> {patientProfile.id || "N/A"}</p>
                    <p><strong>Age:</strong> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                    <p><strong>Gender:</strong> {patientProfile.gender || "N/A"}</p>
                    <p><strong>Phone:</strong> {patientProfile.phone || "N/A"}</p>
                    <p><strong>Email:</strong> {patientProfile.email || "N/A"}</p>
                    <p class="address"><strong>Address:</strong> {patientProfile.address || "N/A"}</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- ========== History Section ========== -->
    <div class="history-section">
        <h2 class="section-title">
            Appointment & Prescription History
        </h2>
        {#if doneAppointments.length === 0}
            <p class="no-data-message">No past visits recorded.</p>
        {:else}
        <div class="card-container">
            {#each doneAppointments as appointment (appointment.id)}
                <div class="history-card">
                    <div class="card-header">
                         Appointment Details
                    </div>
                    <div class="card-content">
                         <p><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</p>
                         <p><strong>Service:</strong> {appointment.service} <span class="status">({appointment.status})</span></p>

                         {#if appointment.remarks}
                            <p class="remarks"><strong>Remarks:</strong> {appointment.remarks}</p>
                         {:else}
                            <p class="no-info"><em>No remarks for this visit.</em></p>
                         {/if}

                         <hr class="divider" />

                         <p class="sub-header"><strong>Prescription:</strong></p>
                         {#if prescriptions && prescriptions.filter(p => p.appointmentId === appointment.id).length > 0}
                            {#each prescriptions.filter(p => p.appointmentId === appointment.id) as prescription}
                                <div class="prescription-details">
                                     {#each prescription.medicines as med (med.medicine)}
                                        <div class="medicine-item">
                                            <p><strong>Med:</strong> {med.medicine}</p>
                                            <p><strong>Instructions:</strong> {med.instructions}</p>
                                            <p><strong>Qty/Refills:</strong> {med.dosage}</p>
                                        </div>
                                     {/each}
                                    <p class="prescriber"><strong>Prescriber:</strong> {prescription.prescriber || "N/A"}</p>
                                </div>
                            {/each}
                         {:else}
                            <p class="no-info"><em>No prescription issued for this visit.</em></p>
                         {/if}
                    </div>
                </div>
            {/each}
        </div>
        {/if}
    </div>
</div>

{#if isEditingProfile}
    <div class="profile-form-container slide-down">
        <h3 class="form-title">Edit Patient Information</h3>
        <form class="profile-form" on:submit|preventDefault={savePatientProfile}>
            <div class="form-image-upload">
                <div class="profile-image-container">
                    {#if profileImage || patientProfile.profileImage}
                        <img src={profileImage || patientProfile.profileImage} alt="Profile Picture" class="profile-image" />
                    {:else}
                        <div class="profile-image-placeholder">
                            <i class="fas fa-user"></i>
                        </div>
                    {/if}
                    <label for="profile-image-upload" class="upload-button" title="Upload Image">
                        <i class="fas fa-camera"></i>
                    </label>
                    <input 
                        type="file" 
                        id="profile-image-upload" 
                        accept="image/*" 
                        on:change={handleImageUpload}
                        style="display: none;"
                    />
                </div>
            </div>
            <div class="input-grid">
                <div class="form-group">
                    <label for="first-name">First Name</label>
                    <input id="first-name" type="text" bind:value={formPatientName} required />
                </div>
                <div class="form-group">
                    <label for="last-name">Last Name</label>
                    <input id="last-name" type="text" bind:value={formLastName} required />
                </div>
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input 
                        id="phone" 
                        type="tel" 
                        placeholder="e.g., 09123456789" 
                        bind:value={formPhone}
                        on:input={(e) => {
                            const input = e.currentTarget as HTMLInputElement;
                            formPhone = input.value.replace(/\D/g, '');
                            if (formPhone.length > 11) {
                                formPhone = formPhone.slice(0, 11);
                            }
                        }}
                        maxlength="11"
                    />
                    {#if formPhone && formPhone.length !== 11}
                        <span class="error-message">Phone number must be exactly 11 digits</span>
                    {/if}
                </div>
                <div class="form-group">
                    <label for="email">E-Mail Address</label>
                    <input id="email" type="email" bind:value={formEmail} />
                </div>
                <div class="form-group full-width"> 
                    <label for="home-address">Home Address</label>
                    <input id="home-address" type="text" bind:value={formHomeAddress} />
                </div>
                <div class="form-group">
                    <label for="birthday">Birth Date</label>
                    <input id="birthday" type="date" bind:value={formBirthday} on:input={updateAge} />
                </div>
                <div class="form-group">
                    <label for="age">Age</label>
                    <input id="age" type="number" bind:value={formAge} disabled />
                </div>
                <div class="form-group">
                    <label for="gender">Gender</label>
                    <select id="gender" bind:value={formGender}>
                        <option value="" disabled>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                </div>
            </div>
            <div class="save-button-container">
                <button type="submit" class="save-button">Save Changes</button>
                <button type="button" on:click={toggleEditProfile} class="cancel-button">Cancel</button>
            </div>
        </form>
    </div>
{/if}

<style>
    :root {
        --primary-color: #6681e2;
        --secondary-color: #172f85;
        --accent-color: #eaee00;
        --light-gray: #f8f9fa;
        --medium-gray: #e9ecef;
        --dark-gray: #6c757d;
        --text-color: #343a40;
        --white: #ffffff;
        --danger-color: #dc3545;
        --success-color: #28a745;
        --border-radius: 8px;
        --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        --input-border-color: #ced4da;
    }

   

   .main-container {
        max-width: 1200px;
        margin: 20px auto;  
        padding: 20px;
         background-color: var(--white);
         border-radius: var(--border-radius);
         box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        
    }

    .patient-card {
        background: linear-gradient(120deg, var(--primary-color), var(--secondary-color));
        color: var(--white);
        border-radius: var(--border-radius);
        padding: 24px;
        display: flex;
        align-items: flex-start;
        box-shadow: var(--card-shadow);
        margin-bottom: 24px;
        gap: 24px;
    }

    .patient-card .logo {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--white);
        flex-shrink: 0;
    }

    .patient-info {
        flex-grow: 1;
        min-width: 0;
    }

    .patient-info h1 {
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 8px;
        word-break: break-word;
    }

    .patient-info .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px 16px;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .patient-info p {
        margin-bottom: 0;
        color: rgba(255, 255, 255, 0.9);
    }

    .patient-info p strong {
        font-weight: 500;
        color: var(--white);
        margin-right: 5px;
    }
     .patient-info .address {
        grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
        .patient-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
            gap: 16px;
        }
         .patient-card .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 10px;
        }
        .patient-info h1 {
            font-size: 1.5rem;
        }
        .patient-info .info-grid {
             grid-template-columns: 1fr;
             text-align: left;
             gap: 5px;
        }
         .patient-info .address {
             grid-column: auto;
         }

         .main-container {
            margin: 10px;
            padding: 15px;
         }
    }


    .edit-profile-section {
        margin-bottom: 32px;
    }

    .edit-button {
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        color: var(--white);
        font-weight: 500;
        padding: 10px 20px;
        border-radius: var(--border-radius);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        border: none;
        cursor: pointer;
        outline: none;
        width: auto;
        min-width: 150px;
    }

    .edit-button:hover {
        background: linear-gradient(90deg, var(--secondary-color), var(--primary-color));
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
        transform: translateY(-2px);
    }

    .edit-button .icon-edit {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    .edit-button span {
        white-space: nowrap;
    }

    .profile-form-container {
        background-color: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: var(--border-radius);
        padding: 24px;
        margin-top: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
     .form-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--secondary-color);
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--medium-gray);
    }

    .profile-form .input-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
        margin-bottom: 24px;
    }

    .profile-form .form-group {
        display: flex;
        flex-direction: column;
    }
     .form-group.full-width {
        grid-column: 1 / -1;
    }


    .profile-form label {
        margin-bottom: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--dark-gray);
    }

    .profile-form input[type="text"],
    .profile-form input[type="tel"],
    .profile-form input[type="email"],
    .profile-form input[type="date"],
    .profile-form input[type="number"],
    .profile-form select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--input-border-color);
        border-radius: 6px;
        font-size: 0.95rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        background-color: var(--white);
    }
    .profile-form input:focus,
    .profile-form select:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(8, 184, 243, 0.2);
        outline: none;
    }
     .profile-form input[disabled] {
         background-color: var(--medium-gray);
         cursor: not-allowed;
     }

    .profile-form select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236c757d'%3E%3Cpath fill-rule='evenodd' d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 16px 16px;
        padding-right: 30px;
    }

    .save-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--medium-gray);
    }

    .save-button, .cancel-button {
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
        border: none;
    }

    .save-button {
        background-color: var(--success-color);
        color: white;
    }
    .save-button:hover {
        background-color: #218838;
        transform: translateY(-1px);
    }

    .cancel-button {
        background-color: var(--light-gray);
        color: var(--dark-gray);
        border: 1px solid var(--input-border-color);
    }
     .cancel-button:hover {
         background-color: var(--medium-gray);
         transform: translateY(-1px);
     }

    .slide-down {
        animation: slideDown 0.4s ease-out forwards;
        overflow: hidden;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-15px);
            max-height: 0;
        }
        to {
            opacity: 1;
            transform: translateY(0);
            max-height: 1000px;
        }
    }

    @media (max-width: 640px) {
        .profile-form .input-grid {
            grid-template-columns: 1fr;
            gap: 15px;
        }
        .form-group.full-width {
            grid-column: auto;
        }
        .save-button-container {
            flex-direction: row;
            gap: 10px;
        }
        .save-button, .cancel-button {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }
        .profile-form-container {
            padding: 16px;
        }
        .form-image-upload {
            display: flex;
            justify-content: center;
            margin-bottom: 16px;
        }
        .details-section {
            margin-top: 10px;
            text-align: left;
            width: 100%;
            font-size: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 10px 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            color: #222 !important;
            font-weight: 500;
        }
        .details-section p, .details-section strong, .details-section .address {
            color: #222 !important;
        }
        .info-grid {
            grid-template-columns: 1fr;
            gap: 6px;
        }
    }

    .history-section {
        margin-top: 32px;
    }

    .section-title {
        font-size: 1.6rem;
        font-weight: 600;
        color: var(--secondary-color);
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--primary-color);
    }

     .no-data-message {
        background-color: var(--medium-gray);
        color: var(--dark-gray);
        padding: 15px;
        border-radius: var(--border-radius);
        text-align: center;
        font-style: italic;
     }

    .card-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
    }

    .history-card {
        background-color: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: var(--border-radius);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
     .history-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
    }

    .history-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }

    .card-header {
        background-color: var(--light-gray);
        padding: 10px 16px;
        font-weight: 600;
        color: var(--secondary-color);
        border-bottom: 1px solid var(--medium-gray);
        font-size: 1.1rem;
    }

    .card-content {
        padding: 16px;
        font-size: 0.95rem;
        color: var(--text-color);
        line-height: 1.6;
        flex-grow: 1;
    }

    .card-content p {
        margin-bottom: 10px;
    }

    .card-content strong {
        font-weight: 500;
        color: var(--secondary-color);
        margin-right: 4px;
    }

     .card-content .status {
         font-style: italic;
         color: var(--dark-gray);
         font-size: 0.9em;
     }
     .card-content .remarks {
         background-color: #eef8ff;
         padding: 8px 12px;
         border-radius: 4px;
         border-left: 3px solid var(--primary-color);
         margin-top: 10px;
     }

     .card-content .no-info {
         color: var(--dark-gray);
         font-style: italic;
         font-size: 0.9em;
         margin-top: 5px;
     }

    .divider {
        border: none;
        border-top: 1px dashed var(--medium-gray);
        margin: 16px 0;
    }
     .sub-header {
        font-weight: 600 !important;
        color: var(--text-color) !important;
        margin-bottom: 8px !important;
     }
     .prescription-details {
        margin-top: 5px;
        padding-left: 10px;
        border-left: 2px solid var(--medium-gray);
     }
     .medicine-item {
         margin-bottom: 12px;
         padding-bottom: 8px;
         border-bottom: 1px dotted #eee;
     }
     .medicine-item:last-child {
         margin-bottom: 5px;
         border-bottom: none;
     }
     .medicine-item p {
         margin-bottom: 4px;
         font-size: 0.9rem;
     }
     .prescriber {
         font-size: 0.9rem;
         color: var(--dark-gray);
         margin-top: 10px;
     }

    @media (max-width: 768px) {
        .card-container {
            grid-template-columns: 1fr;
            gap: 16px;
        }
    }

    .error-message {
        color: var(--danger-color);
        font-size: 0.8rem;
        margin-top: 4px;
    }

    .profile-image-container {
        position: relative;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        overflow: visible;
        border: 3px solid var(--white);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        background-color: var(--light-gray);
        flex-shrink: 0;
    }

    .profile-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
    }

    .profile-image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--medium-gray);
        color: var(--dark-gray);
        font-size: 2.5rem;
        border-radius: 50%;
    }

    .upload-button {
        position: absolute;
        bottom: 0;
        right: 0;
        background-color: var(--primary-color);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.3s ease;
        z-index: 3;
    }

    .upload-button:hover {
        background-color: var(--secondary-color);
    }

    .edit-pen-btn {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: var(--primary-color);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 3;
        transition: background 0.2s;
    }
    .edit-pen-btn:hover {
        background: var(--secondary-color);
    }
    @media (max-width: 768px) {
        .profile-image-container {
            width: 100px;
            height: 100px;
            margin-bottom: 10px;
        }
        .edit-pen-btn {
            width: 30px;
            height: 30px;
            bottom: 4px;
            right: 4px;
        }
    }

    .toggle-details-btn {
        display: none;
        margin: 12px auto 0 auto;
        background: var(--primary-color);
        color: #fff;
        border: none;
        border-radius: 20px;
        padding: 6px 18px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        align-items: center;
        gap: 6px;
    }
    .toggle-details-btn i {
        margin-left: 8px;
    }
    .details-section {
        display: block;
    }
    @media (max-width: 640px) {
        .main-container {
            padding: 10px;
            max-width: 98vw;
        }
        .patient-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
            gap: 10px;
        }
        .profile-image-container {
            width: 110px;
            height: 110px;
            margin-bottom: 10px;
        }
        .patient-info h1 {
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 8px;
            margin-top: 8px;
        }
        .toggle-details-btn {
            display: flex;
        }
        .details-section {
            margin-top: 10px;
            text-align: left;
            width: 100%;
            font-size: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 10px 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            color: #222 !important;
            font-weight: 500;
        }
        .details-section p, .details-section strong, .details-section .address {
            color: #222 !important;
        }
        .info-grid {
            grid-template-columns: 1fr;
            gap: 6px;
        }
    }

</style>