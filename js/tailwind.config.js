/**
 * Configuração centralizada do Tailwind CSS (CDN)
 * Incluído ANTES do <script src="cdn.tailwindcss.com"> em todas as páginas públicas.
 */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                background: '#F5F1EA',
                foreground: '#2A2520',
                card: '#EDE9DF',
                secondary: '#DDD9CE',
                muted: '#EDE9DF',
                'muted-foreground': '#7A7165',
                border: 'rgba(42, 37, 32, 0.14)',
                primary: '#2A2520',
                'primary-foreground': '#F5F1EA',
            },
            fontFamily: {
                sans: ['Roboto', 'sans-serif'],
                mono: ['Roboto Mono', 'monospace'],
            }
        }
    }
};
