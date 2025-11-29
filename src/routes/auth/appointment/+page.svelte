<script lang="ts">
  import { Checkbox } from 'flowbite-svelte';
  import { onMount } from "svelte";
  import { scale, fade } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';
  import {
    getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where,
    updateDoc, getDoc, onSnapshot, runTransaction, initializeFirestore, CACHE_SIZE_UNLIMITED,
    type QuerySnapshot, type DocumentData, Timestamp // Add Timestamp import
  } from "firebase/firestore";
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { env } from '$lib/env';
  import { getAuth, onAuthStateChanged, type Unsubscribe } from "firebase/auth";
  import '@fortawesome/fontawesome-free/css/all.css';
  import { Button, Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import Swal from 'sweetalert2';
  import { loadStripe } from '@stripe/stripe-js';
  import { browser } from '$app/environment';
  import { debounce } from '$lib/utils/debounce';
  import {
    ALL_POSSIBLE_MORNING_SLOTS,
    ALL_POSSIBLE_AFTERNOON_SLOTS,
    ALL_POSSIBLE_SLOTS,
    SERVICES as services,
    SUB_SERVICES as subServices,
    FIRESTORE_APPOINTMENTS_COLLECTION,
    FIRESTORE_PATIENT_PROFILES_COLLECTION,
    FIRESTORE_SETTINGS_COLLECTION,
    FIRESTORE_SCHEDULE_DEFAULTS_DOC,
    FIRESTORE_DAILY_SCHEDULES_COLLECTION,
    type ServiceType,
    type SubServiceType,
    type ServiceWithSubServices
  } from '$lib/data/appointmentConfig';

  // --- Constants ---
  if (!env.stripe.publicKey) {
    throw new Error('Stripe public key is not configured');
  }
  const stripePromise = loadStripe(env.stripe.publicKey);

  // --- Firebase Initialization ---
  let db: ReturnType<typeof getFirestore>;
  let auth: ReturnType<typeof getAuth>;

  if (browser && typeof window !== 'undefined') {
    try {
      if (getApps().length === 0) {
        const app = initializeApp(env.firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
      } else {
        const app = getApp();
        db = getFirestore(app);
        auth = getAuth(app);
      }
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      Swal.fire('Error', 'Could not connect to the booking system.', 'error');
    }
  }

  // --- Type Definitions ---
  type Appointment = {
    id: string;
    date: string;
    time: string;
    patientId: string;
    service: ServiceType;
    subServices: SubServiceType[];
    cancellationStatus?: 'pending' | 'Approved' | 'decline' | 'requested' | null | '';
    cancelReason?: string;
    status: "pending" | "Decline"| "Missed"  | "confirmed" | "Completed" | "cancelled" | "Accepted" | "Reschedule Requested" | "Rescheduled" |"Scheduled" |"Completed: Need Follow-up" |"cancellationRequested" | "";
    requestedDate?: string;
    requestedTime?: string;
    createdAt?: Date;
    paymentStatus?: 'paid' | 'unpaid' | 'refund_pending' | 'refunded' | null;
    paymentDate?: string;
    paymentAmount?: number;
    refundRequested?: boolean;
    refundReason?: string | null;
    refundAmount?: number;
    refundRequestDate?: Timestamp;
    refundProcessedDate?: Timestamp;
  };

  // --- Component State ---
  let selectedDate: string = new Date().toISOString().split('T')[0];
  let selectedTime: string | null = null;
  let selectedService: ServiceType | null = null;
  let selectedSubServices: string[] = [];
  let patientId: string | null = null;
  let hasCompleteProfile: boolean = false;

  let defaultWorkingDays: number[] = [1, 2, 3, 4, 5, 6, 7]; // Default fallback
  let fetchedBookingSlots: string[] = [];
  let isBookingDateWorking: boolean = false;
  let isLoadingBookingSlots: boolean = true;
  let bookingSlotsError: string | null = null;

  let fetchedRescheduleSlots: string[] = [];
  let isRescheduleDateWorking: boolean = false;
  let isLoadingRescheduleSlots: boolean = false;
  let rescheduleSlotsError: string | null = null;

  let activeTab: 'upcoming' | 'past' = 'upcoming';
  let upcomingAppointments: Appointment[] = [];
  let pastAppointments: Appointment[] = [];
  let notifiedAppointments: Set<string> = new Set();

  let popupModal = false;
  let rescheduleModal = false;
  let paymentModal = false;
  let timesPassedModal = false;
  let timesPassedMessage = '';
  let selectedAppointmentId: string | null = null;
  let currentAppointment: Appointment | null = null;
  let newDate: string = "";
  let newTime: string = "";
  let paymentAmount: number = 500; // Default payment amount
  let paymentStatus: 'pending' | 'success' | 'failed' | null = null;

  let reasonNotAvailable = false;
  let reasonSchedulingConflict = false;
  let reasonOther = false;
  let requestRefund = false;
  let refundReason = '';

  // --- Helper Functions ---
  function sortTimeSlots(slots: string[]): string[] {
      return [...slots].sort((a, b) => {
          try {
              const timeToMinutes = (timeStr: string): number => {
                  const [time, modifier] = timeStr.split(' ');
                  let [hours, minutes] = time.split(':').map(Number);
                  if (modifier === 'PM' && hours !== 12) hours += 12;
                  if (modifier === 'AM' && hours === 12) hours = 0;
                  return hours * 60 + minutes;
              };
              return timeToMinutes(a) - timeToMinutes(b);
          } catch (e) {
              console.warn(`Error parsing time slots for sorting: ${a}, ${b}`, e);
              return a.localeCompare(b);
          }
      });
  }

  function getMinDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isTimePassed(time: string): boolean {
    const currentTime = new Date();
    const [slotTime, period] = time.split(' ');
    const [hours, minutes] = slotTime.split(':').map(Number);

    let adjustedHours = hours;
    if (period === 'PM' && hours !== 12) adjustedHours += 12;
    if (period === 'AM' && hours === 12) adjustedHours = 0;

    const slotDateTime = new Date();
    slotDateTime.setHours(adjustedHours, minutes, 0, 0);
    return slotDateTime < currentTime;
  }

  function formatDate(dateString: string): string {
      try {
          const date = new Date(dateString + 'T00:00:00Z');
          return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC' // Ensure consistency
          });
      } catch (e) {
          return dateString; // Fallback
      }
  }

  // --- Firestore Logic ---
  async function loadDefaultWorkingDays() {
    if (!db) return;
    const defaultsRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_SCHEDULE_DEFAULTS_DOC);
    try {
        const docSnap = await getDoc(defaultsRef);
        if (docSnap.exists() && Array.isArray(docSnap.data().defaultWorkingDays)) {
            defaultWorkingDays = docSnap.data().defaultWorkingDays;
        } else {
            // Use 0-6 (Sun-Sat) so weekends are included by default
            defaultWorkingDays = [0, 1, 2, 3, 4, 5, 6];
        }
    } catch (error) {
        console.error("Error loading default working days:", error);
    }
  }

  // Consolidated slot fetching with caching
  const slotCache = new Map<string, { slots: string[], isWorking: boolean, timestamp: number }>();
  const CACHE_DURATION = 30000; // 30 seconds

  // Helper function to clear cache for a date
  function clearCacheForDate(date: string) {
    slotCache.delete(date);
  }

  // Helper function to check if a date has available slots (considering time passed for today)
  async function hasAvailableSlots(date: string): Promise<boolean> {
    if (!db || !date) return false;
    
    // Check cache first
    const cached = slotCache.get(date);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const slots = cached.slots;
      const isWorking = cached.isWorking;
      
      // If it's today, filter out slots where time has passed
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        const availableNow = slots.filter(slot => !isTimePassed(slot));
        return availableNow.length > 0 && isWorking;
      }
      
      return slots.length > 0 && isWorking;
    }

    try {
      const scheduleRef = doc(db, FIRESTORE_DAILY_SCHEDULES_COLLECTION, date);
      const scheduleSnap = await getDoc(scheduleRef);

      let slots: string[] = [];
      let isWorking = false;

      if (scheduleSnap.exists()) {
        const data = scheduleSnap.data();
        // Check if explicitly marked as non-working day (takes priority)
        if (data.isNonWorkingDay === true) {
          isWorking = false;
        } else if (data.isWorkingDay === true) {
          // Explicitly marked as working day
          isWorking = true;
        } else if (data.isNonWorkingDay === false) {
          // Explicitly marked as not non-working (i.e., working)
          isWorking = true;
        } else {
          // No explicit flag - fall back to default working days
          const dateObj = new Date(date + 'T00:00:00Z');
          const dayOfWeek = dateObj.getUTCDay();
          isWorking = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
        }
        if (isWorking && Array.isArray(data.availableSlots)) {
          slots = data.availableSlots;
        } else if (isWorking && !data.availableSlots) {
          // If working but no custom slots defined, use all slots
          slots = ALL_POSSIBLE_SLOTS;
        }
      } else {
        const dateObj = new Date(date + 'T00:00:00Z');
        const dayOfWeek = dateObj.getUTCDay();
        isWorking = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
        if (isWorking) {
          slots = ALL_POSSIBLE_SLOTS;
        }
      }

      if (isWorking && slots.length > 0) {
        // Filter out booked slots
        const q = query(
          collection(db, FIRESTORE_APPOINTMENTS_COLLECTION),
          where("date", "==", date),
          where("status", "in", ["Accepted", "pending", "confirmed", "Rescheduled"]),
          where("cancellationStatus", "in", ["", null])
        );
        const querySnapshot = await getDocs(q);
        const unavailableSlots = querySnapshot.docs.map((d) => d.data().time);
        let availableSlots = slots.filter(slot => !unavailableSlots.includes(slot));
        
        // If it's today, also filter out slots where time has passed
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          availableSlots = availableSlots.filter(slot => !isTimePassed(slot));
        }
        
        return availableSlots.length > 0;
      }

      return false;
    } catch (error) {
      console.error(`Error checking availability for ${date}:`, error);
      return false;
    }
  }

  // Helper function to find the next available date
  async function findNextAvailableDate(startDate: string, maxDaysToCheck: number = 30): Promise<string | null> {
    const start = new Date(startDate + 'T00:00:00Z');
    
    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = new Date(start);
      checkDate.setUTCDate(start.getUTCDate() + i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const hasSlots = await hasAvailableSlots(dateString);
      if (hasSlots) {
        return dateString;
      }
    }
    
    return null;
  }

  async function fetchAvailabilityForDate(date: string, target: 'booking' | 'reschedule') {
    if (!db || !date) return;

    // Check cache first
    const cached = slotCache.get(date);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      if (target === 'booking') {
        isLoadingBookingSlots = false;
        fetchedBookingSlots = cached.slots;
        isBookingDateWorking = cached.isWorking;
        bookingSlotsError = null;
      } else {
        isLoadingRescheduleSlots = false;
        fetchedRescheduleSlots = cached.slots;
        isRescheduleDateWorking = cached.isWorking;
        rescheduleSlotsError = null;
      }
      return;
    }

    if (target === 'booking') {
        isLoadingBookingSlots = true;
        fetchedBookingSlots = [];
        isBookingDateWorking = false;
        bookingSlotsError = null;
        selectedTime = null;
    } else {
        isLoadingRescheduleSlots = true;
        fetchedRescheduleSlots = [];
        isRescheduleDateWorking = false;
        rescheduleSlotsError = null;
    }

    try {
        const scheduleRef = doc(db, FIRESTORE_DAILY_SCHEDULES_COLLECTION, date);
        const scheduleSnap = await getDoc(scheduleRef);

        let slots: string[] = [];
        let isWorking = false;

        if (scheduleSnap.exists()) {
            const data = scheduleSnap.data();
            // Check if explicitly marked as non-working day (takes priority)
            if (data.isNonWorkingDay === true) {
              isWorking = false;
            } else if (data.isWorkingDay === true) {
              // Explicitly marked as working day
              isWorking = true;
            } else if (data.isNonWorkingDay === false) {
              // Explicitly marked as not non-working (i.e., working)
              isWorking = true;
            } else {
              // No explicit flag - fall back to default working days
              const dateObj = new Date(date + 'T00:00:00Z');
              const dayOfWeek = dateObj.getUTCDay();
              isWorking = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
            }
            if (isWorking && Array.isArray(data.availableSlots)) {
                slots = data.availableSlots;
            } else if (isWorking && !data.availableSlots) {
              // If working but no custom slots defined, use all slots
              slots = ALL_POSSIBLE_SLOTS;
            }
        } else {
            const dateObj = new Date(date + 'T00:00:00Z');
            const dayOfWeek = dateObj.getUTCDay();
            // Treat Saturday(6) and Sunday(0) as working days as well
            isWorking = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
            if (isWorking) {
                slots = ALL_POSSIBLE_SLOTS;
            }
        }

        const sortedSlots = sortTimeSlots(slots);
        let finalAvailableSlots = sortedSlots;

        // Filter out booked slots regardless of target
        if (isWorking && sortedSlots.length > 0) {
            const q = query(
                collection(db, FIRESTORE_APPOINTMENTS_COLLECTION),
                where("date", "==", date),
                where("status", "in", ["Accepted", "pending", "confirmed", "Rescheduled"]),
                where("cancellationStatus", "in", ["", null])
            );
            const querySnapshot = await getDocs(q);
            const unavailableSlots = querySnapshot.docs.map((d) => d.data().time);
            finalAvailableSlots = sortedSlots.filter(slot => !unavailableSlots.includes(slot));
        }

        // Cache the results
        slotCache.set(date, { slots: finalAvailableSlots, isWorking, timestamp: Date.now() });

        if (target === 'booking') {
            isBookingDateWorking = isWorking;
            fetchedBookingSlots = finalAvailableSlots;
        } else { // target === 'reschedule'
            isRescheduleDateWorking = isWorking;
            fetchedRescheduleSlots = finalAvailableSlots;
        }

    } catch (error) {
        console.error(`Error fetching availability for ${date} (${target}):`, error);
        if (target === 'booking') {
            bookingSlotsError = "Could not load available times. Please try again.";
        } else {
            rescheduleSlotsError = "Could not load available times for rescheduling.";
        }
    } finally {
        if (target === 'booking') {
            isLoadingBookingSlots = false;
        } else {
            isLoadingRescheduleSlots = false;
        }
    }
  }

  async function checkPatientProfile() {
    if (!patientId || !db) return false;
    try {
      const profileRef = doc(db, FIRESTORE_PATIENT_PROFILES_COLLECTION, patientId);
      const profileDoc = await getDoc(profileRef);
      
      if (!profileDoc.exists()) {
        return false;
      }

      const profileData = profileDoc.data();
      // Check if all required fields are filled
      return !!(profileData.name && 
                profileData.lastName && 
                profileData.age && 
                profileData.gender && 
                // profileData.email && 
                profileData.phone && 
                profileData.address);
    } catch (error) {
      console.error("Error checking patient profile:", error);
      return false;
    }
  }

  async function bookAppointment() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(selectedDate + 'T00:00:00Z');

      if (!selectedDate || selectedDateObj < today) {
          Swal.fire('Invalid Date', 'You cannot book an appointment on a past date.', 'warning'); return;
      }
      if (!selectedTime) {
          Swal.fire('Time Not Selected', 'Please select an available time slot.', 'warning'); return;
      }
      if (!patientId) {
          Swal.fire('Not Logged In', 'Please log in to book an appointment.', 'error'); return;
      }
      if (!hasCompleteProfile) {
          Swal.fire({
              icon: 'warning',
              title: 'Complete Profile Required',
              text: 'Please complete your profile information before booking an appointment.',
              showCancelButton: true,
              confirmButtonText: 'Go to Profile',
              cancelButtonText: 'Cancel'
          }).then((result) => {
              if (result.isConfirmed) {
                  window.location.href = '/auth/profile';
              }
          });
          return;
      }
      if (!selectedService) {
          Swal.fire('Service Not Selected', 'Please select a service.', 'warning'); return;
      }
      if (!isBookingDateWorking || !fetchedBookingSlots.includes(selectedTime)) {
           Swal.fire('Invalid Time', 'The selected time slot is not available. Please refresh or choose another.', 'error');
           await fetchAvailabilityForDate(selectedDate, 'booking');
           return;
      }

      if (!db) {
          Swal.fire('Error', 'Database connection unavailable. Please refresh the page.', 'error');
          return;
      }

      try {
          let totalAmount = 500; // Use a fixed default value

          await runTransaction(db, async (transaction) => {
              const slotQuery = query(
                  collection(db, FIRESTORE_APPOINTMENTS_COLLECTION),
                  where("date", "==", selectedDate),
                  where("time", "==", selectedTime),
                  where("status", "in", ["pending", "Accepted", "confirmed", "Rescheduled"]),
                  where("cancellationStatus", "in", ["", null])
              );
              const slotSnapshot = await getDocs(slotQuery);

              if (!slotSnapshot.empty) {
                  throw new Error('Time Slot Unavailable');
              }

              const userQuery = query(
                  collection(db, FIRESTORE_APPOINTMENTS_COLLECTION),
                  where("patientId", "==", patientId),
                  where("date", "==", selectedDate),
                  where("status", "in", ["pending", "Accepted", "confirmed", "Rescheduled"]),
                   where("cancellationStatus", "in", ["", null])
              );
              const userSnapshot = await getDocs(userQuery);
              if (!userSnapshot.empty) {
                   throw new Error('Already Booked');
              }

              const appointmentRef = doc(collection(db, FIRESTORE_APPOINTMENTS_COLLECTION));
              transaction.set(appointmentRef, {
                  patientId: patientId,
                  date: selectedDate,
                  time: selectedTime,
                  service: selectedService,
                  subServices: selectedSubServices || [],
                  status: 'pending',
                  cancellationStatus: '',
                  createdAt: new Date(),
                  paymentStatus: 'unpaid',
                  paymentAmount: totalAmount
              });
          });

          Swal.fire({
              icon: 'success',
              title: 'Appointment Pending',
              text: `Your appointment request for ${selectedDate} at ${selectedTime} has been submitted. Please wait for confirmation.`,
          });

          selectedTime = null;
          await fetchAvailabilityForDate(selectedDate, 'booking');

      } catch (error: any) {
          console.error("Error during booking transaction:", error);
          let title = 'Booking Error';
          let text = 'An issue occurred while booking your appointment. Please try again.';
          if (error.message === 'Time Slot Unavailable') {
              title = 'Time Slot Unavailable';
              text = 'Sorry, this time slot was just booked. Please choose a different time.';
              await fetchAvailabilityForDate(selectedDate, 'booking');
          } else if (error.message === 'Already Booked') {
               title = 'Already Booked';
               text = 'You already have an appointment scheduled for this date. Please choose another date.';
          }
          Swal.fire({ icon: 'error', title: title, text: text });
      }
  }

  function getSelectedReasons() {
    const reasons = [];
    if (reasonNotAvailable) reasons.push('Service is no longer needed');
    if (reasonSchedulingConflict) reasons.push('Scheduling conflict');
    if (reasonOther) reasons.push('Other');
    return reasons;
  }

  // Helper to normalize cancel/decline reason field names coming from different admin apps
  function getCancelReason(appointment: any) {
    return appointment?.cancelReason || appointment?.reason || appointment?.declineReason || appointment?.adminReason || '';
  }

  function switchTab(tab: 'upcoming' | 'past') {
    activeTab = tab;
  }

  const checkNotificationsState = () => {
    const state = localStorage.getItem("notifiedAppointments");
    if (state) {
      try {
         return new Set<string>(JSON.parse(state));
      } catch (e) {
         console.error("Error parsing notifiedAppointments from localStorage", e);
         return new Set<string>();
      }
    }
    return new Set<string>();
  };

  const updateNotificationsState = () => {
     try {
        localStorage.setItem("notifiedAppointments", JSON.stringify(Array.from(notifiedAppointments)));
     } catch (e) {
        console.error("Error saving notifiedAppointments to localStorage", e);
     }
  };

  function getAppointments(): Unsubscribe | undefined {
      if (!patientId || !db) return undefined;
      try {
            const today = new Date();
            const todayISOString = today.toISOString().split("T")[0];
            const q = query(collection(db, FIRESTORE_APPOINTMENTS_COLLECTION), where("patientId", "==", patientId));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                upcomingAppointments = [];
                pastAppointments = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data() as Omit<Appointment, 'id'>;
                    const appointmentDate = data.date;
                  const appointmentWithId: Appointment = { ...data, id: doc.id };

                    // Check if appointment should be in past based on status
                    const isCompletedStatus = ['Completed', 'Completed: Need Follow-up', 'Missed'].includes(appointmentWithId.status);
                    const isCancelledStatus = appointmentWithId.cancellationStatus === 'Approved' || appointmentWithId.cancellationStatus === 'decline';
                    
                    if (appointmentDate >= todayISOString && !isCompletedStatus && !isCancelledStatus) {
                        upcomingAppointments.push(appointmentWithId);
                    } else {
                        pastAppointments.push(appointmentWithId);
                    }
                });

                upcomingAppointments.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
                pastAppointments.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

                 upcomingAppointments.forEach((appointment) => {
                    if (appointment.status === "Accepted" && !notifiedAppointments.has(appointment.id)) {
                        Swal.fire("Appointment Confirmed", `Your appointment on ${formatDate(appointment.date)} at ${appointment.time} has been confirmed!`, "success");
                        notifiedAppointments.add(appointment.id);
                        updateNotificationsState();
                    }
                    const appointmentDateObj = new Date(appointment.date + 'T00:00:00Z');
                    const timeDiff = appointmentDateObj.getTime() - today.getTime();
                    const oneDayInMillis = 24 * 60 * 60 * 1000;
                    if (timeDiff > 0 && timeDiff <= oneDayInMillis && !notifiedAppointments.has(appointment.id + '_reminder')) {
                        Swal.fire("Appointment Reminder", `Your appointment is tomorrow, on ${formatDate(appointment.date)} at ${appointment.time}.`, "info");
                        notifiedAppointments.add(appointment.id + '_reminder');
                        updateNotificationsState();
                    }
                });

            }, (error) => {
                 console.error("Error in appointment listener:", error);
                 Swal.fire('Error', 'Could not update appointment list.', 'error');
            });

            return unsubscribe;

      } catch (e) {
          console.error("Error setting up real-time listener:", e);
          Swal.fire('Error', 'Unable to load appointments. Please refresh.', 'error');
          return undefined;
      }
  }

  async function requestCancelAppointment() {
      if (!selectedAppointmentId) {
         Swal.fire('Error', 'No appointment selected for cancellation.', 'error'); return;
      }
      if (getSelectedReasons().length === 0) {
          Swal.fire('Reason Required', 'Please select a reason for cancellation.', 'warning'); return;
      }
      if (requestRefund && !refundReason.trim()) {
          Swal.fire('Refund Reason Required', 'Please provide a reason for the refund request.', 'warning'); return;
      }

      try {
          const appointmentRef = doc(db, FIRESTORE_APPOINTMENTS_COLLECTION, selectedAppointmentId);
          const appointmentDoc = await getDoc(appointmentRef);
          const appointmentData = appointmentDoc.data();

          if (!appointmentData) {
              throw new Error('Appointment not found');
          }

          const updateData: any = {
              cancellationStatus: 'requested',
              cancelReason: getSelectedReasons().join(", "),
              status: 'cancellationRequested'
          };

          // Handle payment status for paid appointments
          if (appointmentData.paymentStatus === 'paid') {
              updateData.paymentStatus = 'refund_pending';
              updateData.refundRequested = requestRefund;
              updateData.refundReason = requestRefund ? refundReason : null;
              if (appointmentData.paymentAmount) {
                  updateData.refundAmount = appointmentData.paymentAmount;
              }
              updateData.refundRequestDate = Timestamp.fromDate(new Date());
          }

          await updateDoc(appointmentRef, updateData);

          const successMessage = appointmentData.paymentStatus === 'paid' 
              ? 'Your cancellation and refund request has been submitted.' 
              : 'Your cancellation request has been submitted.';

          Swal.fire('Cancellation Requested', successMessage, 'success');
          popupModal = false;
          reasonNotAvailable = false;
          reasonSchedulingConflict = false;
          reasonOther = false;
          requestRefund = false;
          refundReason = '';
      } catch (e) {
          console.error("Error requesting cancellation: ", e);
          Swal.fire('Error', 'Failed to submit cancellation request. Please try again.', 'error');
      }
  }

  function openCancelModal(appointmentId: string) {
    selectedAppointmentId = appointmentId;
    const appointment = upcomingAppointments.find(a => a.id === appointmentId);
    if (appointment?.paymentStatus === 'paid') {
      requestRefund = true;
    } else {
      requestRefund = false;
    }

    refundReason = '';
    popupModal = true;
  }

  function openRescheduleModal(appointmentId: string): void {
      currentAppointment = upcomingAppointments.find(appointment => appointment.id === appointmentId) || null;
      if (currentAppointment) {
          selectedAppointmentId = appointmentId;
          newDate = currentAppointment.date;
          newTime = "";
          fetchAvailabilityForDate(newDate, 'reschedule');
          rescheduleModal = true;
      } else {
          console.error("Could not find appointment with ID:", appointmentId);
          Swal.fire('Error', 'Unable to load appointment details. Please try again or contact support.', 'error');
      }
  }

  async function rescheduleAppointment(): Promise<void> {
      if (!selectedAppointmentId || !currentAppointment) {
          console.error("Missing reschedule data - appointmentId:", selectedAppointmentId, "hasAppointment:", !!currentAppointment);
          Swal.fire('Error', 'Session expired. Please close this window and try again.', 'error'); return;
      }
      if (!newDate || !newTime) {
          Swal.fire("Incomplete Details", "Please select a new date and time.", "warning"); return;
      }
      if (currentAppointment.date === newDate && currentAppointment.time === newTime) {
          Swal.fire("No Change", "Please choose a different date or time from your current schedule.", "warning"); return;
      }
      if (!isRescheduleDateWorking || !fetchedRescheduleSlots.includes(newTime)) {
           Swal.fire('Invalid Time', 'The selected time slot is not available for rescheduling on this date. Please choose another.', 'error');
           return;
       }

      const selectedDateObj = new Date(newDate + 'T00:00:00Z');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDateObj < today) {
          Swal.fire("Invalid Date", "You cannot reschedule to a past date.", "warning"); return;
      }

      try {
          await runTransaction(db, async (transaction) => {
              const slotQuery = query(
                  collection(db, FIRESTORE_APPOINTMENTS_COLLECTION),
                  where("date", "==", newDate),
                  where("time", "==", newTime),
                  where("status", "in", ["pending", "Accepted", "confirmed", "Rescheduled"]),
                  where("cancellationStatus", "in", ["", null]),
                  where("__name__", "!=", selectedAppointmentId)
              );
              const slotSnapshot = await getDocs(slotQuery);

              if (slotSnapshot.size > 0) {
                  throw new Error('Reschedule Slot Unavailable');
              }

               const appointmentRef = doc(db, FIRESTORE_APPOINTMENTS_COLLECTION, selectedAppointmentId!);
               transaction.update(appointmentRef, {
                  status: "Reschedule Requested",
                  requestedDate: newDate,
                  requestedTime: newTime,
                  cancellationStatus: '',
              });
          });

           Swal.fire({
              icon: "success",
              title: "Reschedule Requested",
              text: `Request to reschedule to ${formatDate(newDate)} at ${newTime} submitted. Please wait for approval.`,
          });
          rescheduleModal = false;
           fetchAvailabilityForDate(selectedDate, 'booking'); // Refresh main list

      } catch (error: any) {
          console.error("Reschedule transaction error:", error?.message || error);
          let title = 'Reschedule Error';
          let text = 'Unable to submit your reschedule request. Please try again.';
          if (error.message === 'Reschedule Slot Unavailable') {
              title = 'Time Slot Unavailable';
              text = 'This time slot is no longer available. Please select another.';
              await fetchAvailabilityForDate(newDate, 'reschedule');
          }
          Swal.fire({ icon: "error", title: title, text: text });
      }
  }

  function toggleSubService(subService: string) {
    if (selectedSubServices.includes(subService)) {
      selectedSubServices = selectedSubServices.filter(item => item !== subService);
    } else {
      selectedSubServices.push(subService);
    }
  }

  async function processPayment() {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const appointment = upcomingAppointments.find(a => a.id === selectedAppointmentId);
      if (!appointment) throw new Error('Appointment not found');

      let totalAmount = 500; // Use a fixed default value

      // Create a payment session
      const response = await fetch('/api/create-payment-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: selectedAppointmentId,
          amount: totalAmount,
          service: appointment.service,
          subServices: appointment.subServices
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const { id: sessionId } = await response.json();
      if (!sessionId) throw new Error('No session ID received');

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: sessionId
      });

      if (result.error) {
        throw result.error;
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: error instanceof Error ? error.message : 'There was an error processing your payment. Please try again.',
      });
    }
  }

  function openPaymentModal(appointmentId: string) {
    selectedAppointmentId = appointmentId;
    paymentAmount = 500; // Use a fixed default value
    paymentModal = true;
    paymentStatus = null;
  }

  // --- Lifecycle ---
  let authUnsubscribe: Unsubscribe | null = null;
  let appointmentsUnsubscribe: Unsubscribe | null = null;

  onMount(() => {
    let localAppointmentsUnsubscribe: Unsubscribe | undefined;

    const setup = async () => {
      if (!db || !auth) {
        console.error("Firebase not initialized");
        Swal.fire({
          icon: 'error',
          title: 'Connection Error',
          text: 'Unable to connect to the booking system. Please refresh the page.',
          confirmButtonText: 'Refresh'
        }).then(() => window.location.reload());
        return;
      }
      
      try {
        await loadDefaultWorkingDays();
        
        // Check if today has available slots, if not, find next available date
        const todayStr = new Date().toISOString().split('T')[0];
        const hasTodaySlots = await hasAvailableSlots(todayStr);
        
        if (!hasTodaySlots) {
          const nextDate = await findNextAvailableDate(todayStr);
          if (nextDate) {
            selectedDate = nextDate;
          }
        }
        
        await fetchAvailabilityForDate(selectedDate, 'booking');
      } catch (error) {
        console.error("Error during initial setup:", error);
      }

      authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (localAppointmentsUnsubscribe) {
          localAppointmentsUnsubscribe();
          localAppointmentsUnsubscribe = undefined;
        }

        if (user) {
          patientId = user.uid;
          hasCompleteProfile = await checkPatientProfile();
          notifiedAppointments = checkNotificationsState();
          localAppointmentsUnsubscribe = getAppointments();
          appointmentsUnsubscribe = localAppointmentsUnsubscribe ?? null;
        } else {
          patientId = null;
          hasCompleteProfile = false;
          upcomingAppointments = [];
          pastAppointments = [];
          appointmentsUnsubscribe = null;
        }
      });
    };

    setup();

    return () => {
      console.log("Cleaning up appointment component listeners");
      // Close all modals when component unmounts (navigating away)
      timesPassedModal = false;
      popupModal = false;
      rescheduleModal = false;
      paymentModal = false;
      if (authUnsubscribe) authUnsubscribe();
      if (appointmentsUnsubscribe) appointmentsUnsubscribe();
    };
  });

  // --- Reactivity ---
  // Debounced fetch to reduce unnecessary queries
  const debouncedFetchBooking = debounce((date: string) => {
    if (db && date) {
      fetchAvailabilityForDate(date, 'booking');
    }
  }, 300);

  const debouncedFetchReschedule = debounce((date: string) => {
    if (db && date) {
      fetchAvailabilityForDate(date, 'reschedule');
    }
  }, 300);

  // Validate date selection for booking
  async function handleBookingDateChange(date: string) {
    if (!db || !date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date + 'T00:00:00Z');
    
    // Don't allow past dates
    if (selectedDateObj < today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'You cannot select a past date.',
      });
      // Find next available date
      const nextDate = await findNextAvailableDate(new Date().toISOString().split('T')[0]);
      if (nextDate) {
        selectedDate = nextDate;
      } else {
        selectedDate = new Date().toISOString().split('T')[0];
      }
      return;
    }
    
    // Check if date is a non-working day
    try {
      // Clear cache to ensure fresh data from Firestore
      clearCacheForDate(date);
      
      const scheduleRef = doc(db, FIRESTORE_DAILY_SCHEDULES_COLLECTION, date);
      const scheduleSnap = await getDoc(scheduleRef);
      
      let isWorkingDay = true; // Default to working day
      if (scheduleSnap.exists()) {
        const data = scheduleSnap.data();
        // Check if explicitly marked as non-working day (takes priority)
        if (data.isNonWorkingDay === true) {
          isWorkingDay = false;
        } else if (data.isWorkingDay === true) {
          // Explicitly marked as working day
          isWorkingDay = true;
        } else if (data.isNonWorkingDay === false) {
          // Explicitly marked as not non-working (i.e., working)
          isWorkingDay = true;
        } else {
          // No explicit flag - fall back to default working days
          const dateObj = new Date(date + 'T00:00:00Z');
          const dayOfWeek = dateObj.getUTCDay();
          isWorkingDay = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
        }
      } else {
        // No document exists - use default working days
        const dateObj = new Date(date + 'T00:00:00Z');
        const dayOfWeek = dateObj.getUTCDay();
        isWorkingDay = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
      }
      
      if (!isWorkingDay) {
        Swal.fire({
          icon: 'info',
          title: 'Non-Working Day',
          text: 'This is a non-working day. Please pick a different date.',
        });
        return;
      }
    } catch (error) {
      console.error('Error checking if date is working day:', error);
    }
    
    // Check if date has available slots
    const hasSlots = await hasAvailableSlots(date);
    if (!hasSlots) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // If it's today and all times have passed, automatically move to next available date
      if (date === todayStr) {
        const nextDate = await findNextAvailableDate(date);
        if (nextDate && nextDate !== date) {
          timesPassedMessage = `All available time slots for today have passed. Moving to the next available date: ${formatDate(nextDate)}`;
          timesPassedModal = true;
          selectedDate = nextDate;
          return;
        }
      }
      
      // For other dates without slots, just show message
      Swal.fire({
        icon: 'info',
        title: 'No Available Slots',
        text: 'This date has no available time slots. Please select another date.',
      });
    }
    
    debouncedFetchBooking(date);
  }

  // Validate date selection for rescheduling
  async function handleRescheduleDateChange(date: string) {
    if (!db || !date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date + 'T00:00:00Z');
    
    // Don't allow past dates
    if (selectedDateObj < today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'You cannot select a past date for rescheduling.',
      });
      // Find next available date
      const nextDate = await findNextAvailableDate(new Date().toISOString().split('T')[0]);
      if (nextDate) {
        newDate = nextDate;
      } else if (currentAppointment) {
        newDate = currentAppointment.date;
      }
      return;
    }
    
    // Check if date is a non-working day
    try {
      // Clear cache to ensure fresh data from Firestore
      clearCacheForDate(date);
      
      const scheduleRef = doc(db, FIRESTORE_DAILY_SCHEDULES_COLLECTION, date);
      const scheduleSnap = await getDoc(scheduleRef);
      
      let isWorkingDay = true; // Default to working day
      if (scheduleSnap.exists()) {
        const data = scheduleSnap.data();
        // Check if explicitly marked as non-working day (takes priority)
        if (data.isNonWorkingDay === true) {
          isWorkingDay = false;
        } else if (data.isWorkingDay === true) {
          // Explicitly marked as working day
          isWorkingDay = true;
        } else if (data.isNonWorkingDay === false) {
          // Explicitly marked as not non-working (i.e., working)
          isWorkingDay = true;
        } else {
          // No explicit flag - fall back to default working days
          const dateObj = new Date(date + 'T00:00:00Z');
          const dayOfWeek = dateObj.getUTCDay();
          isWorkingDay = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
        }
      } else {
        // No document exists - use default working days
        const dateObj = new Date(date + 'T00:00:00Z');
        const dayOfWeek = dateObj.getUTCDay();
        isWorkingDay = defaultWorkingDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6;
      }
      
      if (!isWorkingDay) {
        Swal.fire({
          icon: 'info',
          title: 'Non-Working Day',
          text: 'This is a non-working day. Please pick a different date.',
        });
        return;
      }
    } catch (error) {
      console.error('Error checking if date is working day:', error);
    }
    
    // Check if date has available slots
    const hasSlots = await hasAvailableSlots(date);
    if (!hasSlots) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // If it's today and all times have passed, automatically move to next available date
      if (date === todayStr) {
        const nextDate = await findNextAvailableDate(date);
        if (nextDate && nextDate !== date) {
          timesPassedMessage = `All available time slots for today have passed. Moving to the next available date: ${formatDate(nextDate)}`;
          timesPassedModal = true;
          newDate = nextDate;
          return;
        }
      }
      
      // For other dates without slots, just show message
      Swal.fire({
        icon: 'info',
        title: 'No Available Slots',
        text: 'This date has no available time slots. Please select another date.',
      });
    }
    
    debouncedFetchReschedule(date);
  }

  $: if (selectedDate && db) {
    handleBookingDateChange(selectedDate);
  }

  $: if (rescheduleModal && newDate && db) {
    handleRescheduleDateChange(newDate);
  }

  $: displayMorningSlots = fetchedBookingSlots.filter(slot => ALL_POSSIBLE_MORNING_SLOTS.includes(slot));
  $: displayAfternoonSlots = fetchedBookingSlots.filter(slot => ALL_POSSIBLE_AFTERNOON_SLOTS.includes(slot));

</script>

<div class="page-wrapper">
  <div class="page-header">
    <h1 class="page-title">Appointments</h1>
    <p class="page-subtitle">Schedule and manage your medical appointments</p>
  </div>

  <div class="responsive-container">
    <!-- Booking Card (Left) -->
    <div class="responsive-card booking-card">
      <div class="card-header">
        <i class="fas fa-calendar-plus card-header-icon"></i>
        <h3 class="card-title">Schedule Appointment</h3>
      </div>
      <div class="card-content"> 
        {#if !patientId}
          <div class="alert-box alert-info">
              <i class="fas fa-sign-in-alt alert-icon"></i>
              <div>
                <p class="alert-title">Login Required</p>
                <p class="alert-text">Please log in to schedule your appointment.</p>
              </div>
          </div>
        {:else if !hasCompleteProfile}
          <div class="alert-box alert-warning">
              <i class="fas fa-user-edit alert-icon"></i>
              <div class="flex-1">
                <p class="alert-title">Complete Your Profile</p>
                <p class="alert-text">Please complete your profile information before booking an appointment.</p>
                <div class="mt-3">
                  <Button color="blue" on:click={() => window.location.href = '/auth/profile'}>
                      <i class="fas fa-user-edit mr-2"></i>Complete Profile
                  </Button>
                </div>
              </div>
          </div>
        {:else}
          <div class="form-group">
            <label for="datepicker" class="form-label">
              <i class="far fa-calendar text-blue-500 mr-1"></i>Select Date
            </label>
            <input
              type="date"
              id="datepicker"
              bind:value={selectedDate}
              class="form-input"
              min={getMinDate()}
              disabled={isLoadingBookingSlots}
            />
          </div>

          <div class="form-group">
              <label for="service-select" class="form-label">
                <i class="fas fa-stethoscope text-blue-500 mr-1"></i>Select Service
              </label>
              <select id="service-select" bind:value={selectedService} class="form-input" disabled={isLoadingBookingSlots}>
                  <option value={null} disabled selected>Select a service</option>
                  {#each services as service} <option value={service}>{service}</option> {/each}
              </select>
          </div>

          {#if selectedService && selectedService in subServices}
          <div class="form-group">
              <label for="subservices-group" class="form-label">
                <i class="fas fa-list-check text-blue-500 mr-1"></i>Select Sub-Services (Optional)
              </label>
              <div id="subservices-group" class="sub-services-grid">
                    {#each subServices[selectedService as ServiceWithSubServices] as subService}
                    <label for={`sub-${subService}`} class="flex items-center">
                        <Checkbox id={`sub-${subService}`} value={subService} on:change={() => toggleSubService(subService)} disabled={isLoadingBookingSlots} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                        <span class="ml-2 text-sm text-gray-600">{subService}</span>
                       </label>
                    {/each}
                </div>
          </div>
          {/if}

          <div class="form-group time-slots-section">
            {#if isLoadingBookingSlots}
              <div class="space-y-4">
                <div class="skeleton-header"></div>
                <div class="skeleton-grid">
                  {#each Array(6) as _, i}
                    <div class="skeleton-slot"></div>
                  {/each}
                </div>
              </div>
            {:else if bookingSlotsError}
               <div class="alert-box alert-error">
                  <i class="fas fa-exclamation-triangle alert-icon"></i>
                  <p>{bookingSlotsError}</p>
              </div>
            {:else if !isBookingDateWorking}
              <div class="alert-box alert-warning">
                   <i class="fas fa-calendar-times alert-icon"></i>
                   <p>This is a non-working day. Please pick a different date.</p>
              </div>
            {:else if fetchedBookingSlots.length === 0}
              <div class="alert-box alert-info">
                  <i class="fas fa-info-circle alert-icon"></i>
                  <p>No available time slots for this date.</p>
               </div>
            {:else}
              {#if displayMorningSlots.length > 0}
              <div class="time-slot-group">
                 <div class="time-slot-header">
                      <i class="far fa-sun text-amber-500"></i>
                      <span>Morning</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {#each ALL_POSSIBLE_MORNING_SLOTS as slot (slot)}
                         {@const isAvailable = displayMorningSlots.includes(slot)}
                         {@const hasPassed = selectedDate === new Date().toISOString().split('T')[0] && isTimePassed(slot)}
                         <button
                             type="button"
                             class="slot-button border text-sm px-2 py-1.5 rounded-md transition duration-150 {selectedTime === slot ? 'selected' : isAvailable && !hasPassed ? 'available' : 'unavailable'}"
                             on:click={() => { if (isAvailable && !hasPassed) selectedTime = slot; }}
                             disabled={!isAvailable || hasPassed}
                             title={hasPassed ? 'Time has passed' : !isAvailable ? 'Unavailable' : `Select ${slot}`}
                         >
                             {slot}
                         </button>
                      {/each}
                   </div>
              </div>
              {/if}

              {#if displayAfternoonSlots.length > 0}
              <div class="time-slot-group">
                   <div class="time-slot-header">
                       <i class="far fa-moon text-indigo-500"></i>
                       <span>Afternoon</span>
                   </div>
                   <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {#each ALL_POSSIBLE_AFTERNOON_SLOTS as slot (slot)}
                           {@const isAvailable = displayAfternoonSlots.includes(slot)}
                           {@const hasPassed = selectedDate === new Date().toISOString().split('T')[0] && isTimePassed(slot)}
                            <button
                             type="button"
                             class="slot-button border text-sm px-2 py-1.5 rounded-md transition duration-150 {selectedTime === slot ? 'selected' : isAvailable && !hasPassed ? 'available' : 'unavailable'}"
                             on:click={() => { if (isAvailable && !hasPassed) selectedTime = slot; }}
                             disabled={!isAvailable || hasPassed}
                              title={hasPassed ? 'Time has passed' : !isAvailable ? 'Unavailable' : `Select ${slot}`}
                           >
                               {slot}
                           </button>
                        {/each}
                   </div>
              </div>
               {/if}

               {#if selectedTime}
                <div class="booking-summary">
                    <div class="summary-content">
                      <i class="fas fa-check-circle text-green-500 text-xl"></i>
                      <div>
                        <p class="summary-label">Selected Appointment</p>
                        <p class="summary-value">
                          {formatDate(selectedDate)} at {selectedTime}
                        </p>
                      </div>
                    </div>
                    <Button
                        size="lg"
                        color="green"
                        class="w-full submit-btn"
                        on:click={bookAppointment}
                        disabled={!selectedTime || !selectedService || isLoadingBookingSlots}
                    >
                       <i class="fas fa-calendar-check mr-2"></i> Request Appointment
                    </Button>
                </div>
               {/if}
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- Appointments Card (Right) -->
    <div class="responsive-card appointments-card">
      <div class="card-header">
        <i class="fas fa-clipboard-list card-header-icon"></i>
        <h3 class="card-title">Your Appointments</h3>
      </div>
      <div class="card-content">
       <div class="tabs-container">
            <button on:click={() => switchTab('upcoming')} class="tab-button {activeTab === 'upcoming' ? 'active-tab' : ''}"> Upcoming </button>
            <button on:click={() => switchTab('past')} class="tab-button {activeTab === 'past' ? 'active-tab' : ''}"> Past </button>
        </div>

        {#if !patientId}
          <div class="alert-box alert-info">
              <i class="fas fa-sign-in-alt alert-icon"></i>
              <p>Please log in to see your appointments.</p>
          </div>
        {:else}
          <div class="appointment-list space-y-3">
                {#if activeTab === 'upcoming' && upcomingAppointments.length === 0 && isLoadingBookingSlots}
                    {#each Array(3) as _, i}
                      <div class="skeleton-appointment-card"></div>
                    {/each}
                {:else if activeTab === 'upcoming'}
                    {#if upcomingAppointments.length > 0}
                        {#each upcomingAppointments as appointment (appointment.id)}
                           <div class="appointment-card flex flex-col">
                           
                                <div class="flex justify-between items-center text-sm mb-2 text-gray-600">
                                    <span class="flex items-center gap-1">
                                        <i class="far fa-calendar-alt w-4 text-center text-gray-400"></i>
                                        {formatDate(appointment.date)}
                                    </span>
                                    <span class="flex items-center gap-1">
                                         <i class="far fa-clock w-4 text-center text-gray-400"></i>
                                         {appointment.time}
                                    </span>
                                </div>
                              
                                <div class="mb-2 flex-grow">
                                    <p class="font-semibold text-gray-800 truncate" title={appointment.service}>{appointment.service}</p>
                                   {#if appointment.subServices.length > 0}
                                        <p class="text-xs text-gray-500 truncate" title={appointment.subServices.join(', ')}>
                                            Sub: {appointment.subServices.join(', ')}
                                        </p>
                                   {/if}
                               </div>
                            
                               <div class="mt-auto pt-2 border-t border-gray-100">
                                    <div class="flex justify-between items-center min-h-[50px] mb-2">
                                        <div class="status-badge {appointment.status.toLowerCase().replace(/\s+/g, '-')}-status {appointment.cancellationStatus ? appointment.cancellationStatus.toLowerCase() + '-status' : ''}">
                                            {#if appointment.status === 'Reschedule Requested'}
                                                <i class="fas fa-exchange-alt mr-1"></i> Reschedule Req.
                                            {:else if appointment.cancellationStatus === 'requested'}
                                                <i class="fas fa-ban mr-1"></i> Cancel Req.
                                            {:else if appointment.cancellationStatus === 'Approved'}
                                                <i class="fas fa-times-circle mr-1"></i> Cancelled
                                            {:else if appointment.cancellationStatus === 'decline'}
                                                <i class="fas fa-exclamation-circle mr-1"></i> Cancel Declined
                                            {:else if appointment.status === 'Accepted' || appointment.status === 'confirmed'}
                                                <i class="fas fa-check-circle mr-1"></i> {appointment.status}
                                             {:else if appointment.status === 'pending'}
                                                <i class="fas fa-hourglass-half mr-1"></i> Pending
                                            {:else}
                                               {appointment.status || 'Unknown'}
                                            {/if}
                                        </div>
                                        <div class="action-buttons">
                                          {#if (appointment.status === 'Accepted' || appointment.status === 'pending' || appointment.status === 'confirmed') && appointment.cancellationStatus !== 'requested' && appointment.cancellationStatus !== 'Approved'}
                                             <button title="Reschedule Appointment" class="btn-action btn-reschedule" on:click={() => openRescheduleModal(appointment.id)}>
                                               <i class="fas fa-edit"></i> <span class="ml-1">Reschedule</span>
                                             </button>
                                             <button title="Cancel Appointment" class="btn-action btn-cancel" on:click={() => openCancelModal(appointment.id)}>
                                               <i class="fas fa-times"></i> <span class="ml-1">Cancel</span>
                                             </button>
                                    <!-- Pay Now button removed as requested -->
                                          {:else if appointment.status === 'Reschedule Requested'}
                                            <span class="text-xs italic text-purple-600 px-2">Pending...</span>
                                           {:else if appointment.cancellationStatus === 'requested'}
                                            <span class="text-xs italic text-yellow-700 px-2">Pending...</span>
                                           {/if}
                                         </div>
                                    </div>
                                    
                                    {#if appointment.paymentStatus === 'refund_pending' || appointment.paymentStatus === 'refunded'}
                                        <div class="flex flex-wrap items-center gap-2 mb-2">
                                            <div class="status-badge {appointment.paymentStatus}-payment-status">
                                                <i class="fas {appointment.paymentStatus === 'refund_pending' ? 'fa-clock' : 'fa-money-bill-wave'} mr-1"></i>
                                                {appointment.paymentStatus === 'refund_pending' ? 'Refund Pending' : 'Refunded'}
                                            </div>
                                            {#if appointment.paymentStatus === 'refunded' && appointment.refundAmount}
                                                <span class="text-xs text-gray-500">
                                                    (₱{appointment.refundAmount.toFixed(2)})
                                                </span>
                                            {/if}
                                        </div>
                                        <div class="text-xs text-gray-500 mb-2">
                                            {#if appointment.refundRequestDate}
                                                Requested: {appointment.refundRequestDate instanceof Timestamp ? appointment.refundRequestDate.toDate().toLocaleDateString() : new Date(appointment.refundRequestDate).toLocaleDateString()}
                                            {/if}
                                            {#if appointment.refundProcessedDate}
                                                <br>Processed: {appointment.refundProcessedDate instanceof Timestamp ? appointment.refundProcessedDate.toDate().toLocaleDateString() : new Date(appointment.refundProcessedDate).toLocaleDateString()}
                                            {/if}
                                        </div>
                                    {/if}
                                    
                                    {#if appointment.cancellationStatus === 'Approved' || appointment.cancellationStatus === 'decline' || appointment.status === 'Decline'}
                                       <p class="reason-paragraph {appointment.cancellationStatus === 'decline' || appointment.status === 'Decline' ? 'text-red-600' : 'text-gray-500'}" title={getCancelReason(appointment)}>
                                          <strong>Reason:</strong> {getCancelReason(appointment) || 'N/A'}
                                       </p>
                                    {/if}
                               </div>
                            </div>
                        {/each}
                    {:else}
                        <div class="empty-state">
                           <i class="fas fa-calendar-day empty-icon"></i>
                           <p class="empty-title">No Upcoming Appointments</p>
                           <p class="empty-text">Schedule your first appointment using the form.</p>
                        </div>
                    {/if}
                {:else if activeTab === 'past'}
                     {#if pastAppointments.length > 0}
                        {#each pastAppointments as appointment (appointment.id)}
                            <div class="appointment-card past flex flex-col">
                                 <div class="flex justify-between items-center text-sm mb-2 text-gray-500">
                                     <span class="flex items-center gap-1">
                                         <i class="far fa-calendar-alt w-4 text-center text-gray-400"></i>
                                         {formatDate(appointment.date)}
                                     </span>
                                     <span class="flex items-center gap-1">
                                          <i class="far fa-clock w-4 text-center text-gray-400"></i>
                                          {appointment.time}
                                     </span>
                                 </div>
                                 <div class="mb-2 flex-grow">
                                     <p class="font-semibold text-gray-700 truncate" title={appointment.service}>{appointment.service}</p>
                                     {#if appointment.subServices.length > 0}
                                        <p class="text-xs text-gray-400 truncate" title={appointment.subServices.join(', ')}>
                                            Sub: {appointment.subServices.join(', ')}
                                        </p>
                                     {/if}
                                </div>
                                <div class="mt-auto pt-2 border-t border-gray-100">
                                    <div class="flex items-center min-h-[50px] mb-2">
                                        <div class="status-badge {appointment.status?.toLowerCase().replace(/\s|:/g, '-')}-status {appointment.cancellationStatus ? appointment.cancellationStatus.toLowerCase() + '-status' : ''}">
                                           {#if appointment.cancellationStatus === 'Approved'}
                                                <i class="fas fa-times-circle mr-1"></i> Cancelled
                                           {:else if appointment.cancellationStatus === 'decline'}
                                                <i class="fas fa-exclamation-circle mr-1"></i> Cancel Declined
                                           {:else if appointment.status === 'Completed'}
                                                <i class="fas fa-check-double mr-1"></i> Completed
                                            {:else if appointment.status === 'Completed: Need Follow-up'}
                                                <i class="fas fa-notes-medical mr-1"></i> Completed (Follow-up)
                                            {:else if appointment.status === 'Missed'}
                                                <i class="fas fa-calendar-times mr-1"></i> Missed
                                            {:else}
                                               {appointment.status || 'Unknown'}
                                           {/if}
                                        </div>
                                    </div>
                                    {#if appointment.cancellationStatus === 'Approved' || appointment.cancellationStatus === 'decline' || appointment.status === 'Decline'}
                                      <p class="reason-paragraph {appointment.cancellationStatus === 'decline' || appointment.status === 'Decline' ? 'text-red-600' : 'text-gray-500'}" title={getCancelReason(appointment)}>
                                        <strong>Reason:</strong> {getCancelReason(appointment) || 'No reason'}
                                      </p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    {:else}
                         <div class="empty-state">
                           <i class="fas fa-history empty-icon"></i>
                           <p class="empty-title">No Past Appointments</p>
                           <p class="empty-text">Your appointment history will appear here.</p>
                        </div>
                    {/if}
                {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

  <!-- Reschedule Modal -->
  {#if rescheduleModal && currentAppointment}
  <div class="modal reschedule-modal">
    <div class="modal-content">
      <h2 class="text-xl font-semibold mb-4">Request Reschedule</h2>
      <p class="text-sm mb-4">Current: <strong>{formatDate(currentAppointment.date)}</strong> at <strong>{currentAppointment.time}</strong></p>

      <div class="space-y-4">
          <div>
            <label for="newDate" class="block text-sm font-medium text-gray-700 mb-1">Select New Date:</label>
            <input type="date" id="newDate" min={getMinDate()} bind:value={newDate} disabled={isLoadingRescheduleSlots} class="block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"/>
          </div>

          <div>
            <label for="newTime" class="block text-sm font-medium text-gray-700 mb-1">Select New Time:</label>
            {#if isLoadingRescheduleSlots}
                <div class="p-2 text-sm text-blue-600 bg-blue-50 rounded-md"><i class="fas fa-spinner fa-spin mr-1"></i>Loading times...</div>
            {:else if rescheduleSlotsError}
                <div class="p-2 text-sm text-red-700 bg-red-100 rounded-md border border-red-200">{rescheduleSlotsError}</div>
            {:else if !isRescheduleDateWorking}
                <div class="p-2 text-sm text-orange-700 bg-orange-100 rounded-md border border-orange-200">This is a non-working day. Please pick a different date.</div>
            {:else if fetchedRescheduleSlots.length === 0}
                <div class="p-2 text-sm text-gray-600 bg-gray-100 rounded-md border border-gray-200">No available slots on this date.</div>
            {:else}
                <select id="newTime" bind:value={newTime} disabled={isLoadingRescheduleSlots || !isRescheduleDateWorking || fetchedRescheduleSlots.length === 0} class="block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="" disabled selected>Select a time</option>
                    {#each fetchedRescheduleSlots as slot (slot)}
                       {@const hasPassed = newDate === new Date().toISOString().split('T')[0] && isTimePassed(slot)}
                       <option value={slot} disabled={hasPassed} title={hasPassed ? 'Time has passed' : ''}>{slot}</option>
                    {/each}
                </select>
            {/if}
          </div>
      </div>

      <div class="modal-actions">
          <Button color="alternative" on:click={() => { rescheduleModal = false; rescheduleSlotsError=null; fetchedRescheduleSlots=[]; isRescheduleDateWorking=false; }}>
              Cancel
          </Button>
          <Button color="blue" on:click={rescheduleAppointment} disabled={isLoadingRescheduleSlots || !newTime || !newDate || (newDate === currentAppointment.date && newTime === currentAppointment.time)}>
             <i class="fas fa-exchange-alt mr-2"></i> Request Reschedule
          </Button>
      </div>
    </div>
  </div>
  {/if}

  <!-- Cancel Modal -->
  <Modal bind:open={popupModal} size="xs" autoclose={false} class="cancel-modal">
    <div class="text-center">
      <ExclamationCircleOutline class="mx-auto mb-4 text-yellow-400 w-12 h-12" />
      <h3 class="mb-5 text-lg font-normal text-gray-600">Are you sure you want to request cancellation?</h3>
      <div class="mb-4 text-left px-2">
        <p class="text-gray-600 font-medium mb-2">Reason for Cancellation (Required):</p>
        <div class="space-y-1">
          <label class="flex items-center cursor-pointer">
            <Checkbox bind:checked={reasonNotAvailable} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"/> Service no longer needed
          </label>
          <label class="flex items-center cursor-pointer">
            <Checkbox bind:checked={reasonSchedulingConflict} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"/> Scheduling conflict
          </label>
          <label class="flex items-center cursor-pointer">
            <Checkbox bind:checked={reasonOther} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"/> Other
          </label>
        </div>

        {#if requestRefund}
          <div class="mt-4">
            <p class="text-gray-600 font-medium mb-2">Refund Request Details:</p>
            <div class="bg-blue-50 p-3 rounded-md mb-3">
              <p class="text-sm text-blue-700">
                <i class="fas fa-info-circle mr-1"></i>
                Since this appointment has been paid, you can request a refund.
              </p>
            </div>
            <div class="space-y-2">
              <label class="block text-sm text-gray-600">
                Reason for Refund (Required):
                <textarea
                  bind:value={refundReason}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  rows="3"
                  placeholder="Please explain why you need a refund..."
                ></textarea>
              </label>
            </div>
          </div>
        {/if}
      </div>
      <div class="modal-actions">
         <Button color="alternative" on:click={() => { 
           popupModal = false; 
           reasonNotAvailable = false; 
           reasonSchedulingConflict = false; 
           reasonOther = false;
           requestRefund = false;
           refundReason = '';
         }}>
             No, Keep Appointment
         </Button>
         <Button color="red" on:click={requestCancelAppointment} disabled={!reasonNotAvailable && !reasonSchedulingConflict && !reasonOther || (requestRefund && !refundReason.trim())}>
             <i class="fas fa-ban mr-2"></i>Yes, Request
         </Button>
      </div>
    </div>
  </Modal>

  <!-- Payment Modal -->
  {#if paymentModal && selectedAppointmentId}
  <div class="modal payment-modal">
    <div class="modal-content">
      <h2 class="text-xl font-semibold mb-4">Secure Payment</h2>
      
      <div class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600 mb-2">Payment Details:</p>
          <p class="font-semibold text-lg">₱{paymentAmount.toFixed(2)}</p>
          <p class="text-sm text-gray-500 mt-1">Service: {currentAppointment?.service}</p>
        </div>

        <div class="text-sm text-gray-600">
          <p class="mb-2">You will be redirected to our secure payment processor.</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Secure payment processing</li>
            <li>Multiple payment methods accepted</li>
            <li>Instant confirmation</li>
          </ul>
        </div>
      </div>

      <div class="modal-actions">
          <Button color="alternative" on:click={() => { paymentModal = false; }}>
              Cancel
          </Button>
          <Button color="green" on:click={processPayment}>
            <i class="fas fa-lock mr-2"></i> Proceed to Payment
          </Button>
      </div>
    </div>
  </div>
  {/if}

  <!-- All Times Have Passed Modal -->
  {#if timesPassedModal}
  <div class="modal" transition:fade={{ duration: 200 }}>
    <div class="modal-content times-passed-modal" transition:scale={{ duration: 500, easing: elasticOut, start: 0.5 }}>
      <div class="text-center">
        <div class="times-passed-icon">
          <i class="fas fa-info-circle"></i>
        </div>
        <h3 class="times-passed-title">All Times Have Passed</h3>
        <p class="times-passed-message">{timesPassedMessage}</p>
      </div>
      <div class="modal-actions">
        <Button color="blue" on:click={() => { timesPassedModal = false; }} class="w-full times-passed-btn">
          OK
        </Button>
      </div>
    </div>
  </div>
  {/if}

<style>
  /* Page Layout */
  .page-wrapper {
    min-height: 100vh;
    background: #ffffff;
    padding: 2rem 1rem;
  }

  .page-header {
    text-align: left;
    margin-bottom: 2rem;
    animation: fadeIn 0.6s ease-out;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    padding: 0 1rem;
  }

  .page-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .page-subtitle {
    font-size: 1.125rem;
    color: #6b7280;
  }

  .responsive-container {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .responsive-card {
    flex: 1 1 45%;
    min-width: 320px;
    max-width: 650px;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    overflow: hidden;
    animation: slideUp 0.6s ease-out;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .responsive-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  }

  .card-header {
    background: linear-gradient(135deg, #1e3a66 0%, #1e3a66 100%);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .card-header-icon {
    font-size: 1.5rem;
    color: white;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .card-content {
    padding: 1.5rem;
  }

  /* Form Elements */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    background: white;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-input:disabled {
    background: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .sub-services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  /* Alert Boxes */
  .alert-box {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
    animation: fadeIn 0.4s ease;
  }

  .alert-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .alert-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .alert-text {
    font-size: 0.875rem;
  }

  .alert-info {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  }

  .alert-info .alert-icon {
    color: #3b82f6;
  }

  .alert-warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
  }

  .alert-warning .alert-icon {
    color: #f59e0b;
  }

  .alert-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .alert-error .alert-icon {
    color: #ef4444;
  }

  @media (max-width: 768px) {
    .page-wrapper {
      padding: 0.75rem;
    }

    .page-header {
      padding: 1rem 0;
    }

    .page-title {
      font-size: 1.75rem;
    }

    .page-subtitle {
      font-size: 0.875rem;
    }

    .responsive-container {
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .responsive-card {
      width: 100%;
      min-width: 0;
    }

    .card-header {
      padding: 1rem;
    }

    .card-title {
      font-size: 1.1rem;
    }

    .card-content {
      padding: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-input {
      padding: 0.875rem;
      font-size: 1rem;
    }

    .sub-services-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .time-slot-group {
      margin-bottom: 1.25rem;
    }

    .slot-button {
      padding: 0.75rem 0.5rem !important;
      font-size: 0.9rem !important;
      min-height: 44px;
    }

    .skeleton-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .booking-summary {
      padding: 1rem;
    }

    .summary-value {
      font-size: 1rem;
    }

    .appointment-card {
      padding: 1rem;
      font-size: 0.9rem;
    }

    .action-buttons {
      margin-top: 0.75rem;
      justify-content: flex-start;
    }

    .btn-action {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      min-height: 36px;
      flex: 1;
    }

    .tabs-container {
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.875rem 0.75rem;
      font-size: 0.95rem;
    }

    .modal {
      padding: 0.5rem;
    }

    .modal-content {
      max-width: 100%;
      padding: 1.25rem;
    }

    .alert-box {
      padding: 0.875rem;
      gap: 0.75rem;
    }

    .alert-icon {
      font-size: 1.25rem;
    }
  }

  /* Modal Base Styles */
  .modal {
      position: fixed; z-index: 50; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      padding: 1rem;
   }
  .modal-content {
      background: white;
      padding: 1.5rem;
      border-radius: 0.5rem;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
   }
   @media (max-width: 640px) {
       .modal-content { padding: 1rem; }
   }
  .modal-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.5rem; }

  /* Times Passed Modal Styles */
  .times-passed-modal {
    max-width: 550px;
    padding: 3rem 2.5rem;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid #e0f2fe;
    box-shadow: 0 20px 60px rgba(14, 165, 233, 0.25);
  }

  .times-passed-icon {
    font-size: 5rem;
    color: #0ea5e9;
    margin-bottom: 1.5rem;
    display: inline-block;
    animation: pulse-bounce 1.5s ease-in-out infinite;
  }

  .times-passed-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 1rem;
    letter-spacing: -0.5px;
  }

  .times-passed-message {
    font-size: 1.0625rem;
    color: #475569;
    line-height: 1.6;
    margin-bottom: 2rem;
    font-weight: 500;
  }

  .times-passed-btn {
    padding: 0.875rem 1.5rem;
    font-size: 1.0625rem;
    font-weight: 600;
    border-radius: 0.5rem;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    border: none;
  }

  .times-passed-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4);
  }

  .times-passed-btn:active {
    transform: translateY(0);
  }

  @keyframes pulse-bounce {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.15);
      opacity: 0.8;
    }
  }

  @media (max-width: 640px) {
    .times-passed-modal {
      max-width: 90vw;
      padding: 2rem 1.5rem;
    }

    .times-passed-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }

    .times-passed-title {
      font-size: 1.5rem;
    }

    .times-passed-message {
      font-size: 0.9375rem;
    }

    .times-passed-btn {
      padding: 0.75rem 1rem;
      font-size: 1rem;
    }
  }


  /* Time Slots */
  .time-slots-section {
    margin-top: 1.5rem;
  }

  .time-slot-group {
    margin-bottom: 1.5rem;
  }

  .time-slot-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 0.75rem;
  }

  .slot-button {
    font-weight: 500;
    text-align: center;
    transition: all 0.2s ease;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slot-button.selected {
    background: linear-gradient(135deg, #1e3a66 0%, #1e3a66 100%);
    color: white;
    border-color: #667eea;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    transform: scale(1.05);
  }

  .slot-button.available {
    border: 2px solid #e5e7eb;
    color: #374151;
    background-color: white;
  }

  .slot-button.available:hover {
    background: linear-gradient(135deg, #f0f4ff 0%, #e9efff 100%);
    border-color: #1e3a66;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .slot-button.unavailable {
    background-color: #f9fafb;
    color: #9ca3af;
    border: 2px solid #f3f4f6;
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* Booking Summary */
  .booking-summary {
    margin-top: 1.5rem;
    padding: 1.25rem;
    background: linear-gradient(135deg, #f0f4ff 0%, #e9efff 100%);
    border-radius: 0.75rem;
    border: 2px solid #1e3a66;
  }

  .summary-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .summary-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .appointment-list {
      flex-grow: 1;
      min-height: 100px; 
      overflow-y: auto;
      padding-right: 8px;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
  }
  .appointment-list::-webkit-scrollbar { width: 6px; }
  .appointment-list::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
  .appointment-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  .appointment-list::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  /* Appointment Cards */
  .appointment-card {
    background-color: #ffffff;
    border: 2px solid #e5e7eb;
    padding: 1.25rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    min-height: 170px;
    overflow: hidden;
    transition: all 0.3s ease;
    margin-bottom: 1rem;
    position: relative;
    word-wrap: break-word;
  }

  .appointment-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(135deg, #1e3a66 0%, #ffbc22 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .appointment-card:hover::before {
    opacity: 1;
  }

  .appointment-card:last-child {
    margin-bottom: 0;
  }

  .appointment-card:hover {
    border-color: #667eea;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.15);
    transform: translateX(4px);
  }

  .appointment-card.past {
    background-color: #f9fafb;
    opacity: 0.85;
    border-color: #f3f4f6;
  }

  .appointment-card > div.flex-grow {
    flex-grow: 1;
    min-height: 0;
  }

  .appointment-card > div.mt-auto {
    margin-top: auto;
    flex-shrink: 0;
  }

  .status-badge {
      display: inline-flex; align-items: center;
      padding: 0.25rem 0.75rem; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 600;
      text-transform: capitalize; border: 1px solid transparent;
      white-space: nowrap;
  }
  .pending-status,
.reschedule-requested-status,
.cancellationrequested-status,
.requested-status {
  background-color: #fef9c3;
  color: #a16207;
  border-color: #fef08a;
}

.accepted-status,
.confirmed-status,
.rescheduled-status {
  background-color: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}

.completed-status {
  background-color: #dbeafe;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.completed-need-follow-up-status {
  background-color: #e0e7ff;
  color: #3730a3;
  border-color: #c7d2fe;
}

.missed-status {
  background-color: #ffedd5;
  color: #c2410c;
  border-color: #fed7aa;
}

.cancelled-status,
.decline-status,
.Approved-status,
.canceled-status {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

  .action-buttons {
      display: flex; gap: 0.5rem; justify-content: flex-end;
      align-items: center; min-height: 32px; flex-shrink: 0;
      flex-wrap: wrap;
  }
  
  @media (max-width: 480px) {
    .action-buttons {
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    
    .btn-action {
      width: 100%;
      justify-content: center;
    }
  }
  .btn-action {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.25rem 0.5rem; font-size: 0.8rem; border-radius: 0.375rem;
      cursor: pointer; border: 1px solid transparent; color: white;
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
      line-height: 1.25;
  }
  .btn-action:focus {
      outline: 2px solid transparent; outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  }
  .btn-action i { width: 1em; text-align: center; }
  .btn-reschedule { background-color: #3b82f6; border-color: #2563eb; }
  .btn-reschedule:hover { background-color: #2563eb; }
  .btn-cancel { background-color: #ef4444; border-color: #dc2626; }
  .btn-cancel:hover { background-color: #dc2626; }

  /* Tabs */
  .tabs-container {
    display: flex;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1.5rem;
  }

  .tab-button {
    flex: 1;
    padding: 0.75rem 1rem;
    font-weight: 500;
    text-align: center;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.3s ease;
    color: #6b7280;
    font-size: 0.875rem;
    position: relative;
  }

  .tab-button.active-tab {
    color: #667eea;
    font-weight: 600;
    border-bottom-color: #667eea;
  }

  .tab-button:hover:not(.active-tab) {
    color: #374151;
    background: #f9fafb;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    animation: fadeIn 0.6s ease;
  }

  .empty-icon {
    font-size: 3rem;
    color: #d1d5db;
    margin-bottom: 1rem;
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .empty-text {
    font-size: 0.875rem;
    color: #6b7280;
  }

  /* Utility */
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Dark Mode */
  :global(.dark) .page-wrapper {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  :global(.dark) .page-title,
  :global(.dark) .page-subtitle {
    color: #f1f5f9;
  }

  :global(.dark) .responsive-card {
    background-color: #1e293b;
    border-color: #334155;
  }

  :global(.dark) .card-title {
    color: #f1f5f9;
  }

  :global(.dark) .form-label {
    color: #cbd5e1;
  }

  :global(.dark) .form-input {
    background-color: #334155;
    border-color: #475569;
    color: #f1f5f9;
  }

  :global(.dark) .form-input:focus {
    border-color: #667eea;
  }
 :global(.dark) select, :global(.dark) input[type="date"] { background-color: #374151; border-color: #4b5563; color: #f9fafb; }
 :global(.dark) .slot-button.available { background-color: #374151; border-color: #4b5563; color: #d1d5db; }
 :global(.dark) .slot-button.available:hover { background-color: #4b5563; }
 :global(.dark) .slot-button.unavailable { background-color: #1f2937; border-color: #374151; color: #6b7280; }
 :global(.dark) .appointment-list { scrollbar-color: #4b5563 #1f2937; }
 :global(.dark) .appointment-list::-webkit-scrollbar-track { background: #1f2937; }
 :global(.dark) .appointment-list::-webkit-scrollbar-thumb { background: #4b5563; }
 :global(.dark) .appointment-list::-webkit-scrollbar-thumb:hover { background: #6b7280; }
 
 :global(.dark) .appointment-card { background-color: #374151; border-color: #4b5563; }
 :global(.dark) .appointment-card.past { background-color: #1f2937; border-color: #374151; }
 :global(.dark) .appointment-card p.text-gray-800, :global(.dark) .appointment-card p.text-gray-700 { color: #d1d5db; }
 :global(.dark) .appointment-card .text-gray-600 { color: #9ca3af; }
 :global(.dark) .appointment-card .text-gray-500 { color: #6b7280; }
 :global(.dark) .appointment-card .text-gray-400 { color: #9ca3af; }
 :global(.dark) .appointment-card .border-gray-100 { border-color: #4b5563; }
 /* End inner card dark mode */
 :global(.dark) .tab-button { color: #9ca3af; }
 :global(.dark) .tab-button:hover:not(.active-tab) { color: #f9fafb; border-bottom-color: #4b5563; }
 :global(.dark) .tab-button.active-tab { color: #60a5fa; border-bottom-color: #60a5fa; }
 :global(.dark) .no-appointments { background-color: #374151; border-color: #4b5563; color: #9ca3af; }
 :global(.dark) .modal-content { background-color: #1f2937; }
 :global(.dark) .modal h2 { color: #f3f4f6; }
 :global(.dark) .modal p, :global(.dark) .modal label { color: #d1d5db; }

 .btn-payment { 
    background-color: #10b981; 
    border-color: #059669; 
  }
  .btn-payment:hover { 
    background-color: #059669; 
  }

  .payment-modal .modal-content {
    max-width: 400px;
  }

  /* payment-status styles removed (unused in this component) */

  .paid-payment-status {
    background-color: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
  }

  .unpaid-payment-status {
    background-color: #fee2e2;
    color: #b91c1c;
    border-color: #fecaca;
  }

  :global(.dark) .paid-payment-status {
    background-color: #064e3b;
    color: #6ee7b7;
    border-color: #059669;
  }

  :global(.dark) .unpaid-payment-status {
    background-color: #7f1d1d;
    color: #fca5a5;
    border-color: #dc2626;
  }

  .refund_pending-payment-status {
    background-color: #fef3c7;
    color: #92400e;
    border-color: #fcd34d;
}

.refunded-payment-status {
    background-color: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
}

:global(.dark) .refund_pending-payment-status {
    background-color: #78350f;
    color: #fcd34d;
    border-color: #92400e;
}

:global(.dark) .refunded-payment-status {
    background-color: #064e3b;
    color: #6ee7b7;
    border-color: #059669;
}

/* Reason paragraph styling (smaller, wrapped, subtle color) */
.reason-paragraph {
  font-size: 0.75rem; /* smaller than surrounding text */
  margin-top: 0.25rem;
  font-style: italic;
  line-height: 1.2;
  white-space: normal;
  color: #6b7280; /* gray-500 */
}
.reason-paragraph.text-red-600 { color: #dc2626; }

/* Skeleton loaders */
.skeleton-header {
  height: 20px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  width: 30%;
}

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    .skeleton-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .page-title {
      font-size: 1.5rem;
    }
    
    .card-header-icon {
      font-size: 1.25rem;
    }
    
    .summary-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }.skeleton-slot {
  height: 36px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.375rem;
}

.skeleton-appointment-card {
  height: 170px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

:global(.dark) .skeleton-header,
:global(.dark) .skeleton-slot,
:global(.dark) .skeleton-appointment-card {
  background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
  background-size: 200% 100%;
}
</style>