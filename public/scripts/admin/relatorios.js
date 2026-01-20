const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') { window.location.href = '../login.html'; }

    let relatorioEditando = null;
    let tipoEditando = null;
    let todosRelatorios = [];

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataRelatorio').value = hoje;

    document.getElementById('tipoRelatorio').addEventListener('change', (e) => {
      const isExterno = e.target.value !== 'normal';
      document.getElementById('entidadeGroup').style.display = isExterno ? 'block' : 'none';
      document.getElementById('entidadeEmailGroup').style.display = isExterno ? 'block' : 'none';
    });

    async function carregarPacientes() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pacientes');
        const pacientes = await res.json();
        const options = pacientes.filter(p => p.estado === 'ativo')
          .map(p => '<option value="' + p.nomeCompleto + '">' + p.nomeCompleto + '</option>').join('');
        document.getElementById('pacienteSelect').innerHTML = '<option value="">Selecione um paciente</option>' + options;
        document.getElementById('filtroRelatorio').innerHTML = '<option value="">Todos os pacientes</option>' + options;

        const adminRes = await fetch('http://localhost:3000/api/admin/perfil?username=admin');
        const admin = await adminRes.json();
        if (admin) document.getElementById('assinaturaNome').value = admin.nome || '';
      } catch (error) { console.error(error); }
    }

    async function criarRelatorio() {
      const titulo = document.getElementById('titulo').value;
      const dataRelatorio = document.getElementById('dataRelatorio').value;
      const paciente = document.getElementById('pacienteSelect').value;
      const tipo = document.getElementById('tipoRelatorio').value;
      const entidade = document.getElementById('entidade').value;
      const entidadeEmail = document.getElementById('entidadeEmail').value;
      const conteudo = document.getElementById('conteudo').value;
      const notas = document.getElementById('notas').value;
      const assinaturaNome = document.getElementById('assinaturaNome').value;
      const assinaturaTitulo = document.getElementById('assinaturaTitulo').value;
      const anexosInput = document.getElementById('anexos');

      if (!titulo || !paciente || !conteudo || !assinaturaNome) {
        await customAlert('Preencha todos os campos obrigatorios');
        return;
      }

      if (tipo !== 'normal' && !entidade) {
        await customAlert('Preencha a entidade para relatorios externos');
        return;
      }

      if (anexosInput.files.length > 5) {
        await customAlert('Pode selecionar no maximo 5 anexos');
        return;
      }

      try {
        showLoading('A criar relatorio...');
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('data', dataRelatorio);
        formData.append('paciente', paciente);
        formData.append('tipo', tipo);
        formData.append('entidade', entidade);
        formData.append('entidadeEmail', entidadeEmail);
        formData.append('conteudo', conteudo);
        formData.append('notas', notas);
        formData.append('assinaturaNome', assinaturaNome);
        formData.append('assinaturaTitulo', assinaturaTitulo);

        if (anexosInput.files.length > 0) {
          for (let i = 0; i < anexosInput.files.length; i++) {
            formData.append('anexos', anexosInput.files[i]);
          }
        }

        const res = await fetch('http://localhost:3000/api/admin/relatorios', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Relatorio criado!\n\nCodigo: ' + result.codigo);
          document.getElementById('titulo').value = '';
          document.getElementById('pacienteSelect').value = '';
          document.getElementById('conteudo').value = '';
          document.getElementById('notas').value = '';
          document.getElementById('entidade').value = '';
          document.getElementById('entidadeEmail').value = '';
          document.getElementById('anexos').value = '';
          carregarRelatorios();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao criar relatorio');
      }
    }

    async function carregarRelatorios() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/relatorios');
        const data = await res.json();
        todosRelatorios = [
          ...data.normais.map(r => ({ ...r, tipoRelatorio: 'normal' })),
          ...data.externos.map(r => ({ ...r, tipoRelatorio: r.tipo }))
        ].sort((a, b) => new Date(b.data) - new Date(a.data));
        exibirRelatorios(todosRelatorios);
      } catch (error) { console.error(error); }
    }

    async function filtrarRelatorios() {
      const pacienteFiltro = document.getElementById('filtroRelatorio').value;
      let filtrados = [...todosRelatorios];
      if (pacienteFiltro) filtrados = filtrados.filter(r => r.paciente === pacienteFiltro);
      exibirRelatorios(filtrados);
    }

    function copiarCodigo(codigo, event) {
      event.stopPropagation();
      navigator.clipboard.writeText(codigo).then(() => {
        mostrarAlerta('Codigo copiado!', 'success');
      });
    }

    function exibirRelatorios(relatorios) {
      const container = document.getElementById('listaRelatorios');
      if (relatorios.length === 0) {
        container.innerHTML = '<p>Sem relatorios</p>';
        return;
      }

      container.innerHTML = relatorios.map(r => `
        <div class="message-box">
          <div class="relatorio-header">
            <div>
              <h4>${r.titulo || (r.tipoRelatorio === 'normal' ? 'Relatorio de Sessao' : 'Relatorio Externo')}</h4>
              <span style="font-size: 0.85rem; color: var(--color-text-light);">${r.tipoRelatorio !== 'normal' ? r.tipoRelatorio.toUpperCase() : 'SESSAO'}</span>
            </div>
            <span class="codigo-badge clickable" onclick="verDetalhes('${r._id}', '${r.tipoRelatorio}')" title="Ver detalhes">
              ${r.codigo}
              <button onclick="copiarCodigo('${r.codigo}', event)" title="Copiar">Copiar</button>
            </span>
          </div>

          <div class="relatorio-meta">
            <div class="relatorio-meta-item">
              <label>Data</label>
              <span>${r.data}</span>
            </div>
            <div class="relatorio-meta-item">
              <label>Paciente</label>
              <span>${r.paciente}</span>
            </div>
            ${r.entidade ? '<div class="relatorio-meta-item"><label>Entidade</label><span>' + r.entidade + '</span></div>' : ''}
            ${r.psicologo ? '<div class="relatorio-meta-item"><label>Psicologo</label><span>' + r.psicologo + '</span></div>' : ''}
          </div>

          <div class="relatorio-content">
            <div class="relatorio-section">
              <h5>Conteudo</h5>
              <p style="white-space: pre-wrap;">${(r.conteudo || r.relatorio || '').substring(0, 300)}${(r.conteudo || r.relatorio || '').length > 300 ? '...' : ''}</p>
            </div>
          </div>
          
          ${r.anexos && r.anexos.length > 0 ? `
            <div class="relatorio-section">
              <h5>Anexos</h5>
              ${r.anexos.map(a => '<div class="anexo-item"><a href="' + a.caminho + '" target="_blank">' + a.nome + '</a><button class="btn-small btn-danger" onclick="removerAnexo(\'' + r._id + '\', \'' + r.tipoRelatorio + '\', \'' + a.caminho + '\')">Remover</button></div>').join('')}
            </div>
          ` : ''}

          <div class="relatorio-footer">
            <div class="message-actions">
              <button class="btn-small" onclick="editarRelatorio('${r._id}', '${r.tipoRelatorio}', \`${(r.titulo || '').replace(/`/g, '')}\`, '${r.entidade || ''}', '${r.entidadeEmail || ''}', \`${(r.conteudo || r.relatorio || '').replace(/`/g, '').replace(/\n/g, '\\n')}\`, \`${(r.notas || '').replace(/`/g, '').replace(/\n/g, '\\n')}\`)">Editar</button>
              <button class="btn-small btn-danger" onclick="apagarRelatorio('${r._id}', '${r.tipoRelatorio}')">Apagar</button>
            </div>

            ${r.assinatura ? `
              <div class="assinatura-section">
                <div class="assinatura-nome">${r.assinatura.nome}</div>
                ${r.assinatura.titulo ? '<div class="assinatura-titulo">' + r.assinatura.titulo + '</div>' : ''}
              </div>
            ` : '<div></div>'}
          </div>
        </div>
      `).join('');
    }

    function verDetalhes(id, tipo) {
      const rel = todosRelatorios.find(r => r._id === id);
      if (!rel) return;
      
      document.getElementById('detalhesConteudo').innerHTML = `
        <div class="modal-detalhes-grid">
          <div class="detalhe-item">
            <label>Codigo</label>
            <span>${rel.codigo}</span>
          </div>
          <div class="detalhe-item">
            <label>Tipo</label>
            <span>${rel.tipoRelatorio}</span>
          </div>
          <div class="detalhe-item">
            <label>Paciente</label>
            <span>${rel.paciente}</span>
          </div>
          <div class="detalhe-item">
            <label>Data</label>
            <span>${rel.data}</span>
          </div>
          ${rel.psicologo ? '<div class="detalhe-item"><label>Psicologo</label><span>' + rel.psicologo + '</span></div>' : ''}
          ${rel.entidade ? '<div class="detalhe-item"><label>Entidade</label><span>' + rel.entidade + '</span></div>' : ''}
          <div class="detalhe-item full">
            <label>Conteudo</label>
            <p style="white-space: pre-wrap; margin-top: 0.5rem;">${rel.conteudo || rel.relatorio || ''}</p>
          </div>
          ${rel.notas ? '<div class="detalhe-item full"><label>Notas</label><p style="white-space: pre-wrap; margin-top: 0.5rem;">' + rel.notas + '</p></div>' : ''}
          ${rel.assinatura ? '<div class="detalhe-item full"><label>Assinatura</label><span>' + rel.assinatura.nome + (rel.assinatura.titulo ? ' - ' + rel.assinatura.titulo : '') + '</span></div>' : ''}
        </div>
      `;
      document.getElementById('modalDetalhes').style.display = 'flex';
    }

    function fecharModalDetalhes() {
      document.getElementById('modalDetalhes').style.display = 'none';
    }

    function editarRelatorio(id, tipo, titulo, entidade, entidadeEmail, conteudo, notas) {
      relatorioEditando = id;
      tipoEditando = tipo;
      document.getElementById('editTitulo').value = titulo;
      document.getElementById('editEntidade').value = entidade;
      document.getElementById('editEntidadeEmail').value = entidadeEmail || '';
      document.getElementById('editConteudo').value = conteudo.replace(/\\n/g, '\n');
      document.getElementById('editNotas').value = notas.replace(/\\n/g, '\n');
      
      document.getElementById('editEntidadeEmailGroup').style.display = tipo !== 'normal' ? 'block' : 'none';
      
      document.getElementById('modalEditar').style.display = 'flex';
    }

    async function salvarEdicao() {
      const titulo = document.getElementById('editTitulo').value;
      const entidade = document.getElementById('editEntidade').value;
      const entidadeEmail = document.getElementById('editEntidadeEmail').value;
      const conteudo = document.getElementById('editConteudo').value;
      const notas = document.getElementById('editNotas').value;

      try {
        showLoading('A guardar alteracoes...');
        const res = await fetch('http://localhost:3000/api/admin/relatorios/' + relatorioEditando, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: tipoEditando, titulo, conteudo, entidade, entidadeEmail, notas })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Relatorio atualizado!');
          fecharModal();
          carregarRelatorios();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao atualizar');
      }
    }

    function fecharModal() {
      document.getElementById('modalEditar').style.display = 'none';
      relatorioEditando = null;
      tipoEditando = null;
    }

    async function removerAnexo(relatorioId, tipo, anexoCaminho) {
      const confirmacao = await customConfirm('Tem certeza que deseja remover este anexo?');
      if (!confirmacao) return;

      try {
        showLoading('A remover anexo...');
        const res = await fetch('http://localhost:3000/api/admin/relatorios/' + relatorioId + '/anexo', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo, anexoCaminho })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Anexo removido!');
          carregarRelatorios();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao remover anexo');
      }
    }

    async function apagarRelatorio(id, tipo) {
      const confirmacao = await customConfirm('Tem certeza que deseja apagar este relatorio?');
      if (!confirmacao) return;

      try {
        showLoading('A apagar relatorio...');
        const res = await fetch('http://localhost:3000/api/admin/relatorios/' + id + '?tipo=' + tipo, { method: 'DELETE' });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Relatorio apagado!');
          carregarRelatorios();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao apagar');
      }
    }

    function mostrarAlerta(msg, tipo) {
      const el = document.getElementById('alert');
      el.className = tipo === 'error' ? 'alert alert-error' : 'alert alert-success';
      el.textContent = msg;
      setTimeout(() => el.className = 'alert-hidden', 5000);
    }

    carregarPacientes();
    carregarRelatorios();


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