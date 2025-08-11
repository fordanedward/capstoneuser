<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
	import type { User } from "firebase/auth";
	import { firebaseConfig } from "$lib/firebaseConfig";
	import { initializeApp, getApps, getApp } from "firebase/app";
	import '@fortawesome/fontawesome-free/css/all.css'; 
	import Swal from 'sweetalert2';
	import '../../app.css'; 

	let isMobile = false;
	let isCollapsed = false; // Desktop collapsed state
	let isSidebarOpen = false; // Mobile sidebar open state

	const MOBILE_BREAKPOINT = 768; // Same breakpoint

	// --- Firebase Setup (from OriginalComponent) ---
	const app = browser && !getApps().length ? initializeApp(firebaseConfig) : (browser ? getApp() : null); // Initialize only in browser
	const auth = app ? getAuth(app) : null; // Get auth only if app is initialized

	// --- Stores (from OriginalComponent) ---
	export const username = writable<string>('');
	let loading = writable(false);

	// --- Layout Logic (from TemplateComponent, adapted) ---
	function checkLayoutMode() {
		if (!browser) return;

		const screenWidth = window.innerWidth;
		const currentlyMobile = screenWidth < MOBILE_BREAKPOINT;

		if (currentlyMobile !== isMobile) {
			isMobile = currentlyMobile;

			if (isMobile) {
				isCollapsed = true; // Mobile always starts 'collapsed' conceptually
				isSidebarOpen = false; // Mobile sidebar starts closed
			} else {
				// Desktop: Restore collapsed state or default to false
				isSidebarOpen = false; // Ensure mobile sidebar is closed
				const savedState = sessionStorage.getItem('isCollapsed');
				isCollapsed = savedState === 'true'; // Restore from session storage
			}
		} else {
             // Ensure default state is set if not mobile and no session storage exists
             if (!isMobile && sessionStorage.getItem('isCollapsed') === null) {
                sessionStorage.setItem('isCollapsed', 'false');
                isCollapsed = false;
            }
        }
	}

	// Toggle desktop sidebar collapse state
	function toggleSidebarDesktop() {
		if (!browser || isMobile || !auth) return; // Guard against non-browser, mobile, or uninitialized auth
		isCollapsed = !isCollapsed;
		sessionStorage.setItem('isCollapsed', String(isCollapsed)); // Save state
	}

	// Toggle mobile sidebar open/closed state
	function toggleSidebarMobile() {
		if (!browser || !isMobile || !auth) return; // Guard against non-browser, non-mobile, or uninitialized auth
		isSidebarOpen = !isSidebarOpen;
	}

	// Close mobile sidebar explicitly
	function closeSidebarMobile() {
		if (isSidebarOpen) {
			isSidebarOpen = false;
		}
	}

	// --- Logout Function (Merged Logic) ---
	export function logout() {
		if (!auth) {
			console.error("Auth not initialized for logout.");
			// Optionally redirect or show error even if auth isn't ready
			goto('/loginPatient');
			return;
		}

		Swal.fire({
			title: 'Are you sure?',
			text: "You are about to log out.",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#3085d6', // Keep Swal styling
			cancelButtonColor: '#d33',
			confirmButtonText: 'Yes, log out!',
			cancelButtonText: 'Cancel'
		}).then((result) => {
			if (result.isConfirmed) {
				loading.set(true); // Show loading state

				// Clean up session storage (from TemplateComponent)
				if (browser) {
					sessionStorage.removeItem('isCollapsed');
				}
                // Close mobile sidebar if open (from TemplateComponent)
                closeSidebarMobile();

				signOut(auth)
					.then(() => {
						console.log('User signed out');
						username.set(''); // Clear username store
						goto('/loginPatient'); // Navigate to login
					})
					.catch((error) => {
						console.error('Error signing out: ', error);
						Swal.fire('Error', 'Logout failed. Please try again.', 'error');
					})
					.finally(() => {
						loading.set(false); // Hide loading state
					});
			}
		});
	}

	// --- Lifecycle Hooks (Merged Logic) ---
	onMount(() => {
		if (!browser) return; // Don't run listeners/Firebase on server

        checkLayoutMode(); // Initial layout check
        window.addEventListener('resize', checkLayoutMode); // Add resize listener

        // Firebase Auth Listener (from OriginalComponent)
        let unsubscribeAuthState: (() => void) | null = null;
        if (auth) {
             unsubscribeAuthState = onAuthStateChanged(auth, (user) => {
                if (user) {
                    const maxLength = 15; // Keep truncation logic
                    let displayName = user.displayName ?? user.email ?? 'User';
                    if (displayName.length > maxLength) {
                        displayName = displayName.substring(0, maxLength) + '...';
                    }
                    username.set(displayName);
                } else {
                    username.set(''); // Clear username when logged out
                    // Optional: Redirect if user becomes unauthenticated while on protected page
                    // if (!['/loginPatient', '/registerPatient'].includes($page.url.pathname)) {
                    //     goto('/loginPatient');
                    // }
                }
            });
        } else {
            console.warn("Firebase Auth not initialized on mount.");
            // Handle case where auth didn't initialize (maybe redirect)
             if (!['/loginPatient', '/registerPatient'].includes($page.url.pathname)) { // Avoid redirect loop
                 goto('/loginPatient');
             }
        }

		// Page change listener (from TemplateComponent)
		const pageUnsubscribe = page.subscribe((currentPage) => {
             // Close mobile sidebar on navigation
			if (isMobile && isSidebarOpen) {
				closeSidebarMobile();
			}
            // Check if user is logged out but trying to access protected pages
            if (auth && !auth.currentUser && currentPage.url.pathname !== '/loginPatient' && currentPage.url.pathname !== '/registerPatient' && !currentPage.url.pathname.startsWith('/_app')) {
                 // console.log("Redirecting to login due to no user on protected route:", currentPage.url.pathname);
                 // goto('/loginPatient');
            }
		});

		// Cleanup function
		return () => {
			window.removeEventListener('resize', checkLayoutMode);
			if (unsubscribeAuthState) unsubscribeAuthState();
			pageUnsubscribe();
		};
	});

</script>

<!-- HTML Structure (from TemplateComponent, using OriginalComponent's content/icons) -->
<div class="app-layout">
	<!-- Mobile Header -->
	{#if isMobile}
		<header class="app-header">
			<button on:click={toggleSidebarMobile} class="hamburger-btn" aria-label="Toggle Menu" aria-expanded={isSidebarOpen}>
				<!-- Hamburger Icon SVG -->
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
				</svg>
			</button>
			<!-- Optional Header Title -->
			<!-- <span class="header-title">App Name</span> -->
		</header>
	{/if}

	<!-- Sidebar -->
	<div class="sidebar {isMobile ? (isSidebarOpen ? 'open' : 'closed-mobile') : (isCollapsed ? 'collapsed' : 'open-desktop')}">
		<!-- Sidebar Header (using OriginalComponent's logic/images) -->
		<div class="sidebar-header">
			{#if isMobile}
				 <button on:click={closeSidebarMobile} class="close-sidebar-btn" aria-label="Close Menu">×</button> <!-- Added close button -->
			{/if}
			<div class="circle-background">
				<!-- Conditional image based on collapsed state (desktop) or always logo (mobile?) -->
                 <img
                    src={(isMobile && isSidebarOpen) || (!isMobile && !isCollapsed) ? "/images/logo(landing) copy.png" : "/images/icon-person.png"}
                    alt={ (isMobile && isSidebarOpen) || (!isMobile && !isCollapsed) ? "App Logo" : "User Icon"}
                 />
			</div>
			<!-- Display username when expanded (desktop) or sidebar is open (mobile) -->
			{#if (!isMobile && !isCollapsed) || (isMobile && isSidebarOpen)}
				<div class="name-container"> <!-- Use name-container div -->
					<span>{$username || '...'}</span> <!-- Display username from store -->
                     <!-- Remove second name span unless needed -->
				</div>
			{/if}
		</div>

		<!-- Sidebar Menu (using OriginalComponent's items) -->
		<ul class="sidebar-menu">
			<li>
				<a href="./profile">
					<img class="icon" src="/images/profile1.png" alt="Profile Icon" />
					<span class="text">Profile</span>
				</a>
			</li>
			<li>
				<a href="./appointment">
					<img class="icon" src="/images/book.png" alt="Appointment Icon" />
					<span class="text">Appointment</span>
				</a>
			</li>
			<li>
				<a href="./prescription">
					<img class="icon" src="/images/history.png" alt="History Icon" />
					<span class="text">History</span>
				</a>
			</li>
		</ul>

		<!-- Logout Button (using combined logic) -->
		<button class="logout-btn" on:click={logout} title="Logout">
			{#if isMobile || (!isMobile && !isCollapsed)}
				<!-- Icon and Text for Mobile Open OR Desktop Expanded -->
				<img src="/images/logout-icon.png" alt="Logout" class="logout-icon" />
				<span>Logout</span>
			{:else if !isMobile && isCollapsed}
				<!-- Icon Only for Desktop Collapsed -->
				<img src="/images/logout-icon.png" alt="Logout" class="logout-icon" />
			{/if}
		</button>

		<!-- Desktop Toggle Button (using OriginalComponent's arrows) -->
		
        {#if !isMobile}
			<button class="toggle-btn" on:click={toggleSidebarDesktop} aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
				{isCollapsed ? '➡️' : '⬅️'}
			</button>
		{/if}
	</div>

	<!-- Mobile Backdrop -->
	{#if isMobile && isSidebarOpen}
		<div class="backdrop" on:click={closeSidebarMobile} aria-hidden="true"></div>
	{/if}

	<!-- Main Content Area -->
	<main class="content {isMobile ? 'mobile' : (isCollapsed ? 'collapsed' : 'desktop')}">
		<slot /> <!-- Page content goes here -->
	</main>

	<!-- Loading Spinner Overlay (from OriginalComponent) -->
	{#if $loading}
		<div class="loading-overlay" aria-busy="true" aria-label="Loading">
			<div class="loading-spinner"></div>
		</div>
	{/if}
</div>

<!-- CSS (from TemplateComponent, with color override and Loading styles added) -->
<style>
	:root {
		--sidebar-width-desktop: 11.6rem;
		--sidebar-width-collapsed: 4.22rem;
		--sidebar-width-mobile: 200px; /* Or adjust as needed */

		/* --- Using OriginalComponent's blue color --- */
        --sidebar-bg-color: #334eac;
		/* --- Hover/Active colors inspired by OriginalComponent --- */
	
	
		/* --- Text color --- */
		--sidebar-text-color: white;
		/* --- Content background --- */
		--content-bg-color: #f4f7f6;
		/* --- Transition timing --- */
		--sidebar-transition: 0.3s ease-in-out;
        /* --- Mobile Header Height (adjust if needed) --- */
        --header-height-mobile: 56px; /* Example height */
	}

	.app-layout {
		min-height: 100vh;
		background-color: var(--content-bg-color);
        position: relative; /* Needed for absolute positioning of sidebar/backdrop */
        overflow-x: hidden; /* Prevent horizontal scroll */
	}

    /* --- Mobile Header --- */
	.app-header {
		display: none; /* Hidden by default */
		position: sticky; /* Sticks to top */
		top: 0;
		width: 100%;
		height: var(--header-height-mobile);
		background-color: var(--sidebar-bg-color);
		color: var(--sidebar-text-color);
		padding: 0 1rem; /* Horizontal padding */
		align-items: center;
		z-index: 900; /* Below mobile sidebar */
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.hamburger-btn {
		background: none;
		border: none;
		color: var(--sidebar-text-color);
		cursor: pointer;
		padding: 0.5rem;
		margin-right: 1rem; /* Space between button and potential title */
	}

	.hamburger-btn svg {
		display: block;
		width: 24px;
		height: 24px;
	}

	.header-title { /* Optional title styling */
		font-size: 1.1rem;
		font-weight: 500;
	}

    /* --- Sidebar --- */
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		background-color: var(--sidebar-bg-color);
		color: var(--sidebar-text-color);
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow-x: hidden; /* Prevent horizontal scroll inside sidebar */
		overflow-y: auto; /* Allow vertical scroll if needed */
		box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
		/* Transitions applied in media queries */
	}

    /* --- Sidebar Header --- */
	.sidebar-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px 10px; /* Adjusted padding */
		flex-shrink: 0;
		position: relative; /* For close button positioning */
        border-bottom: 1px solid rgba(255, 255, 255, 0.2); /* Optional separator */
	}

	.sidebar-header .circle-background {
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: white;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		transition: width 0.3s ease, height 0.3s ease;
		margin-bottom: 10px;
	}

	.sidebar-header .circle-background img {
		display: block;
        max-width: 70%; /* Adjust image size inside circle */
        max-height: 70%;
        object-fit: contain;
	}

    .name-container {
		margin-top: 5px; /* Reduced margin */
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
        width: 100%; /* Allow text centering */
	}

	.name-container span {
        margin-top: 2px;
        font-size: 0.9rem; /* Match template */
        white-space: normal; /* Allow wrapping */
        text-align: center;
        overflow-wrap: break-word;
        max-width: calc(var(--sidebar-width-desktop) - 40px); /* Limit width */
        line-height: 1.3;
	}

	/* --- Sidebar Menu --- */
    .sidebar-menu {
		list-style: none;
		padding: 15px 0; /* Vertical padding */
		margin: 0;
		flex-grow: 1; /* Take remaining space */
	}

	.sidebar-menu li {
		padding: 0; /* Remove padding from li */
		cursor: pointer;
		/* transition: background-color 0.2s ease; Removed, apply to <a> */
	}

	.sidebar-menu a {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--sidebar-text-color);
		width: 100%;
		padding: 12px 20px; /* Padding for click area */
		white-space: nowrap;
		overflow: hidden;
        transition: background-color 0.2s ease, color 0.2s ease;
	}

	.sidebar-menu a:hover,
    .sidebar-menu a:focus {
		background-color: var(--sidebar-hover-bg); /* Use hover color */
        outline: none;
	}

	/* Active link styling - requires router integration or manual class */
	.sidebar-menu a.active {
		background-color: var(--sidebar-active-bg);
		font-weight: bold;
	}

	.sidebar-menu a .icon {
		width: 20px; /* Match OriginalComponent style */
		height: 20px;
		flex-shrink: 0;
		margin-right: 15px; /* Space between icon and text */
		transition: margin-right var(--sidebar-transition);
	}

	.sidebar-menu a .text {
		font-size: 0.95rem; /* Match template */
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 1;
		transition: opacity 0.1s ease 0.1s, width var(--sidebar-transition); /* Delay opacity transition */
	}

	/* --- Logout Button --- */
    .logout-btn {
		background-color: transparent;
		border: 1px solid rgba(255, 255, 255, 0.5);
		color: white;
		cursor: pointer;
		font-size: 0.95rem;
		padding: 8px 15px;
		margin: 15px;
		margin-top: auto;
		border-radius: 20px;
		text-align: center;
		transition: background-color 0.2s ease, padding var(--sidebar-transition), border-color 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		gap: 8px;
	}
	.logout-btn:hover {
		background-color: #007bb5;
		border-color: #007bb5;
	}

	.logout-btn img.logout-icon {
		width: 18px;
		height: 18px;
	}

	@media (max-width: 767px) {
		.app-header {
			display: flex; 
		}

		.sidebar {
			width: var(--sidebar-width-mobile);
			transform: translateX(-100%); /* Hidden off-screen */
			z-index: 1000; /* Above backdrop and content */
			transition: transform var(--sidebar-transition);
            box-shadow: 4px 0 6px rgba(0,0,0,0.2); /* Stronger shadow for mobile */
		}

		.sidebar.open {
			transform: translateX(0); /* Slide in */
		}

		.sidebar-header .circle-background {
			width: 70px; /* Adjust size for mobile */
			height: 70px;
		}

         .name-container span {
             max-width: calc(var(--sidebar-width-mobile) - 40px);
         }

		.sidebar-menu a .icon {
            margin-right: 15px; /* Ensure margin exists */
		}

		.sidebar-menu a .text {
			opacity: 1;
			width: auto; /* Text always visible */
            margin-left: 15px;
		}

		.logout-btn {
			padding: 10px 15px; /* Ensure padding */
            margin: 20px; /* Consistent margin */
		}

		.logout-btn span {
			display: inline; /* Text always visible */
		}

		.content.mobile {
			margin-left: 0; /* No margin when sidebar is hidden/overlay */
		
			transition: filter var(--sidebar-transition); /* Optional: Dim content when sidebar open */
			width: 100%;
		}

		.sidebar.open ~ .content.mobile { /* Apply dimming when sidebar is open */
			/* filter: brightness(0.7); */
		}

		.close-sidebar-btn {
			position: absolute;
			top: 10px;
			right: 10px;
			background: none;
			border: none;
			color: rgba(255, 255, 255, 0.8);
			font-size: 1.8rem; /* Make X bigger */
			cursor: pointer;
			padding: 5px;
			line-height: 1;
			display: block; /* Show on mobile */
            z-index: 10; /* Above other header content */
		}

		.close-sidebar-btn:hover {
			color: white;
		}

		.toggle-btn { /* Desktop toggle button */
			display: none;
		}

		.backdrop {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.5);
			z-index: 999; /* Below sidebar, above content */
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.3s ease-in-out, visibility 0s linear 0.3s;
		}

		/* Use .sidebar.open + .backdrop selector */
        .sidebar.open + .backdrop {
			opacity: 1;
			visibility: visible;
			transition: opacity 0.3s ease-in-out, visibility 0s linear 0s;
		}
	}

    /* --- Desktop Specific Styles --- */
	@media (min-width: 768px) {
		.sidebar {
			transform: none; /* Static position */
			width: var(--sidebar-width-desktop);
			z-index: 50; /* Standard z-index */
			transition: width var(--sidebar-transition);
		}

		.sidebar.collapsed {
			width: var(--sidebar-width-collapsed);
			/* overflow: hidden; /* Hide overflow when collapsed */
		}

		.sidebar-header .circle-background {
			width: 80px; /* Desktop expanded size */
			height: 80px;
		}

		.sidebar.collapsed .sidebar-header .circle-background {
			width: 45px; /* Desktop collapsed size */
			height: 45px;
            margin-bottom: 0; /* No space needed when name is hidden */
		}

        .sidebar.collapsed .name-container {
            display: none; /* Hide name container when collapsed */
        }

		.sidebar-menu a .icon {
            margin-right: 15px; /* Default margin */
		}

		.sidebar.collapsed .sidebar-menu a {
			justify-content: center; /* Center icon */
			padding: 12px 10px; /* Adjust padding for centered icon */
		}

		.sidebar.collapsed .sidebar-menu a .icon {
			margin-right: 0; /* No margin when text hidden */
		}

		.sidebar.collapsed .sidebar-menu a .text {
			opacity: 0;
			width: 0; /* Collapse text width */
			margin-left: 0; /* No margin for text */
            transition: opacity 0.1s ease, width var(--sidebar-transition), margin-left var(--sidebar-transition); /* Adjust transition timing */
		}

		.logout-btn {
			padding: 10px 15px; /* Expanded state padding */
             margin: 20px;
		}

		.logout-btn span {
			display: inline; /* Show text */
		}

		.sidebar.collapsed .logout-btn {
			width: auto; /* Fit icon */
			padding: 10px; /* Padding for icon-only */
			margin: 20px auto; /* Center button horizontally */
            border-radius: 50%; /* Make it circular */
             aspect-ratio: 1 / 1; /* Maintain square/circle shape */
		}

		.sidebar.collapsed .logout-btn span {
			display: none; /* Hide text */
		}
         .sidebar.collapsed .logout-btn img.logout-icon {
             margin: 0; /* Remove potential gap */
         }

		.content { /* Base content class for desktop */
             padding: 20px; /* Add padding */
             height: 100vh; /* Ensure content takes height */
             box-sizing: border-box;
             overflow-y: auto; /* Allow content scroll */
         }

		.content.desktop { /* When sidebar is expanded */
			margin-left: var(--sidebar-width-desktop);
			padding-top: 0; /* No mobile header */
			transition: margin-left var(--sidebar-transition);
			width: calc(100% - var(--sidebar-width-desktop)); /* Calculate width */
		}

		.content.collapsed { /* When sidebar is collapsed */
			margin-left: var(--sidebar-width-collapsed);
			width: calc(100% - var(--sidebar-width-collapsed)); /* Calculate width */
		}

		.close-sidebar-btn { /* Mobile close button */
			display: none;
		}

		.backdrop { /* Mobile backdrop */
			display: none;
		}

			.toggle-btn {
			display: block;
			cursor: pointer;
			background-color: rgba(0, 0, 0, 0.1);
			border: none;
			color: white;
			font-size: 1rem;
			padding: 8px 0;
			text-align: center;
			flex-shrink: 0;
			width: 100%;
			margin-top: 10px;
		}

		.toggle-btn:hover {
			background-color: var(--sidebar-hover-bg); /* Use hover blue */
		}
	}

    /* --- Loading Overlay Styles (from OriginalComponent) --- */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.6); /* Slightly darker */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999; /* Highest */
        backdrop-filter: blur(2px); /* Optional blur */
    }

    .loading-spinner {
        border: 6px solid #f3f3f3; /* Adjusted border */
        border-top: 6px solid var(--sidebar-bg-color); /* Use theme color */
        border-radius: 50%;
        width: 45px; /* Adjusted size */
        height: 45px;
        animation: spin 1.5s linear infinite; /* Adjusted speed */
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>