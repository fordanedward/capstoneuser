import { writable } from "svelte/store";

/**
 * Function to create a persistent writable store
 * @param {string} key - The key for localStorage
 * @param {any} initialValue - The initial value for the store
 */
function createPersistentStore(key, initialValue) {
    // Check if there's already data in localStorage
    const storedValue = localStorage.getItem(key);

    // Initialize the writable store with either the stored value or the default value
    const store = writable(storedValue ? JSON.parse(storedValue) : initialValue);

    // Subscribe to the store and save changes to localStorage
    store.subscribe(value => {
        localStorage.setItem(key, JSON.stringify(value));
    });

    return store;
}

// Example: Persistent store for patient profile
export const patientProfile = createPersistentStore("patientProfile", {
    name: '',
    id: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    lastName: ''
});
