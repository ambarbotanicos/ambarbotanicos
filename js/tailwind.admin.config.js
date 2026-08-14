/**
 * Configuração do Tailwind CSS para páginas de administração (fundo branco).
 * Incluído ANTES do <script src="cdn.tailwindcss.com"> nas páginas admin.
 */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                background: '#F5F5F5',
                foreground: '#2A2520',
                card: '#F6F6F6',
                secondary: '#DDD9CE',
                muted: '#EDE9DF',
                'muted-foreground': '#7A7165',
                border: 'rgba(0, 0, 0, 0.1)',
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
