<script lang="ts">
    // @ts-nocheck
    import Swal from 'sweetalert2'; 
    import { Label, Input, Button as FlowbiteButton, Toast } from 'flowbite-svelte'; 
    import {
        CheckOutline,
        CloseOutline,
        ExclamationCircleOutline,
        InfoCircleOutline
    } from "flowbite-svelte-icons";
    import {
        getAuth,
        signInWithEmailAndPassword,
        signInAnonymously,
        signOut
    } from 'firebase/auth';
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getFirestore, doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    let identifier = '';
    let password = '';
    let showPassword = false;
    let rememberMe = false;

    // identifier (Patient ID) npte: instead of a member's email, we allow login via Patient ID

    type ToastTypeFB = 'info' | 'success' | 'warning' | 'error'; 
    let toastVisibleFB: boolean = false;
    let toastMessageFB: string = '';
    let toastTypeFB: ToastTypeFB = 'info';
    let toastDurationFB: number = 3000;
    let toastTimeoutIdFB: number | null = null;

    let isLoggingIn = false;
    let isPageLoaded = false;

    function showAppToast(message: string, type: ToastTypeFB = 'info', duration: number = 3000) {
        toastMessageFB = message;
        toastTypeFB = type;
        toastVisibleFB = true;
        toastDurationFB = duration;
        if (toastTimeoutIdFB !== null) clearTimeout(toastTimeoutIdFB);
        if (duration > 0) {
            toastTimeoutIdFB = window.setTimeout(() => {
                toastVisibleFB = false;
                toastTimeoutIdFB = null;
            }, duration);
        }
    }

    onMount(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('rememberMe') === 'true') {
            identifier = localStorage.getItem('email') || '';
            password = localStorage.getItem('password') || '';
            rememberMe = true;
        }
        // If redirected here because the admin deactivated the account, show a modal
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('accountDeactivated') === 'true') {
                localStorage.removeItem('accountDeactivated');
                Swal.fire({
                    icon: 'error',
                    title: 'Account Deactivated',
                    html: `
                        <p style="margin-bottom: 20px; color: #6b7280; font-size: 15px; line-height: 1.6;">Your account has been deactivated by the administrator. Contact support for help.</p>
                        <div style="background-color: #f3f4f6; padding: 16px 20px; border-radius: 8px; margin-top: 20px;">
                            <a href="mailto:customerservice@permanentehealthplan.org" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: #1e40af; font-size: 14px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <span>customerservice@permanentehealthplan.org</span>
                            </a>
                            <a href="mailto:thepermanentehealthplancorpcs@gmail.com" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: #1e40af; font-size: 14px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <span>thepermanentehealthplancorpcs@gmail.com</span>
                            </a>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#6366f1'
                });
            }
        } catch (e) {
            console.error('Error checking accountDeactivated flag:', e);
        }
        
        // Trigger page load animation
        setTimeout(() => {
            isPageLoaded = true;
        }, 100);
    });

    async function processSuccessfulLogin(user: any, providerId: string) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Prevent login if admin marked the account as inactive/archived
            const isArchivedFlag = Boolean(userData.isArchived ?? userData.archived ?? false);
            const statusField = (userData.status || '').toString().toLowerCase();
            if (isArchivedFlag || statusField === 'inactive') {
                await auth.signOut();
                Swal.fire({
                    icon: 'error',
                    title: 'Account Inactive',
                    html: `
                        <p style="margin-bottom: 20px; color: #6b7280; font-size: 15px; line-height: 1.6;">Your account has been deactivated by the administrator. Contact support for help.</p>
                        <div style="background-color: #f3f4f6; padding: 16px 20px; border-radius: 8px; margin-top: 20px;">
                            <a href="mailto:customerservice@permanentehealthplan.org" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: #1e40af; font-size: 14px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <span>customerservice@permanentehealthplan.org</span>
                            </a>
                            <a href="mailto:thepermanentehealthplancorpcs@gmail.com" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: #1e40af; font-size: 14px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <span>thepermanentehealthplancorpcs@gmail.com</span>
                            </a>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonColor: '#6366f1'
                });
                return false;
            }

            if (userData.role !== 'userPatient') {
                
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: `This login is for patients only. Your role is ${userData.role}.`,
                    showConfirmButton: true
                });
                await auth.signOut();
                return false;
            }

            await setDoc(userDocRef, {
                lastLoginAt: new Date().toISOString()
            }, { merge: true });

            Swal.fire({
                icon: 'success',
                title: 'Login Successful',
                text: `Welcome, ${userData.displayName || user.email}`,
                showConfirmButton: false,
                timer: 2000,
                customClass: { popup: 'swal-custom' }
            });

            if (rememberMe && providerId === 'password') {
                localStorage.setItem('email', identifier);
                localStorage.setItem('password', password);
                localStorage.setItem('rememberMe', 'true');
            } else if (providerId === 'password') {
                localStorage.removeItem('email');
                localStorage.removeItem('password');
                localStorage.removeItem('rememberMe');
            }

            setTimeout(() => {
                goto('/auth/profile');
            }, 2000); 
            return true;

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Profile Not Found',
                text: 'Your account exists, but your patient profile is missing. Please complete registration or contact support.',
                showConfirmButton: true
            });
            await auth.signOut();
            return false; 
        }
    }

    async function handleLogin() { 
        // Validate password first
        if (!password.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter your password.', showConfirmButton: true });
            return;
        }

        // Determine if identifier is an email or a patient ID
        let resolvedEmail: string | null = null;
        const input = identifier.trim();
        if (!input) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter your Email or Patient ID.', showConfirmButton: true });
            return;
        }
        const looksLikeEmail = /.+@.+\..+/.test(input);
        if (looksLikeEmail) {
            // Try to resolve to the actual auth email. Users might have set email only in profile.
            try {
                let cleanupAnon = false;
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                        cleanupAnon = true;
                    } catch (anonErr) {
                        console.error('Anonymous sign-in failed (email resolution):', anonErr);
                    }
                }

                // First, check users collection for exact email match
                const usersRef = collection(db, 'users');
                const uq = query(usersRef, where('email', '==', input));
                const uSnap = await getDocs(uq);
                if (!uSnap.empty) {
                    resolvedEmail = input;
                } else {
                    // Next, check patientProfiles by email to find uid, then map to users.email or phone placeholder
                    const profilesRef = collection(db, 'patientProfiles');
                    const pq = query(profilesRef, where('email', '==', input));
                    const pSnap = await getDocs(pq);
                    if (!pSnap.empty) {
                        const profileDoc = pSnap.docs[0];
                        const profileUid = profileDoc.id;
                        const userRef = doc(db, 'users', profileUid);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const u = userSnap.data() as any;
                            if (u && typeof u.email === 'string' && u.email) {
                                resolvedEmail = String(u.email);
                            } else {
                                const phoneRaw = String((profileDoc.data() as any).phone || '');
                                const cleanedPhone = phoneRaw.replace(/\D/g, '');
                                if (cleanedPhone) {
                                    resolvedEmail = `${cleanedPhone}@noemail.local`;
                                }
                            }
                        }
                    }
                }

                if (!resolvedEmail) {
                    // Fallback: try the input as typed
                    resolvedEmail = input;
                }

                if (cleanupAnon) {
                    try { await signOut(auth); } catch {}
                }
            } catch (e) {
                console.error('Error resolving email identifier:', e);
                resolvedEmail = input; // fallback to attempt login with typed email
            }
        } else {
            const trimmedId = input;
            // Look up by customUserId
            try {
                // Ensure we're authenticated for Firestore rules
                let cleanupAnon = false;
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                        cleanupAnon = true;
                    } catch (anonError) {
                        console.error('Anonymous sign-in failed:', anonError);
                        Swal.fire({ 
                            icon: 'error', 
                            title: 'Configuration Error', 
                            text: 'Patient ID login is not properly configured. Please use email login or contact support.', 
                            showConfirmButton: true 
                        });
                        return;
                    }
                }
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('customUserId', '==', trimmedId));
                const snap = await getDocs(q);
                if (snap.empty) {
                    if (cleanupAnon) {
                        try { await signOut(auth); } catch {}
                    }
                    Swal.fire({ icon: 'error', title: 'Patient ID Not Found', text: 'Please check your Patient ID and try again.', showConfirmButton: true });
                    return;
                }
                const userDoc = snap.docs[0];
                const userDocData = userDoc.data();
                resolvedEmail = (userDocData && userDocData.email) ? String(userDocData.email) : null;

                // If email is missing (email-optional accounts), derive the placeholder from profile phone
                if (!resolvedEmail) {
                    try {
                        const profileRef = doc(db, 'patientProfiles', userDoc.id);
                        const profileSnap = await getDoc(profileRef);
                        if (profileSnap.exists()) {
                            const phoneRaw = String((profileSnap.data() as any).phone || '');
                            const cleanedPhone = phoneRaw.replace(/\D/g, '');
                            if (cleanedPhone) {
                                resolvedEmail = `${cleanedPhone}@noemail.local`;
                            }
                        }
                    } catch (e) {
                        console.error('Error deriving placeholder email from profile:', e);
                    }
                }

                if (!resolvedEmail) {
                    if (cleanupAnon) {
                        try { await signOut(auth); } catch {}
                    }
                    Swal.fire({ icon: 'error', title: 'Login Unavailable', text: 'Could not resolve your login email from Patient ID. Please contact support.', showConfirmButton: true });
                    return;
                }
                // Sign out anonymous session before real login
                if (cleanupAnon) {
                    try { await signOut(auth); } catch {}
                }
            } catch (lookupErr) {
                console.error('Patient ID lookup error:', lookupErr);
                Swal.fire({ icon: 'error', title: 'Login Failed', text: 'Unable to verify Patient ID. Please try again later.', showConfirmButton: true });
                return;
            }
        }

        isLoggingIn = true;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, resolvedEmail!, password);
            await processSuccessfulLogin(userCredential.user, 'password');
        } catch (error) {
            console.error('Error during login:', error);
            let errorMessage = 'An error occurred. Please try again.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/invalid-credential':
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = loginMode === 'email' ? 'Invalid email or password. Please try again.' : 'Invalid Patient ID or password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'The email address is not valid.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Access temporarily disabled due to many failed login attempts.";
                        break;
                    default: 
                        errorMessage = 'An error occurred. Please try again.';
                }
            }
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: errorMessage,
                showConfirmButton: true
            });
        } finally {
            isLoggingIn = false;
        }
    }

    // Google sign-in removed

</script>

<style>
:global(body, html) {
    margin: 0;
    padding: 0;
    height: 100%;
}

/* Animation styles */
.login-container {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-container.loaded {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.login-form {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
}

.login-form.loaded {
    opacity: 1;
    transform: translateY(0);
}

.login-logo {
    opacity: 0;
    transform: scale(0.8) rotate(-5deg);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
}

.login-logo.loaded {
    opacity: 1;
    transform: scale(1) rotate(0deg);
}

.login-title {
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
}

.login-title.loaded {
    opacity: 1;
    transform: translateY(0);
}

.form-field {
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-field.loaded {
    opacity: 1;
    transform: translateX(0);
}

.form-field:nth-child(1) { transition-delay: 0.4s; }
.form-field:nth-child(2) { transition-delay: 0.5s; }
.form-field:nth-child(3) { transition-delay: 0.6s; }
.form-field:nth-child(4) { transition-delay: 0.7s; }
.form-field:nth-child(5) { transition-delay: 0.8s; }
.form-field:nth-child(6) { transition-delay: 0.9s; }

.login-button {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 1s;
}

.login-button.loaded {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.register-link {
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) 1.2s;
}

.register-link.loaded {
    opacity: 1;
    transform: translateY(0);
}

@media (max-width: 768px) {
    :global(.swal-custom) { 
        width: 80% !important;
        font-size: 0.9rem !important;
    }
}

@media (max-width: 480px) {
    :global(.swal-custom) {
        width: 90% !important;
        font-size: 0.8rem !important;
    }
}
</style>

{#if toastVisibleFB} 
    <div class="fixed top-5 right-5 z-50">
        <Toast
            color={toastTypeFB === 'success' ? 'green' : toastTypeFB === 'error' ? 'red' : toastTypeFB === 'warning' ? 'yellow' : 'blue'}
            dismissable
            on:close={() => { toastVisibleFB = false; if (toastTimeoutIdFB !== null) clearTimeout(toastTimeoutIdFB); }}
        >
            <svelte:fragment slot="icon">
                {#if toastTypeFB === 'success'} <CheckOutline class="h-5 w-5" />
                {:else if toastTypeFB === 'error'} <CloseOutline class="h-5 w-5" />
                {:else if toastTypeFB === 'warning'} <ExclamationCircleOutline class="h-5 w-5" />
                {:else} <InfoCircleOutline class="h-5 w-5" /> {/if}
            </svelte:fragment>
            {toastMessageFB}
        </Toast>
    </div>
{/if}

<div class="min-h-screen bg-[#0b2d56] flex items-center justify-center px-4 sm:px-8 md:px-16 lg:px-24">
    <div class="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20 w-full max-w-7xl">
        <!-- Left side - Logo (shown on desktop, hidden on mobile) -->
        <div class="hidden lg:flex flex-shrink-0 items-center justify-center">
            <img src="/images/digital member portal.png" alt="PHP Logo" class="login-logo {isPageLoaded ? 'loaded' : ''} w-[29rem] h-[29rem] object-contain" />
        </div>

        <!-- Right side - Login Form with mobile logo/title -->
        <div class="login-container {isPageLoaded ? 'loaded' : ''} bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
            <!-- Logo and Title for Mobile -->
            <div class="flex lg:hidden flex-col items-center mb-8">
                <img src="/images/digital member portal.png" alt="PHP Logo" class="login-logo {isPageLoaded ? 'loaded' : ''} w-24 h-24 mb-4 object-contain" />
                <h2 class="login-title {isPageLoaded ? 'loaded' : ''} text-3xl font-bold text-gray-900 text-center">Welcome Member!</h2>
            </div>

            <!-- Title for Desktop -->
            <div class="hidden lg:block mb-8">
                <h2 class="login-title {isPageLoaded ? 'loaded' : ''} text-3xl font-bold text-gray-900 text-center">Welcome Member</h2>
            </div>

        <div class="login-form {isPageLoaded ? 'loaded' : ''}">
            <form on:submit|preventDefault={handleLogin}>
                <div class="form-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="identifier" class="block mb-2 text-sm font-medium text-gray-700">Patient ID</Label>
                    <Input
                        type="text"
                        id="identifier"
                        placeholder="Enter your patient ID"
                        class="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        bind:value={identifier}
                        required
                    />
                </div>

                <div class="form-field {isPageLoaded ? 'loaded' : ''} mb-6">
                    <Label for="password" class="block mb-2 text-sm font-medium text-gray-700">Password</Label>
                    <div class="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="Enter your password"
                            class="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            bind:value={password}
                            required
                        />
                        <button
                            type="button"
                            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            on:click={() => showPassword = !showPassword}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {#if showPassword}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19.5c-5.162 0-9.246-3.697-10.125-8.55a1.286 1.286 0 010-.9c.879-4.853 4.963-8.55 10.125-8.55a10.05 10.05 0 011.875.175M15 12a3 3 0 11-6 0 3 3 0 016 0zm6-6.75L4.5 19.5" />
                                </svg>
                            {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            {/if}
                        </button>
                    </div>
                </div>

                <div class="login-button {isPageLoaded ? 'loaded' : ''} mb-6">
                    <button
                        type="submit" 
                        class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 shadow-md"
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </form>

            <div class="register-link {isPageLoaded ? 'loaded' : ''} text-center mt-6">
                <a href="/" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Back Home
                </a>
            </div>
        </div>
        </div>
    </div>
</div>