document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');

    // Se o usuário já estiver logado, manda direto pro admin
    db.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'admin.html';
        }
    });

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnEntrar');
            const msg = document.getElementById('login-msg');

            btn.textContent = 'Entrando...';
            btn.disabled = true;
            msg.classList.add('hidden');

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('senha').value;

            const { data, error } = await db.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                msg.textContent = 'Erro: E-mail ou senha incorretos.';
                msg.classList.remove('hidden');
                btn.textContent = 'Entrar';
                btn.disabled = false;
            } else {
                window.location.href = 'admin.html';
            }
        });
    }
});
