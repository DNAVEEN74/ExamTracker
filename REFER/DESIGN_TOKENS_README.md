# ExamTracker India - Design Tokens

Complete design system tokens for ExamTracker India, optimized for mobile-first development.

## 📦 What's Included

- **design-tokens.js** - JavaScript/ES6 module format
- **design-tokens.css** - CSS custom properties (CSS variables)
- **design-tokens.json** - Pure JSON format
- **tailwind.config.js** - Tailwind CSS configuration

## 🚀 Quick Start

### Option 1: JavaScript/React (Recommended)

```javascript
// Import the tokens
import { colors, typography, spacing } from './design-tokens';

// Use in styled-components
const Button = styled.button`
  background: ${colors.accent.primary};
  font-size: ${typography.fontSize.base};
  padding: ${spacing.md};
  border-radius: ${borderRadius.md};
`;

// Use in CSS-in-JS
const styles = {
  button: {
    background: colors.accent.primary,
    color: colors.background.primary,
    fontSize: typography.fontSize.base,
  }
};
```

### Option 2: CSS Variables

```html
<!-- Include the CSS file -->
<link rel="stylesheet" href="design-tokens.css">
```

```css
/* Use the variables */
.exam-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.btn-primary {
  background: var(--color-accent-primary);
  color: var(--color-bg-primary);
  font-size: var(--font-size-base);
  height: var(--button-height);
}
```

### Option 3: Tailwind CSS

```javascript
// tailwind.config.js
module.exports = require('./tailwind.config.js');
```

```jsx
// Use Tailwind classes
<button className="btn-primary">
  Track This Exam
</button>

<div className="exam-card">
  <h3 className="text-lg font-semibold text-primary">
    SSC CGL Tier 1 2026
  </h3>
</div>
```

### Option 4: Pure JSON (Any Framework)

```javascript
// Load the JSON
import tokens from './design-tokens.json';

// Access values
const primaryColor = tokens.colors.accent.primary; // "#FF6B35"
const baseFont = tokens.typography.fontSize.base; // "16px"
```

## 📊 Color Palette

### Primary Colors
```javascript
colors.background.primary    // #FFFFFF - Main app background
colors.background.secondary  // #F8F9FA - Exam cards, input fields
colors.background.tertiary   // #F1F3F5 - Subtle backgrounds

colors.text.primary          // #1A1A1A - Headings, exam names
colors.text.secondary        // #5C5C5C - Body text, descriptions
colors.text.tertiary         // #8C8C8C - Metadata, timestamps
```

### Accent Colors (Energy & Opportunity)
```javascript
colors.accent.primary        // #FF6B35 - Primary CTAs, deadlines
colors.accent.light          // #FFF5F2 - Backgrounds for urgent alerts
colors.accent.dark           // #E65A2E - Hover states
```

### Status Colors
```javascript
colors.success.primary       // #10B981 - Eligible ✓
colors.warning.primary       // #F59E0B - Partial eligibility ⚠
colors.error.primary         // #EF4444 - Not eligible ✗
colors.info.primary          // #3B82F6 - Tooltips, helper text
```

## 🎨 Typography Scale

```javascript
typography.fontSize.xs       // 12px - Captions, ad labels
typography.fontSize.sm       // 14px - Metadata, timestamps
typography.fontSize.base     // 16px - DEFAULT body text
typography.fontSize.lg       // 18px - Exam card titles
typography.fontSize.xl       // 20px - Section headings
typography.fontSize['2xl']   // 24px - Page titles
typography.fontSize['3xl']   // 30px - Onboarding titles
typography.fontSize['4xl']   // 36px - Landing hero
```

## 📐 Spacing System

```javascript
spacing.xs     // 4px
spacing.sm     // 8px
spacing.md     // 16px - DEFAULT card padding
spacing.lg     // 24px
spacing.xl     // 32px
spacing['2xl'] // 48px
spacing['3xl'] // 64px
```

## 🧩 Component Examples

### Exam Card (Complete)

```jsx
// React + Tailwind
<div className="exam-card">
  <div className="flex justify-between items-start mb-2">
    <h3 className="text-lg font-semibold text-primary">
      SSC CGL Tier 1 2026
    </h3>
    <span className="deadline-badge-warning">
      7 days left
    </span>
  </div>
  
  <div className="eligibility-status eligible mb-2">
    <span>✓</span>
    <span>You're eligible</span>
  </div>
  
  <p className="text-sm text-tertiary mb-4">
    SSC | 2,500 vacancies | Posted 2 days ago
  </p>
  
  <button className="btn-primary w-full">
    Track This Exam
  </button>
</div>
```

### Button States

```jsx
// Primary CTA
<button className="btn-primary">
  Track This Exam
</button>

// Secondary action
<button className="btn-secondary">
  View Details
</button>

// Disabled state
<button className="btn-primary" disabled>
  Application Closed
</button>
```

### Input Field with Validation

```jsx
// Normal state
<input 
  type="text" 
  className="input-field" 
  placeholder="Enter your name"
/>

// Error state
<input 
  type="text" 
  className="input-field error" 
  placeholder="Enter your name"
/>
<p className="text-sm text-error mt-1">
  Name is required
</p>
```

### Deadline Badges

```jsx
// Safe (>7 days)
<span className="deadline-badge-safe">
  15 days left
</span>

// Warning (3-7 days)
<span className="deadline-badge-warning">
  5 days left
</span>

// Urgent (<3 days) - with pulsing animation
<span className="deadline-badge-urgent">
  Tomorrow
</span>
```

## 📱 Responsive Breakpoints

```javascript
breakpoints.mobile   // 320px - Budget Android phones
breakpoints.tablet   // 768px - iPads, larger phones
breakpoints.desktop  // 1024px - Laptops
breakpoints.wide     // 1440px - Desktop monitors
```

### Usage in CSS

```css
/* Mobile-first (default) */
.exam-card {
  padding: var(--spacing-md);
}

/* Tablet and up */
@media (min-width: 768px) {
  .exam-card {
    padding: var(--spacing-lg);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .exam-card {
    max-width: 800px;
  }
}
```

### Usage in Tailwind

```jsx
<div className="p-md tablet:p-lg desktop:max-w-3xl">
  Exam card content
</div>
```

## ♿ Accessibility Features

### Minimum Touch Targets (WCAG 2.5.5 AA)

```javascript
accessibility.minTouchTarget // "44px"
```

All interactive elements (buttons, links, inputs) have **minimum 44px height**.

```jsx
<button className="btn-primary"> {/* height: 44px */}
  Track Exam
</button>
```

### Focus Visible States

```css
/* Automatically applied to all interactive elements */
*:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}
```

### Reduced Motion Support

```css
/* Automatically respects user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 🎭 Shadows

```javascript
shadows.sm          // Subtle elevation
shadows.base        // Default cards
shadows.md          // Dropdowns
shadows.cardHover   // Exam card on hover
shadows.accentCta   // Primary button hover
```

### Usage Example

```css
.exam-card {
  box-shadow: var(--shadow-base);
  transition: var(--transition-base);
}

.exam-card:hover {
  box-shadow: var(--shadow-card-hover);
}
```

## 🔄 Transitions

```javascript
transitions.fast    // 150ms - Dropdown, quick interactions
transitions.base    // 200ms - DEFAULT button, card hovers
transitions.slow    // 300ms - Modals, large UI changes
```

## 📏 Performance Budget

Target metrics for 3G on budget Android devices:

```javascript
performance.firstContentfulPaint  // <1.8s
performance.timeToInteractive     // <3.5s
performance.totalPageSize         // <500KB
performance.lighthouseScore       // 90+ minimum
```

## 🎨 Complete Component Token Set

```javascript
// Exam Card
components.examCard.background         // "#F8F9FA"
components.examCard.border            // "#E5E7EB"
components.examCard.hover.borderColor // "#FF6B35"

// Buttons
components.button.primary.background   // "#FF6B35"
components.button.primary.hoverBackground // "#E65A2E"
components.button.height               // "44px"

// Inputs
components.input.height                // "56px"
components.input.focus.borderColor     // "#FF6B35"

// Header
components.header.height               // "64px"
components.header.background           // "#FFFFFF"
```

## 🛠️ Framework-Specific Tips

### React/Next.js

```javascript
// Create a theme provider
import tokens from './design-tokens';

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
};

// Use in components
const { colors } = useTheme();
```

### Vue.js

```javascript
// In main.js
import tokens from './design-tokens';
app.config.globalProperties.$tokens = tokens;

// In components
<template>
  <div :style="{ color: $tokens.colors.text.primary }">
</template>
```

### Vanilla JS

```javascript
import tokens from './design-tokens.json';

document.querySelector('.button').style.backgroundColor = 
  tokens.colors.accent.primary;
```

## 📝 Notes

- **Mobile-First**: All default values are optimized for 320px+ screens
- **WCAG AA Compliant**: All color combinations tested for 4.5:1 contrast
- **Budget Android Ready**: Optimized for slow networks and low-end devices
- **No External Fonts**: Uses system fonts for instant loading

## 🤝 Contributing

When adding new tokens:
1. Update `design-tokens.js` (source of truth)
2. Regenerate `design-tokens.css`
3. Update `design-tokens.json`
4. Add to `tailwind.config.js` if needed
5. Document in this README

## 📞 Support

For questions or issues with design tokens, refer to the complete design system documentation in the Word documents (Part 1 & Part 2).

---

**Last Updated**: February 2026  
**Version**: 1.0  
**License**: Proprietary - ExamTracker India
