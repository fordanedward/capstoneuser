<script lang="ts">
  import { Checkbox } from 'flowbite-svelte';
  import { onMount } from "svelte";
  import {
    getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where,
    updateDoc, getDoc, onSnapshot, runTransaction, initializeFirestore, CACHE_SIZE_UNLIMITED,
    type QuerySnapshot, type DocumentData, Timestamp // Add Timestamp import
  } from "firebase/firestore";
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { env } from '$lib/env';
  import { getAuth, onAuthStateChanged, type Unsubscribe } from "firebase/auth"; // Import Unsubscribe type
  import '@fortawesome/fontawesome-free/css/all.css'; // Keep for icons
  import { Button, Modal, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { ExclamationCircleOutline, CloseOutline, CloseCircleOutline } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte'; // Keep if used elsewhere, otherwise remove
  import Swal from 'sweetalert2';
  import { loadStripe } from '@stripe/stripe-js';
  import { browser } from '$app/environment';

  // --- Constants ---
  const FIRESTORE_APPOINTMENTS_COLLECTION = 'appointments';
  const FIRESTORE_PATIENT_PROFILES_COLLECTION = 'patientProfiles';
  const FIRESTORE_SETTINGS_COLLECTION = 'settings';
  const FIRESTORE_SCHEDULE_DEFAULTS_DOC = 'scheduleDefaults';
  const FIRESTORE_DAILY_SCHEDULES_COLLECTION = 'dailySchedules';
  if (!env.stripe.publicKey) {
    throw new Error('Stripe public key is not configured');
  }
  const stripePromise = loadStripe(env.stripe.publicKey);

  const ALL_POSSIBLE_MORNING_SLOTS = [
      "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  ];
  const ALL_POSSIBLE_AFTERNOON_SLOTS = [
      "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  ];
  const ALL_POSSIBLE_SLOTS = [...ALL_POSSIBLE_MORNING_SLOTS, ...ALL_POSSIBLE_AFTERNOON_SLOTS];

  // --- Firebase Initialization ---
  let db: ReturnType<typeof getFirestore>;
  let auth: ReturnType<typeof getAuth>;

  if (browser && typeof window !== 'undefined') {
    try {
      if (getApps().length === 0) {
        const app = initializeApp(env.firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase Initialized (Client Booking)");
      } else {
        const app = getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Using existing Firebase instance (Client Booking)");
      }
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      Swal.fire('Error', 'Could not connect to the booking system.', 'error');
    }
  }

  // --- Type Definitions ---
  type ServiceType = typeof services[number];
  type SubServiceType = typeof subServices[keyof typeof subServices][number];
  type ServiceWithSubServices = keyof typeof subServices;

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

  let defaultWorkingDays: number[] = [1, 2, 3, 4, 5]; // Default fallback
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

  // --- Static Data ---
  const services = [
    "Consultation", "Oral Prophylaxis / Linis", "Filling / Pasta", "COSMETIC", "ORAL SURGERY",
    "ENDODONTIC", "PROSTHODONTICS", "CROWNS", "ORTHODONTICS", "TMJ", "IMPLANTS"
  ] as const;

  // Add service prices
  const servicePrices: Record<ServiceType, number> = {
    "Consultation": 300,
    "Oral Prophylaxis / Linis": 1000,
    "Filling / Pasta": 1500,
    "COSMETIC": 5000,
    "ORAL SURGERY": 3000,
    "ENDODONTIC": 4000,
    "PROSTHODONTICS": 8000,
    "CROWNS": 12000,
    "ORTHODONTICS": 50000,
    "TMJ": 2000,
    "IMPLANTS": 30000
  };

  const subServices = {
    "Oral Prophylaxis / Linis": ["Simple & Deep Scaling", "Fluoride"],
    "Filling / Pasta": ["Composite", "Temporary", "Pit & Fissure Sealants"],
    "COSMETIC": ["Whitening", "Laminate / Veneer"],
    "ORAL SURGERY": ["Simple", "Complicated", "Odontectomy"],
    "ENDODONTIC": ["Pulpotomy"],
    "PROSTHODONTICS": ["Complete Denture", "Removable Denture"],
    "CROWNS": ["Plastic", "Porcelain, Zirconia, Emax", "Fixed Bridge"],
    "ORTHODONTICS": ["Braces", "Retainers"]
  } as const;

  // Add sub-service prices
  const subServicePrices: Record<SubServiceType, number> = {
    "Simple & Deep Scaling": 500,
    "Fluoride": 300,
    "Composite": 800,
    "Temporary": 500,
    "Pit & Fissure Sealants": 400,
    "Whitening": 3000,
    "Laminate / Veneer": 8000,
    "Simple": 1500,
    "Complicated": 2500,
    "Odontectomy": 3000,
    "Pulpotomy": 2000,
    "Complete Denture": 5000,
    "Removable Denture": 4000,
    "Plastic": 3000,
    "Porcelain, Zirconia, Emax": 8000,
    "Fixed Bridge": 10000,
    "Braces": 45000,
    "Retainers": 2000
  };

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
            console.log("Loaded default working days:", defaultWorkingDays);
        } else {
            console.warn("Default working days not found or invalid in Firestore. Using code default [1,2,3,4,5].");
            defaultWorkingDays = [1, 2, 3, 4, 5];
        }
    } catch (error) {
        console.error("Error loading default working days:", error);
    }
  }

  async function fetchAvailabilityForDate(date: string, target: 'booking' | 'reschedule') {
    if (!db || !date) return;

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
            isWorking = data.isWorkingDay ?? false;
            if (isWorking && Array.isArray(data.availableSlots)) {
                slots = data.availableSlots;
            }
        } else {
            const dateObj = new Date(date + 'T00:00:00Z');
            const dayOfWeek = dateObj.getUTCDay();
            isWorking = defaultWorkingDays.includes(dayOfWeek);
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
            console.log(`Availability Check for ${date} (${target}): Filtered unavailable slots: ${unavailableSlots.join(', ')}. Final slots: ${finalAvailableSlots.length}`);
        }

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
                profileData.email && 
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
           fetchAvailabilityForDate(selectedDate, 'booking');
           return;
      }

      try {
          // Calculate total amount
          let totalAmount = servicePrices[selectedService];
          if (selectedSubServices && selectedSubServices.length > 0) {
              selectedSubServices.forEach(subService => {
                  totalAmount += subServicePrices[subService as SubServiceType] || 0;
              });
          }

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
          fetchAvailabilityForDate(selectedDate, 'booking');

      } catch (error: any) {
          console.error("Error during booking transaction:", error);
          let title = 'Booking Error';
          let text = 'An issue occurred while booking your appointment. Please try again.';
          if (error.message === 'Time Slot Unavailable') {
              title = 'Time Slot Unavailable';
              text = 'Sorry, this time slot was just booked. Please choose a different time.';
              fetchAvailabilityForDate(selectedDate, 'booking');
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

                    if (appointmentDate >= todayISOString) {
                        if(appointmentWithId.cancellationStatus !== 'Approved' && appointmentWithId.cancellationStatus !== 'decline') {
                           upcomingAppointments.push(appointmentWithId);
                        } else {
                           pastAppointments.push(appointmentWithId);
                        }
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
          console.error("Error setting up real-time listener for appointments:", e);
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
          console.error("Could not find appointment to reschedule:", appointmentId);
          Swal.fire('Error', 'Could not load appointment details for rescheduling.', 'error');
      }
  }

  async function rescheduleAppointment(): Promise<void> {
      if (!selectedAppointmentId || !currentAppointment) {
          console.error("Missing data for reschedule:", selectedAppointmentId, currentAppointment);
          Swal.fire('Error', 'Cannot proceed with reschedule. Please close and reopen.', 'error'); return;
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
          console.error("Error submitting reschedule request:", error);
          let title = 'Reschedule Error';
          let text = 'Failed to submit reschedule request. Please try again.';
          if (error.message === 'Reschedule Slot Unavailable') {
              title = 'Time Slot Unavailable';
              text = 'Sorry, the new time slot became unavailable. Please choose another.';
               fetchAvailabilityForDate(newDate, 'reschedule');
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

      // Calculate total amount with type assertions
      let totalAmount = servicePrices[appointment.service as ServiceType] || 500;
      
      if (appointment.subServices && appointment.subServices.length > 0) {
        appointment.subServices.forEach(subService => {
          totalAmount += subServicePrices[subService as SubServiceType] || 0;
        });
      }

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

      // Update appointment with payment amount
      if (!selectedAppointmentId) throw new Error('No appointment selected');
      const appointmentRef = doc(db, FIRESTORE_APPOINTMENTS_COLLECTION, selectedAppointmentId);
      await updateDoc(appointmentRef, {
        paymentAmount: totalAmount
      });

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
    const appointment = upcomingAppointments.find(a => a.id === appointmentId);
    if (appointment) {
      let totalAmount = servicePrices[appointment.service as ServiceType] || 500;
      if (appointment.subServices && appointment.subServices.length > 0) {
        appointment.subServices.forEach(subService => {
          totalAmount += subServicePrices[subService as SubServiceType] || 0;
        });
      }
      paymentAmount = totalAmount;
    }
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
        console.error("Firebase not initialized onMount"); return;
      }
      await loadDefaultWorkingDays();
      fetchAvailabilityForDate(selectedDate, 'booking');

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
      if (authUnsubscribe) authUnsubscribe();
      if (appointmentsUnsubscribe) appointmentsUnsubscribe();
    };
  });

  // --- Reactivity ---
  $: if (selectedDate && db) {
    fetchAvailabilityForDate(selectedDate, 'booking');
  }

  $: if (rescheduleModal && newDate && db) {
     fetchAvailabilityForDate(newDate, 'reschedule');
  }

  $: displayMorningSlots = fetchedBookingSlots.filter(slot => ALL_POSSIBLE_MORNING_SLOTS.includes(slot));
  $: displayAfternoonSlots = fetchedBookingSlots.filter(slot => ALL_POSSIBLE_AFTERNOON_SLOTS.includes(slot));

</script>

<div style="max-height: 100vh; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">
  <div class="responsive-container">

    <!-- Booking Card (Left) -->
    <div class="responsive-card">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">Book Appointment</h3>
      <div class="space-y-4"> 
        {#if !patientId}
          <div class="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
              <i class="fas fa-sign-in-alt mr-2"></i>Please log in to book an appointment.
          </div>
        {:else if !hasCompleteProfile}
          <div class="text-center p-6 text-orange-600 bg-orange-50 rounded-md">
              <i class="fas fa-user-edit mr-2"></i>Please complete your profile information before booking an appointment.
              <div class="mt-4">
                  <Button color="blue" on:click={() => window.location.href = '/auth/profile'}>
                      <i class="fas fa-user-edit mr-2"></i>Complete Profile
                  </Button>
              </div>
          </div>
        {:else}
          <div>
            <label for="datepicker" class="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              id="datepicker"
              bind:value={selectedDate}
              class="block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
              min={getMinDate()}
              disabled={isLoadingBookingSlots}
            />
          </div>

          <div>
              <label for="service-select" class="block text-sm font-medium text-gray-700 mb-1">Select Service</label>
              <select id="service-select" bind:value={selectedService} class="block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70" disabled={isLoadingBookingSlots}>
                  <option value={null} disabled selected>Select a service</option>
                  {#each services as service} <option value={service}>{service}</option> {/each}
              </select>
          </div>

          {#if selectedService && selectedService in subServices}
          <div class="pt-2">
              <label for="subservices-group" class="block text-sm font-medium text-gray-700 mb-1">Sub-services (Optional)</label>
               <div id="subservices-group" class="space-y-1">
                   {#each subServices[selectedService as ServiceWithSubServices] as subService}
                   <label for={`sub-${subService}`} class="flex items-center">
                       <Checkbox id={`sub-${subService}`} value={subService} on:change={() => toggleSubService(subService)} disabled={isLoadingBookingSlots} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                       <span class="ml-2 text-sm text-gray-600">{subService}</span>
                      </label>
                   {/each}
               </div>
          </div>
          {/if}

          <div class="pt-2 space-y-4">
            {#if isLoadingBookingSlots}
              <div class="text-center p-4 text-blue-600 bg-blue-50 rounded-md">
                  <i class="fas fa-spinner fa-spin mr-2"></i>Loading available times...
              </div>
            {:else if bookingSlotsError}
               <div class="text-center p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
                  <i class="fas fa-exclamation-triangle mr-2"></i>{bookingSlotsError}
              </div>
            {:else if !isBookingDateWorking}
              <div class="text-center p-4 text-orange-700 bg-orange-100 rounded-md border border-orange-200">
                   <i class="fas fa-calendar-times mr-2"></i>Sorry, this is not a working day.
              </div>
            {:else if fetchedBookingSlots.length === 0}
              <div class="text-center p-4 text-gray-600 bg-gray-100 rounded-md border border-gray-200">
                  <i class="fas fa-info-circle mr-2"></i>No available time slots for this date.
               </div>
            {:else}
              {#if displayMorningSlots.length > 0}
              <div>
                 <div class="flex items-center mb-2 text-sm font-medium text-gray-600">
                      <i class="far fa-sun mr-2 w-4 text-center"></i>Morning
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
              <div>
                   <div class="flex items-center mb-2 text-sm font-medium text-gray-600">
                       <i class="far fa-moon mr-2 w-4 text-center"></i>Afternoon
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
                <div class="mt-4 pt-4 border-t border-gray-200 text-center">
                    <p class="text-gray-700 mb-3 text-sm">
                        Selected: <span class="font-semibold">{formatDate(selectedDate)}</span> at <span class="font-semibold">{selectedTime}</span>
                    </p>
                    <Button
                        size="md"
                        color="green"
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
    <div class="responsive-card">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">Your Appointments</h3>
       <div class="flex border-b border-gray-200 mb-4">
            <button on:click={() => switchTab('upcoming')} class="tab-button {activeTab === 'upcoming' ? 'active-tab' : ''}"> Upcoming </button>
            <button on:click={() => switchTab('past')} class="tab-button {activeTab === 'past' ? 'active-tab' : ''}"> Past </button>
        </div>

        {#if !patientId}
          <div class="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
              <i class="fas fa-sign-in-alt mr-2"></i>Please log in to see your appointments.
          </div>
        {:else}
          <div class="appointment-list space-y-3">
                {#if activeTab === 'upcoming'}
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
                            
                               <div class="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center min-h-[50px]">
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
                                    {#if appointment.paymentStatus}
                                        <div class="status-badge {appointment.paymentStatus}-payment-status ml-2">
                                            <i class="fas {appointment.paymentStatus === 'paid' ? 'fa-check-circle' : 
                                                         appointment.paymentStatus === 'refund_pending' ? 'fa-clock' : 
                                                         appointment.paymentStatus === 'refunded' ? 'fa-money-bill-wave' : 
                                                         'fa-times-circle'} mr-1"></i>
                                            {#if appointment.paymentStatus === 'refund_pending'}
                                                Refund Pending
                                            {:else if appointment.paymentStatus === 'refunded'}
                                                Refunded
                                            {:else}
                                                {appointment.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                            {/if}
                                        </div>
                                    {/if}
                                    {#if appointment.paymentStatus === 'refunded' && appointment.refundAmount}
                                        <div class="text-xs text-gray-500 ml-2">
                                            (₱{appointment.refundAmount.toFixed(2)})
                                        </div>
                                    {/if}
                                    {#if appointment.paymentStatus === 'refund_pending' || appointment.paymentStatus === 'refunded'}
                                        <div class="text-xs text-gray-500 ml-2">
                                            {#if appointment.refundRequestDate}
                                                Requested: {appointment.refundRequestDate instanceof Timestamp ? appointment.refundRequestDate.toDate().toLocaleDateString() : new Date(appointment.refundRequestDate).toLocaleDateString()}
                                            {/if}
                                            {#if appointment.refundProcessedDate}
                                                <br>Processed: {appointment.refundProcessedDate instanceof Timestamp ? appointment.refundProcessedDate.toDate().toLocaleDateString() : new Date(appointment.refundProcessedDate).toLocaleDateString()}
                                            {/if}
                                        </div>
                                    {/if}
                                    <div class="action-buttons">
                                        {#if (appointment.status === 'Accepted' || appointment.status === 'pending' || appointment.status === 'confirmed') && appointment.cancellationStatus !== 'requested' && appointment.cancellationStatus !== 'Approved'}
                                           <button title="Reschedule Appointment" class="btn-action btn-reschedule" on:click={() => openRescheduleModal(appointment.id)}>
                                                <i class="fas fa-edit"></i> <span class="hidden sm:inline ml-1">Reschedule</span>
                                           </button>
                                           <button title="Cancel Appointment" class="btn-action btn-cancel" on:click={() => openCancelModal(appointment.id)}>
                                                <i class="fas fa-times"></i> <span class="hidden sm:inline ml-1">Cancel</span>
                                           </button>
                                           {#if appointment.status === 'Accepted' && (!appointment.paymentStatus || appointment.paymentStatus !== 'paid')}
                                           <button title="Make Payment" class="btn-action btn-payment" on:click={() => openPaymentModal(appointment.id)}>
                                                <i class="fas fa-credit-card"></i> <span class="hidden sm:inline ml-1">Pay Now</span>
                                           </button>
                                           {/if}
                                        {:else if appointment.status === 'Reschedule Requested'}
                                             <span class="text-xs italic text-purple-600 px-2">Pending...</span>
                                         {:else if appointment.cancellationStatus === 'requested'}
                                             <span class="text-xs italic text-yellow-700 px-2">Pending...</span>
                                         {/if}
                                         {#if appointment.cancellationStatus === 'Approved'}
                                            <span class="text-xs italic text-red-600 px-2 truncate" title={appointment.cancelReason}>
                                                Reason: {appointment.cancelReason || 'N/A'}
                                            </span>
                                         {/if}
                                    </div>
                               </div>
                            </div>
                        {/each}
                    {:else}
                        <div class="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
                           <i class="fas fa-calendar-day mr-2"></i> No upcoming appointments.
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
                                <div class="mt-auto pt-2 border-t border-gray-100 flex items-center min-h-[50px]">
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
                                     {#if appointment.cancellationStatus === 'Approved'}
                                        <span class="text-xs italic text-gray-500 ml-2 truncate" title={appointment.cancelReason}>
                                            ({appointment.cancelReason || 'No reason'})
                                        </span>
                                     {/if}
                                </div>
                            </div>
                        {/each}
                    {:else}
                         <div class="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
                           <i class="fas fa-history mr-2"></i>No past appointments.
                        </div>
                    {/if}
                {/if}
          </div>
        {/if}
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
                <div class="p-2 text-sm text-orange-700 bg-orange-100 rounded-md border border-orange-200">This is not a working day.</div>
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

</div>
<style>
  .responsive-container {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem; 
    padding: 1rem; 
    width: 100%;
    margin-top: 2rem; 
    margin-bottom: 2rem;
    /* max-height: 90vh; */ /* Removing this might help stretching on desktop if needed */
    flex-wrap: wrap;
    align-items: stretch; /* Explicitly set default, ensures cards stretch vertically on desktop */
  }
  .responsive-card {
    flex: 1 1 45%;
    min-width: 320px;
    border: 1px solid #e5e7eb; /* border-gray-200 */
    border-radius: 0.75rem; /* rounded-xl */
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
    background-color: #fff;
    padding: 1.5rem; /* p-6 */
    display: flex;           /* Needed for internal flex layout */
    flex-direction: column; /* Needed for internal flex layout */
    /* REMOVED fixed height from here */
  }

   @media (max-width: 768px) {
        .responsive-container {
            flex-direction: column;
            /* max-height: none; */ /* Allow container to grow */
            align-items: center; /* Center cards when stacked */
            margin-top: 1rem;
            gap: 1rem; /* gap-4 */
        }
        .responsive-card {
            flex-basis: auto; /* Allow natural height */
            width: 95%;      /* Control width when stacked */
            /* Ensure min-width doesn't conflict */
             min-width: 0;
            margin-left: auto;
            margin-right: auto;
            padding: 1rem; /* p-4 */
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

  /* Booking Form Time Slots */
  .slot-button {
      font-weight: 500; text-align: center;
   }
  .slot-button.selected {
       background-color: #2563eb; color: white; border-color: #1d4ed8;
       font-weight: 600; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }
   .slot-button.available {
       border-color: #d1d5db; color: #374151; background-color: white;
   }
    .slot-button.available:hover {
       background-color: #f9fafb; border-color: #9ca3af;
    }
  .slot-button.unavailable {
      background-color: #f3f4f6; color: #9ca3af; border-color: #e5e7eb;
      cursor: not-allowed; opacity: 0.7;
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

  /* Inner appointment items */
  .appointment-card {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      height: 170px;             
      overflow: hidden;         
      transition: box-shadow 0.2s ease-in-out;
      margin-bottom: 0.75rem;  
  }
  .appointment-card:last-child {
      margin-bottom: 0;
  }
  .appointment-card:hover {
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
  .appointment-card.past {
      background-color: #f9fafb; opacity: 0.9; border-color: #f3f4f6;
  }
  .appointment-card > div.flex-grow {
      flex-grow: 1; min-height: 0;
  }
   .appointment-card > div.mt-auto {
     margin-top: auto; flex-shrink: 0;
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

 .tab-button {
    flex: 1; padding: 0.75rem 1rem; font-weight: 500; text-align: center;
    border: none; background: none; cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: border-color 0.3s ease, color 0.3s ease;
    color: #6b7280; font-size: 0.875rem;
 }
 .tab-button.active-tab {
    border-bottom-color: #3b82f6; color: #3b82f6; font-weight: 600;
 }
 .tab-button:hover:not(.active-tab) {
    color: #374151; border-bottom-color: #d1d5db;
 }

 /* Utility */
 .truncate {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
 }
 .no-appointments {
    text-align: center; padding: 1.5rem;
    color: #6b7280; background-color: #f9fafb;
    border-radius: 0.5rem; border: 1px dashed #e5e7eb;
 }

 :global(.dark) .responsive-card { background-color: #1f2937; border-color: #374151; }
 :global(.dark) h3 { color: #f3f4f6; }
 :global(.dark) label { color: #d1d5db; }
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
 :global(.dark) .modal h2, :global(.dark) .modal h3 { color: #f3f4f6; }
 :global(.dark) .modal p, :global(.dark) .modal label { color: #d1d5db; }
 :global(.dark) .cancel-modal .text-gray-600 { color: #d1d5db; }

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

  .payment-modal .payment-status {
    text-align: center;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0.5rem;
  }

  .payment-modal .payment-status.pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .payment-modal .payment-status.success {
    background-color: #d1fae5;
    color: #065f46;
  }

  .payment-modal .payment-status.failed {
    background-color: #fee2e2;
    color: #991b1b;
  }

  :global(.dark) .payment-modal .payment-status.pending {
    background-color: #78350f;
    color: #fcd34d;
  }

  :global(.dark) .payment-modal .payment-status.success {
    background-color: #064e3b;
    color: #6ee7b7;
  }

  :global(.dark) .payment-modal .payment-status.failed {
    background-color: #7f1d1d;
    color: #fca5a5;
  }

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
</style>