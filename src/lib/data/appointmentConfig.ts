// Appointment configuration constants
export const ALL_POSSIBLE_MORNING_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
];

export const ALL_POSSIBLE_AFTERNOON_SLOTS = [
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

export const ALL_POSSIBLE_SLOTS = [...ALL_POSSIBLE_MORNING_SLOTS, ...ALL_POSSIBLE_AFTERNOON_SLOTS];

export const SERVICES = [
  "Imaging", "Laboratory", "Doctor's Consultation",
] as const;

export const SUB_SERVICES = {
  "Imaging": ["X-ray", "ECG", "Ultrasound"],
  "Laboratory": ["FBS", "CBC", "SGPT", "SGOT", "HBSAG", "Cholesterol", "Lipid Profile", "Fecalysis", "Creatinine"],
  "Doctor's Consultation": [
    "Adult Non-Urgent Cases",
    "Travel Clearance", 
    "New Prescription",
    "Fit to Work Certification",
    "Medical Certification",
    "Prescription Refills",
    "Routine Wellness Check Up",
    "Laboratory Request",
    "Tumor Marker (CEA/PSA)",
    "Imaging Request",
    "Thyroid Function (FT3, FT4, TSH)",
    "ECG/EKG/X-Ray/Ultrasound",
    "Troponin I",
    "Lab Result Interpretation",
    "HbA1c"
  ]
} as const;

export const FIRESTORE_APPOINTMENTS_COLLECTION = 'appointments';
export const FIRESTORE_PATIENT_PROFILES_COLLECTION = 'patientProfiles';
export const FIRESTORE_SETTINGS_COLLECTION = 'settings';
export const FIRESTORE_SCHEDULE_DEFAULTS_DOC = 'scheduleDefaults';
export const FIRESTORE_DAILY_SCHEDULES_COLLECTION = 'dailySchedules';

export type ServiceType = typeof SERVICES[number];
export type SubServiceType = typeof SUB_SERVICES[keyof typeof SUB_SERVICES][number];
export type ServiceWithSubServices = keyof typeof SUB_SERVICES;
