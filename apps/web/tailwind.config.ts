import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.css",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        brand: {
          canvas: "var(--brand-canvas)",
          ink: "var(--brand-ink)",
          surface: "var(--brand-surface)",
          "surface-raised": "var(--brand-surface-raised)",
          muted: "var(--brand-muted)",
          border: "var(--brand-border)",
          gold: "var(--brand-gold)",
          "gold-foreground": "var(--brand-gold-foreground)",
          "gold-muted": "var(--brand-gold-muted)",
          "gold-subtle": "var(--brand-gold-subtle)",
          accent: "var(--brand-accent)",
          "accent-foreground": "var(--brand-accent-foreground)",
          "accent-muted": "var(--brand-accent-muted)",
          success: "var(--brand-success)",
          "success-muted": "var(--brand-success-muted)",
          warning: "var(--brand-warning)",
          "warning-muted": "var(--brand-warning-muted)",
          info: "var(--brand-info)",
          "info-muted": "var(--brand-info-muted)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-lg)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        "elev-1": "var(--elevation-1)",
        "elev-2": "var(--elevation-2)",
        "elev-3": "var(--elevation-3)",
        "elev-4": "var(--elevation-4)",
      },
      fontSize: {
        display: [
          "var(--text-display)",
          {
            lineHeight: "var(--leading-display)",
            letterSpacing: "var(--tracking-display)",
          },
        ],
        "title-lg": [
          "var(--text-title-lg)",
          {
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-editorial)",
          },
        ],
        title: [
          "var(--text-title)",
          { lineHeight: "var(--leading-snug)", letterSpacing: "var(--tracking-ui)" },
        ],
        "body-lg": [
          "var(--text-body-lg)",
          { lineHeight: "var(--leading-body)" },
        ],
        body: [
          "var(--text-body)",
          { lineHeight: "var(--leading-body)" },
        ],
        caption: [
          "var(--text-caption)",
          { lineHeight: "var(--leading-snug)" },
        ],
        micro: [
          "var(--text-micro)",
          { lineHeight: "var(--leading-snug)" },
        ],
      },
      lineHeight: {
        display: "var(--leading-display)",
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        body: "var(--leading-body)",
      },
      letterSpacing: {
        editorial: "var(--tracking-editorial)",
        widecaps: "var(--tracking-caps)",
        "caps-tight": "var(--tracking-caps-tight)",
        display: "var(--tracking-display)",
        ui: "var(--tracking-ui)",
      },
      transitionDuration: {
        instant: "var(--motion-duration-instant)",
        brand: "var(--motion-duration-base)",
        "brand-slow": "var(--motion-duration-slow)",
      },
      transitionTimingFunction: {
        brand: "var(--motion-ease-standard)",
        "brand-emphasized": "var(--motion-ease-emphasized)",
        "brand-enter": "var(--motion-ease-enter)",
        "brand-spring": "var(--motion-spring-out)",
      },
      spacing: {
        touch: "var(--space-touch)",
        "b-1": "var(--space-1)",
        "b-2": "var(--space-2)",
        "b-3": "var(--space-3)",
        "b-4": "var(--space-4)",
        "b-5": "var(--space-5)",
        "b-6": "var(--space-6)",
        "b-8": "var(--space-8)",
        "b-10": "var(--space-10)",
        "b-12": "var(--space-12)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "ozilcuts-shimmer": {
          "0%": { transform: "translate3d(-120%, 0, 0)" },
          "100%": { transform: "translate3d(120%, 0, 0)" },
        },
      },
      animation: {
        "ozilcuts-shimmer": "ozilcuts-shimmer 1.65s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
