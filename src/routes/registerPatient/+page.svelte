<script lang="ts">
    // @ts-nocheck
    import { Label, Input, Toast, Button } from 'flowbite-svelte';
    import {
        CheckOutline,
        CloseOutline,
        ExclamationCircleOutline,
        InfoCircleOutline,
        GoogleSolid
    } from "flowbite-svelte-icons";
    import {
        getAuth,
        createUserWithEmailAndPassword,
        GoogleAuthProvider,     
        signInWithPopup,       
        deleteUser
    } from 'firebase/auth';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import {
        getFirestore,
        doc,
        setDoc,
        getDoc, 
        collection,
        query,
        where,
        getDocs
    } from "firebase/firestore";
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    let firstName: string = '';
    let lastName: string = '';
    let phone: string = '';
    let email: string = '';
    let password: string = '';
    let confirmPassword: string = '';

    type ToastType = 'info' | 'success' | 'warning' | 'error';
    let toastVisible: boolean = false;
    let toastMessage: string = '';
    let toastType: ToastType = 'info';
    let toastDuration: number = 3000;
    let toastTimeoutId: number | null = null;

    let isGoogleSigningIn = false;
    let isPageLoaded = false; 

    function showToast(message: string, type: ToastType = 'info', duration: number = 3000) {
        toastMessage = message;
        toastType = type;
        toastVisible = true;
        toastDuration = duration;
        if (toastTimeoutId !== null) clearTimeout(toastTimeoutId);
        if (duration > 0) {
            toastTimeoutId = window.setTimeout(() => {
                toastVisible = false;
                toastTimeoutId = null;
            }, duration);
        }
    }

    function generateSixDigitId(): string {
        const min = 10000;
        const max = 99999;
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        return randomNumber.toString();
    }

    async function isCustomIdTaken(customIdToCheck: string): Promise<boolean> {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("customUserId", "==", customIdToCheck));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    }

    async function generateUniqueCustomId(maxRetries: number = 10): Promise<string | null> {
        for (let i = 0; i < maxRetries; i++) {
            const potentialId = generateSixDigitId();
            if (!(await isCustomIdTaken(potentialId))) {
                return potentialId;
            }
            console.warn(`Custom Patient ID ${potentialId} is already taken. Retrying... (${i + 1}/${maxRetries})`);
        }
        console.error("Failed to generate a unique custom Patient ID after several retries.");
        return null;
    }

    async function handleRegistration() {
        // Basic validations
        if (!firstName.trim() || !lastName.trim()) {
            showToast("Please enter your first and last name.", "warning");
            return;
        }

        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone.length !== 11) {
            showToast("Phone number must be exactly 11 digits.", "warning");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "warning");
            return;
        }

        showToast("Registering patient...", "info", 0);
        let createdAuthUser = null;

        try {
            const usePlaceholderEmail = !email.trim();
            const emailForAuth = usePlaceholderEmail ? `${cleanedPhone}@noemail.local` : email.trim();

            const userCredential = await createUserWithEmailAndPassword(auth, emailForAuth, password);
            const user = userCredential.user;
            createdAuthUser = user;

            const customPatientId = await generateUniqueCustomId();

            if (!customPatientId) {
                showToast("Failed to generate a unique Patient ID. Please try again later.", "error", 6000);
                if (createdAuthUser) {
                    await deleteUser(createdAuthUser).catch(delErr => {
                        console.error("Failed to delete auth user after custom ID generation failure:", delErr);
                        showToast("Critical error: Patient account might be orphaned. Contact support.", "error", 10000);
                    });
                }
                if (toastMessage === "Registering patient...") toastVisible = false;
                return;
            }

            await setDoc(doc(db, "users", user.uid), {
                firebaseUid: user.uid,
                customUserId: customPatientId,
                email: usePlaceholderEmail ? null : email.trim(),
                role: 'userPatient',
                displayName: `${firstName} ${lastName}`.trim() || 'Patient',
                photoURL: user.photoURL || null,
                providerId: user.providerData[0]?.providerId || 'password',
                registrationDate: new Date().toISOString()
            });

            // Create initial patient profile so profile page is pre-filled
            const profileData = {
                name: firstName.trim(),
                lastName: lastName.trim(),
                id: customPatientId,
                age: '',
                gender: '',
                email: email.trim(),
                phone: cleanedPhone,
                address: '',
                birthday: '',
                profileImage: ''
            };
            await setDoc(doc(db, "patientProfiles", user.uid), profileData);

            showToast(`Patient registration successful! Your Patient ID: ${customPatientId}. Welcome, ${firstName.trim() || 'Patient'}` , "success", 5000);
            setTimeout(() => {
                goto('/auth/profile'); 
                toastVisible = false;
            }, 2500);

        } catch (error) {
            console.error("Patient Registration Error:", error);
            let userFriendlyMessage = "An unexpected error occurred during registration. Please try again.";
            if (error instanceof Error) {
                const firebaseError = error as any;
                if (firebaseError.code) {
                    switch (firebaseError.code) {
                        case 'auth/email-already-in-use': userFriendlyMessage = "This email is already registered. Try logging in or use a different email."; break;
                        case 'auth/invalid-email': userFriendlyMessage = "The email address is not valid."; break;
                        case 'auth/operation-not-allowed': userFriendlyMessage = "Patient registration is currently not allowed."; break;
                        case 'auth/weak-password': userFriendlyMessage = "The password is too weak (minimum 6 characters)."; break;
                        default: userFriendlyMessage = "Patient registration failed. Please check your details and try again."; break;
                    }
                } else { userFriendlyMessage = "Registration error. Please check your input and try again."; }
            } else if (typeof error === 'string') { userFriendlyMessage = "Registration failed: " + error; }

            if (createdAuthUser && !(error as any).code?.startsWith('auth/')) {
            }
            showToast(userFriendlyMessage, "error", 6000);
        }
    }

    async function handleGoogleSignIn() {
        isGoogleSigningIn = true;
        showToast("Connecting to Google...", "info", 0);
        const provider = new GoogleAuthProvider();
        let createdAuthUserForGoogle = null;

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            createdAuthUserForGoogle = user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            let welcomeMessage: string;
            let displayableCustomId: string | null = null;

            if (userDocSnap.exists()) {
                const existingUserData = userDocSnap.data();
                if (existingUserData.role !== 'userPatient') {
                    console.warn(`User ${user.email} exists with role ${existingUserData.role}, but attempting patient login/registration.`);
                }

                displayableCustomId = existingUserData.customUserId || "N/A";

                await setDoc(userDocRef, {
                    lastLoginAt: new Date().toISOString(),
                    displayName: user.displayName || existingUserData.displayName,
                    photoURL: user.photoURL || existingUserData.photoURL,
                    firebaseUid: user.uid,
                    role: 'userPatient',
                }, { merge: true });
                welcomeMessage = `Welcome back, ${user.displayName || user.email}! Your Patient ID: ${displayableCustomId}`;
                showToast(welcomeMessage, "success", 3000);
            } else {
                const customPatientId = await generateUniqueCustomId();

                if (!customPatientId) {
                    showToast("Failed to generate a unique Patient ID for Google Sign-In. Please try again.", "error", 6000);
                    if (createdAuthUserForGoogle) {
                        await deleteUser(createdAuthUserForGoogle).catch(delErr => {
                           console.error("Failed to delete Google auth user after custom ID failure:", delErr);
                           showToast("Critical error with Google Sign-In. Contact support.", "error", 10000);
                        });
                    }
                    isGoogleSigningIn = false;
                    if (toastMessage === "Connecting to Google...") toastVisible = false;
                    return;
                }
                displayableCustomId = customPatientId;

                const newUser_Data = {
                    firebaseUid: user.uid,
                    customUserId: customPatientId,
                    email: user.email,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Patient',
                    photoURL: user.photoURL,
                    role: 'userPatient',
                    registrationDate: new Date().toISOString(),
                    providerId: result.providerId || 'google.com',
                    lastLoginAt: new Date().toISOString()
                };
                await setDoc(userDocRef, newUser_Data);
                welcomeMessage = `Successfully registered with Google! Your Patient ID: ${displayableCustomId}. Welcome, ${user.displayName || user.email}!`;
                showToast(welcomeMessage, "success", 4000);
            }

            setTimeout(() => {
                goto('/auth/profile');
                toastVisible = false;
            }, 1500);

        } catch (err: any) {
            console.error("Google Sign-In Error:", err);
            let userFriendlyMessage = "Failed to sign in with Google. Please try again.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/popup-closed-by-user':
                        userFriendlyMessage = "Google Sign-In cancelled.";
                        break;
                    case 'auth/account-exists-with-different-credential':
                        userFriendlyMessage = "An account already exists with this email using a different sign-in method. Try logging in with that method.";
                        break;
                    case 'auth/popup-blocked':
                        userFriendlyMessage = "Google Sign-In popup was blocked. Please allow popups and try again.";
                        break;
                    default:
                        userFriendlyMessage = "Google Sign-In failed. Please try again later.";
                }
            }
            showToast(userFriendlyMessage, "error", 6000);
        } finally {
            isGoogleSigningIn = false;
            if (toastVisible && toastMessage === "Connecting to Google...") {
                toastVisible = false;
            }
        }
    }

    onMount(() => {
        // Trigger page load animation
        setTimeout(() => {
            isPageLoaded = true;
        }, 100);
    });

</script>

{#if toastVisible}
    <div class="fixed top-5 right-5 z-50">
        <Toast
            color={toastType === 'success' ? 'green' : toastType === 'error' ? 'red' : toastType === 'warning' ? 'yellow' : 'blue'}
            dismissable
            on:close={() => {
                toastVisible = false;
                if (toastTimeoutId !== null) clearTimeout(toastTimeoutId);
            }}
        >
            <svelte:fragment slot="icon">
                {#if toastType === 'success'} <CheckOutline class="h-5 w-5" />
                {:else if toastType === 'error'} <CloseOutline class="h-5 w-5" />
                {:else if toastType === 'warning'} <ExclamationCircleOutline class="h-5 w-5" />
                {:else} <InfoCircleOutline class="h-5 w-5" /> {/if}
            </svelte:fragment>
            {toastMessage}
        </Toast>
    </div>
{/if}

<style>
/* Animation styles for register page */
.register-container {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.register-container.loaded {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.register-logo {
    opacity: 0;
    transform: scale(0.8) rotate(-5deg);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
}

.register-logo.loaded {
    opacity: 1;
    transform: scale(1) rotate(0deg);
}

.register-form {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
}

.register-form.loaded {
    opacity: 1;
    transform: translateY(0);
}

.register-title {
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
}

.register-title.loaded {
    opacity: 1;
    transform: translateY(0);
}

.register-field {
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.register-field.loaded {
    opacity: 1;
    transform: translateX(0);
}

.register-field:nth-child(1) { transition-delay: 0.4s; }
.register-field:nth-child(2) { transition-delay: 0.5s; }
.register-field:nth-child(3) { transition-delay: 0.6s; }
.register-field:nth-child(4) { transition-delay: 0.7s; }
.register-field:nth-child(5) { transition-delay: 0.8s; }
.register-field:nth-child(6) { transition-delay: 0.9s; }

.register-button {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 1s;
}

.register-button.loaded {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.google-register-button {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 1.1s;
}

.google-register-button.loaded {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.login-link {
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) 1.2s;
}

.login-link.loaded {
    opacity: 1;
    transform: translateY(0);
}
</style>

<div class="h-screen bg-[#0b2d56] flex items-center justify-center px-4 py-4 overflow-hidden">
    <div class="flex items-center w-full max-w-6xl">
        <!-- Logo on the left side -->
        <div class="flex-1 hidden lg:flex justify-center">
            <img 
                src="/images/digital member portal.png" 
                alt="Digital Member Portal Logo" 
                class="register-logo {isPageLoaded ? 'loaded' : ''} max-w-full h-auto" 
                style="width: clamp(360px, 32vw, 480px); max-height: 70vh;"
                />
        </div>
        
        <!-- Registration form on the right side -->
        <div class="register-container {isPageLoaded ? 'loaded' : ''} bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-auto">
            <div class="flex justify-center mb-6">
                <h2 class="register-title {isPageLoaded ? 'loaded' : ''} text-3xl font-semibold text-gray-800 text-center">Register to become a Member</h2>
            </div>

        <div class="register-form {isPageLoaded ? 'loaded' : ''}">
            <form on:submit|preventDefault={handleRegistration}>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="firstName" class="block mb-2">First Name</Label>
                    <Input type="text" id="firstName" placeholder="Enter your first name" class="border p-2 w-full" bind:value={firstName} required />
                </div>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="lastName" class="block mb-2">Last Name</Label>
                    <Input type="text" id="lastName" placeholder="Enter your last name" class="border p-2 w-full" bind:value={lastName} required />
                </div>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="phone" class="block mb-2">Phone Number</Label>
                    <Input
                        type="tel"
                        id="phone"
                        placeholder="e.g., 09123456789"
                        class="border p-2 w-full"
                        bind:value={phone}
                        on:input={(e) => {
                            const input = e.currentTarget as HTMLInputElement;
                            phone = input.value.replace(/\D/g, '');
                            if (phone.length > 11) {
                                phone = phone.slice(0, 11);
                            }
                        }}
                        maxlength="11"
                        required
                    />
                </div>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="email" class="block mb-2">Email (optional)</Label>
                    <Input type="email" id="email" placeholder="Enter your email (optional)" class="border p-2 w-full" bind:value={email} />
                </div>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="password" class="block mb-2">Password</Label>
                    <Input type="password" id="password" placeholder="Enter your password" class="border p-2 w-full" bind:value={password} required />
                </div>
                <div class="register-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="confirmPassword" class="block mb-2">Confirm Password</Label>
                    <Input type="password" id="confirmPassword" placeholder="Confirm your password" class="border p-2 w-full" bind:value={confirmPassword} required />
                </div>
                <div class="register-button {isPageLoaded ? 'loaded' : ''} mb-4">
                    <Button type="submit" class="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        Register
                    </Button>
                </div>
            </form>

            <div class="my-6 flex items-center">
                <hr class="flex-grow border-gray-300">
                <span class="mx-4 text-gray-500 text-sm">OR</span>
                <hr class="flex-grow border-gray-300">
            </div>

            <div class="google-register-button {isPageLoaded ? 'loaded' : ''} mb-4">
                <Button
                    on:click={handleGoogleSignIn}
                    disabled={isGoogleSigningIn}
                    class="w-full p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center justify-center"
                >
                    <GoogleSolid class="w-5 h-5 mr-2" />
                    {isGoogleSigningIn ? 'Connecting...' : 'Register with Google'}
                </Button>
            </div>

            <div class="login-link {isPageLoaded ? 'loaded' : ''} text-center pt-2">
                <span class="text-sm text-gray-600">Already have an account?</span>
                <a href="/loginPatient" class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </a>
            </div>
            <div class="login-link {isPageLoaded ? 'loaded' : ''} text-center mt-4">
                <a href="/" class="text-sm font-medium text-gray-600 hover:text-gray-800 underline">
                    Back to Home
                </a>
            </div>
        </div>
        </div>
    </div>
</div>