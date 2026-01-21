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
    if (window.i18nReady) {
      i18nReady.then(() => traduzirPagina(document.body));
    }
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

let detalhesAtuaisPDF = null;

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
        const t = i18next.t.bind(i18next);
        document.getElementById('pacienteSelect').innerHTML =
          `<option value="">${t('selecionar_paciente')}</option>` + options;
        document.getElementById('filtroPaciente').innerHTML =
          `<option value="">${t('todos_pacientes')}</option>` + options;
      } catch (error) { console.error(error); }
    }

    async function carregarHorariosDisponiveis() {
      const data = document.getElementById('dataAgendamento').value;
      const select = document.getElementById('horaSelect');
      
      if (!data) {
        select.innerHTML = `<option value="">${i18next.t('selecionar_data')}</option>`;
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/api/agendamentos/disponiveis?data=' + data);
        const horarios = await res.json();
        
        if (horarios.length === 0) {
          select.innerHTML = `<option value="">${i18next.t('sem_horarios')}</option>`;
        } else {
          select.innerHTML = `<option value="">${i18next.t('selecionar_horario')}</option>` +
        horarios.map(h => `<option value="${h}">${h}</option>`).join('');

        }
      } catch (error) {
        select.innerHTML = `<option value="">${i18next.t('erro_carregar')}</option>`;
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
        await customAlert(i18next.t('preencher_campos'));
        return;
      }

      try {
        showLoading(i18next.t('a_criar_agendamento'));
        const res = await fetch('http://localhost:3000/api/agendamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paciente, data, hora, criadoPor: 'admin' })
        });
        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert(i18next.t('agendamento_criado'));
          document.getElementById('pacienteSelect').value = '';
          carregarHorariosDisponiveis();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        await customAlert(i18next.t('erro_criar_agendamento'));
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
    container.innerHTML = `
      <p style="text-align: center; color: var(--color-text-light);">
        ${t('sem_agendamentos')}
      </p>
    `;
    return;
  }

  const t = i18next.t.bind(i18next);
  container.innerHTML = agendamentos.map(a => `
    <div class="item-card item-card-wide estado-${a.estado}">
      <div class="item-info">
        <div class="titulo">${a.paciente}</div>

        <div class="detalhes">
          <span><strong>${t('data')}:</strong> ${a.data}</span>
          <span><strong>${t('hora')}:</strong> ${a.hora}</span>
          <span><strong>${t('criado_por')}:</strong> ${a.criadoPor}</span>
        </div>

        <div class="item-badges-row">

          ${a.codigoRelatorio
            ? `
              <span class="codigo-badge clickable"
                onclick="verDetalhesRelatorio('${a.codigoRelatorio}')"
                title="${t('ver_relatorio')}">
                ${a.codigoRelatorio}
              </span>
            `
            : `
              <span class="codigo-badge empty"
                onclick="abrirModalLigar('${a._id}', 'relatorio')"
                title="${t('ligar_relatorio')}">
                + ${t('relatorio')}
              </span>
            `
          }

          ${a.codigoPagamento
            ? `
              <span class="codigo-badge clickable"
                onclick="verDetalhesPagamento('${a.codigoPagamento}')"
                title="${t('ver_pagamento')}">
                ${a.codigoPagamento}
              </span>
            `
            : `
              <span class="codigo-badge empty"
                onclick="abrirModalLigar('${a._id}', 'pagamento')"
                title="${t('ligar_pagamento')}">
                + ${t('pagamento')}
              </span>
            `
          }

          <span class="badge ${
            a.estado === 'completo'
              ? 'badge-success'
              : a.estado === 'confirmado'
              ? 'badge-info'
              : a.estado === 'pendente'
              ? 'badge-warning'
              : 'badge-danger'
          }">
            ${t(a.estado)}
          </span>

        </div>
      </div>

      ${a.estado !== 'cancelado' ? `
        <div class="item-acoes">

          <div class="acoes-esquerda">
            <button class="btn-small btn-secondary"
              onclick="abrirModalLigar('${a._id}', 'relatorio')">
              + ${t('relatorio')}
            </button>
            <button class="btn-small btn-secondary"
              onclick="abrirModalLigar('${a._id}', 'pagamento')">
              + ${t('pagamento')}
            </button>
          </div>

          <div class="acoes-centro">
            ${a.estado === 'pendente'
              ? `
                <button class="btn-small btn-outline"
                  onclick="confirmarAgendamento('${a._id}')">
                  ${t('confirmar')}
                </button>
              `
              : '<span></span>'
            }
          </div>

          <div class="acoes-direita">
            <button class="btn-small"
              onclick="editarAgendamento('${a._id}', '${a.data}', '${a.hora}', '${a.estado}')">
              ${t('editar')}
            </button>
            <button class="btn-small btn-danger"
              onclick="abrirModalCancelar('${a._id}')">
              ${t('cancelar')}
            </button>
          </div>

        </div>
      ` : ''}
    </div>
  `).join('');

  if (window.i18nReady) {
    i18nReady.then(() => traduzirPagina(container));
  }
}

    async function verDetalhesRelatorio(codigo) {
      try {
        showLoading('A carregar...');
        const res = await fetch('http://localhost:3000/api/relatorios/codigo/' + codigo);
        const data = await res.json();
        hideLoading();

        if (!res.ok) {
          await customAlert(i18next.t('relatorio_nao_encontrado'));
          return;
        }

        const rel = data.relatorio;
        detalhesAtuaisPDF = {
          tipo: 'relatorio',
          dados: rel
        };

        document.getElementById('modalDetalhesTitulo').textContent = 'Detalhes do Relatorio';
        const t = i18next.t.bind(i18next);
        document.getElementById('detalhesConteudo').innerHTML = `
          <div class="modal-detalhes-grid">
            <div class="detalhe-item"><label>${t('codigo')}</label><span>${rel.codigo}</span></div>
            <div class="detalhe-item"><label>${t('tipo')}</label><span>${rel.tipo || data.tipo}</span></div>
            <div class="detalhe-item"><label>${t('paciente')}</label><span>${rel.paciente}</span></div>
            <div class="detalhe-item"><label>${t('data')}</label><span>${rel.data}</span></div>

            ${rel.psicologo ? `
              <div class="detalhe-item"><label>${t('psicologo')}</label><span>${rel.psicologo}</span></div>
            ` : ''}

            ${rel.entidade ? `
              <div class="detalhe-item"><label>${t('entidade')}</label><span>${rel.entidade}</span></div>
            ` : ''}

            <div class="detalhe-item full">
              <label>${t('conteudo')}</label>
              <p style="white-space: pre-wrap; margin-top: 0.5rem;">
                ${rel.conteudo || ''}
              </p>
            </div>

            ${rel.notas ? `
              <div class="detalhe-item full">
                <label>${t('notas')}</label>
                <p style="white-space: pre-wrap; margin-top: 0.5rem;">
                  ${rel.notas}
                </p>
              </div>
            ` : ''}
          </div>
        `;
        document.getElementById('modalDetalhes').style.display = 'flex';
      } catch (error) {
        hideLoading();
        customAlert(i18next.t('erro_carregar_relatorio'));
      }
    }

    async function verDetalhesPagamento(codigo) {
      try {
        showLoading('A carregar...');
        const res = await fetch('http://localhost:3000/api/pagamentos/codigo/' + codigo);
        const pag = await res.json();
        detalhesAtuaisPDF = {
          tipo: 'pagamento',
          dados: pag
        };

        hideLoading();

        if (!res.ok) {
          customAlert(i18next.t('pagamento_nao_encontrado'))
          return;
        }

        const titulo = document.getElementById('modalDetalhesTitulo');
        titulo.setAttribute('data-i18n', 'detalhes_pagamento');
        traduzirPagina(titulo);
        const t = i18next.t.bind(i18next);
        document.getElementById('detalhesConteudo').innerHTML = `
          <div class="modal-detalhes-grid">
            <div class="detalhe-item"><label>${t('codigo')}</label><span>${pag.codigo}</span></div>
            <div class="detalhe-item"><label>${t('paciente')}</label><span>${pag.paciente}</span></div>
            <div class="detalhe-item"><label>${t('valor')}</label><span>EUR ${pag.valor.toFixed(2)}</span></div>
            <div class="detalhe-item">
              <label>${t('estado')}</label>
              <span class="badge ${
                pag.estado === 'pago'
                  ? 'badge-success'
                  : pag.estado === 'pendente'
                  ? 'badge-warning'
                  : 'badge-danger'
              }">
                ${t(pag.estado)}
              </span>
            </div>
            <div class="detalhe-item"><label>${t('metodo')}</label><span>${pag.metodo}</span></div>
            <div class="detalhe-item"><label>${t('data')}</label><span>${pag.data}</span></div>

            ${pag.descricao ? `
              <div class="detalhe-item full">
                <label>${t('descricao')}</label>
                <span>${pag.descricao}</span>
              </div>
            ` : ''}
          </div>
        `;
        document.getElementById('modalDetalhes').style.display = 'flex';
      } catch (error) {
        hideLoading();
        await customAlert(i18next.t('erro_criar_agendamento'));
      }
    }

    function fecharModalDetalhes() {
      document.getElementById('modalDetalhes').style.display = 'none';
    }

    function abrirModalLigar(id, tipo) {
      agendamentoLigando = id;
      tipoLigacao = tipo;
      const t = i18next.t.bind(i18next);

      agendamentoLigando = id;
      tipoLigacao = tipo;

      document.getElementById('modalLigarTitulo').textContent =
        tipo === 'relatorio'
          ? t('ligar_relatorio')
          : t('ligar_pagamento');

      document.getElementById('modalLigarLabel').textContent =
        tipo === 'relatorio'
          ? t('codigo_relatorio')
          : t('codigo_pagamento');

      document.getElementById('codigoLigar').value = '';
      document.getElementById('codigoLigar').placeholder =
        tipo === 'relatorio'
          ? t('placeholder_relatorio')
          : t('placeholder_pagamento');

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
        customAlert(i18next.t('introduce_code'))
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
          customAlert(i18next.t('ligado_sucesso'))
          fecharModalLigar();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        customAlert(i18next.t('erro_ligar'))
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
          customAlert(i18next.t('agendamento_atualizado'))
          fecharModal();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
      } catch (error) {
        hideLoading();
        customAlert(i18next.t('erro_atualizar'))
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
        customAlert(i18next.t('erro_confirmar'))
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
        customAlert(i18next.t('erro_cancelar'))
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

async function gerarPDFDetalhes() {
  if (!detalhesAtuaisPDF) {
    customAlert(i18next.t('no_data_pdf'))
    return;
  }

  try {
    showLoading('A gerar PDF...');

    const res = await fetch('http://localhost:3000/api/pdf/detalhes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detalhesAtuaisPDF)
    });

    if (!res.ok) {
      hideLoading();
      customAlert(i18next.t('erro_pdf'))
      return;
    }

    const blob = await res.blob();
    hideLoading();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    let nomeFicheiro = 'documento.pdf';

    if (detalhesAtuaisPDF.tipo === 'pagamento') {
      nomeFicheiro = `Pagamento_${detalhesAtuaisPDF.dados.codigo}.pdf`;
    }

    if (detalhesAtuaisPDF.tipo === 'relatorio') {
      nomeFicheiro = `Relatorio_${detalhesAtuaisPDF.dados.codigo}.pdf`;
    }

    a.href = url;
    a.download = nomeFicheiro;
    a.click();

    URL.revokeObjectURL(url);

  } catch (e) {
    hideLoading();
    customAlert(i18next.t('erro_pdf'))
  }
}
