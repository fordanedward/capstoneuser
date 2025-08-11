import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}', // App files
    './node_modules/flowbite/**/*.{html,js}', // Core Flowbite files
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}', // Flowbite-Svelte files
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin'),
  ],
} satisfies Config;
