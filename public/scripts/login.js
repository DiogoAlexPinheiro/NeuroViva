function togglePassword() {
    const p = document.getElementById('password');
    p.type = p.type === 'password' ? 'text' : 'password';
}

function mostrarRegistro() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registroForm').style.display = 'block';
}

function mostrarLogin() {
    document.getElementById('registroForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function mostrarAlerta(msg, tipo, elementId = 'alert') {
    const el = document.getElementById(elementId);
    el.textContent = msg;
    el.className = tipo === 'error' ? 'alert alert-error' : 'alert alert-success';
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        mostrarAlerta('Por favor, preencha todos os campos.', 'error');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
          mostrarAlerta('Login efetuado com sucesso!', 'success');
          localStorage.setItem('user', JSON.stringify(data.user));
          
          setTimeout(() => {
            if (data.user.role === 'admin') {
              window.location.href = '../views/admin/dashboard.html';
            } else {
              window.location.href = '../views/client/dashboard.html';
            }
          }, 800);
        } else {
          mostrarAlerta(data.error || 'Credenciais invalidas', 'error');
        }
    } catch (error) {
        mostrarAlerta('Erro ao conectar ao servidor. Verifique a sua ligacao.', 'error');
    }
}

async function registrar() {
    const nome = document.getElementById('regNome').value;
    const primeiroNome = document.getElementById('regPrimeiroNome').value;
    const ultimoNome = document.getElementById('regUltimoNome').value;
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const genero = document.getElementById('regGenero').value;

    if (!nome || !username || !email || !password) {
        mostrarAlerta('Preencha os campos obrigatorios.', 'error', 'alertRegistro');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, primeiroNome, ultimoNome, username, email, password, genero })
        });

        if (res.ok) {
            mostrarAlerta('Conta criada com sucesso!', 'success', 'alertRegistro');
            setTimeout(() => mostrarLogin(), 1500);
        } else {
            const data = await res.json();
            mostrarAlerta(data.error, 'error', 'alertRegistro');
        }
    } catch (e) {
        mostrarAlerta('Erro na ligacao ao servidor.', 'error', 'alertRegistro');
    }
}