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

const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') { window.location.href = '../login.html'; }

    let todosAgendamentos = [];
    let agendamentoEditando = null;
    let agendamentoCancelando = null;
    let agendamentoLigando = null;
    let tipoLigacao = null;

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataAgendamento').value = hoje;
    document.getElementById('dataAgendamento').min = hoje;

    document.getElementById('dataAgendamento').addEventListener('change', carregarHorariosDisponiveis);
    document.getElementById('editData').addEventListener('change', carregarHorariosDisponiveisEdit);

    async function carregarPacientes() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pacientes');
        const pacientes = await res.json();
        const options = pacientes.filter(p => p.estado === 'ativo')
          .map(p => '<option value="' + p.nomeCompleto + '">' + p.nomeCompleto + '</option>').join('');
        document.getElementById('pacienteSelect').innerHTML = '<option value="">Selecione um paciente</option>' + options;
        document.getElementById('filtroPaciente').innerHTML = '<option value="">Todos os pacientes</option>' + options;
      } catch (error) { console.error(error); }
    }

    async function carregarHorariosDisponiveis() {
      const data = document.getElementById('dataAgendamento').value;
      const select = document.getElementById('horaSelect');
      
      if (!data) {
        select.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/api/agendamentos/disponiveis?data=' + data);
        const horarios = await res.json();
        
        if (horarios.length === 0) {
          select.innerHTML = '<option value="">Sem horarios disponiveis</option>';
        } else {
          select.innerHTML = '<option value="">Selecione um horario</option>' + 
            horarios.map(h => '<option value="' + h + '">' + h + '</option>').join('');
        }
      } catch (error) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
      }
    }

    async function carregarHorariosDisponiveisEdit() {
      const data = document.getElementById('editData').value;
      const select = document.getElementById('editHora');
      
      if (!data) return;

      try {
        const res = await fetch('http://localhost:3000/api/agendamentos/disponiveis?data=' + data);
        const horarios = await res.json();
        select.innerHTML = horarios.map(h => '<option value="' + h + '">' + h + '</option>').join('');
      } catch (error) { console.error(error); }
    }

    async function criarAgendamento() {
      const paciente = document.getElementById('pacienteSelect').value;
      const data = document.getElementById('dataAgendamento').value;
      const hora = document.getElementById('horaSelect').value;

      if (!paciente || !data || !hora) {
        await customAlert('Preencha todos os campos');
        return;
      }

      try {
        showLoading('A criar agendamento...');
        const res = await fetch('http://localhost:3000/api/agendamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paciente, data, hora, criadoPor: 'admin' })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Agendamento criado!');
          document.getElementById('pacienteSelect').value = '';
          carregarHorariosDisponiveis();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao criar agendamento');
      }
    }

    async function carregarAgendamentos() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/agendamentos');
        todosAgendamentos = await res.json();
        exibirAgendamentos(todosAgendamentos);
      } catch (error) { console.error(error); }
    }

    function filtrarAgendamentos() {
      const pacienteFiltro = document.getElementById('filtroPaciente').value;
      const estadoFiltro = document.getElementById('filtroEstado').value;
      let filtrados = [...todosAgendamentos];
      if (pacienteFiltro) filtrados = filtrados.filter(a => a.paciente === pacienteFiltro);
      if (estadoFiltro) filtrados = filtrados.filter(a => a.estado === estadoFiltro);
      exibirAgendamentos(filtrados);
    }

    function exibirAgendamentos(agendamentos) {
  const container = document.getElementById('listaAgendamentos');
  if (agendamentos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">Sem agendamentos</p>';
    return;
  }

  container.innerHTML = agendamentos.map(a => `
    <div class="item-card item-card-wide estado-${a.estado}">
      <div class="item-info">
        <div class="titulo">${a.paciente}</div>
        <div class="detalhes">
          <span><strong>Data:</strong> ${a.data}</span>
          <span><strong>Hora:</strong> ${a.hora}</span>
          <span><strong>Criado por:</strong> ${a.criadoPor}</span>
        </div>
        <div class="item-badges-row">
          
          ${a.codigoRelatorio ? 
            `<span class="codigo-badge clickable" onclick="verDetalhesRelatorio('${a.codigoRelatorio}')" title="Ver relatório">
              ${a.codigoRelatorio}
            </span>` : 
            `<span class="codigo-badge empty" onclick="abrirModalLigar('${a._id}', 'relatorio')" title="Ligar relatório">
              + Relatório
            </span>`}
          ${a.codigoPagamento ? 
            `<span class="codigo-badge clickable" onclick="verDetalhesPagamento('${a.codigoPagamento}')" title="Ver pagamento">
              ${a.codigoPagamento}
            </span>` : 
            `<span class="codigo-badge empty" onclick="abrirModalLigar('${a._id}', 'pagamento')" title="Ligar pagamento">
              + Pagamento
            </span>`}
            <span class="badge ${a.estado === 'completo' ? 'badge-success' : a.estado === 'confirmado' ? 'badge-info' : a.estado === 'pendente' ? 'badge-warning' : 'badge-danger'}">${a.estado}</span>
        </div>
      </div>
      
      ${a.estado !== 'cancelado' ? `
      <div class="item-acoes">
        <div class="acoes-esquerda">
          <button class="btn-small btn-secondary" onclick="abrirModalLigar('${a._id}', 'relatorio')">+ Relatório</button>
          <button class="btn-small btn-secondary" onclick="abrirModalLigar('${a._id}', 'pagamento')">+ Pagamento</button>
        </div>
        
        <div class="acoes-centro">
          ${a.estado === 'pendente' ? 
            `<button class="btn-small btn-outline" onclick="confirmarAgendamento('${a._id}')">Confirmar</button>` : 
            '<span></span>'}
        </div>
        
        <div class="acoes-direita">
          <button class="btn-small" onclick="editarAgendamento('${a._id}', '${a.data}', '${a.hora}', '${a.estado}')">Editar</button>
          <button class="btn-small btn-danger" onclick="abrirModalCancelar('${a._id}')">Cancelar</button>
        </div>
      </div>
      ` : ''}
    </div>
  `).join('');
}

    async function verDetalhesRelatorio(codigo) {
      try {
        showLoading('A carregar...');
        const res = await fetch('http://localhost:3000/api/relatorios/codigo/' + codigo);
        const data = await res.json();
        hideLoading();

        if (!res.ok) {
          await customAlert('Relatorio nao encontrado');
          return;
        }

        const rel = data.relatorio;
        document.getElementById('modalDetalhesTitulo').textContent = 'Detalhes do Relatorio';
        document.getElementById('detalhesConteudo').innerHTML = `
          <div class="modal-detalhes-grid">
            <div class="detalhe-item"><label>Codigo</label><span>${rel.codigo}</span></div>
            <div class="detalhe-item"><label>Tipo</label><span>${rel.tipo || data.tipo}</span></div>
            <div class="detalhe-item"><label>Paciente</label><span>${rel.paciente}</span></div>
            <div class="detalhe-item"><label>Data</label><span>${rel.data}</span></div>
            ${rel.psicologo ? '<div class="detalhe-item"><label>Psicologo</label><span>' + rel.psicologo + '</span></div>' : ''}
            ${rel.entidade ? '<div class="detalhe-item"><label>Entidade</label><span>' + rel.entidade + '</span></div>' : ''}
            <div class="detalhe-item full"><label>Conteudo</label><p style="white-space: pre-wrap; margin-top: 0.5rem;">${rel.conteudo || ''}</p></div>
            ${rel.notas ? '<div class="detalhe-item full"><label>Notas</label><p style="white-space: pre-wrap; margin-top: 0.5rem;">' + rel.notas + '</p></div>' : ''}
          </div>
        `;
        document.getElementById('modalDetalhes').style.display = 'flex';
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao carregar relatorio');
      }
    }

    async function verDetalhesPagamento(codigo) {
      try {
        showLoading('A carregar...');
        const res = await fetch('http://localhost:3000/api/pagamentos/codigo/' + codigo);
        const pag = await res.json();
        hideLoading();

        if (!res.ok) {
          await customAlert('Pagamento nao encontrado');
          return;
        }

        document.getElementById('modalDetalhesTitulo').textContent = 'Detalhes do Pagamento';
        document.getElementById('detalhesConteudo').innerHTML = `
          <div class="modal-detalhes-grid">
            <div class="detalhe-item"><label>Codigo</label><span>${pag.codigo}</span></div>
            <div class="detalhe-item"><label>Paciente</label><span>${pag.paciente}</span></div>
            <div class="detalhe-item"><label>Valor</label><span>EUR ${pag.valor.toFixed(2)}</span></div>
            <div class="detalhe-item"><label>Estado</label><span class="badge ${pag.estado === 'pago' ? 'badge-success' : pag.estado === 'pendente' ? 'badge-warning' : 'badge-danger'}">${pag.estado}</span></div>
            <div class="detalhe-item"><label>Metodo</label><span>${pag.metodo}</span></div>
            <div class="detalhe-item"><label>Data</label><span>${pag.data}</span></div>
            ${pag.descricao ? '<div class="detalhe-item full"><label>Descricao</label><span>' + pag.descricao + '</span></div>' : ''}
          </div>
        `;
        document.getElementById('modalDetalhes').style.display = 'flex';
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao carregar pagamento');
      }
    }

    function fecharModalDetalhes() {
      document.getElementById('modalDetalhes').style.display = 'none';
    }

    function abrirModalLigar(id, tipo) {
      agendamentoLigando = id;
      tipoLigacao = tipo;
      document.getElementById('modalLigarTitulo').textContent = tipo === 'relatorio' ? 'Ligar Relatorio' : 'Ligar Pagamento';
      document.getElementById('modalLigarLabel').textContent = tipo === 'relatorio' ? 'Codigo do Relatorio' : 'Codigo do Pagamento';
      document.getElementById('codigoLigar').value = '';
      document.getElementById('codigoLigar').placeholder = tipo === 'relatorio' ? 'Ex: REL-XXXXX' : 'Ex: PAG-XXXXX';
      document.getElementById('modalLigar').style.display = 'flex';
    }

    function fecharModalLigar() {
      document.getElementById('modalLigar').style.display = 'none';
      agendamentoLigando = null;
      tipoLigacao = null;
    }

    async function confirmarLigar() {
      const codigo = document.getElementById('codigoLigar').value.trim();
      if (!codigo) {
        await customAlert('Introduza um codigo');
        return;
      }

      try {
        showLoading('A ligar...');
        const endpoint = tipoLigacao === 'relatorio' ? 'ligar-relatorio' : 'ligar-pagamento';
        const body = tipoLigacao === 'relatorio' ? { codigoRelatorio: codigo } : { codigoPagamento: codigo };
        
        const res = await fetch('http://localhost:3000/api/agendamentos/' + agendamentoLigando + '/' + endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Ligado com sucesso!');
          fecharModalLigar();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao ligar');
      }
    }

    function editarAgendamento(id, data, hora, estado) {
      agendamentoEditando = id;
      document.getElementById('editData').value = data;
      document.getElementById('editEstado').value = estado;
      carregarHorariosDisponiveisEdit().then(() => {
        document.getElementById('editHora').value = hora;
      });
      document.getElementById('modalEditar').style.display = 'flex';
    }

    async function salvarEdicao() {
      const data = document.getElementById('editData').value;
      const hora = document.getElementById('editHora').value;
      const estado = document.getElementById('editEstado').value;

      try {
        showLoading('A guardar...');
        const res = await fetch('http://localhost:3000/api/agendamentos/' + agendamentoEditando, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, hora, estado })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Agendamento atualizado!');
          fecharModal();
          carregarAgendamentos();
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
      agendamentoEditando = null;
    }

    async function confirmarAgendamento(id) {
      try {
        showLoading('A confirmar...');
        const res = await fetch('http://localhost:3000/api/agendamentos/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'confirmado' })
        });
        hideLoading();

        if (res.ok) {
          await customAlert('Agendamento confirmado!');
          carregarAgendamentos();
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao confirmar');
      }
    }

    function abrirModalCancelar(id) {
      agendamentoCancelando = id;
      document.getElementById('razaoCancelamento').value = '';
      document.getElementById('modalCancelar').style.display = 'flex';
    }

    function fecharModalCancelar() {
      document.getElementById('modalCancelar').style.display = 'none';
      agendamentoCancelando = null;
    }

    async function confirmarCancelamento() {
      const razao = document.getElementById('razaoCancelamento').value.trim();
      if (!razao) {
        await customAlert('Introduza a razao do cancelamento');
        return;
      }

      try {
        showLoading('A cancelar...');
        const admin = await (await fetch('http://localhost:3000/api/admin/perfil?username=admin')).json();
        
        const res = await fetch('http://localhost:3000/api/agendamentos/' + agendamentoCancelando, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ razao, canceladoPor: admin.nome })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert('Agendamento cancelado!');
          fecharModalCancelar();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert('Erro ao cancelar');
      }
    }

    function mostrarAlerta(msg, tipo) {
      const el = document.getElementById('alert');
      el.className = tipo === 'error' ? 'alert alert-error' : 'alert alert-success';
      el.textContent = msg;
      setTimeout(() => el.className = 'alert-hidden', 5000);
    }

    carregarPacientes();
    carregarAgendamentos();
    carregarHorariosDisponiveis();