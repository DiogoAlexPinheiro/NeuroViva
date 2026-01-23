const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'admin') {
      window.location.href = '../login.html';
    }

    let diasLivres = [];
    let profileImageFile = null;

    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    // Preview da imagem
    document.getElementById('profileImageInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        profileImageFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('previewImage').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    function toggleDia(dia) {
      const checkbox = document.getElementById(`${dia}-ativo`);
      const inputs = document.getElementById(`${dia}-inputs`);
      
      if (checkbox.checked) {
        inputs.style.display = 'flex';
      } else {
        inputs.style.display = 'none';
      }
    }

    async function carregarPerfil() {
      try {
        const res = await fetch(`http://localhost:3000/api/admin/perfil?username=${user.username}`);
        const admin = await res.json();

        document.getElementById('nome').value = admin.nome || '';
        document.getElementById('primeiroNome').value = admin.primeiroNome || '';
        document.getElementById('ultimoNome').value = admin.ultimoNome || '';
        document.getElementById('genero').value = admin.genero || '';
        document.getElementById('email').value = admin.email || '';
        
        if (admin.profileImage) {
          document.getElementById('previewImage').src = admin.profileImage;
        }

        if (admin.horario) {
          diasSemana.forEach(dia => {
            const horarioDia = admin.horario[dia] || [];
            const checkbox = document.getElementById(`${dia}-ativo`);
            const inputs = document.getElementById(`${dia}-inputs`);
            
            if (horarioDia.length > 0) {
              checkbox.checked = true;
              inputs.style.display = 'flex';
              document.getElementById(`${dia}-inicio`).value = horarioDia[0];
              document.getElementById(`${dia}-fim`).value = horarioDia[1];
            } else {
              checkbox.checked = false;
              inputs.style.display = 'none';
            }
          });
        }

        diasLivres = admin.diasLivres || [];
        renderizarDiasLivres();
      } catch (error) {
        mostrarAlerta('Erro ao carregar perfil', 'error');
      }
    }

    async function salvarPerfil() {
      const nome = document.getElementById('nome').value;
      const primeiroNome = document.getElementById('primeiroNome').value;
      const ultimoNome = document.getElementById('ultimoNome').value;
      const genero = document.getElementById('genero').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const horario = {};
      diasSemana.forEach(dia => {
        const checkbox = document.getElementById(`${dia}-ativo`);
        if (checkbox.checked) {
          const inicio = document.getElementById(`${dia}-inicio`).value;
          const fim = document.getElementById(`${dia}-fim`).value;
          horario[dia] = [inicio, fim];
        } else {
          horario[dia] = [];
        }
      });

      try {
        const formData = new FormData();
        formData.append('username', user.username);
        formData.append('nome', nome);
        formData.append('primeiroNome', primeiroNome);
        formData.append('ultimoNome', ultimoNome);
        formData.append('genero', genero);
        formData.append('email', email);
        if (password) formData.append('password', password);
        formData.append('horario', JSON.stringify(horario));
        formData.append('diasLivres', JSON.stringify(diasLivres));
        if (profileImageFile) {
          formData.append('profileImage', profileImageFile);
        }

        const res = await fetch('http://localhost:3000/api/admin/perfil', {
          method: 'PUT',
          body: formData
        });

        const result = await res.json();

        if (res.ok) {
          mostrarAlerta('Perfil atualizado!', 'success');
          user.nome = nome;
          user.primeiroNome = primeiroNome;
          user.genero = genero;
          localStorage.setItem('user', JSON.stringify(user));
          document.getElementById('password').value = '';
          
          setTimeout(() => location.reload(), 1000);
        } else {
          mostrarAlerta(result.error, 'error');
        }
      } catch (error) {
        mostrarAlerta('Erro ao atualizar perfil', 'error');
      }
    }

    function adicionarDiaLivre() {
      const data = document.getElementById('novoDiaLivre').value;
      
      if (!data) {
        mostrarAlerta('Selecione uma data', 'error');
        return;
      }

      if (diasLivres.includes(data)) {
        mostrarAlerta('Esta data ja esta adicionada', 'error');
        return;
      }

      diasLivres.push(data);
      diasLivres.sort();
      renderizarDiasLivres();
      document.getElementById('novoDiaLivre').value = '';
    }

    function removerDiaLivre(data) {
      diasLivres = diasLivres.filter(d => d !== data);
      renderizarDiasLivres();
    }

    function renderizarDiasLivres() {
      const container = document.getElementById('listaDiasLivres');
      
      if (diasLivres.length === 0) {
        container.innerHTML = '<p data-i18n="sem_dias_livres">Sem dias livres definidos</p>';
        return;
      }

      container.innerHTML = `
        <div class="dias-livres-list">
          ${diasLivres.map(d => `
            <div class="dia-livre-item">
              <span>${d}</span>
              <button class="btn-small btn-danger" onclick="removerDiaLivre('${d}')" data-i18n="remover">Remover</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    function mostrarAlerta(msg, tipo) {
      const el = document.getElementById('alert');
      el.className = tipo === 'error' ? 'alert alert-error' : 'alert alert-success';
      el.textContent = msg;
      setTimeout(() => el.className = 'alert-hidden', 5000);
    }

    carregarPerfil();

// public/admin/adds/loader.js
async function loadComponent(elementId, file) {
  try {
    const response = await fetch(file);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error(`Erro ao carregar ${file}:`, error);
  }
}

async function carregarNotificacoes() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return;

  try {
    const res = await fetch('http://localhost:3000/api/notificacoes/admin');
    const notif = await res.json();

    const badgeMensagens = document.getElementById('badgeMensagens');
    const badgePagamentos = document.getElementById('badgePagamentos');

    if (badgeMensagens) {
      badgeMensagens.textContent = notif.mensagens;
      badgeMensagens.className = notif.mensagens > 0 ? 'notification-badge' : 'notification-badge zero';
    }

    if (badgePagamentos) {
      badgePagamentos.textContent = notif.pagamentos;
      badgePagamentos.className = notif.pagamentos > 0 ? 'notification-badge' : 'notification-badge zero';
    }
  } catch (error) {
    console.error('Erro ao carregar notificações:', error);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadComponent('header-container', '../admin/adds/header.html');
  await loadComponent('footer-container', '../admin/adds/footer.html');
  
  setTimeout(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const userNameEl = document.getElementById('userName');
      if (userNameEl) {
        userNameEl.textContent = i18next.t('ola_utilizador', {
          nome: user.nome
        });
      }
    }
    
    carregarNotificacoes();
    setInterval(carregarNotificacoes, 30000);
  }, 100);
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../login.html';
}