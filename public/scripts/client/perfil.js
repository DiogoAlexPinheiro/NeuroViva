// public/client/adds/loader.js
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
    const res = await fetch(`http://localhost:3000/api/notificacoes/cliente/${user.nome}`);
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
  await loadComponent('header-container', '../client/adds/header.html');
  await loadComponent('footer-container', '../client/adds/footer.html');
  
  // Aguardar um pouco para garantir que os elementos foram carregados
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

// Carregar HTML dos modais quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  // Criar container para os modais se não existir
  if (!document.getElementById('customModalOverlay')) {
    const modalHTML = `
      <div id="customModalOverlay" class="custom-modal-overlay">
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="customModalTitle" data-i18n="confirmacao">Confirmação</h3>
          </div>
          <div class="custom-modal-body">
            <p id="customModalMessage"></p>
          </div>
          <div class="custom-modal-footer">
            <button id="customModalCancel" class="btn-secondary" data-i18n="cancelar">Cancelar</button>
            <button id="customModalConfirm" class="btn" data-i18n="confirmar">Confirmar</button>
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
        <p id="loadingMessage" data-i18n="a_processar">A processar...</p>
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

// Tornar funções globais
window.customConfirm = customConfirm;
window.customAlert = customAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'client') {
      window.location.href = '../login.html';
    }

    let profileImageFile = null;

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

    async function carregarPerfil() {
      try {
        const res = await fetch(`http://localhost:3000/api/client/perfil/${user.id}`);
        const data = await res.json();

        // Dados editáveis
        document.getElementById('nome').value = data.user.nome || '';
        document.getElementById('primeiroNome').value = data.user.primeiroNome || '';
        document.getElementById('ultimoNome').value = data.user.ultimoNome || '';
        document.getElementById('email').value = data.user.email || '';
        document.getElementById('contacto').value = data.paciente.contacto || '';
        document.getElementById('morada').value = data.paciente.morada || '';
        document.getElementById('idade').value = data.paciente.idade || '';
        document.getElementById('genero').value = data.paciente.genero || '';
        document.getElementById('profissao').value = data.paciente.profissao || '';

        if (data.user.profileImage) {
          document.getElementById('previewImage').src = data.user.profileImage;
        }

        // Contexto familiar
        if (data.paciente.contextoFamiliar) {
          document.getElementById('estadoCivil').value = data.paciente.contextoFamiliar.estadoCivil || '';
          document.getElementById('filhos').value = data.paciente.contextoFamiliar.filhos || 0;
          document.getElementById('membros').value = data.paciente.contextoFamiliar.membros ? 
            data.paciente.contextoFamiliar.membros.join(', ') : '';
        }

        // Campos apenas de leitura
        document.getElementById('numeroIdentificacao').value = data.paciente.numeroIdentificacao || '-';
        
        if (data.paciente.contatoEmergencia && data.paciente.contatoEmergencia.nome) {
          const ce = data.paciente.contatoEmergencia;
          document.getElementById('contatoEmergenciaInfo').innerHTML = `
            <strong>${ce.nome}</strong> (${ce.relacao || 'N/A'})<br>
            📞 ${ce.telefone || 'N/A'}
          `;
        } else {
          document.getElementById('contatoEmergenciaInfo').textContent = 'Não definido';
        }

        // Historico clinico (apenas leitura)
if (data.paciente.historicClinico) {
  const hist = data.paciente.historicClinico;
  let histHtml = '';
  
  if (hist.diagnosticos) {
    histHtml += `<div class="form-group"><label data-i18n="diagnosticos">Diagnósticos e Condições</label><div style="padding: 1rem; background: #fff; border-radius: 8px; border: 1px solid var(--color-border);">${hist.diagnosticos}</div></div>`;
  }
  if (hist.medicacao) {
    histHtml += `<div class="form-group"><label data-i18n="medicacao">Medicação Atual</label><div style="padding: 1rem; background: #fff; border-radius: 8px; border: 1px solid var(--color-border);">${hist.medicacao}</div></div>`;
  }
  if (hist.motivoConsulta) {
    histHtml += `<div class="form-group"><label data-i18n="motivo_consulta">Motivo da Consulta Inicial</label><div style="padding: 1rem; background: #fff; border-radius: 8px; border: 1px solid var(--color-border);">${hist.motivoConsulta}</div></div>`;
  }
  if (hist.evolucaoClinica) {
    histHtml += `<div class="form-group"><label data-i18n="evolucao_notas">Evolução e Notas Clinicas</label><div style="padding: 1rem; background: #fff; border-radius: 8px; border: 1px solid var(--color-border); white-space: pre-wrap;">${hist.evolucaoClinica}</div></div>`;
  }
  if (hist.alertas) {
    histHtml += `<div class="form-group"><label data-i18n="alertas_precaucoes">Alertas e precauções</label><div style="padding: 1rem; background: #fff3e0; border-radius: 8px; border: 1px solid #ff9800; color: #e65100;">${hist.alertas}</div></div>`;
  }
  
  document.getElementById('historicoClinicoInfo').innerHTML = histHtml || '<p data-i18n="sem_informacoes">Sem informacoes clinicas registadas</p>';
} else {
  document.getElementById('historicoClinicoInfo').innerHTML = '<p data-i18n="sem_informacoes">Sem informacoes clinicas registadas</p>';
}

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        mostrarAlerta('Erro ao carregar perfil', 'error');
      }
    }

    async function atualizarPerfil() {
      const nome = document.getElementById('nome').value.trim();
      const primeiroNome = document.getElementById('primeiroNome').value.trim();
      const ultimoNome = document.getElementById('ultimoNome').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const contacto = document.getElementById('contacto').value.trim();
      const morada = document.getElementById('morada').value.trim();
      const idade = document.getElementById('idade').value;
      const genero = document.getElementById('genero').value;
      const profissao = document.getElementById('profissao').value.trim();
      
      const estadoCivil = document.getElementById('estadoCivil').value;
      const filhos = document.getElementById('filhos').value;
      const membrosStr = document.getElementById('membros').value;
      const membros = membrosStr ? membrosStr.split(',').map(m => m.trim()).filter(m => m) : [];

      if (!nome || !email) {
        mostrarAlerta('Nome e email são obrigatórios', 'error');
        return;
      }

      const contextoFamiliar = {
        estadoCivil,
        filhos: parseInt(filhos) || 0,
        membros
      };

      try {
        showLoading('A guardar alterações...');
        
        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('primeiroNome', primeiroNome);
        formData.append('ultimoNome', ultimoNome);
        formData.append('email', email);
        if (password) formData.append('password', password);
        formData.append('contacto', contacto);
        formData.append('morada', morada);
        formData.append('idade', idade);
        formData.append('genero', genero);
        formData.append('profissao', profissao);
        formData.append('contextoFamiliar', JSON.stringify(contextoFamiliar));
        
        if (profileImageFile) {
          formData.append('profileImage', profileImageFile);
        }

        const res = await fetch(`http://localhost:3000/api/client/perfil/${user.id}`, {
          method: 'PUT',
          body: formData
        });

        const result = await res.json();
        hideLoading();

        if (res.ok) {
          mostrarAlerta('Perfil atualizado com sucesso!', 'success');
          
          // Atualizar localStorage
          user.nome = nome;
          user.primeiroNome = primeiroNome;
          user.genero = genero;
          localStorage.setItem('user', JSON.stringify(user));
          
          document.getElementById('password').value = '';
          profileImageFile = null;
          
          setTimeout(() => location.reload(), 1500);
        } else {
          mostrarAlerta(result.error || 'Erro ao atualizar', 'error');
        }
      } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        mostrarAlerta('Erro ao atualizar perfil', 'error');
      }
    }

    function mostrarAlerta(msg, tipo) {
      const el = document.getElementById('alert');
      el.className = `alert alert-${tipo === 'error' ? 'error' : 'success'}`;
      el.textContent = msg;
      setTimeout(() => el.textContent = '', 5000);
    }

    carregarPerfil();