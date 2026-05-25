<script lang="ts">
    import { onMount } from "svelte";
    import { getFirestore, setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
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

    // Password change state variables
    let currentPassword = "";
    let newPassword = "";
    let confirmNewPassword = "";
    let showPasswordSection = false;
    let showCurrentPassword = false;
    let showNewPassword = false;
    let showConfirmNewPassword = false;

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

    type MedicalConditions = typeof medicalConditions;
    type SurgicalHistory = typeof surgicalHistory;
    type FamilyHistory = typeof familyHistory;

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
        medicalConditions?: MedicalConditions;
        surgicalHistory?: SurgicalHistory;
        familyHistory?: FamilyHistory;
        otherMedicalConditions?: string;
        otherFamilyHistory?: string;
        bloodTransfusionHistory?: string;
        bloodTransfusionDate?: string;
    };

    type Appointment = {
        id: string;
        date: string;
        time: string;
        requestedDate?: string;
        requestedTime?: string;
        service: string;
        status?: string;
        cancellationStatus?: string;
        subServices?: string[];
        remarks?: string;
    };

    function parseAppointmentDateTime(date: string, time: string): Date | null {
        if (!date || !time) return null;

        const dateParts = date.split('-').map(Number);
        if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) return null;

        const [year, month, day] = dateParts;
        const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!timeMatch) return null;

        const hourRaw = Number(timeMatch[1]);
        const minute = Number(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();

        if (Number.isNaN(hourRaw) || Number.isNaN(minute)) return null;

        let hour = hourRaw % 12;
        if (period === 'PM') hour += 12;

        return new Date(year, month - 1, day, hour, minute, 0, 0);
    }

    function isPastAppointment(appointment: Appointment): boolean {
        const doneStatuses = ['completed', 'completed: need follow-up', 'missed', 'cancelled', 'decline', 'declined'];
        const status = (appointment.status || '').toLowerCase().trim();
        if (doneStatuses.includes(status)) return true;

        // Also treat any appointment whose cancellationStatus is approved as done
        const cancellationStatus = (appointment.cancellationStatus || '').toLowerCase().trim();
        if (cancellationStatus === 'approved') return true;

        const appointmentDate = parseAppointmentDateTime(appointment.date, appointment.time);
        if (!appointmentDate) return false;

        return appointmentDate.getTime() < Date.now();
    }

    function isActiveUpcomingAppointment(appointment: Appointment): boolean {
        const status = (appointment.status || '').toLowerCase().trim();
        const cancellationStatus = (appointment.cancellationStatus || '').toLowerCase().trim();

        const excludedStatuses = ['decline', 'cancelled', 'cancellationrequested', 'completed', 'completed: need follow-up', 'missed'];
        if (excludedStatuses.includes(status)) return false;
        if (cancellationStatus === 'approved' || cancellationStatus === 'requested' || cancellationStatus === 'pending') return false;

        const explicitlyUpcomingStatuses = ['accepted', 'confirmed', 'scheduled', 'rescheduled', 'reschedule requested', 'pending'];
        if (status && !explicitlyUpcomingStatuses.includes(status)) return false;

        const appointmentDate = parseAppointmentDateTime(appointment.date, appointment.time);
        if (!appointmentDate) return false;

        return appointmentDate.getTime() >= Date.now();
    }

    function getAppointmentStatusClass(status?: string): string {
        const normalized = (status || 'pending').toLowerCase().trim();

        if (normalized.includes('complete')) return 'status-completed';
        if (normalized.includes('accept') || normalized.includes('confirm') || normalized.includes('schedule') || normalized.includes('resched')) return 'status-confirmed';
        if (normalized.includes('cancel') || normalized.includes('decline') || normalized.includes('missed')) return 'status-cancelled';

        return 'status-pending';
    }

    function scrollHistoryCarousel(direction: number) {
        if (!historyCarousel) return;

        historyCarousel.scrollBy({
            left: direction * Math.max(historyCarousel.clientWidth * 0.85, 320),
            behavior: 'smooth'
        });
    }

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
        medicalConditions: JSON.parse(JSON.stringify(medicalConditions)),
        surgicalHistory: JSON.parse(JSON.stringify(surgicalHistory)),
        familyHistory: JSON.parse(JSON.stringify(familyHistory)),
        otherMedicalConditions: '',
        otherFamilyHistory: '',
        bloodTransfusionHistory: '',
        bloodTransfusionDate: ''
    };

    let currentUser: User | null = null;
    let isEditingProfile = false; 
    let doneAppointments: Appointment[] = [];
    let upcomingAppointment: Appointment | null = null;
    let showDetails = false;
    let isMobile = false;
    let isArchived: boolean = false;
    let historyCarousel: HTMLDivElement | null = null;
    $: accountStatus = isArchived ? 'Inactive' : 'Active';

    // ── History search / filter / expand state ──────────────────────────────
    let historySearchQuery = "";
    let historyFilter = "all";
    let expandedRemarks = new Set<string>();

    function toggleRemarks(id: string) {
        const next = new Set(expandedRemarks);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        expandedRemarks = next;
    }

    function getServiceIcon(service: string): string {
        const s = (service || '').toLowerCase();
        if (s.includes('lab') || s.includes('blood') || s.includes('urine') || s.includes('test')) return 'fa-vials';
        if (s.includes('imag') || s.includes('x-ray') || s.includes('xray') || s.includes('mri') || s.includes('ct') || s.includes('ultrasound') || s.includes('scan')) return 'fa-x-ray';
        if (s.includes('consult') || s.includes('check') || s.includes('visit') || s.includes('follow')) return 'fa-stethoscope';
        if (s.includes('dental') || s.includes('tooth') || s.includes('oral')) return 'fa-tooth';
        if (s.includes('eye') || s.includes('ophthal') || s.includes('vision')) return 'fa-eye';
        if (s.includes('cardio') || s.includes('heart') || s.includes('echo')) return 'fa-heartbeat';
        if (s.includes('surgery') || s.includes('surgical') || s.includes('operation')) return 'fa-syringe';
        return 'fa-calendar-check';
    }

    function getServiceColorClass(service: string): string {
        const s = (service || '').toLowerCase();
        if (s.includes('lab') || s.includes('blood') || s.includes('urine') || s.includes('test')) return 'svc-lab';
        if (s.includes('imag') || s.includes('x-ray') || s.includes('xray') || s.includes('mri') || s.includes('ct') || s.includes('ultrasound') || s.includes('scan')) return 'svc-imaging';
        if (s.includes('consult') || s.includes('check') || s.includes('visit') || s.includes('follow')) return 'svc-consult';
        if (s.includes('cardio') || s.includes('heart')) return 'svc-cardio';
        return 'svc-default';
    }

    function formatAppointmentDate(dateStr: string): string {
        if (!dateStr) return 'N/A';
        try {
            const parts = dateStr.split('-').map(Number);
            if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    }

    function getTimelineSteps(appointment: Appointment): { label: string; done: boolean; active: boolean }[] {
        const status = (appointment.status || '').toLowerCase().trim();
        const steps = [
            { label: 'Requested', done: true, active: false },
            { label: 'Approved', done: false, active: false },
            { label: 'Completed', done: false, active: false }
        ];
        if (['accepted', 'confirmed', 'scheduled', 'rescheduled', 'reschedule requested'].some(s => status.includes(s))) {
            steps[1].done = true; steps[1].active = true;
        } else if (status.includes('complet')) {
            steps[1].done = true; steps[2].done = true; steps[2].active = true;
        } else if (['cancel', 'decline', 'missed'].some(s => status.includes(s))) {
            // only first step done
        } else {
            steps[0].active = true; // pending
        }
        return steps;
    }

    $: filteredDoneAppointments = [...doneAppointments]
        .sort((a, b) => {
            const da = parseAppointmentDateTime(a.date, a.time);
            const db2 = parseAppointmentDateTime(b.date, b.time);
            return (db2?.getTime() ?? 0) - (da?.getTime() ?? 0);
        })
        .filter((apt) => {
            const status = (apt.status || '').toLowerCase().trim();
            const service = (apt.service || '').toLowerCase();
            const matchesFilter = (() => {
                if (historyFilter === 'all') return true;
                if (historyFilter === 'completed') return status.includes('complet');
                if (historyFilter === 'pending') return status === 'pending' || status === '';
                if (historyFilter === 'cancelled') return ['cancel', 'decline', 'missed'].some(s => status.includes(s));
                if (historyFilter === 'laboratory') return service.includes('lab') || service.includes('blood') || service.includes('urine') || service.includes('test');
                if (historyFilter === 'imaging') return service.includes('imag') || service.includes('x-ray') || service.includes('xray') || service.includes('mri') || service.includes('ct') || service.includes('ultrasound') || service.includes('scan');
                return true;
            })();
            if (!matchesFilter) return false;
            if (!historySearchQuery.trim()) return true;
            const q = historySearchQuery.toLowerCase();
            return (
                apt.service?.toLowerCase().includes(q) ||
                apt.date?.toLowerCase().includes(q) ||
                apt.status?.toLowerCase().includes(q) ||
                apt.subServices?.some(s => s.toLowerCase().includes(q)) ||
                apt.remarks?.toLowerCase().includes(q)
            ) ?? false;
        });

    function normalizeGender(value: unknown): string {
        if (typeof value !== 'string') return '';
        const normalized = value.trim().toLowerCase();
        const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        return allowedGenders.includes(normalized) ? normalized : '';
    }

    function sanitizeOptionalEmail(value: unknown): string {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';

        const placeholderValues = ['n/a', 'na', 'none', 'null', '-'];
        return placeholderValues.includes(trimmed.toLowerCase()) ? '' : trimmed;
    }

    function formatGenderLabel(value: unknown): string {
        const normalized = normalizeGender(value);
        if (!normalized) return 'N/A';
        if (normalized === 'prefer_not_to_say') return 'Prefer not to say';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function getDefaultFamilyHistory() {
        return {
            mother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            father: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            sister: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            brother: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            daughter: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            son: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false },
            otherRelative: { alcoholAbuse: false, breastCancer: false, ovarianCancer: false, prostateCancer: false, otherCancer: false, diabetes: false, heartDisease: false, highCholesterol: false, hypertension: false, mentalIllness: false }
        };
    }

    function ensureFamilyHistoryComplete(data: any): typeof familyHistory {
        const defaults = getDefaultFamilyHistory();
        if (!data || typeof data !== 'object') return defaults;
        
        // Merge data with defaults to ensure all nested properties exist
        const result = { ...defaults };
        for (const member in defaults) {
            if (data[member] && typeof data[member] === 'object') {
                result[member as keyof typeof defaults] = { ...defaults[member as keyof typeof defaults], ...data[member] };
            }
        }
        return result;
    }

    $: normalizedPatientGender = normalizeGender(patientProfile.gender);

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
                    patientProfile.gender = normalizeGender(patientProfile.gender);
                    patientProfile.email = sanitizeOptionalEmail(patientProfile.email);
                    // Get the customUserId from the users collection
                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        patientProfile.id = userData.customUserId || "N/A";
                        isArchived = Boolean(userData.isArchived ?? userData.archived ?? false);
                    } else {
                        // Fallback: some projects store archive flag on profile
                        const patientData = patientDoc.data() as { isArchived?: boolean; archived?: boolean };
                        const archivedFlag = patientData.isArchived ?? patientData.archived;
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
                    where("patientId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(qAppointments);
                const allAppointments = querySnapshot.docs.map((doc) => {
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
                    const rawStatus = data.status ? String(data.status) : '';
                    const normalizedStatus = rawStatus.toLowerCase().trim();
                    const requestedDate = String(data.requestedDate ?? '');
                    const requestedTime = String(data.requestedTime ?? '');
                    const useApprovedRescheduledSchedule = normalizedStatus === 'rescheduled' && (!data.date || !data.time) && !!requestedDate && !!requestedTime;

                    const appointment: Appointment = {
                        id: doc.id,
                        date: useApprovedRescheduledSchedule ? requestedDate : String(data.date ?? ''),
                        time: useApprovedRescheduledSchedule ? requestedTime : String(data.time ?? ''),
                        requestedDate: requestedDate || undefined,
                        requestedTime: requestedTime || undefined,
                        service: String(data.service ?? ''),
                        status: rawStatus || undefined,
                        cancellationStatus: data.cancellationStatus ? String(data.cancellationStatus) : undefined,
                        subServices: Array.isArray(data.subServices) ? data.subServices : undefined,
                        remarks: remarksValue
                    };

                    return appointment;
                });

                doneAppointments = allAppointments.filter((appointment) => isPastAppointment(appointment));

                const upcomingAppointments = allAppointments
                    .filter((appointment) => isActiveUpcomingAppointment(appointment))
                    .sort((a, b) => {
                        const dateA = parseAppointmentDateTime(a.date, a.time);
                        const dateB = parseAppointmentDateTime(b.date, b.time);

                        const timeA = dateA ? dateA.getTime() : Number.POSITIVE_INFINITY;
                        const timeB = dateB ? dateB.getTime() : Number.POSITIVE_INFINITY;
                        return timeA - timeB;
                    });

                upcomingAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
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
            upcomingAppointment = null;
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
        .filter(([, value]) => !value)
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
            gender: normalizeGender(formGender),
            email: sanitizeOptionalEmail(formEmail),
            phone: cleanedPhone,
            address: formHomeAddress,
            id: customUserId,
            profileImage: profileImage,
            bloodType: formBloodType,
            allergies: formAllergies,
            currentMedications: formCurrentMedications,
            medicalConditions: patientProfile.medicalConditions ?? medicalConditions,
            surgicalHistory: patientProfile.surgicalHistory ?? surgicalHistory,
            familyHistory: patientProfile.familyHistory ?? familyHistory,
            otherMedicalConditions: patientProfile.otherMedicalConditions ?? formOtherMedicalConditions,
            otherFamilyHistory: patientProfile.otherFamilyHistory ?? formOtherFamilyHistory,
            bloodTransfusionHistory: patientProfile.bloodTransfusionHistory ?? formBloodTransfusionHistory,
            bloodTransfusionDate: patientProfile.bloodTransfusionDate ?? formBloodTransfusionDate
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

async function changePassword() {
    if (!currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'Not Logged In',
            text: 'Please log in to change your password.'
        });
        return;
    }

    // Validate password fields
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please fill in all password fields.'
        });
        return;
    }

    if (newPassword !== confirmNewPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Passwords Do Not Match',
            text: 'New password and confirmation do not match.'
        });
        return;
    }

    if (newPassword.length < 6) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be at least 6 characters long.'
        });
        return;
    }

    if (newPassword === currentPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Same Password',
            text: 'New password must be different from current password.'
        });
        return;
    }

    try {
        // Reauthenticate user before changing password
        const credential = EmailAuthProvider.credential(
            currentUser.email!,
            currentPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        Swal.fire({
            icon: 'success',
            title: 'Password Changed',
            text: 'Your password has been updated successfully.'
        });
        
        // Clear password fields
        currentPassword = "";
        newPassword = "";
        confirmNewPassword = "";
        showPasswordSection = false;
        
    } catch (error: unknown) {
        console.error("Error changing password:", error);
        
        let errorMessage = 'Failed to change password. Please try again.';
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: unknown }).code)
            : '';
        
        if (errorCode === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect.';
        } else if (errorCode === 'auth/weak-password') {
            errorMessage = 'New password is too weak.';
        } else if (errorCode === 'auth/requires-recent-login') {
            errorMessage = 'Please log out and log back in before changing your password.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
        });
    }
}

function toggleEditProfile() {
    try {
        // Guard: Ensure user is logged in
        if (!currentUser) {
            Swal.fire({
                icon: 'warning',
                title: 'Not Logged In',
                text: 'Please log in to edit your profile.'
            });
            return;
        }

        if (!patientProfile) {
            Swal.fire({
                icon: 'warning',
                title: 'Profile Not Loaded',
                text: 'Your profile is loading. Please try again in a moment.'
            });
            return;
        }

        isEditingProfile = !isEditingProfile; 

        if (isEditingProfile) {
            // Disable body scroll when modal opens
            document.body.style.overflow = 'hidden';
            
            formPatientName = patientProfile.name || '';
            formMiddleName = patientProfile.middleName || '';
            formLastName = patientProfile.lastName || '';
            formSuffix = patientProfile.suffix || '';
            formAge = patientProfile.age || '';
            formBirthday = patientProfile.birthday || ''; 
            formGender = normalizeGender(patientProfile.gender);
            formEmail = sanitizeOptionalEmail(patientProfile.email);
            formPhone = patientProfile.phone || '';
            formHomeAddress = patientProfile.address || '';
            
            // Load medical information
            formBloodType = patientProfile.bloodType || '';
            formAllergies = patientProfile.allergies || '';
            formCurrentMedications = patientProfile.currentMedications || '';
            
            // Handle medicalConditions - could be array or object
            let medConditionsData = patientProfile.medicalConditions;
            if (Array.isArray(medConditionsData)) {
                // If it's an array from admin registration, store as string for now
                formOtherMedicalConditions = medConditionsData.join(', ');
                medicalConditions = {
                    anemia: false, anxiety: false, arthritis: false, asthma: false,
                    bloodTransfusion: false, cancer: false, clottingDisorder: false,
                    congestiveHeartFailure: false, depression: false, diabetesMellitus: false,
                    emphysema: false, gastroEsophagealReflux: false, glaucoma: false,
                    heartMurmur: false, hivAids: false, highCholesterol: false, hypertension: false
                };
            } else if (medConditionsData && typeof medConditionsData === 'object') {
                medicalConditions = JSON.parse(JSON.stringify(medConditionsData));
            } else {
                medicalConditions = {
                    anemia: false, anxiety: false, arthritis: false, asthma: false,
                    bloodTransfusion: false, cancer: false, clottingDisorder: false,
                    congestiveHeartFailure: false, depression: false, diabetesMellitus: false,
                    emphysema: false, gastroEsophagealReflux: false, glaucoma: false,
                    heartMurmur: false, hivAids: false, highCholesterol: false, hypertension: false
                };
            }
            
            // Handle surgicalHistory - could be string or object
            let surgicalData = patientProfile.surgicalHistory;
            if (typeof surgicalData === 'string') {
                // If it's a string, it will be displayed in otherMedicalConditions
                surgicalHistory = {
                    appendectomy: false, brainSurgery: false, breastSurgery: false, cabg: false,
                    cholecystectomy: false, colonSurgery: false, tonsillectomy: false,
                    thyroidSurgery: false, lungSurgery: false, csection: false, eyeSurgery: false,
                    fracturesSurgery: false, herniaRepair: false, hysterectomy: false,
                    jointSurgery: false, pancreatomy: false, varicoseVeinSurgery: false,
                    prostateSurgery: false, weightReductionSurgery: false
                };
            } else if (surgicalData && typeof surgicalData === 'object') {
                surgicalHistory = JSON.parse(JSON.stringify(surgicalData));
            } else {
                surgicalHistory = {
                    appendectomy: false, brainSurgery: false, breastSurgery: false, cabg: false,
                    cholecystectomy: false, colonSurgery: false, tonsillectomy: false,
                    thyroidSurgery: false, lungSurgery: false, csection: false, eyeSurgery: false,
                    fracturesSurgery: false, herniaRepair: false, hysterectomy: false,
                    jointSurgery: false, pancreatomy: false, varicoseVeinSurgery: false,
                    prostateSurgery: false, weightReductionSurgery: false
                };
            }
            
            // Handle familyHistory - could be array or object
            let familyData = patientProfile.familyHistory;
            if (Array.isArray(familyData)) {
                // If it's an array from admin registration, store as string for now
                formOtherFamilyHistory = (patientProfile.otherFamilyHistory || '') + (patientProfile.otherFamilyHistory ? ', ' : '') + familyData.join(', ');
                familyHistory = getDefaultFamilyHistory();
            } else if (familyData && typeof familyData === 'object') {
                familyHistory = ensureFamilyHistoryComplete(familyData);
            } else {
                familyHistory = getDefaultFamilyHistory();
            }
            
            formOtherMedicalConditions = formOtherMedicalConditions || patientProfile.otherMedicalConditions || '';
            formOtherFamilyHistory = formOtherFamilyHistory || patientProfile.otherFamilyHistory || '';
            formBloodTransfusionHistory = patientProfile.bloodTransfusionHistory || '';
            formBloodTransfusionDate = patientProfile.bloodTransfusionDate || '';
            profileImage = patientProfile.profileImage || '';
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
        
        // Reset password fields
        currentPassword = "";
        newPassword = "";
        confirmNewPassword = "";
        showPasswordSection = false;
        
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
    } catch (error) {
        console.error("Error in toggleEditProfile:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Profile',
            text: 'There was an error loading your profile data for editing. Please try again or contact support.'
        });
        isEditingProfile = false;
        document.body.style.overflow = '';
    }
}

    async function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            Swal.fire('Error', 'Image size should be less than 5MB', 'error');
            return;
        }

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
                };
                img.onerror = () => {
                    Swal.fire('Error', 'Invalid image file', 'error');
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            Swal.fire('Error', 'Failed to upload image', 'error');
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
                        <p><i class="fas fa-id-card icon-label" title="Member ID"></i> {patientProfile.id || "N/A"}</p>
                        <p><i class="fas fa-birthday-cake icon-label" title="Age"></i> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                        <p><i class="fas fa-{normalizedPatientGender === 'male' ? 'mars' : normalizedPatientGender === 'female' ? 'venus' : 'genderless'} icon-label" title="Gender"></i> {formatGenderLabel(patientProfile.gender)}</p>
                        <p><i class="fas fa-phone icon-label" title="Phone"></i> {patientProfile.phone || "N/A"}</p>
                        <p><i class="fas fa-envelope icon-label" title="Email"></i> {patientProfile.email || "N/A"}</p>
                        <p class="address-info"><i class="fas fa-map-marker-alt icon-label" title="Address"></i> {patientProfile.address || "N/A"}</p>
                    </div>
                {/if}
            {:else}
                <div class="info-grid">
                    <p><i class="fas fa-id-card icon-label" title="Member ID"></i> {patientProfile.id || "N/A"}</p>
                    <p><i class="fas fa-birthday-cake icon-label" title="Age"></i> {patientProfile.age != null ? patientProfile.age : "N/A"}</p>
                    <p><i class="fas fa-{normalizedPatientGender === 'male' ? 'mars' : normalizedPatientGender === 'female' ? 'venus' : 'genderless'} icon-label" title="Gender"></i> {formatGenderLabel(patientProfile.gender)}</p>
                    <p><i class="fas fa-phone icon-label" title="Phone"></i> {patientProfile.phone || "N/A"}</p>
                    <p><i class="fas fa-envelope icon-label" title="Email"></i> {patientProfile.email || "N/A"}</p>
                    <p class="address-info"><i class="fas fa-map-marker-alt icon-label" title="Address"></i> {patientProfile.address || "N/A"}</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- ========== Upcoming Appointment ========== -->
    <div class="upcoming-section">
        <div class="upcoming-section-header">
            <div class="hist-header-left">
                <i class="fas fa-calendar-alt hist-title-icon" aria-hidden="true"></i>
                <h2 class="hist-title">Next Appointment</h2>
            </div>
        </div>
        {#if upcomingAppointment}
            <article class="upcoming-card-new">
                <div class="upcoming-card-left">
                    <div class="upcoming-svc-icon {getServiceColorClass(upcomingAppointment.service)}" aria-hidden="true">
                        <i class="fas {getServiceIcon(upcomingAppointment.service)}"></i>
                    </div>
                    <div>
                        <p class="upcoming-svc-name">{upcomingAppointment.service || 'Appointment'}</p>
                        <span class="status-pill {getAppointmentStatusClass(upcomingAppointment.status)}">{upcomingAppointment.status || 'Pending'}</span>
                    </div>
                </div>
                <div class="upcoming-card-right">
                    <div class="upcoming-meta-item">
                        <i class="fas fa-calendar-day" aria-hidden="true"></i>
                        <span>{formatAppointmentDate(upcomingAppointment.date)}</span>
                    </div>
                    <div class="upcoming-meta-item">
                        <i class="fas fa-clock" aria-hidden="true"></i>
                        <span>{upcomingAppointment.time || 'N/A'}</span>
                    </div>
                    {#if upcomingAppointment.subServices && upcomingAppointment.subServices.length > 0}
                        <div class="upcoming-meta-item upcoming-meta-services">
                            <i class="fas fa-list-ul" aria-hidden="true"></i>
                            <span>{upcomingAppointment.subServices.join(' · ')}</span>
                        </div>
                    {/if}
                </div>
            </article>
        {:else}
            <div class="hist-empty">
                <i class="fas fa-calendar-plus hist-empty-icon" aria-hidden="true"></i>
                <p>No upcoming appointment scheduled.</p>
            </div>
        {/if}
    </div>

    <!-- ========== Appointment History ========== -->
    <div class="hist-section">
        <!-- Header row -->
        <div class="hist-header">
            <div class="hist-header-left">
                <i class="fas fa-calendar-alt hist-title-icon" aria-hidden="true"></i>
                <h2 class="hist-title">Appointment History</h2>
            </div>
            <div class="hist-search-wrapper">
                <i class="fas fa-search hist-search-icon" aria-hidden="true"></i>
                <input
                    type="search"
                    class="hist-search-input"
                    placeholder="Search appointment..."
                    bind:value={historySearchQuery}
                    aria-label="Search appointments"
                />
            </div>
        </div>

        <!-- Filter pills -->
        <div class="hist-filters" role="group" aria-label="Filter appointments">
            {#each [
                { key: 'all',        label: 'All',        icon: 'fa-layer-group' },
                { key: 'completed',  label: 'Completed',  icon: 'fa-check-circle' },
                { key: 'pending',    label: 'Pending',    icon: 'fa-hourglass-half' },
                { key: 'cancelled',  label: 'Cancelled',  icon: 'fa-times-circle' }
            ] as pill}
                <button
                    type="button"
                    class="filter-pill {historyFilter === pill.key ? 'filter-pill--active' : ''}"
                    on:click={() => historyFilter = pill.key}
                    aria-pressed={historyFilter === pill.key}
                >
                    <i class="fas {pill.icon}" aria-hidden="true"></i>
                    {pill.label}
                </button>
            {/each}
        </div>

        <!-- Timeline -->
        {#if filteredDoneAppointments.length === 0}
            <div class="hist-empty">
                <i class="fas fa-calendar-times hist-empty-icon" aria-hidden="true"></i>
                <p>{doneAppointments.length === 0 ? 'No past visits recorded.' : 'No appointments match your search.'}</p>
            </div>
        {:else}
            <div class="tl-list" role="list">
                {#each filteredDoneAppointments as apt (apt.id)}
                    <div class="tl-item" role="listitem">
                        <!-- Dot + vertical line -->
                        <div class="tl-spine" aria-hidden="true">
                            <div class="tl-dot tl-dot--{getAppointmentStatusClass(apt.status)}"></div>
                            <div class="tl-vline"></div>
                        </div>

                        <!-- Card -->
                        <article class="tl-card">
                            <!-- Card top: icon + title + status -->
                            <div class="tl-card-top">
                                <div class="tl-svc-icon {getServiceColorClass(apt.service)}" aria-hidden="true">
                                    <i class="fas {getServiceIcon(apt.service)}"></i>
                                </div>
                                <div class="tl-card-info">
                                    <div class="tl-title-row">
                                        <span class="tl-svc-name">{apt.service || 'Appointment'}</span>
                                        <span class="status-pill {getAppointmentStatusClass(apt.status)}">{apt.status || 'Completed'}</span>
                                    </div>
                                    <div class="tl-chips-row">
                                        <span class="tl-chip">
                                            <i class="fas fa-calendar-day" aria-hidden="true"></i>
                                            {formatAppointmentDate(apt.date)}
                                        </span>
                                        <span class="tl-chip">
                                            <i class="fas fa-clock" aria-hidden="true"></i>
                                            {apt.time || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Sub-services -->
                            {#if apt.subServices && apt.subServices.length > 0}
                                <div class="tl-subservices">
                                    <span class="tl-sub-label">Selected Services</span>
                                    <div class="tl-sub-chips">
                                        {#each apt.subServices as sub}
                                            <span class="tl-sub-chip">{sub}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Progress steps: Requested → Approved → Completed -->
                            <div class="tl-steps" aria-label="Appointment progress">
                                {#each getTimelineSteps(apt) as step, i}
                                    <div class="tl-step {step.done ? 'tl-step--done' : ''} {step.active ? 'tl-step--active' : ''}">
                                        <div class="tl-step-node" aria-hidden="true"></div>
                                        {#if i < 2}
                                            <div class="tl-step-bar {step.done ? 'tl-step-bar--done' : ''}" aria-hidden="true"></div>
                                        {/if}
                                        <span class="tl-step-label">{step.label}</span>
                                    </div>
                                {/each}
                            </div>

                            <!-- Remarks with Read More -->
                            {#if apt.remarks}
                                <div class="tl-remarks">
                                    <p class="tl-remarks-label">
                                        <i class="fas fa-comment-medical" aria-hidden="true"></i>
                                        Doctor's Remarks
                                    </p>
                                    <div class="tl-remarks-body {expandedRemarks.has(apt.id) ? 'tl-remarks--expanded' : 'tl-remarks--collapsed'}">
                                        {apt.remarks}
                                    </div>
                                    <button
                                        type="button"
                                        class="tl-readmore-btn"
                                        on:click={() => toggleRemarks(apt.id)}
                                        aria-expanded={expandedRemarks.has(apt.id)}
                                    >
                                        {expandedRemarks.has(apt.id) ? 'Show Less' : 'Read More'}
                                        <i class="fas {expandedRemarks.has(apt.id) ? 'fa-chevron-up' : 'fa-chevron-down'}" aria-hidden="true"></i>
                                    </button>
                                </div>
                            {/if}
                        </article>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

{#if isEditingProfile}
    <div class="modal-overlay" 
        role="presentation"
        on:click={(e) => e.currentTarget === e.target && toggleEditProfile()}
        on:keydown={(e) => e.key === 'Escape' && toggleEditProfile()}
        tabindex="-1"
    >
    <div class="profile-form-container slide-down" 
        role="dialog"
        aria-label="Edit Member Information"
    >
        <div class="form-header">
            <div>
                <h3 class="form-title">Edit Member Information</h3>
                <p class="form-description">Review and update your personal and medical details below.</p>
            </div>
            <button type="button" class="modal-close-btn" on:click={toggleEditProfile} aria-label="Close edit form">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form class="profile-form" on:submit|preventDefault={savePatientProfile}>
            <div class="profile-form-body">
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
                        <input id="email" type="text" inputmode="email" autocomplete="email" bind:value={formEmail} placeholder="your.email@example.com (optional)" />
                    </div>
                    <div class="form-group full-width"> 
                        <label for="home-address">Home Address</label>
                        <input id="home-address" type="text" bind:value={formHomeAddress} placeholder="Ex. 123 4th Street, Sta. Rita Salcedo Village, Olongapo City, Zambales" />
                    </div>
                </div>
            </div>
            
            <!-- Medical Information Section -->
            <div class="form-section">
                <h4 class="section-subtitle">Medical Information</h4>
                <div class="input-grid">
                    <div class="form-group">
                        <label for="bloodType">Blood Type (Optional)</label>
                        <input type="text" id="bloodType" bind:value={formBloodType} placeholder="Ex. O+, A-, B+"/>
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
            <div class="form-section admin-readonly-section">
                <h4 class="section-subtitle">Your Medical Conditions (check all that apply)</h4>
                <fieldset class="admin-readonly-group" disabled aria-label="Medical conditions (admin only)">
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
                </fieldset>
            </div>
            
            <!-- Surgical History Section -->
            <div class="form-section admin-readonly-section">
                <h4 class="section-subtitle">Surgical History (check all that apply)</h4>
                <fieldset class="admin-readonly-group" disabled aria-label="Surgical history (admin only)">
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
                </fieldset>
            </div>
            
            <!-- Family History Section -->
            <div class="form-section admin-readonly-section">
                <h4 class="section-subtitle">Family History (check all that apply)</h4>
                <fieldset class="admin-readonly-group" disabled aria-label="Family history (admin only)">
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
                </fieldset>
            </div>
            
            <!-- Other Medical Information Section -->
            <div class="form-section admin-readonly-section">
                <h4 class="section-subtitle">Other Medical Information</h4>
                <fieldset class="admin-readonly-group" disabled aria-label="Other medical information (admin only)">
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
                </fieldset>
            </div>
            
            <!-- Password Change Section -->
            <div class="form-section">
                <div class="password-section-header">
                    <h4 class="section-subtitle">Change Password</h4>
                    <button 
                        type="button" 
                        class="toggle-password-btn"
                        on:click={() => showPasswordSection = !showPasswordSection}
                    >
                        {showPasswordSection ? 'Hide' : 'Show'}
                        <i class="fas {showPasswordSection ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                    </button>
                </div>
                
                {#if showPasswordSection}
                    <div class="password-change-content">
                        <p class="password-info">
                            <i class="fas fa-info-circle"></i>
                            For security reasons, you'll need to enter your current password to set a new one.
                        </p>
                        
                        <div class="input-grid">
                            <div class="form-group">
                                <label for="currentPassword">
                                    Current Password <span class="required">*</span>
                                </label>
                                <div class="password-input-container">
                                    <input 
                                        type={showCurrentPassword ? "text" : "password"}
                                        id="currentPassword" 
                                        bind:value={currentPassword}
                                        placeholder="Enter current password"
                                        autocomplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        class="toggle-visibility-btn"
                                        on:click={() => showCurrentPassword = !showCurrentPassword}
                                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i class="fas {showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="newPassword">
                                    New Password <span class="required">*</span>
                                </label>
                                <div class="password-input-container">
                                    <input 
                                        type={showNewPassword ? "text" : "password"}
                                        id="newPassword" 
                                        bind:value={newPassword}
                                        placeholder="At least 6 characters"
                                        autocomplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        class="toggle-visibility-btn"
                                        on:click={() => showNewPassword = !showNewPassword}
                                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i class="fas {showNewPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="confirmNewPassword">
                                    Confirm New Password <span class="required">*</span>
                                </label>
                                <div class="password-input-container">
                                    <input 
                                        type={showConfirmNewPassword ? "text" : "password"}
                                        id="confirmNewPassword" 
                                        bind:value={confirmNewPassword}
                                        placeholder="Re-enter new password"
                                        autocomplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        class="toggle-visibility-btn"
                                        on:click={() => showConfirmNewPassword = !showConfirmNewPassword}
                                        aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i class="fas {showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="password-action-container">
                            <button 
                                type="button" 
                                class="change-password-btn"
                                on:click={changePassword}
                            >
                                <i class="fas fa-key"></i>
                                Change Password
                            </button>
                        </div>
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
        background: linear-gradient(180deg, #ffffff 0%, #f7fafc 100%);
        border: 1px solid #d7dee8;
        border-radius: var(--border-radius);
        padding: 28px;
        box-shadow: 0 24px 60px rgba(12, 27, 52, 0.28);
        position: relative;
        display: flex;
        flex-direction: column;
        max-width: 1100px;
        width: 100%;
        max-height: 88vh;
        overflow: hidden;
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

    .form-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin: 8px 0 24px;
        padding-bottom: 14px;
        border-bottom: 1px solid #dde5ef;
    }

     .form-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        margin: 0;
        line-height: 1.2;
    }

    .form-description {
        margin: 8px 0 0;
        color: #5b6878;
        font-size: 0.95rem;
    }

    .modal-close-btn {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #d0d9e5;
        background: #ffffff;
        color: #365071;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all var(--transition-speed) ease;
        flex-shrink: 0;
    }

    .modal-close-btn:hover {
        background: #f1f5f9;
        transform: translateY(-1px);
        color: var(--primary-color);
        box-shadow: 0 8px 18px rgba(16, 35, 64, 0.15);
    }

    .form-section {
        margin-bottom: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
        border: 1px solid #dfe6ef;
        border-radius: 10px;
        padding: 18px;
        box-shadow: 0 3px 12px rgba(18, 35, 61, 0.06);
    }

    .profile-form {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
    }

    .profile-form-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 6px;
        padding-bottom: 8px;
    }

    .profile-form-body::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    .profile-form-body {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .form-section:last-of-type {
        margin-bottom: 0;
    }

    .form-image-upload {
        display: flex;
        justify-content: center;
        margin-bottom: 18px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--medium-gray);
    }

    .section-subtitle {
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 14px;
        padding-bottom: 9px;
        border-bottom: 1px dashed #cdd7e4;
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
        font-size: 0.88rem;
        letter-spacing: 0.02em;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .profile-form input[type="text"],
    .profile-form input[type="tel"],
    .profile-form input[type="date"],
    .profile-form input[type="number"],
    .profile-form select {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #cfd8e5;
        border-radius: 8px;
        font-size: 1rem;
        transition: all var(--transition-speed) ease;
        background-color: #ffffff;
        font-family: inherit;
    }
    .profile-form input:focus,
    .profile-form select:focus {
        border-color: #3763a4;
        box-shadow: 0 0 0 3px rgba(55, 99, 164, 0.18);
        outline: none;
        background-color: #fefefe;
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
        margin-top: 18px;
        padding: 18px 0 4px;
        border-top: 1px solid #dbe3ee;
        background: #f7fafc;
        flex-shrink: 0;
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
            padding: 18px 14px;
            max-height: 95vh;
            margin-top: 10px;
        }
        .profile-form-body {
            padding-right: 0;
        }
        .form-header {
            margin: 4px 0 16px;
        }
        .form-title {
            font-size: 1.2rem;
        }
        .form-description {
            font-size: 0.88rem;
        }
        .form-section {
            padding: 14px;
            border-radius: 8px;
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
            padding: 14px 0 0;
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
        .details-section p, .details-section .address-info {
            color: #222 !important;
        }
        .info-grid {
            grid-template-columns: 1fr;
            gap: 6px;
        }
    }

    /* base status pill – colours now set per-status in timeline CSS block */
    .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: capitalize;
        border: 1px solid transparent;
        white-space: nowrap;
    }



    @media (max-width: 768px) {
        .meta-grid {
            grid-template-columns: 1fr;
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
        .patient-info {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .patient-info h1 {
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 8px;
            margin-top: 8px;
            width: 100%;
        }
        .status-badge {
            align-self: center;
            justify-content: center;
            margin: 0 auto 14px;
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
        .details-section p, .details-section .address-info {
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
        border: 1px solid #cfd8e5;
        border-radius: 8px;
        font-size: 1rem;
        transition: all var(--transition-speed) ease;
        background-color: var(--white);
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
    }

    .profile-form textarea:focus {
        border-color: #3763a4;
        box-shadow: 0 0 0 3px rgba(55, 99, 164, 0.18);
        outline: none;
    }

    .admin-readonly-section {
        background: #f4f7fb;
        border-color: #d6deea;
    }

    .admin-readonly-group {
        border: 0;
        margin: 0;
        padding: 0;
    }

    .admin-readonly-section .section-subtitle::after {
        content: ' (Admin only)';
        color: #6b7280;
        font-weight: 500;
    }

    .admin-readonly-section input:disabled,
    .admin-readonly-section select:disabled,
    .admin-readonly-section textarea:disabled {
        background-color: #eef2f7;
        color: #667085;
        cursor: not-allowed;
    }

    .admin-readonly-section .checkbox-label {
        cursor: not-allowed;
        background: #f7f9fc;
    }

    .admin-readonly-section .family-history-table tbody tr:hover {
        background-color: transparent;
    }

    /* Highlight checked disabled checkboxes in admin-only sections */
    .admin-readonly-section .checkbox-label input[type="checkbox"]:checked {
        accent-color: #059669;
        background-color: #d1fae5;
    }

    .admin-readonly-section .checkbox-label input[type="checkbox"]:checked + span {
        color: #047857;
        font-weight: 600;
    }

    .admin-readonly-section .checkbox-label:has(input[type="checkbox"]:checked) {
        background-color: #ecfdf5;
        border-color: #6ee7b7;
    }

    /* Highlight checked disabled checkboxes in family history table */
    .admin-readonly-section .family-history-table input[type="checkbox"]:checked {
        accent-color: #059669;
        background-color: #d1fae5;
    }

    .admin-readonly-section .family-history-table td:has(input[type="checkbox"]:checked) {
        background-color: #ecfdf5;
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
        border-radius: 8px;
        border: 1px solid #dbe4ef;
        background: #ffffff;
        transition: all var(--transition-speed) ease;
        user-select: none;
    }

    .checkbox-label:hover {
        background-color: #f8fbff;
        border-color: #c8d8ea;
    }

    .checkbox-label input[type="checkbox"]:checked + span {
        color: #1f4f84;
        font-weight: 600;
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
        border: 1px solid #dbe4ef;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
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

    /* Password Change Section Styles */
    .password-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0;
    }

    .toggle-password-btn {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all var(--transition-speed) ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toggle-password-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(30, 58, 102, 0.3);
    }

    .password-change-content {
        margin-top: 16px;
        padding: 20px;
        background: linear-gradient(to bottom, #f8fbff 0%, #ffffff 100%);
        border-radius: 8px;
        border: 1px solid #d7e1ee;
    }

    .password-info {
        background: linear-gradient(to right, #fff3cd 0%, #fff8e1 100%);
        border-left: 4px solid #ffc107;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 0.95rem;
        color: #856404;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .password-info i {
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .password-action-container {
        margin-top: 20px;
        display: flex;
        justify-content: flex-start;
    }

    .change-password-btn {
        background: #172f85;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all var(--transition-speed) ease;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 8px rgba(23, 47, 133, 0.3);
    }

    .change-password-btn:hover {
        background: #1a3592;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(23, 47, 133, 0.4);
    }

    .change-password-btn i {
        font-size: 1.1rem;
    }

    .password-input-container {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
    }

    .password-input-container input {
        width: 100%;
        padding-right: 40px;
    }

    .toggle-visibility-btn {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        cursor: pointer;
        color: #1e3a66;
        font-size: 1.1rem;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
    }

    .toggle-visibility-btn:hover {
        color: #172f85;
    }

    .toggle-visibility-btn:focus {
        outline: 2px solid #172f85;
        outline-offset: 2px;
        border-radius: 4px;
    }

    @media (max-width: 640px) {
        .password-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }

        .toggle-password-btn {
            width: 100%;
            justify-content: center;
        }

        .password-change-content {
            padding: 16px;
        }

        .password-action-container {
            width: 100%;
        }

        .change-password-btn {
            width: 100%;
            justify-content: center;
        }
    }

    /* Icon Label Styles */
    .icon-label {
        color: rgba(255, 255, 255, 0.95);
        margin-right: 10px;
        font-size: 1.15rem;
        min-width: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .patient-info .icon-label {
        color: rgba(255, 255, 255, 0.95);
    }

    /* Mobile details section - icons need to be dark on white background */
    .details-section .icon-label {
        color: var(--primary-color);
        text-shadow: none;
    }

    .info-grid p {
        display: flex;
        align-items: center;
        gap: 6px;
    }


    @media (max-width: 640px) {
        .icon-label {
            font-size: 1.05rem;
            margin-right: 8px;
            min-width: 20px;
        }
        
    }

    /* ═══════════════════════════════════════════════════════════════
       UPCOMING APPOINTMENT – redesigned
    ═══════════════════════════════════════════════════════════════ */
    .upcoming-section {
        margin: 28px 0 0;
    }

    .upcoming-section-header {
        margin-bottom: 12px;
    }

    .upcoming-card-new {
        display: flex;
        align-items: flex-start;
        gap: 20px;
        background: linear-gradient(135deg, #eef4ff 0%, #f0f9ff 100%);
        border: 1px solid #bfdbfe;
        border-radius: 16px;
        padding: 20px 24px;
        box-shadow: 0 4px 16px rgba(30, 58, 102, 0.08);
        transition: box-shadow var(--transition-speed) ease, transform var(--transition-speed) ease;
    }

    .upcoming-card-new:hover {
        box-shadow: 0 8px 24px rgba(30, 58, 102, 0.14);
        transform: translateY(-2px);
    }

    .upcoming-card-left {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        flex-shrink: 0;
    }

    .upcoming-svc-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        flex-shrink: 0;
    }

    .upcoming-svc-name {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--primary-color);
        display: block;
        margin-bottom: 6px;
    }

    .upcoming-card-right {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        flex: 1;
        align-items: center;
        justify-content: flex-end;
    }

    .upcoming-meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.92rem;
        color: #374151;
        background: rgba(255,255,255,0.8);
        border: 1px solid #dbeafe;
        border-radius: 8px;
        padding: 6px 12px;
        white-space: nowrap;
    }

    .upcoming-meta-item i {
        color: var(--primary-color);
        font-size: 0.88rem;
    }

    .upcoming-meta-services {
        white-space: normal;
        max-width: 100%;
    }

    /* ═══════════════════════════════════════════════════════════════
       APPOINTMENT HISTORY – new section
    ═══════════════════════════════════════════════════════════════ */
    .hist-section {
        margin-top: 36px;
    }

    .hist-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
    }

    .hist-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .hist-title-icon {
        color: var(--primary-color);
        font-size: 1.35rem;
    }

    .hist-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        margin: 0;
    }

    /* Search */
    .hist-search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    .hist-search-icon {
        position: absolute;
        left: 13px;
        color: #94a3b8;
        font-size: 0.9rem;
        pointer-events: none;
    }

    .hist-search-input {
        padding: 9px 16px 9px 36px;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        font-size: 0.93rem;
        background: #ffffff;
        color: #1e293b;
        outline: none;
        width: 240px;
        transition: border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
        font-family: inherit;
    }

    .hist-search-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    /* Filter pills */
    .hist-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 24px;
    }

    .filter-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 600;
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.01em;
    }

    .filter-pill i {
        font-size: 0.8rem;
    }

    .filter-pill:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: #eef2ff;
    }

    .filter-pill--active {
        background: var(--primary-color) !important;
        color: #ffffff !important;
        border-color: var(--primary-color) !important;
        box-shadow: 0 2px 8px rgba(30, 58, 102, 0.25);
    }

    /* Empty state */
    .hist-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 52px 20px;
        color: #94a3b8;
        text-align: center;
    }

    .hist-empty-icon {
        font-size: 2.8rem;
        opacity: 0.45;
    }

    .hist-empty p {
        font-size: 1rem;
        color: #64748b;
        margin: 0;
    }

    /* ═══════════════════════════════════════════════════════════════
       VERTICAL TIMELINE
    ═══════════════════════════════════════════════════════════════ */
    .tl-list {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .tl-item {
        display: flex;
        gap: 16px;
        position: relative;
    }

    /* Left column: dot + vertical line */
    .tl-spine {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
        padding-top: 14px;
    }

    .tl-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2.5px solid;
        flex-shrink: 0;
        z-index: 1;
    }

    .tl-dot--status-completed  { background: #dbeafe; border-color: #3b82f6; }
    .tl-dot--status-confirmed  { background: #dcfce7; border-color: #22c55e; }
    .tl-dot--status-cancelled  { background: #fee2e2; border-color: #ef4444; }
    .tl-dot--status-pending    { background: #fef9c3; border-color: #eab308; }

    .tl-vline {
        width: 2px;
        flex: 1;
        background: linear-gradient(to bottom, #cbd5e1 0%, transparent 100%);
        margin-top: 4px;
        min-height: 32px;
    }

    .tl-item:last-child .tl-vline {
        display: none;
    }

    /* Card */
    .tl-card {
        flex: 1;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 18px 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
        transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
        min-width: 0;
    }

    .tl-card:hover {
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        transform: translateY(-2px);
        border-color: #bfdbfe;
    }

    /* Card top */
    .tl-card-top {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 14px;
    }

    .tl-svc-icon {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    /* Service icon colour themes */
    .svc-lab      { background: #eff6ff; color: #2563eb; }
    .svc-imaging  { background: #f0fdf4; color: #16a34a; }
    .svc-consult  { background: #fdf4ff; color: #9333ea; }
    .svc-cardio   { background: #fff1f2; color: #e11d48; }
    .svc-default  { background: #f8fafc; color: #475569; }

    .tl-card-info {
        flex: 1;
        min-width: 0;
    }

    .tl-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 8px;
    }

    .tl-svc-name {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        word-break: break-word;
    }

    .tl-chips-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .tl-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.82rem;
        color: #475569;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 4px 10px;
        white-space: nowrap;
    }

    .tl-chip i {
        color: var(--primary-color);
        font-size: 0.78rem;
    }

    /* Sub-services */
    .tl-subservices {
        margin-bottom: 14px;
        padding-top: 12px;
        border-top: 1px dashed #e2e8f0;
    }

    .tl-sub-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 7px;
    }

    .tl-sub-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .tl-sub-chip {
        font-size: 0.82rem;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        padding: 3px 10px;
        font-weight: 500;
    }

    /* Progress steps */
    .tl-steps {
        display: flex;
        align-items: flex-start;
        margin-bottom: 14px;
        padding: 12px 14px;
        background: #f8fafc;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    .tl-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        flex: 1;
    }

    .tl-step-node {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #cbd5e1;
        border: 2px solid #94a3b8;
        z-index: 1;
        transition: all 0.25s ease;
        flex-shrink: 0;
    }

    .tl-step--done .tl-step-node,
    .tl-step--active .tl-step-node {
        background: var(--primary-color);
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(30, 58, 102, 0.18);
    }

    .tl-step--active .tl-step-node {
        background: #3b82f6;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    .tl-step-bar {
        position: absolute;
        top: 4px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: #cbd5e1;
        z-index: 0;
        transition: background 0.25s ease;
    }

    .tl-step-bar--done {
        background: var(--primary-color);
    }

    .tl-step-label {
        margin-top: 6px;
        font-size: 0.73rem;
        font-weight: 600;
        color: #94a3b8;
        text-align: center;
        white-space: nowrap;
        line-height: 1.3;
    }

    .tl-step--done .tl-step-label,
    .tl-step--active .tl-step-label {
        color: var(--primary-color);
    }

    .tl-step--active .tl-step-label {
        color: #3b82f6;
    }

    /* Remarks */
    .tl-remarks {
        padding-top: 12px;
        border-top: 1px dashed #e2e8f0;
    }

    .tl-remarks-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
    }

    .tl-remarks-label i {
        color: var(--primary-color);
    }

    .tl-remarks-body {
        font-size: 0.92rem;
        color: #374151;
        line-height: 1.65;
        overflow: hidden;
        transition: max-height 0.35s ease;
    }

    .tl-remarks--collapsed {
        max-height: 4.8em; /* ~3 lines */
        -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
        mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    }

    .tl-remarks--expanded {
        max-height: 1000px;
        -webkit-mask-image: none;
        mask-image: none;
    }

    .tl-readmore-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 6px;
        background: none;
        border: none;
        color: #3b82f6;
        font-size: 0.83rem;
        font-weight: 600;
        cursor: pointer;
        padding: 2px 0;
        transition: color 0.2s ease;
    }

    .tl-readmore-btn:hover {
        color: #1d4ed8;
    }

    /* Status pills – shared reuse */
    .status-pill.status-completed { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .status-pill.status-confirmed { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .status-pill.status-cancelled { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
    .status-pill.status-pending   { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }

    /* ── Responsive ─────────────────────────────────────────────── */
    @media (max-width: 768px) {
        .hist-header {
            flex-direction: column;
            align-items: flex-start;
        }

        .hist-search-input {
            width: 100%;
        }

        .hist-search-wrapper {
            width: 100%;
        }

        .upcoming-card-new {
            flex-direction: column;
        }

        .upcoming-card-right {
            justify-content: flex-start;
        }

        .tl-title-row {
            flex-direction: column;
            align-items: flex-start;
        }

        .tl-steps {
            padding: 10px 10px;
        }

        .tl-step-label {
            font-size: 0.68rem;
        }
    }

    @media (max-width: 480px) {
        .hist-filters {
            gap: 6px;
        }

        .filter-pill {
            padding: 5px 10px;
            font-size: 0.8rem;
        }

        .tl-card {
            padding: 14px 14px;
        }

        .tl-svc-icon, .upcoming-svc-icon {
            width: 38px;
            height: 38px;
            font-size: 1rem;
            border-radius: 10px;
        }

        .tl-spine {
            width: 14px;
        }

        .tl-dot {
            width: 11px;
            height: 11px;
        }
    }

</style>