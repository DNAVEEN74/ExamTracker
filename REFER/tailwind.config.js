/**
 * ExamTracker India - Tailwind CSS Configuration
 * 
 * Usage:
 * Add this to your tailwind.config.js file
 */

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background
        background: {
          primary: '#FFFFFF',
          secondary: '#F8F9FA',
          tertiary: '#F1F3F5',
        },

        // Text
        text: {
          primary: '#1A1A1A',
          secondary: '#5C5C5C',
          tertiary: '#8C8C8C',
          disabled: '#B8B8B8',
        },

        // Accent (Energy & Opportunity)
        accent: {
          DEFAULT: '#FF6B35',
          primary: '#FF6B35',
          secondary: '#FF8555',
          light: '#FFF5F2',
          dark: '#E65A2E',
        },

        // Status Colors
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },

        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },

        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#DC2626',
        },

        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#2563EB',
        },

        // Border
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
          dark: '#D1D5DB',
        },

        // Ad Integration
        ad: {
          bg: '#FAFBFC',
          border: '#E8EAED',
          label: '#9CA3AF',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['Courier New', 'monospace'],
      },

      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['30px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.2' }],
      },

      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },

      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },

      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'accent-cta': '0 2px 8px rgba(255, 107, 53, 0.24)',
      },

      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'ease-in-out',
      },

      zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        'modal-backdrop': 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
      },

      minHeight: {
        'touch-target': '44px', // WCAG minimum touch target
      },

      minWidth: {
        'touch-target': '44px', // WCAG minimum touch target
      },

      height: {
        header: '64px',
        button: '44px',
        input: '56px',
      },

      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      animation: {
        pulse: 'pulse 0.8s ease-in-out infinite',
      },
    },

    screens: {
      mobile: '320px',
      tablet: '768px',
      desktop: '1024px',
      wide: '1440px',
    },
  },

  plugins: [
    // Custom plugin for component classes
    function ({ addComponents }) {
      addComponents({
        // Exam Card
        '.exam-card': {
          backgroundColor: '#F8F9FA',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          transition: '200ms ease-in-out',
          '&:hover': {
            border: '2px solid #FF6B35',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
        },

        // Button Primary
        '.btn-primary': {
          height: '44px',
          minWidth: '44px',
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          padding: '0 24px',
          cursor: 'pointer',
          transition: '200ms ease-in-out',
          '&:hover': {
            backgroundColor: '#E65A2E',
            boxShadow: '0 2px 8px rgba(255, 107, 53, 0.24)',
          },
          '&:disabled': {
            backgroundColor: '#F1F3F5',
            color: '#B8B8B8',
            cursor: 'not-allowed',
          },
        },

        // Button Secondary
        '.btn-secondary': {
          height: '44px',
          minWidth: '44px',
          backgroundColor: 'transparent',
          color: '#1A1A1A',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          padding: '0 24px',
          cursor: 'pointer',
          transition: '200ms ease-in-out',
          '&:hover': {
            backgroundColor: '#F8F9FA',
            borderColor: '#8C8C8C',
          },
        },

        // Input Field
        '.input-field': {
          height: '56px',
          width: '100%',
          border: '2px solid #D1D5DB',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '18px',
          transition: '200ms ease-in-out',
          '&:focus': {
            outline: 'none',
            borderColor: '#FF6B35',
          },
          '&.error': {
            borderColor: '#EF4444',
          },
        },

        // Deadline Badge
        '.deadline-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: '500',
        },

        '.deadline-badge-safe': {
          backgroundColor: '#F1F3F5',
          color: '#8C8C8C',
        },

        '.deadline-badge-warning': {
          backgroundColor: '#FFF5F2',
          color: '#FF6B35',
        },

        '.deadline-badge-urgent': {
          backgroundColor: '#FEE2E2',
          color: '#EF4444',
          animation: 'pulse 0.8s ease-in-out infinite',
        },

        // Eligibility Status
        '.eligibility-status': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '16px',
          fontWeight: '500',
        },

        '.eligibility-eligible': {
          color: '#10B981',
        },

        '.eligibility-not-eligible': {
          color: '#EF4444',
        },

        '.eligibility-partial': {
          color: '#F59E0B',
        },

        // Header
        '.header': {
          height: '64px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '0 24px',
          position: 'sticky',
          top: '0',
          zIndex: '1020',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },

        // Native Ad
        '.native-ad': {
          backgroundColor: '#FAFBFC',
          border: '1px solid #E8EAED',
          borderRadius: '12px',
          padding: '16px',
        },

        '.native-ad-label': {
          fontSize: '12px',
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
      });
    },

    // Custom plugin for accessibility focus styles
    function ({ addBase }) {
      addBase({
        '*:focus-visible': {
          outline: '2px solid #FF6B35',
          outlineOffset: '2px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      });
    },
  ],
};
