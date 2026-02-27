/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Background / Surface
        midnight:       '#0C0906',
        'deep-navy':    '#130E09',
        navy:           '#1A1208',
        surface:        '#231810',
        'surface-raised': '#2C1F13',

        // Brand
        ember:          '#FF6B2B',
        'ember-dim':    '#D9521A',
        amber:          '#FFAA3B',
        'amber-dim':    '#D98A20',
        gold:           '#FFD166',
        'gold-dim':     '#E0B040',

        // Text
        'text-primary':   '#FAF3EC',
        'text-secondary': '#B8A090',
        'text-muted':     '#5C4A3A',
      },

      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },

      // Tailwind uses the same keys as the design system names
      borderRadius: {
        sm:   '8px',
        md:   '14px',
        lg:   '20px',
        xl:   '28px',
        pill: '100px',
      },

      // 8pt spacing grid — extending defaults (not replacing them)
      spacing: {
        // Named to match style guide tokens; numeric keys already exist in Tailwind defaults
        'xs':  '4px',
        'sm':  '8px',
        'md':  '16px',
        'lg':  '24px',
        'xl':  '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },

      // Gradient backgrounds as background-image utilities
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #FF6B2B 0%, #FFAA3B 50%, #FFD166 100%)',
        'grad-ember': 'linear-gradient(135deg, #FF6B2B 0%, #FFAA3B 100%)',
        'grad-amber': 'linear-gradient(135deg, #FFAA3B 0%, #FFD166 100%)',
        'grad-bg':    'linear-gradient(160deg, #0C0906 0%, #130E09 40%, #160F08 100%)',
        'grad-card':  'linear-gradient(145deg, rgba(44,31,19,0.9) 0%, rgba(26,18,8,0.95) 100%)',
      },

      // Letter-spacing tokens from type scale
      letterSpacing: {
        tighter: '-0.03em',
        tight:   '-0.02em',
        snug:    '-0.01em',
        normal:  '0em',
        wide:    '0.06em',
        wider:   '0.10em',
        widest:  '0.14em',
        mono:    '0.18em',
      },
    },
  },
  plugins: [],
};
