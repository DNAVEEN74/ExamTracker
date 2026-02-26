/**
 * ExamTracker India - Design Tokens
 * Mobile-First Design System
 * 
 * Usage:
 * import { colors, typography, spacing, borderRadius } from './design-tokens';
 */

// ==================== COLORS ====================

export const colors = {
  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
  },

  // Text Colors
  text: {
    primary: '#1A1A1A',
    secondary: '#5C5C5C',
    tertiary: '#8C8C8C',
    disabled: '#B8B8B8',
  },

  // Accent Colors (Energy & Opportunity)
  accent: {
    primary: '#FF6B35',
    secondary: '#FF8555',
    light: '#FFF5F2',
    dark: '#E65A2E',
  },

  // Status Colors
  success: {
    primary: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
  },

  warning: {
    primary: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },

  error: {
    primary: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },

  info: {
    primary: '#3B82F6',
    light: '#DBEAFE',
    dark: '#2563EB',
  },

  // Border Colors
  border: {
    default: '#E5E7EB',
    light: '#F3F4F6',
    dark: '#D1D5DB',
  },

  // Ad Integration (Subtle)
  ad: {
    background: '#FAFBFC',
    border: '#E8EAED',
    label: '#9CA3AF',
  },
};

// ==================== TYPOGRAPHY ====================

export const typography = {
  // Font Family
  fontFamily: {
    primary: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Courier New', monospace",
  },

  // Font Sizes
  fontSize: {
    xs: '12px',      // 0.75rem - Captions, ad labels
    sm: '14px',      // 0.875rem - Metadata, timestamps
    base: '16px',    // 1rem - DEFAULT body text
    lg: '18px',      // 1.125rem - Exam card titles
    xl: '20px',      // 1.25rem - Section headings
    '2xl': '24px',   // 1.5rem - Page titles
    '3xl': '30px',   // 1.875rem - Onboarding titles
    '4xl': '36px',   // 2.25rem - Landing hero
  },

  // Font Weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,      // Large headings
    snug: 1.3,       // Onboarding titles
    normal: 1.4,     // Page titles
    relaxed: 1.5,    // Section headings
    loose: 1.6,      // Body text (default)
  },
};

// ==================== SPACING ====================

export const spacing = {
  xs: '4px',       // 0.25rem
  sm: '8px',       // 0.5rem
  md: '16px',      // 1rem - Default card padding
  lg: '24px',      // 1.5rem
  xl: '32px',      // 2rem
  '2xl': '48px',   // 3rem
  '3xl': '64px',   // 4rem
};

// ==================== BORDER RADIUS ====================

export const borderRadius = {
  sm: '4px',
  md: '8px',       // Default for buttons/inputs
  lg: '12px',      // Exam cards
  xl: '16px',      // Large cards
  full: '9999px',  // Pills/badges
};

// ==================== SHADOWS ====================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Exam card hover
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.08)',
  
  // Orange accent shadow (for CTAs)
  accentCta: '0 2px 8px rgba(255, 107, 53, 0.24)',
};

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  mobile: '320px',    // Budget Android phones
  tablet: '768px',    // iPad, larger phones
  desktop: '1024px',  // Laptop screens
  wide: '1440px',     // Desktop monitors
};

// Media query helpers
export const mediaQueries = {
  mobile: `@media (min-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
  wide: `@media (min-width: ${breakpoints.wide})`,
};

// ==================== Z-INDEX SCALE ====================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// ==================== TRANSITIONS ====================

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  
  // Specific use cases
  button: '200ms ease-in-out',
  modal: '300ms ease-in-out',
  dropdown: '150ms ease-in-out',
};

// ==================== COMPONENT-SPECIFIC TOKENS ====================

export const components = {
  // Exam Card
  examCard: {
    background: colors.background.secondary,
    border: colors.border.default,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    
    hover: {
      borderColor: colors.accent.primary,
      borderWidth: '2px',
      shadow: shadows.cardHover,
    },
    
    newIndicator: {
      color: colors.accent.primary,
      width: '4px',
    },
  },

  // Buttons
  button: {
    height: '44px', // Minimum touch target (WCAG)
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    transition: transitions.button,
    
    primary: {
      background: colors.accent.primary,
      color: colors.background.primary,
      hoverBackground: colors.accent.dark,
      shadow: shadows.accentCta,
    },
    
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.dark}`,
      hoverBackground: colors.background.secondary,
      hoverBorder: colors.text.tertiary,
    },
    
    ghost: {
      background: 'transparent',
      color: colors.text.secondary,
      hoverColor: colors.text.primary,
      hoverTextDecoration: 'underline',
    },
    
    disabled: {
      background: colors.background.tertiary,
      color: colors.text.disabled,
      border: `1px solid ${colors.border.default}`,
      cursor: 'not-allowed',
    },
  },

  // Input Fields
  input: {
    height: '56px',
    borderRadius: borderRadius.md,
    border: `2px solid ${colors.border.dark}`,
    fontSize: typography.fontSize.lg,
    padding: `${spacing.md} ${spacing.md}`,
    
    focus: {
      borderColor: colors.accent.primary,
      outline: 'none',
    },
    
    error: {
      borderColor: colors.error.primary,
    },
  },

  // Deadline Badges
  deadlineBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.full,
    
    safe: {
      background: colors.background.tertiary,
      color: colors.text.tertiary,
    },
    
    warning: {
      background: colors.accent.light,
      color: colors.accent.primary,
    },
    
    urgent: {
      background: colors.error.light,
      color: colors.error.primary,
      animation: 'pulse 0.8s ease-in-out infinite',
    },
  },

  // Eligibility Status
  eligibilityStatus: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    
    eligible: {
      color: colors.success.primary,
      icon: '✓',
    },
    
    notEligible: {
      color: colors.error.primary,
      icon: '✗',
    },
    
    partial: {
      color: colors.warning.primary,
      icon: '⚠',
    },
  },

  // Navigation Header
  header: {
    height: '64px',
    background: colors.background.primary,
    borderBottom: `1px solid ${colors.border.default}`,
    padding: `0 ${spacing.lg}`,
    position: 'sticky',
    top: 0,
    zIndex: zIndex.sticky,
  },

  // Ad Integration
  nativeAd: {
    background: colors.ad.background,
    border: `1px solid ${colors.ad.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    
    label: {
      fontSize: typography.fontSize.xs,
      color: colors.ad.label,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
  },
};

// ==================== ACCESSIBILITY ====================

export const accessibility = {
  // Minimum touch target size (WCAG 2.5.5 Level AA)
  minTouchTarget: '44px',
  
  // Focus visible outline
  focusOutline: `2px solid ${colors.accent.primary}`,
  focusOutlineOffset: '2px',
  
  // Skip to content link
  skipLink: {
    position: 'absolute',
    left: '-9999px',
    zIndex: zIndex.tooltip,
    padding: spacing.md,
    background: colors.accent.primary,
    color: colors.background.primary,
    textDecoration: 'none',
    
    focus: {
      left: spacing.md,
      top: spacing.md,
    },
  },
};

// ==================== PERFORMANCE BUDGET ====================

export const performance = {
  // Target metrics for 3G on budget Android
  firstContentfulPaint: '1.8s',
  timeToInteractive: '3.5s',
  totalPageSize: '500KB',
  lighthouseScore: 90, // Minimum acceptable
};

// ==================== DEFAULT EXPORT ====================

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  mediaQueries,
  zIndex,
  transitions,
  components,
  accessibility,
  performance,
};
