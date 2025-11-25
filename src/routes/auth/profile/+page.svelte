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
    let formMiddleName = "";
    let formLastName = "";
    let formSuffix = "";
    let formAge = "";
    let formGender = "";
    let formEmail = "";
    let formPhone = "";
    let formHomeAddress = "";
    let formBirthday="";

    // Add new state for profile image
    let profileImage: string = '';
    let isUploading = false;

    type PatientProfile = {
        name: string;
        middleName?: string;
        lastName: string;
        suffix?: string;
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
        middleName: '',
        lastName: '',
        suffix: '',
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
    let isArchived: boolean = false;
    $: accountStatus = isArchived ? 'Inactive' : 'Active';

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
                        isArchived = Boolean(userData.isArchived ?? userData.archived ?? false);
                    } else {
                        // Fallback: some projects store archive flag on profile
                        const archivedFlag = (patientDoc.data() as any)?.isArchived ?? (patientDoc.data() as any)?.archived;
                        isArchived = Boolean(archivedFlag ?? false);
                    }
                    console.log("Loaded patient profile from Firestore: ", patientProfile);
                } else {
                    console.log("No profile found for this user. Using default values.");
                    // Get the customUserId from the users collection
                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    const customUserId = userDoc.exists() ? userDoc.data().customUserId : "N/A";
                    isArchived = userDoc.exists() ? Boolean(userDoc.data().isArchived ?? userDoc.data().archived ?? false) : false;
                    
                    patientProfile = {
                        name: '',
                        middleName: '',
                        lastName: '',
                        suffix: '',
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
                doneAppointments = querySnapshot.docs.map((doc) => {
                    const data = doc.data();
                    console.log("Appointment data:", data); // Debug log
                    console.log("Checking remarks fields:", {
                        remarks: data.remarks,
                        remark: data.remark,
                        adminRemarks: data.adminRemarks,
                        notes: data.notes,
                        comment: data.comment,
                        comments: data.comments,
                        description: data.description
                    });
                    
                    // Try all possible field names for remarks
                    const remarksValue = data.remarks || 
                                       data.remark || 
                                       data.adminRemarks || 
                                       data.notes || 
                                       data.comment || 
                                       data.comments || 
                                       data.description || 
                                       '';
                    
                    console.log("Final remarks value for appointment", doc.id, ":", remarksValue);
                    
                    return {
                        ...data,
                        id: doc.id,
                        remarks: remarksValue
                    };
                });
                console.log("Loaded done appointments: ", doneAppointments);

            } catch (error) {
                console.error("Error loading data: ", error);
            }
        } else {
            currentUser = null;
            patientProfile = {
                name: '',
                middleName: '',
                lastName: '',
                suffix: '',
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
            isArchived = false;
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

    // Check required fields (email optional)
    const requiredFields = {
        'First Name': formPatientName,
        'Last Name': formLastName,
        'Age': formAge,
        // 'Email': formEmail,
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
            middleName: formMiddleName,
            lastName: formLastName,
            suffix: formSuffix,
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
        // Disable body scroll when modal opens
        document.body.style.overflow = 'hidden';
        
        formPatientName = patientProfile.name;
        formMiddleName = patientProfile.middleName || '';
        formLastName = patientProfile.lastName;
        formSuffix = patientProfile.suffix || '';
        formAge = patientProfile.age;
        formBirthday = patientProfile.birthday; 
        formGender = patientProfile.gender;
        formEmail = patientProfile.email;
        formPhone = patientProfile.phone;
        formHomeAddress = patientProfile.address;
    } else {
        // Re-enable body scroll when modal closes
        document.body.style.overflow = '';
        
        formPatientName = "";
        formMiddleName = "";
        formLastName = "";
        formSuffix = "";
        formAge = "";
        formBirthday = ""; 
        formGender = "";
        formEmail = "";
        formPhone = "";
        formHomeAddress = "";
    }
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
                <img src={patientProfile.profileImage} alt="User avatar" class="profile-image" />
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
            <h1>{[patientProfile.name, patientProfile.middleName, patientProfile.lastName, patientProfile.suffix].filter(Boolean).join(' ') || "<Patient Name>"}</h1>
            <div class="status-row">
                <span class={`status-badge ${accountStatus === 'Active' ? 'active' : 'inactive'}`}>Status: {accountStatus}</span>
            </div>
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
                        <p class="address-info"><strong>Address:</strong> {patientProfile.address || "N/A"}</p>
                    </div>
                {/if}
            {:else}
                <div class="info-grid">
                    <p><strong>Patient ID:</strong> {patientProfile.id || "N/A"}</p>
                    <p><strong>Age:</strong> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                    <p><strong>Gender:</strong> {patientProfile.gender || "N/A"}</p>
                    <p><strong>Phone:</strong> {patientProfile.phone || "N/A"}</p>
                    <p><strong>Email:</strong> {patientProfile.email || "N/A"}</p>
                    <p class="address-info"><strong>Address:</strong> {patientProfile.address || "N/A"}</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- ========== History Section ========== -->
    <div class="history-section">
        <h2 class="section-title">
            Appointment History
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
                         
                         {#if appointment.subServices && appointment.subServices.length > 0}
                            <p><strong>Selected Services:</strong> {appointment.subServices.join(', ')}</p>
                         {/if}

                         {#if appointment.remarks}
                            <p class="remarks"><strong>Remarks:</strong> {appointment.remarks}</p>
                         {:else}
                            <p class="no-info"><em>No remarks for this visit.</em></p>
                         {/if}
                    </div>
                </div>
            {/each}
        </div>
        {/if}
    </div>
</div>

{#if isEditingProfile}
    <div class="modal-overlay" on:click={toggleEditProfile}>
    <div class="profile-form-container slide-down" on:click|stopPropagation>
        <h3 class="form-title">Edit Patient Information</h3>
        <form class="profile-form" on:submit|preventDefault={savePatientProfile}>
            <div class="form-image-upload">
                <div class="profile-image-container">
                    {#if profileImage || patientProfile.profileImage}
                        <img src={profileImage || patientProfile.profileImage} alt="User avatar" class="profile-image" />
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
            <div class="form-section">
                <h4 class="section-subtitle">Personal Information</h4>
                <div class="input-grid">
                    <div class="form-group">
                        <label for="first-name">First Name <span class="required">*</span></label>
                        <input id="first-name" type="text" bind:value={formPatientName} placeholder="Enter first name" required />
                    </div>
                    <div class="form-group">
                        <label for="middle-name">Middle Name</label>
                        <input id="middle-name" type="text" bind:value={formMiddleName} placeholder="Enter middle name (optional)" />
                    </div>
                    <div class="form-group">
                        <label for="last-name">Last Name <span class="required">*</span></label>
                        <input id="last-name" type="text" bind:value={formLastName} placeholder="Enter last name" required />
                    </div>
                    <div class="form-group">
                        <label for="suffix">Suffix</label>
                        <select id="suffix" bind:value={formSuffix}>
                            <option value="">None</option>
                            <option value="Jr.">Jr.</option>
                            <option value="Sr.">Sr.</option>
                            <option value="II">II</option>
                            <option value="III">III</option>
                            <option value="IV">IV</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="birthday">Birth Date <span class="required">*</span></label>
                        <input id="birthday" type="date" bind:value={formBirthday} on:input={updateAge} required />
                    </div>
                    <div class="form-group">
                        <label for="age">Age</label>
                        <input id="age" type="number" bind:value={formAge} placeholder="Auto-calculated" disabled />
                    </div>
                    <div class="form-group">
                        <label for="gender">Gender <span class="required">*</span></label>
                        <select id="gender" bind:value={formGender} required>
                            <option value="" disabled>Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4 class="section-subtitle">Contact Information</h4>
                <div class="input-grid">
                    <div class="form-group">
                        <label for="phone">Phone Number <span class="required">*</span></label>
                        <input 
                            id="phone" 
                            type="tel" 
                            placeholder="09123456789" 
                            bind:value={formPhone}
                            on:input={(e) => {
                                const input = e.currentTarget as HTMLInputElement;
                                formPhone = input.value.replace(/\D/g, '');
                                if (formPhone.length > 11) {
                                    formPhone = formPhone.slice(0, 11);
                                }
                            }}
                            maxlength="11"
                            required
                        />
                        {#if formPhone && formPhone.length !== 11}
                            <span class="error-message">Phone number must be exactly 11 digits</span>
                        {/if}
                    </div>
                    <div class="form-group">
                        <label for="email">E-Mail Address</label>
                        <input id="email" type="email" bind:value={formEmail} placeholder="your.email@example.com" />
                    </div>
                    <div class="form-group full-width"> 
                        <label for="home-address">Home Address</label>
                        <input id="home-address" type="text" bind:value={formHomeAddress} placeholder="Street, Barangay, City, Province" />
                    </div>
                </div>
            </div>
            <div class="save-button-container">
                <button type="submit" class="save-button">Save Changes</button>
                <button type="button" on:click={toggleEditProfile} class="cancel-button">Cancel</button>
            </div>
        </form>
    </div>
    </div>
{/if}

<style>
    :root {
        --primary-color: #1e3a66;
        --secondary-color: #172f85;
        --accent-color: #eaee00;
        --light-gray: #f8f9fa;
        --medium-gray: #e9ecef;
        --dark-gray: #6c757d;
        --text-color: #343a40;
        --white: #ffffff;
        --danger-color: #dc3545;
        --success-color: #28a745;
        --info-color: #17a2b8;
        --border-radius: 12px;
        --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        --input-border-color: #ced4da;
        --transition-speed: 0.3s;
    }

   

   .main-container {
        max-width: 1200px;
        margin: 30px auto;  
        padding: 30px;
        background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
        border-radius: var(--border-radius);
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        min-height: 80vh;
    }

    .patient-card {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: var(--white);
        border-radius: var(--border-radius);
        padding: 32px;
        display: flex;
        align-items: flex-start;
        box-shadow: 0 8px 32px rgba(30, 58, 102, 0.3);
        margin-bottom: 32px;
        gap: 32px;
        position: relative;
        overflow: hidden;
        transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
    }

    .patient-card::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        pointer-events: none;
    }

    .patient-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(30, 58, 102, 0.4);
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
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 16px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.4);
        padding-bottom: 12px;
        word-break: break-word;
        letter-spacing: 0.5px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-row {
        margin: 6px 0 10px 0;
    }
    .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.85rem;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.6);
        background: rgba(255,255,255,0.15);
        color: #fff;
    }
    .status-badge.active {
        background: rgba(34,197,94,0.25);
        border-color: rgba(34,197,94,0.6);
    }
    .status-badge.inactive {
        background: rgba(239,68,68,0.25);
        border-color: rgba(239,68,68,0.6);
    }

    .patient-info .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px 24px;
        font-size: 1rem;
        line-height: 1.7;
        margin-top: 8px;
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
     .patient-info .address-info {
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
         .patient-info .address-info {
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

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(9, 19, 36, 0.384) 0%, rgba(0, 0, 0, 0.385) 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
        overflow-y: auto;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .profile-form-container {
        background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid var(--medium-gray);
        border-radius: var(--border-radius);
        padding: 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        max-width: 850px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        margin: auto;
    }

    .profile-form-container::-webkit-scrollbar {
        width: 8px;
    }

    .profile-form-container::-webkit-scrollbar-track {
        background: rgba(248, 249, 250, 0.5);
        border-radius: 10px;
        margin: 4px 0;
    }

    .profile-form-container::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        border-radius: 10px;
        border: 2px solid transparent;
        background-clip: padding-box;
        box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .profile-form-container::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, var(--secondary-color) 0%, var(--primary-color) 100%);
        box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.15), 0 0 8px rgba(30, 58, 102, 0.3);
        transform: scaleX(1.2);
    }

    .profile-form-container::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #152a5f 0%, #0f1f5a 100%);
    }

    .profile-form-container {
        scrollbar-width: thin;
        scrollbar-color: var(--primary-color) rgba(248, 249, 250, 0.5);
        -ms-overflow-style: auto;
    }

    .profile-form-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        border-radius: var(--border-radius) var(--border-radius) 0 0;
    }

     .form-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        margin-bottom: 24px;
        margin-top: 8px;
        padding-bottom: 12px;
        border-bottom: 3px solid var(--primary-color);
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .form-title::before {
        content: '✏️';
        font-size: 1.3rem;
    }

    .form-section {
        margin-bottom: 28px;
    }

    .form-section:last-of-type {
        margin-bottom: 0;
    }

    .form-image-upload {
        display: flex;
        justify-content: center;
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--medium-gray);
    }

    .section-subtitle {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--medium-gray);
    }

    .profile-form .input-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
    }

    .required {
        color: var(--danger-color);
        font-weight: bold;
    }

    .profile-form .form-group {
        display: flex;
        flex-direction: column;
    }
     .form-group.full-width {
        grid-column: 1 / -1;
    }


    .profile-form label {
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .profile-form input[type="text"],
    .profile-form input[type="tel"],
    .profile-form input[type="email"],
    .profile-form input[type="date"],
    .profile-form input[type="number"],
    .profile-form select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--input-border-color);
        border-radius: 8px;
        font-size: 1rem;
        transition: all var(--transition-speed) ease;
        background-color: var(--white);
        font-family: inherit;
    }
    .profile-form input:focus,
    .profile-form select:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 4px rgba(30, 58, 102, 0.15);
        outline: none;
        transform: translateY(-1px);
    }
    .profile-form input:hover:not(:disabled),
    .profile-form select:hover:not(:disabled) {
        border-color: var(--secondary-color);
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
        margin-top: 32px;
        padding-top: 24px;
        border-top: 2px solid var(--medium-gray);
    }

    .save-button, .cancel-button {
        padding: 12px 28px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all var(--transition-speed) ease;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .save-button {
        background: var(--success-color);
        color: white;
    }
    .save-button:hover {
        background: #218838;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
    }

    .cancel-button {
        background-color: var(--white);
        color: var(--text-color);
        border: 2px solid var(--input-border-color);
    }
     .cancel-button:hover {
         background-color: var(--medium-gray);
         transform: translateY(-2px);
         border-color: var(--dark-gray);
         box-shadow: 0 4px 16px rgba(0,0,0,0.15);
     }

    .slide-down {
        animation: slideDown 0.4s ease-out forwards;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @media (max-width: 640px) {
        .modal-overlay {
            padding: 10px;
            align-items: flex-start;
        }
        .profile-form-container {
            padding: 24px 20px;
            max-height: 95vh;
            margin-top: 10px;
        }
        .form-title {
            font-size: 1.3rem;
        }
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
            margin-top: 24px;
            padding-top: 20px;
        }
        .save-button, .cancel-button {
            flex: 1;
            min-width: 0;
            justify-content: center;
            padding: 10px 16px;
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
        .details-section p, .details-section strong, .details-section .address-info {
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
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--primary-color);
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 3px solid var(--primary-color);
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .section-title::before {
        content: '📋';
        font-size: 1.5rem;
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
        border: 2px solid var(--medium-gray);
        border-radius: var(--border-radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transition: all var(--transition-speed) ease;
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
        height: 6px;
        background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    }

    .history-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        border-color: var(--primary-color);
    }

    .card-header {
        background: linear-gradient(to right, var(--light-gray) 0%, #e3e7eb 100%);
        padding: 14px 20px;
        font-weight: 700;
        color: var(--primary-color);
        border-bottom: 2px solid var(--medium-gray);
        font-size: 1.15rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .card-header::before {
        content: '📅';
        font-size: 1rem;
    }

    .card-content {
        padding: 20px;
        font-size: 1rem;
        color: var(--text-color);
        line-height: 1.8;
        flex-grow: 1;
    }

    .card-content p {
        margin-bottom: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }

    .card-content strong {
        font-weight: 600;
        color: var(--primary-color);
        margin-right: 6px;
        min-width: fit-content;
    }

     .card-content .status {
         font-style: italic;
         color: var(--dark-gray);
         font-size: 0.9em;
     }
     .card-content .remarks {
         background: linear-gradient(to right, #eef8ff 0%, #f0f9ff 100%);
         padding: 12px 16px;
         border-radius: 8px;
         border-left: 4px solid var(--info-color);
         margin-top: 12px;
         box-shadow: 0 2px 8px rgba(23, 162, 184, 0.1);
         position: relative;
     }

     .card-content .remarks::before {
         content: '💬';
         position: absolute;
         top: 12px;
         right: 16px;
         font-size: 1.2rem;
         opacity: 0.5;
     }

     .card-content .no-info {
         color: var(--dark-gray);
         font-style: italic;
         font-size: 0.9em;
         margin-top: 5px;
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
        width: 140px;
        height: 140px;
        border-radius: 50%;
        overflow: visible;
        border: 4px solid var(--white);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        background-color: var(--light-gray);
        flex-shrink: 0;
        transition: all var(--transition-speed) ease;
    }

    .profile-image-container:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 28px rgba(0, 0, 0, 0.3);
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
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.3s ease;
        z-index: 3;
        font-size: 1rem;
    }

    .upload-button:hover {
        background-color: var(--secondary-color);
    }

    .upload-button i {
        color: white;
    }

    .edit-pen-btn {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: #fff;
        border: 2px solid var(--white);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        cursor: pointer;
        z-index: 3;
        transition: all var(--transition-speed) ease;
        font-size: 1.1rem;
    }
    .edit-pen-btn:hover {
        background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
        transform: scale(1.1) rotate(15deg);
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
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
        margin: 16px auto 0 auto;
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: #fff;
        border: none;
        border-radius: 24px;
        padding: 10px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-speed) ease;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(30, 58, 102, 0.3);
    }
    .toggle-details-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(30, 58, 102, 0.4);
    }
    .toggle-details-btn i {
        margin-left: 8px;
        transition: transform var(--transition-speed) ease;
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
        .details-section p, .details-section strong, .details-section .address-info {
            color: #222 !important;
        }
        .info-grid {
            grid-template-columns: 1fr;
            gap: 6px;
        }
    }

</style>