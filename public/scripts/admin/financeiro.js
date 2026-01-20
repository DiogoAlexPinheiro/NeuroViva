const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') { window.location.href = '../login.html'; }

    let pagamentoEditando = null;
    let todosPagamentos = [];
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataPagamento').value = hoje;

    async function carregarPacientes() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pacientes');
        const pacientes = await res.json();
        const options = pacientes.filter(p => p.estado === 'ativo')
          .map(p => `<option value="${p.nomeCompleto}">${p.nomeCompleto}</option>`).join('');
        document.getElementById('pacienteSelect').innerHTML = '<option value="">Selecione um paciente</option>' + options;
        document.getElementById('filtroPaciente').innerHTML = '<option value="">Todos os pacientes</option>' + options;
      } catch (error) { console.error(error); }
    }

    async function registarPagamento() {
      const paciente = document.getElementById('pacienteSelect').value;
      const valor = document.getElementById('valor').value;
      const estado = document.getElementById('estado').value;
      const metodo = document.getElementById('metodo').value;
      const data = document.getElementById('dataPagamento').value;
      const descricao = document.getElementById('descricao').value;
      const comprovantivoInput = document.getElementById('comprovativo');

      if (!paciente || !valor || !data) {
        await customAlert('Preencha todos os campos obrigatorios');
        return;
      }

      try {
        showLoading('A registar pagamento...');
        const formData = new FormData();
        formData.append('paciente', paciente);
        formData.append('valor', valor);
        formData.append('estado', estado);
        formData.append('metodo', metodo);
        formData.append('data', data);
        formData.append('descricao', descricao);
        if (comprovantivoInput.files.length > 0) {
          formData.append('comprovativo', comprovantivoInput.files[0]);
        }

        const res = await fetch('http://localhost:3000/api/admin/pagamentos', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Pagamento registado!\n\nCodigo: ' + result.codigo);
          document.getElementById('pacienteSelect').value = '';
          document.getElementById('valor').value = '';
          document.getElementById('descricao').value = '';
          document.getElementById('dataPagamento').value = hoje;
          document.getElementById('comprovativo').value = '';
          carregarPagamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao registar pagamento');
      }
    }

    function copiarCodigo(codigo, event) {
      event.stopPropagation();
      navigator.clipboard.writeText(codigo).then(() => {
        mostrarAlerta('Codigo copiado!', 'success');
      });
    }

    async function carregarPagamentos() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pagamentos');
        todosPagamentos = await res.json();
        exibirPagamentos(todosPagamentos);
        atualizarTotais(todosPagamentos);
      } catch (error) { console.error(error); }
    }

    function filtrarPagamentos() {
      const pacienteFiltro = document.getElementById('filtroPaciente').value;
      const estadoFiltro = document.getElementById('filtroEstado').value;
      let filtrados = [...todosPagamentos];
      if (pacienteFiltro) filtrados = filtrados.filter(p => p.paciente === pacienteFiltro);
      if (estadoFiltro) filtrados = filtrados.filter(p => p.estado === estadoFiltro);
      exibirPagamentos(filtrados);
    }

    function exibirPagamentos(pagamentos) {
      const container = document.getElementById('listaPagamentos');
      if (pagamentos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">Sem pagamentos registados</p>';
        return;
      }

      container.innerHTML = pagamentos.map(p => `
        <div class="item-card estado-${p.estado}">
          <div class="item-codigo">
            <span class="codigo-badge clickable" onclick="verDetalhes('${p._id}')" title="Ver detalhes">
              ${p.codigo}
              <button onclick="copiarCodigo('${p.codigo}', event)" title="Copiar">Copiar</button>
            </span>
          </div>
          
          <div class="item-info">
            <div class="titulo">${p.paciente}</div>
            <div class="detalhes">
              <span>Data: ${p.data}</span>
              <span>Metodo: ${p.metodo}</span>
              ${p.descricao ? '<span>Ref: ' + p.descricao + '</span>' : ''}
            </div>
          </div>
          
          <div class="item-valor">
            <div class="valor">EUR ${p.valor.toFixed(2)}</div>
            <div class="estado">
              <span class="badge ${p.estado === 'pago' ? 'badge-success' : p.estado === 'pendente' ? 'badge-warning' : 'badge-danger'}">${p.estado}</span>
            </div>
          </div>
          
          <div class="item-acoes">
            ${p.comprovativo ? '<a href="' + p.comprovativo.caminho + '" target="_blank" class="btn-small btn-outline">Ver Doc</a>' : ''}
            <button class="btn-small" onclick="editarPagamento('${p._id}', ${p.valor}, '${p.estado}', '${p.metodo}', '${p.data}', '${p.descricao || ''}')">Editar</button>
            <button class="btn-small btn-danger" onclick="apagarPagamento('${p._id}')">Apagar</button>
          </div>
        </div>
      `).join('');
    }

    function atualizarTotais(pagamentos) {
      const totalPago = pagamentos.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor, 0);
      const totalPendente = pagamentos.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor, 0);
      document.getElementById('totalPago').textContent = 'EUR ' + totalPago.toFixed(2);
      document.getElementById('totalPendente').textContent = 'EUR ' + totalPendente.toFixed(2);
      document.getElementById('totalGeral').textContent = 'EUR ' + (totalPago + totalPendente).toFixed(2);
    }

    function verDetalhes(id) {
      const pag = todosPagamentos.find(p => p._id === id);
      if (!pag) return;
      
      document.getElementById('detalhesConteudo').innerHTML = `
        <div class="modal-detalhes-grid">
          <div class="detalhe-item">
            <label>Codigo</label>
            <span>${pag.codigo}</span>
          </div>
          <div class="detalhe-item">
            <label>Paciente</label>
            <span>${pag.paciente}</span>
          </div>
          <div class="detalhe-item">
            <label>Valor</label>
            <span>EUR ${pag.valor.toFixed(2)}</span>
          </div>
          <div class="detalhe-item">
            <label>Estado</label>
            <span class="badge ${pag.estado === 'pago' ? 'badge-success' : pag.estado === 'pendente' ? 'badge-warning' : 'badge-danger'}">${pag.estado}</span>
          </div>
          <div class="detalhe-item">
            <label>Metodo</label>
            <span>${pag.metodo}</span>
          </div>
          <div class="detalhe-item">
            <label>Data</label>
            <span>${pag.data}</span>
          </div>
          ${pag.descricao ? '<div class="detalhe-item full"><label>Descricao</label><span>' + pag.descricao + '</span></div>' : ''}
          ${pag.comprovativo ? '<div class="detalhe-item full"><label>Comprovativo</label><a href="' + pag.comprovativo.caminho + '" target="_blank" class="btn-small btn-outline">Ver Documento</a></div>' : ''}
        </div>
      `;
      document.getElementById('modalDetalhes').style.display = 'flex';
    }

    function fecharModalDetalhes() {
      document.getElementById('modalDetalhes').style.display = 'none';
    }

    function editarPagamento(id, valor, estado, metodo, data, descricao) {
      pagamentoEditando = id;
      document.getElementById('editValor').value = valor;
      document.getElementById('editEstado').value = estado;
      document.getElementById('editMetodo').value = metodo;
      document.getElementById('editData').value = data;
      document.getElementById('editDescricao').value = descricao;
      document.getElementById('modalEditar').style.display = 'flex';
    }

    async function salvarEdicao() {
      const valor = document.getElementById('editValor').value;
      const estado = document.getElementById('editEstado').value;
      const metodo = document.getElementById('editMetodo').value;
      const data = document.getElementById('editData').value;
      const descricao = document.getElementById('editDescricao').value;

      try {
        showLoading('A guardar alteracoes...');
        const res = await fetch('http://localhost:3000/api/admin/pagamentos/' + pagamentoEditando, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor, estado, metodo, data, descricao })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Pagamento atualizado!');
          fecharModal();
          carregarPagamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao atualizar');
      }
    }

    async function apagarPagamento(id) {
      const confirmacao = await customConfirm('Tem certeza que deseja apagar este pagamento?');
      if (!confirmacao) return;

      try {
        showLoading('A apagar pagamento...');
        const res = await fetch('http://localhost:3000/api/admin/pagamentos/' + id, { method: 'DELETE' });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Pagamento apagado!');
          carregarPagamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao apagar');
      }
    }

    function fecharModal() {
      document.getElementById('modalEditar').style.display = 'none';
      pagamentoEditando = null;
    }

    function mostrarAlerta(msg, tipo) {
      const el = document.getElementById('alert');
      el.className = tipo === 'error' ? 'alert alert-error' : 'alert alert-success';
      el.textContent = msg;
      setTimeout(() => el.className = 'alert-hidden', 5000);
    }

    carregarPacientes();
    carregarPagamentos();


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

// Tornar funções globais
window.customConfirm = customConfirm;
window.customAlert = customAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

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
      if (userNameEl) userNameEl.textContent = user.nome;
    }
    
    carregarNotificacoes();
    setInterval(carregarNotificacoes, 30000);
  }, 100);
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../../login.html';
}