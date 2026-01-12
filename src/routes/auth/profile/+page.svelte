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

    // Medical Information state variables
    let formBloodType = "";
    let formAllergies = "";
    let formCurrentMedications = "";
    
    // Medical Conditions
    let medicalConditions = {
        anemia: false,
        anxiety: false,
        arthritis: false,
        asthma: false,
        bloodTransfusion: false,
        cancer: false,
        clottingDisorder: false,
        congestiveHeartFailure: false,
        depression: false,
        diabetesMellitus: false,
        emphysema: false,
        gastroEsophagealReflux: false,
        glaucoma: false,
        heartMurmur: false,
        hivAids: false,
        highCholesterol: false,
        hypertension: false
    };
    
    // Surgical History
    let surgicalHistory = {
        appendectomy: false,
        brainSurgery: false,
        breastSurgery: false,
        cabg: false,
        cholecystectomy: false,
        colonSurgery: false,
        tonsillectomy: false,
        thyroidSurgery: false,
        lungSurgery: false,
        csection: false,
        eyeSurgery: false,
        fracturesSurgery: false,
        herniaRepair: false,
        hysterectomy: false,
        jointSurgery: false,
        pancreatomy: false,
        varicoseVeinSurgery: false,
        prostateSurgery: false,
        weightReductionSurgery: false
    };
    
    // Family History
    let familyHistory = {
        mother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        father: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        sister: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        brother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        daughter: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        son: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
        otherRelative: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false }
    };
    
    // Other Medical Information
    let formOtherMedicalConditions = "";
    let formOtherFamilyHistory = "";
    let formBloodTransfusionHistory = "";
    let formBloodTransfusionDate = "";

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
        profileImage?: string;
        bloodType?: string;
        allergies?: string;
        currentMedications?: string;
        medicalConditions?: any;
        surgicalHistory?: any;
        familyHistory?: any;
        otherMedicalConditions?: string;
        otherFamilyHistory?: string;
        bloodTransfusionHistory?: string;
        bloodTransfusionDate?: string;
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
        profileImage: '',
        bloodType: '',
        allergies: '',
        currentMedications: '',
        medicalConditions: {},
        surgicalHistory: {},
        familyHistory: {},
        otherMedicalConditions: '',
        otherFamilyHistory: '',
        bloodTransfusionHistory: '',
        bloodTransfusionDate: ''
    };

    let currentUser: User | null = null;
    let isEditingProfile = false; 
    let doneAppointments: any[] = [];
    let isDropdownOpen = true;
    let showDetails = false;
    let isMobile = false;
    let isArchived: boolean = false;
    $: accountStatus = isArchived ? 'Inactive' : 'Active';

    // Default medical data structures as constants
    const DEFAULT_MEDICAL_CONDITIONS = {
        anemia: false, anxiety: false, arthritis: false, asthma: false,
        bloodTransfusion: false, cancer: false, clottingDisorder: false,
        congestiveHeartFailure: false, depression: false, diabetesMellitus: false,
        emphysema: false, gastroEsophagealReflux: false, glaucoma: false,
        heartMurmur: false, hivAids: false, highCholesterol: false, hypertension: false
    };

    const DEFAULT_SURGICAL_HISTORY = {
        appendectomy: false, brainSurgery: false, breastSurgery: false, cabg: false,
        cholecystectomy: false, colonSurgery: false, tonsillectomy: false,
        thyroidSurgery: false, lungSurgery: false, csection: false, eyeSurgery: false,
        fracturesSurgery: false, herniaRepair: false, hysterectomy: false,
        jointSurgery: false, pancreatomy: false, varicoseVeinSurgery: false,
        prostateSurgery: false, weightReductionSurgery: false
    };

    const DEFAULT_FAMILY_MEMBER = {
        alcoholAbuse: false, breastCancer: false, ovarianCancer: false,
        prostateCancer: false, otherCancer: false, diabetes: false,
        heartDisease: false, highCholesterol: false, hypertension: false,
        mentalIllness: false
    };

    const DEFAULT_FAMILY_HISTORY = {
        mother: { ...DEFAULT_FAMILY_MEMBER },
        father: { ...DEFAULT_FAMILY_MEMBER },
        sister: { ...DEFAULT_FAMILY_MEMBER },
        brother: { ...DEFAULT_FAMILY_MEMBER },
        daughter: { ...DEFAULT_FAMILY_MEMBER },
        son: { ...DEFAULT_FAMILY_MEMBER },
        otherRelative: { ...DEFAULT_FAMILY_MEMBER }
    };

    // Helper function to convert array/string to object with boolean properties
    function arrayToObjectWithBooleans(items: string[], defaultObj: Record<string, boolean>): Record<string, boolean> {
        const result = { ...defaultObj };
        items.forEach((item: string) => {
            const key = item.trim();
            if (key in result) {
                result[key] = true;
            }
        });
        return result;
    }

    // Helper function to normalize medical conditions from array to object format
    function normalizeMedicalConditions(data: any): Record<string, boolean> {
        console.log("Normalizing medical conditions, input:", data);
        
        if (!data) {
            return { ...DEFAULT_MEDICAL_CONDITIONS };
        }
        
        // If data is already an object with boolean values, return it
        if (typeof data === 'object' && !Array.isArray(data)) {
            console.log("Medical conditions already in object format");
            return data;
        }
        
        // If data is an array, convert to object format
        if (Array.isArray(data)) {
            console.log("Converting medical conditions from array to object format");
            const normalized = arrayToObjectWithBooleans(data, DEFAULT_MEDICAL_CONDITIONS);
            console.log("Normalized medical conditions:", normalized);
            return normalized;
        }
        
        // If data is a string (comma-separated), parse it
        if (typeof data === 'string') {
            console.log("Converting medical conditions from string to object format");
            return arrayToObjectWithBooleans(data.split(','), DEFAULT_MEDICAL_CONDITIONS);
        }
        
        console.log("Returning default medical conditions");
        return { ...DEFAULT_MEDICAL_CONDITIONS };
    }

    // Helper function to normalize surgical history from array/string to object format
    function normalizeSurgicalHistory(data: any): Record<string, boolean> {
        console.log("Normalizing surgical history, input:", data);
        
        if (!data) {
            return { ...DEFAULT_SURGICAL_HISTORY };
        }
        
        // If data is already an object with boolean values, return it
        if (typeof data === 'object' && !Array.isArray(data)) {
            console.log("Surgical history already in object format");
            return data;
        }
        
        // If data is an array, convert to object format
        if (Array.isArray(data)) {
            console.log("Converting surgical history from array to object format");
            const normalized = arrayToObjectWithBooleans(data, DEFAULT_SURGICAL_HISTORY);
            console.log("Normalized surgical history:", normalized);
            return normalized;
        }
        
        // If data is a string (comma-separated), parse it
        if (typeof data === 'string') {
            console.log("Converting surgical history from string to object format");
            return arrayToObjectWithBooleans(data.split(','), DEFAULT_SURGICAL_HISTORY);
        }
        
        console.log("Returning default surgical history");
        return { ...DEFAULT_SURGICAL_HISTORY };
    }

    // Helper function to normalize family history from array to object format
    function normalizeFamilyHistory(data: any): any {
        console.log("Normalizing family history, input:", data);
        
        if (!data) {
            return { ...DEFAULT_FAMILY_HISTORY };
        }
        
        // If data is already in the correct object format, return it
        if (typeof data === 'object' && !Array.isArray(data) && data.mother && typeof data.mother === 'object') {
            console.log("Family history already in object format");
            return data;
        }
        
        // If data is an array, we'll need to handle it differently
        // This is a simplified conversion - real data might need more sophisticated parsing
        if (Array.isArray(data)) {
            console.log("Converting family history from array to object format");
            // For now, just return the default structure
            // In a real scenario, you might need to parse specific conditions
            return { ...DEFAULT_FAMILY_HISTORY };
        }
        
        console.log("Returning default family history");
        return { ...DEFAULT_FAMILY_HISTORY };
    }

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
                    
                    // Log the data structure for debugging
                    console.log("=== Patient Profile Data Structure ===");
                    console.log("Profile loaded from Firestore:", patientProfile);
                    console.log("Medical conditions type:", typeof patientProfile.medicalConditions, Array.isArray(patientProfile.medicalConditions) ? "(array)" : "(object)");
                    console.log("Surgical history type:", typeof patientProfile.surgicalHistory, Array.isArray(patientProfile.surgicalHistory) ? "(array)" : "(object)");
                    console.log("Family history type:", typeof patientProfile.familyHistory, Array.isArray(patientProfile.familyHistory) ? "(array)" : "(object)");
                    
                    // Warn if data structure doesn't match expected format
                    if (Array.isArray(patientProfile.medicalConditions)) {
                        console.warn("⚠️ Medical conditions stored as array - will be normalized on edit");
                    }
                    if (Array.isArray(patientProfile.surgicalHistory)) {
                        console.warn("⚠️ Surgical history stored as array - will be normalized on edit");
                    }
                    if (Array.isArray(patientProfile.familyHistory)) {
                        console.warn("⚠️ Family history stored as array - will be normalized on edit");
                    }
                    
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
                    where("status", "in", ["Completed", "Completed: Need Follow-up", "Missed"])
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
                        description: data.description,
                        completionRemarks: data.completionRemarks
                    });
                    
                    // Try all possible field names for remarks
                    const remarksValue = data.completionRemarks ||
                                       data.remarks || 
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

    // Check required fields (email is optional)
    const requiredFields = {
        'First Name': formPatientName,
        'Last Name': formLastName,
        'Age': formAge,
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
            profileImage: profileImage,
            bloodType: formBloodType,
            allergies: formAllergies,
            currentMedications: formCurrentMedications,
            medicalConditions: medicalConditions,
            surgicalHistory: surgicalHistory,
            familyHistory: familyHistory,
            otherMedicalConditions: formOtherMedicalConditions,
            otherFamilyHistory: formOtherFamilyHistory,
            bloodTransfusionHistory: formBloodTransfusionHistory,
            bloodTransfusionDate: formBloodTransfusionDate
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
    console.log("=== toggleEditProfile called ===");
    console.log("Current isEditingProfile state:", isEditingProfile);
    console.log("Patient profile data:", patientProfile);
    
    isEditingProfile = !isEditingProfile; 

    if (isEditingProfile) {
        try {
            console.log("Opening edit modal...");
            
            // Disable body scroll when modal opens
            document.body.style.overflow = 'hidden';
            
            formPatientName = patientProfile.name || '';
            formMiddleName = patientProfile.middleName || '';
            formLastName = patientProfile.lastName || '';
            formSuffix = patientProfile.suffix || '';
            formAge = patientProfile.age || '';
            formBirthday = patientProfile.birthday || ''; 
            formGender = patientProfile.gender || '';
            formEmail = patientProfile.email || '';
            formPhone = patientProfile.phone || '';
            formHomeAddress = patientProfile.address || '';
            
            // Load medical information
            formBloodType = patientProfile.bloodType || '';
            formAllergies = patientProfile.allergies || '';
            formCurrentMedications = patientProfile.currentMedications || '';
            
            // Use normalization helpers to handle both array and object formats
            console.log("Normalizing medical data...");
            console.log("Raw medicalConditions:", patientProfile.medicalConditions);
            console.log("Raw surgicalHistory:", patientProfile.surgicalHistory);
            console.log("Raw familyHistory:", patientProfile.familyHistory);
            
            medicalConditions = normalizeMedicalConditions(patientProfile.medicalConditions);
            surgicalHistory = normalizeSurgicalHistory(patientProfile.surgicalHistory);
            familyHistory = normalizeFamilyHistory(patientProfile.familyHistory);
            
            console.log("Normalized medicalConditions:", medicalConditions);
            console.log("Normalized surgicalHistory:", surgicalHistory);
            console.log("Normalized familyHistory:", familyHistory);
            
            formOtherMedicalConditions = patientProfile.otherMedicalConditions || '';
            formOtherFamilyHistory = patientProfile.otherFamilyHistory || '';
            formBloodTransfusionHistory = patientProfile.bloodTransfusionHistory || '';
            formBloodTransfusionDate = patientProfile.bloodTransfusionDate || '';
            profileImage = patientProfile.profileImage || '';
            
            console.log("Edit modal opened successfully!");
        } catch (error) {
            console.error("Error opening edit modal:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'There was an error opening the edit form. Please try again or contact support.'
            });
            // Reset the state if there was an error
            isEditingProfile = false;
            document.body.style.overflow = '';
        }
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
        
        // Reset medical information
        formBloodType = "";
        formAllergies = "";
        formCurrentMedications = "";
        formOtherMedicalConditions = "";
        formOtherFamilyHistory = "";
        formBloodTransfusionHistory = "";
        formBloodTransfusionDate = "";
        profileImage = "";
        
        // Reset medical condition objects to defaults
        medicalConditions = {
            anemia: false, anxiety: false, arthritis: false, asthma: false,
            bloodTransfusion: false, cancer: false, clottingDisorder: false,
            congestiveHeartFailure: false, depression: false, diabetesMellitus: false,
            emphysema: false, gastroEsophagealReflux: false, glaucoma: false,
            heartMurmur: false, hivAids: false, highCholesterol: false, hypertension: false
        };
        surgicalHistory = {
            appendectomy: false, brainSurgery: false, breastSurgery: false, cabg: false,
            cholecystectomy: false, colonSurgery: false, tonsillectomy: false,
            thyroidSurgery: false, lungSurgery: false, csection: false, eyeSurgery: false,
            fracturesSurgery: false, herniaRepair: false, hysterectomy: false,
            jointSurgery: false, pancreatomy: false, varicoseVeinSurgery: false,
            prostateSurgery: false, weightReductionSurgery: false
        };
        familyHistory = {
            mother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            father: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            sister: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            brother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            daughter: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            son: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            otherRelative: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false }
        };
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
            <button 
                class="edit-pen-btn" 
                on:click={toggleEditProfile} 
                title="Edit Profile"
                aria-label="Edit Profile"
                type="button"
            >
                <i class="fas fa-pen"></i>
            </button>
        </div>
        <div class="patient-info">
            <h1>{[patientProfile.name, patientProfile.middleName, patientProfile.lastName, patientProfile.suffix].filter(Boolean).join(' ') || "<Patient Name>"}</h1>
            <div class="status-badge {isArchived ? 'inactive' : 'active'}">
                <i class="fas {isArchived ? 'fa-ban' : 'fa-check-circle'}"></i>
                {accountStatus}
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
    <div class="modal-overlay" 
        role="presentation"
        on:click={toggleEditProfile}
        on:keydown={(e) => e.key === 'Escape' && toggleEditProfile()}
        tabindex="-1"
    >
    <div class="profile-form-container slide-down" 
        role="dialog"
        aria-label="Edit Member Information"
        on:click|stopPropagation
        on:keydown={(e) => e.key === 'Enter' && e.stopPropagation()}
        tabindex="0"
    >
        <h3 class="form-title">Edit Member Information</h3>
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
                        <input 
                            id="birthday" 
                            type="date" 
                            bind:value={formBirthday} 
                            on:input={(e) => {
                                const input = e.currentTarget as HTMLInputElement;
                                let dateValue = input.value;
                                
                                // Check if date contains a year with more than 4 digits
                                if (dateValue) {
                                    const parts = dateValue.split('-');
                                    if (parts[0] && parts[0].length > 4) {
                                        // Truncate year to 4 digits
                                        parts[0] = parts[0].slice(-4);
                                        dateValue = parts.join('-');
                                        input.value = dateValue;
                                    }
                                }
                                
                                formBirthday = dateValue;
                                updateAge(e);
                            }}
                            required 
                        />
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
            
            <!-- Medical Information Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Medical Information</h4>
                <div class="input-grid">
                    <div class="form-group">
                        <label for="bloodType">Blood Type (Optional)</label>
                        <input type="text" id="bloodType" bind:value={formBloodType} placeholder="e.g., O+, A-, B+"/>
                    </div>
                    <div class="form-group">
                        <label for="allergies">Allergies</label>
                        <input type="text" id="allergies" bind:value={formAllergies} placeholder="Indicate if any"/>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label for="currentMedications">Current Medication(s)</label>
                    <textarea id="currentMedications" bind:value={formCurrentMedications} placeholder="List with doses; include contraceptives, vitamins, supplements, etc." rows="3"></textarea>
                </div>
            </div>
            
            <!-- Medical Conditions Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Your Medical Conditions (check all that apply)</h4>
                <div class="checkbox-grid">
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.anemia}/>
                        <span>Anemia</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.anxiety}/>
                        <span>Anxiety</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.arthritis}/>
                        <span>Arthritis</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.asthma}/>
                        <span>Asthma</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.bloodTransfusion}/>
                        <span>Blood transfusion</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.cancer}/>
                        <span>Cancer</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.clottingDisorder}/>
                        <span>Clotting disorder</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.congestiveHeartFailure}/>
                        <span>Congestive Heart Failure</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.depression}/>
                        <span>Depression</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.diabetesMellitus}/>
                        <span>Diabetes Mellitus</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.emphysema}/>
                        <span>Emphysema/COPD</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.gastroEsophagealReflux}/>
                        <span>Gastro esophageal reflux (GERD)</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.glaucoma}/>
                        <span>Glaucoma</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.heartMurmur}/>
                        <span>Heart murmur</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.hivAids}/>
                        <span>HIV/AIDS</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.highCholesterol}/>
                        <span>High Cholesterol</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={medicalConditions.hypertension}/>
                        <span>Hypertension/high blood pressure</span>
                    </label>
                </div>
            </div>
            
            <!-- Surgical History Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Surgical History (check all that apply)</h4>
                <div class="checkbox-grid">
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.appendectomy}/>
                        <span>Appendectomy</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.brainSurgery}/>
                        <span>Brain surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.breastSurgery}/>
                        <span>Breast surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.cabg}/>
                        <span>CABG</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.cholecystectomy}/>
                        <span>Cholecystectomy</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.colonSurgery}/>
                        <span>Colon surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.tonsillectomy}/>
                        <span>Tonsillectomy</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.thyroidSurgery}/>
                        <span>Thyroid surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.lungSurgery}/>
                        <span>Lung surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.csection}/>
                        <span>C-section</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.eyeSurgery}/>
                        <span>Eye surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.fracturesSurgery}/>
                        <span>Fracture surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.herniaRepair}/>
                        <span>Hernia repair</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.hysterectomy}/>
                        <span>Hysterectomy</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.jointSurgery}/>
                        <span>Joint surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.pancreatomy}/>
                        <span>Pancreatomy</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.varicoseVeinSurgery}/>
                        <span>Varicose vein surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.prostateSurgery}/>
                        <span>Prostate surgery</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={surgicalHistory.weightReductionSurgery}/>
                        <span>Weight reduction surgery</span>
                    </label>
                </div>
            </div>
            
            <!-- Family History Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Family History (check all that apply)</h4>
                <div class="family-history-table-container">
                    <table class="family-history-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Alcohol<br/>abuse</th>
                                <th>Breast<br/>cancer</th>
                                <th>Ovarian<br/>cancer</th>
                                <th>Prostate<br/>cancer</th>
                                <th>Other<br/>cancer</th>
                                <th>Diabetes</th>
                                <th>Heart<br/>Disease</th>
                                <th>High<br/>cholesterol</th>
                                <th>Hypertension</th>
                                <th>Mental<br/>illness</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="family-member-label">Mother</td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.mother.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Father</td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.father.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Sister</td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.sister.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Brother</td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.brother.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Daughter</td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.daughter.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Son</td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.son.mentalIllness}/></td>
                            </tr>
                            <tr>
                                <td class="family-member-label">Other relative<br/>(specify)</td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.alcoholAbuse}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.breastCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.ovarianCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.prostateCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.otherCancer}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.diabetes}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.heartDisease}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.highCholesterol}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.hypertension}/></td>
                                <td><input type="checkbox" bind:checked={familyHistory.otherRelative.mentalIllness}/></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Other Medical Information Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Other Medical Information</h4>
                <div class="form-group full-width">
                    <label for="otherMedicalConditions">Other Medical Conditions (specify)</label>
                    <textarea id="otherMedicalConditions" bind:value={formOtherMedicalConditions} placeholder="Specify any other medical conditions" rows="3"></textarea>
                </div>
                <div class="form-group full-width">
                    <label for="otherFamilyHistory">Other family history</label>
                    <textarea id="otherFamilyHistory" bind:value={formOtherFamilyHistory} placeholder="Specify other family history" rows="3"></textarea>
                </div>
                <div class="input-grid">
                    <div class="form-group">
                        <label for="bloodTransfusionHistory">Have you ever had blood transfusion?</label>
                        <select id="bloodTransfusionHistory" bind:value={formBloodTransfusionHistory}>
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    {#if formBloodTransfusionHistory === 'Yes'}
                    <div class="form-group">
                        <label for="bloodTransfusionDate">Approximate date</label>
                        <input type="text" id="bloodTransfusionDate" bind:value={formBloodTransfusionDate} placeholder="e.g., January 2020"/>
                    </div>
                    {/if}
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

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 16px;
        margin-top: -8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
    }

    .status-badge.active {
        background: #22c55e;
        color: white;
    }

    .status-badge.inactive {
        background: #ef4444;
        color: white;
    }

    .status-badge i {
        font-size: 1rem;
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
        max-width: 1100px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        margin: auto;
    }

    .profile-form-container::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    .profile-form-container {
        scrollbar-width: none;
        -ms-overflow-style: none;
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
        z-index: 10;
        transition: all var(--transition-speed) ease;
        font-size: 1.1rem;
        pointer-events: auto;
    }
    .edit-pen-btn:hover {
        background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
        transform: scale(1.1) rotate(15deg);
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
    }
    .edit-pen-btn:active {
        transform: scale(0.95);
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

    /* Medical Information Styles */
    .profile-form textarea {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--input-border-color);
        border-radius: 8px;
        font-size: 1rem;
        transition: all var(--transition-speed) ease;
        background-color: var(--white);
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
    }

    .profile-form textarea:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 4px rgba(30, 58, 102, 0.15);
        outline: none;
    }

    .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px 16px;
        margin-top: 8px;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 6px;
        transition: background-color var(--transition-speed) ease;
        user-select: none;
    }

    .checkbox-label:hover {
        background-color: var(--light-gray);
    }

    .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--primary-color);
        flex-shrink: 0;
    }

    .checkbox-label span {
        font-size: 0.95rem;
        color: var(--text-color);
        line-height: 1.4;
    }

    .family-history-table-container {
        overflow-x: auto;
        margin-top: 16px;
        border-radius: 8px;
        border: 2px solid var(--medium-gray);
    }

    .family-history-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 800px;
        background-color: var(--white);
    }

    .family-history-table thead {
        background: linear-gradient(to right, var(--light-gray) 0%, #e3e7eb 100%);
    }

    .family-history-table th {
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--primary-color);
        border: 1px solid var(--medium-gray);
        line-height: 1.3;
    }

    .family-history-table td {
        padding: 10px 8px;
        text-align: center;
        border: 1px solid var(--medium-gray);
    }

    .family-history-table tbody tr:hover {
        background-color: var(--light-gray);
    }

    .family-member-label {
        font-weight: 600;
        color: var(--primary-color);
        text-align: left !important;
        padding-left: 16px !important;
        min-width: 120px;
    }

    .family-history-table input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--primary-color);
    }

    @media (max-width: 768px) {
        .checkbox-grid {
            grid-template-columns: 1fr;
            gap: 8px;
        }

        .family-history-table {
            font-size: 0.85rem;
        }

        .family-history-table th,
        .family-history-table td {
            padding: 8px 4px;
        }

        .family-member-label {
            font-size: 0.85rem;
        }
    }

</style>