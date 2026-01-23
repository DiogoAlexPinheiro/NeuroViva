
// Carregar HTML dos modais quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  // Criar container para os modais se não existir
  if (!document.getElementById('customModalOverlay')) {
    const modalHTML = `
      <div id="customModalOverlay" class="custom-modal-overlay">
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="customModalTitle">Confirmação</h3>
          </div>
          <div class="custom-modal-body">
            <p id="customModalMessage"></p>
          </div>
          <div class="custom-modal-footer">
            <button id="customModalCancel" class="btn-secondary">Cancelar</button>
            <button id="customModalConfirm" class="btn">Confirmar</button>
          </div>
        </div>
      </div>

      <div id="customAlertOverlay" class="custom-modal-overlay">
        <div class="custom-modal-content custom-modal-alert">
          <div class="custom-modal-body">
            <p id="customAlertMessage"></p>
          </div>
          <div class="custom-modal-footer">
            <button id="customAlertOk" class="btn">OK</button>
          </div>
        </div>
      </div>

      <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p id="loadingMessage">A processar...</p>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
});

// ============================================
// FUNÇÃO CUSTOM CONFIRM
// ============================================
function customConfirm(message, title = 'Confirmação') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('customModalOverlay');
    const messageEl = document.getElementById('customModalMessage');
    const titleEl = document.getElementById('customModalTitle');
    const confirmBtn = document.getElementById('customModalConfirm');
    const cancelBtn = document.getElementById('customModalCancel');

    if (!overlay || !messageEl || !confirmBtn || !cancelBtn) {
      // Fallback para confirm nativo se modal não existir
      resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.style.display = 'flex';

    const handleConfirm = () => {
      overlay.style.display = 'none';
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      overlay.style.display = 'none';
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// ============================================
// FUNÇÃO CUSTOM ALERT
// ============================================
function customAlert(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('customAlertOverlay');
    const messageEl = document.getElementById('customAlertMessage');
    const okBtn = document.getElementById('customAlertOk');

    if (!overlay || !messageEl || !okBtn) {
      // Fallback para alert nativo se modal não existir
      alert(message);
      resolve();
      return;
    }

    // Suportar quebras de linha
    messageEl.innerHTML = message.replace(/\n/g, '<br>');
    overlay.style.display = 'flex';

    const handleOk = () => {
      overlay.style.display = 'none';
      okBtn.removeEventListener('click', handleOk);
      resolve();
    };

    okBtn.addEventListener('click', handleOk);
  });
}

// ============================================
// FUNÇÕES DE LOADING
// ============================================
function showLoading(message = 'A processar...') {
  const overlay = document.getElementById('loadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  
  if (overlay && messageEl) {
    messageEl.textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  
  if (overlay) {
    overlay.style.display = 'none';
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

// Tornar funções globais
window.customConfirm = customConfirm;
window.customAlert = customAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.role !== 'admin') {
      window.location.href = '../login.html';
    }

    // Helper para não "quebrar" HTML quando mostramos mensagens (erros, etc.)
    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    const mq = window.matchMedia('(max-width: 768px)');
    let currentView = mq.matches ? 'mobile' : 'desktop';
    let servidorOnline = false;

    mq.addEventListener('change', (e) => {
      currentView = e.matches ? 'mobile' : 'desktop';
      // Só recarrega se o servidor já estiver confirmado online
      if (servidorOnline) carregarPacientes();
    });

    async function carregarPacientes() {
      const container = document.getElementById('listaPacientes');

      try {
        console.log('🔍 Iniciando carregamento de pacientes...');

        container.innerHTML = `<p class="pacientes-message">🔄 ${i18next.t('pacientes_carregar')}</p>`;

        const res = await fetch('http://localhost:3000/api/admin/pacientes');
        console.log('📡 Resposta recebida:', res.status);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const pacientes = await res.json();
        console.log('📋 Pacientes recebidos:', pacientes?.length ?? 0);

        if (!Array.isArray(pacientes) || pacientes.length === 0) {
          container.innerHTML = `<p class="pacientes-message">📭 ${i18next.t('pacientes_sem_registos')}</p>`;

          return;
        }

        // Filtrar pacientes válidos
        const pacientesValidos = pacientes.filter(p => p && p.nomeCompleto);

        if (pacientesValidos.length === 0) {
          container.innerHTML = `<p class="pacientes-message">⚠️ ${i18next.t('pacientes_sem_validos')}</p>`;

          return;
        }

        // Ordenar: primeiro ativos, depois por nome
        pacientesValidos.sort((a, b) => {
          const estadoA = (a.estado || 'ativo').toLowerCase();
          const estadoB = (b.estado || 'ativo').toLowerCase();

          if (estadoA === 'ativo' && estadoB !== 'ativo') return -1;
          if (estadoA !== 'ativo' && estadoB === 'ativo') return 1;

          return a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt');
        });

        console.log('✅ Pacientes ordenados:', pacientesValidos.map(p => `${p.nomeCompleto} (${p.estado})`));

        // Desktop: Tabela
        const tabelaHTML = `
          <table>
            <thead>
              <tr>
                <th>${i18next.t('foto')}</th>
                <th>${i18next.t('nome')}</th>
                <th>${i18next.t('email')}</th>
                <th>${i18next.t('contacto')}</th>
                <th>${i18next.t('estado')}</th>
                <th>${i18next.t('acoes')}</th>
              </tr>
            </thead>

            <tbody>
              ${pacientesValidos.map(p => `
                <tr class="${(p.estado || 'ativo') === 'inativo' ? 'paciente-inativo' : ''}">
                  <td>
                    <img
                      src="${p.profileImage || '/assets/images/profiles/default.jpg'}"
                      alt="Foto ${escapeHtml(p.nomeCompleto)}"
                      class="profile-image"
                      width="60"
                      height="60"
                      loading="lazy"
                      decoding="async"
                      onerror="this.src='/assets/images/profiles/default.jpg'">
                  </td>
                  <td>${escapeHtml(p.nomeCompleto)}</td>
                  <td>${escapeHtml(p.email || 'N/A')}</td>
                  <td>${escapeHtml(p.contacto || '-')}</td>
                  <td><span class="badge ${(p.estado || 'ativo') === 'ativo' ? 'badge-success' : 'badge-danger'}">${i18next.t(`estado_${p.estado || 'ativo'}`)}</span></td>
                  <td>
                    <a href="../admin/paciente-detalhes.html?nome=${encodeURIComponent(p.nomeCompleto)}" class="btn-small btn-solid">${i18next.t('ver_detalhes')}</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        // Mobile: Cards
        const cardsHTML = pacientesValidos.map(p => `
          <div class="mobile-card ${(p.estado || 'ativo') === 'inativo' ? 'inativo' : ''}">
            <div class="mobile-card-header">
              <img
                src="${p.profileImage || '/assets/images/profiles/default.jpg'}"
                alt="Foto ${escapeHtml(p.nomeCompleto)}"
                class="profile-image"
                width="60"
                height="60"
                loading="lazy"
                decoding="async"
                onerror="this.src='/assets/images/profiles/default.jpg'">
              <div>
                <h4 class="paciente-card-title">${escapeHtml(p.nomeCompleto)}</h4>
                <span class="badge ${(p.estado || 'ativo') === 'ativo' ? 'badge-success' : 'badge-danger'} paciente-card-badge">${escapeHtml(p.estado || 'ativo')}</span>
              </div>
            </div>
            <div class="mobile-card-body">
              <p><strong>${i18next.t('email')}:</strong> ${escapeHtml(p.email || i18next.t('na'))}</p>
              <p><strong>${i18next.t('contacto')}:</strong> ${escapeHtml(p.contacto || '-')}</p>

            </div>
            <a href="../admin/paciente-detalhes.html?nome=${encodeURIComponent(p.nomeCompleto)}" class="btn-small btn-solid btn-fullwidth">${i18next.t('ver_detalhes')}</a>
          </div>
        `).join('');

        // Renderizar baseado na view atual
        container.innerHTML = (currentView === 'mobile') ? cardsHTML : tabelaHTML;

        console.log('✅ Renderização completa!');

      } catch (error) {
        console.error('❌ Erro ao carregar pacientes:', error);

        container.innerHTML = `
        <div class="pacientes-message-box pacientes-message-box--error">
          <p class="pacientes-message-title">
            ❌ ${i18next.t('erro_carregar_pacientes')}
          </p>
          <p class="pacientes-message-text">${escapeHtml(error.message)}</p>
          <button class="btn" onclick="carregarPacientes()">
            🔄 ${i18next.t('tentar_novamente')}
          </button>
        </div>
      `;
      }
    }

    // Verificar se servidor está online
    async function verificarServidor() {
      const container = document.getElementById('listaPacientes');

      try {
        const res = await fetch('http://localhost:3000/api/estatisticas/publico');
        if (!res.ok) throw new Error('Servidor não responde');

        console.log('✅ Servidor online!');
        servidorOnline = true;
        carregarPacientes();
      } catch (error) {
        console.error('❌ Servidor offline:', error);
        servidorOnline = false;

        container.innerHTML = `
          <div class="pacientes-message-box pacientes-message-box--error">
            <p class="pacientes-message-title">
              🔌 ${i18next.t('servidor_desconectado')}
            </p>
            <p class="pacientes-message-text">
              ${i18next.t('verificar_servidor')}
            </p>
            <button class="btn" onclick="verificarServidor()">
              🔄 ${i18next.t('tentar_novamente')}
            </button>
          </div>
        `;
      }
    }

    // Inicializar
    verificarServidor();

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../login.html';
}