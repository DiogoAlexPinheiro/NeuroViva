let detalhesAtuaisPDF = null;

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
  window.location.href = '../index.html';
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

    let agendamentos = [];
    let agendamentoEditando = null;
    let agendamentoCancelando = null;

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('novaData').min = hoje;
    document.getElementById('novaData').value = hoje;

    // NOVO: Carregar horário de atendimento
    async function carregarHorarioAtendimento() {
      try {
        const res = await fetch('http://localhost:3000/api/horario-atendimento');
        const data = await res.json();
        
        document.getElementById('nomePsicologo').textContent = data.nomePsicologo || 'Psicóloga';
        
        const diasSemana = {
          segunda: 'Segunda-feira',
          terca: 'Terça-feira',
          quarta: 'Quarta-feira',
          quinta: 'Quinta-feira',
          sexta: 'Sexta-feira',
          sabado: 'Sábado',
          domingo: 'Domingo'
        };
        
        let horarioHtml = '<div class="horario-grid-client">';
        for (const [dia, horario] of Object.entries(data.horario)) {
          const disponivel = horario && horario.length > 0;
          horarioHtml += `
            <div class="horario-item-client ${disponivel ? '' : 'fechado'}">
              <strong>${diasSemana[dia]}</strong>
              <span>${disponivel ? `${horario[0]} - ${horario[1]}` : 'Fechado'}</span>
            </div>
          `;
        }
        horarioHtml += '</div>';
        document.getElementById('horarioInfo').innerHTML = horarioHtml;
        
        // Dias livres próximos
        if (data.diasLivres && data.diasLivres.length > 0) {
          const hojeDate = new Date();
          const diasLivresFuturos = data.diasLivres.filter(d => new Date(d) >= hojeDate).slice(0, 5);
          
          if (diasLivresFuturos.length > 0) {
            document.getElementById('diasLivresInfo').innerHTML = `
              <div class="alert" style="background: #fff3e0; border-left-color: #ff9800; color: #e65100;">
                <strong data-i18n="dias_indisponiveis">⚠️ Dias indisponíveis:</strong> ${diasLivresFuturos.join(', ')}
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar horário:', error);
      }
    }

    document.getElementById('novaData').addEventListener('change', async (e) => {
      await carregarHorariosDisponiveis(e.target.value, 'novaHora');
    });

    document.getElementById('editData').addEventListener('change', async (e) => {
      await carregarHorariosDisponiveis(e.target.value, 'editHora');
    });

    async function carregarHorariosDisponiveis(data, selectId) {
      try {
        const res = await fetch(`http://localhost:3000/api/agendamentos/disponiveis?data=${data}`);
        const horarios = await res.json();

        const select = document.getElementById(selectId);
        select.innerHTML = horarios.length > 0 
          ? horarios.map(h => `<option value="${h}">${h}</option>`).join('')
          : '<option value="" data-i18n="sem_horarios">Sem horários disponíveis</option>';
      } catch (error) {
        console.error(error);
      }
    }

    async function criarAgendamento() {
      const data = document.getElementById('novaData').value;
      const hora = document.getElementById('novaHora').value;

      if (!data || !hora) {
        await customAlert(i18next.t('selecione_data'));
        return;
      }

      try {
        showLoading(i18next.t('a_criar_agendamento'));
        
        const res = await fetch('http://localhost:3000/api/agendamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paciente: user.nome, data, hora, criadoPor: 'cliente' })
        });

        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert(i18next.t('agendamento_criado_aguarde'));
          carregarAgendamentos();
          document.getElementById('novaData').value = hoje;
          carregarHorariosDisponiveis(hoje, 'novaHora');
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
    const res = await fetch(`http://localhost:3000/api/agendamentos/cliente/${encodeURIComponent(user.nome)}`);
    agendamentos = await res.json();

    const container = document.getElementById('listaAgendamentos');

    if (agendamentos.length === 0) {
      container.innerHTML = '<p data-i18n="sem_agendamentos">Sem agendamentos</p>';
      return;
    }

    container.innerHTML = '<div class="items-lista">' + agendamentos.map((a, index) => `
      <div class="item-card estado-${a.estado}">
        <div class="item-info">
          <div class="titulo">${i18next.t('consulta')} - ${a.data} </div>
          <div class="detalhes">
            <span data-i18n="hora_"><strong>Hora:</strong> ${a.hora}</span>
            <span><strong>Psicologa:</strong> ${a.psicologo || 'N/A'}</span>
          </div>
          <div class="item-badges-row">
            ${a.codigoRelatorio ? 
              `<span class="codigo-badge" onclick="verDetalhesRelatorio('${a.codigoRelatorio}')" title="Ver relatorio">
                ${a.codigoRelatorio}
              </span>` : 
              `<span class="codigo-badge empty" data-i18n="sem_relatorios">Sem Relatorio</span>`}
            ${a.codigoPagamento ? 
              `<span class="codigo-badge" onclick="verDetalhesPagamento('${a.codigoPagamento}')" title="Ver pagamento">
                ${a.codigoPagamento}
              </span>` : 
              `<span class="codigo-badge empty" data-i18n="sem_pagamentos">Sem Pagamento</span>`}
            <span class="badge ${
              a.estado === 'confirmado' ? 'badge-success' : 
              a.estado === 'pendente' ? 'badge-warning' :
              a.estado === 'completo' ? 'badge-success' :
              'badge-danger'
            }">
              ${i18next.t(`estado_${a.estado}`)}
            </span>
          </div>
        </div>
        
        ${a.estado !== 'cancelado' && a.estado !== 'completo' ? `
        <div class="item-acoes">
          <button class="btn-small btn-solid" onclick="editarAgendamento(${index})" data-i18n="editar">Editar</button>
          <button class="btn-small btn-danger" onclick="abrirModalCancelar(${index})" data-i18n="cancelar">Cancelar</button>
        </div>
        ` : ''}
      </div>
    `).join('') + '</div>';
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    document.getElementById('listaAgendamentos').innerHTML = '<p data-i18n="erro_carregar">Erro ao carregar</p>';
  }
}

async function verDetalhesRelatorio(codigo) {
  try {
    showLoading(i18next.t('a_carregar'));
    const res = await fetch(`http://localhost:3000/api/relatorios/codigo/${codigo}`);
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
    document.getElementById('detalhesConteudo').innerHTML = `
      <div class="modal-detalhes-grid">
        <div class="detalhe-item"><label data-i18n="codigo">Codigo</label><span>${rel.codigo}</span></div>
        <div class="detalhe-item"><label data-i18n="data">Data</label><span>${rel.data}</span></div>
        <div class="detalhe-item"><label data-i18n="tipo">Tipo</label><span>${rel.tipo || data.tipo}</span></div>
        <div class="detalhe-item"><label data-i18n="psicologa">Psicóloga</label><span>${rel.psicologo || 'N/A'}</span></div>
        ${rel.titulo ? `<div class="detalhe-item full"><label data-i18n="titulo">Título</label><span>${rel.titulo}</span></div>` : ''}
        ${rel.entidade ? `<div class="detalhe-item full"><label data-i18n="entidade">Entidade</label><span>${rel.entidade}</span></div>` : ''}
        <div class="detalhe-item full"><label data-i18n="conteudo">Conteúdo</label><p style="white-space: pre-wrap; margin-top: 0.5rem;">${rel.conteudo || ''}</p></div>
        ${rel.notas ? `<div class="detalhe-item full"><label data-i18n="notas">Notas</label><p style="white-space: pre-wrap; margin-top: 0.5rem;">${rel.notas}</p></div>` : ''}
        ${rel.anexos && rel.anexos.length > 0 ? `
          <div class="detalhe-item full">
            <label data-i18n="anexos">Anexos</label>
            ${rel.anexos.map(a => `<p><a href="${a.caminho}" target="_blank" class="btn-small btn-outline">${a.nome}</a></p>`).join('')}
          </div>
        ` : ''}
      </div>
      ${rel.assinatura ? `
        <div style="text-align: right; margin-top: 1rem; padding-top: 1rem; border-top: 2px dashed var(--color-border);">
          <strong>${rel.assinatura.nome}</strong><br>
          <small style="color: var(--color-text-light);">${rel.assinatura.titulo || ''}</small>
        </div>
      ` : ''}
    `;
    document.getElementById('modalDetalhes').style.display = 'flex';
  } catch (error) {
    hideLoading();
    await customAlert(i18next.t('erro_carregar_relatorio'));
  }
}

async function verDetalhesPagamento(codigo) {
  try {
    showLoading('A carregar...');
    const res = await fetch(`http://localhost:3000/api/pagamentos/codigo/${codigo}`);
    const pag = await res.json();
    detalhesAtuaisPDF = {
      tipo: 'pagamento',
      dados: pag
    };
    hideLoading();

    if (!res.ok) {
      await customAlert(i18next.t('pagamento_nao_encontrado'));
      return;
    }

    document.getElementById('detalhesConteudo').innerHTML = `
      <div class="modal-detalhes-grid">
        <div class="detalhe-item"><label data-i18n="codigo">Codigo</label><span>${pag.codigo}</span></div>
        <div class="detalhe-item"><label data-i18n="data">Data</label><span>${pag.data}</span></div>
        <div class="detalhe-item"><label data-i18n="valor">Valor</label><span style="font-size: 1.3rem; color: var(--color-primary);">EUR ${pag.valor.toFixed(2)}</span></div>
        <div class="detalhe-item"><label data-i18n="estado">Estado</label><span class="badge ${pag.estado === 'pago' ? 'badge-success' : pag.estado === 'pendente' ? 'badge-warning' : 'badge-danger'}">${pag.estado}</span></div>
        <div class="detalhe-item"><label data-i18n="metodo">Método</label><span>${pag.metodo}</span></div>
        ${pag.descricao ? `<div class="detalhe-item full"><label data-i18n="descricao">Descrição</label><span>${pag.descricao}</span></div>` : ''}
        ${pag.comprovativo ? `<div class="detalhe-item full"><label data-i18n="comprovativo">Comprovativo</label><a href="${pag.comprovativo.caminho}" target="_blank" class="btn-small btn-solid">Ver Documento</a></div>` : ''}
      </div>
    `;
    document.getElementById('modalDetalhes').style.display = 'flex';
  } catch (error) {
    hideLoading();
    await customAlert(i18next.t('erro_carregar_pagamento'));
  }
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

function editarAgendamento(index) {
    const agendamento = agendamentos[index];
    agendamentoEditando = agendamento._id;
      
    document.getElementById('editData').value = agendamento.data;
    document.getElementById('editData').min = hoje;
      
    carregarHorariosDisponiveis(agendamento.data, 'editHora').then(() => {
        document.getElementById('editHora').value = agendamento.hora;
    });
      
    document.getElementById('modalEditar').style.display = 'flex';
}

async function salvarEdicao() {
    const data = document.getElementById('editData').value;
    const hora = document.getElementById('editHora').value;

    try {
        showLoading(i18next.t('a_guardar_alteracoes'));
        
        const res = await fetch(`http://localhost:3000/api/agendamentos/${agendamentoEditando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, hora })
        });

        const result = await res.json();
        hideLoading();

        if (res.ok) {
          await customAlert(i18next.t('agendamento_atualizado'));
          fecharModal();
          carregarAgendamentos();
        } else {
          await customAlert(result.error);
        }
    } catch (error) {
        hideLoading();
        await customAlert(i18next.t('erro_atualizar'));
    }
}

    function fecharModal() {
      document.getElementById('modalEditar').style.display = 'none';
      agendamentoEditando = null;
    }

    function abrirModalCancelar(index) {
      const agendamento = agendamentos[index];
      agendamentoCancelando = agendamento._id;
      document.getElementById('razaoCancelamento').value = '';
      document.getElementById('modalCancelar').style.display = 'flex';
    }

async function confirmarCancelamento() {
    const razao = document.getElementById('razaoCancelamento').value.trim();

    if (!razao) {
        await customAlert(i18next.t('por_favor_indique'));
        return;
    }

    try {
        showLoading('A cancelar agendamento...');
            
        const res = await fetch(`http://localhost:3000/api/agendamentos/${agendamentoCancelando}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ razao, canceladoPor: user.nome })
        });

        const result = await res.json();
        hideLoading();

        if (res.ok) {
            await customAlert(i18next.t('agendamento_cancelado'));
            fecharModalCancelar();
            carregarAgendamentos();
        } else {
            await customAlert(result.error);
        }

    } catch (error) {
        hideLoading();
        await customAlert(i18next.t('erro_cancelar'));
    }
}

function fecharModalCancelar() {
    document.getElementById('modalCancelar').style.display = 'none';
    agendamentoCancelando = null;
}

// Inicializar
carregarHorarioAtendimento();
carregarAgendamentos();
carregarHorariosDisponiveis(hoje, 'novaHora');

async function gerarPDFDetalhes() {
  if (!detalhesAtuaisPDF) {
    await customAlert(i18next.t('no_data_pdf'));
    return;
  }

  try {
    showLoading(i18next.t('gerar_pdf'));

    const res = await fetch('http://localhost:3000/api/pdf/detalhes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detalhesAtuaisPDF)
    });

    if (!res.ok) {
      hideLoading();
      await customAlert(i18next.t('erro_gerar_pdf'));
      return;
    }

    const blob = await res.blob();
    hideLoading();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let nomeFicheiro = 'documento.pdf';

    if (detalhesAtuaisPDF.tipo === 'pagamento') {
      nomeFicheiro = `Pagamento_${detalhesAtuaisPDF.dados.codigo}.pdf`;
    }

    if (detalhesAtuaisPDF.tipo === 'relatorio') {
      nomeFicheiro = `Relatorio_${detalhesAtuaisPDF.dados.codigo}.pdf`;
    }

    a.download = nomeFicheiro;
    a.click();

    URL.revokeObjectURL(url);

  } catch (e) {
    hideLoading();
    await customAlert(i18next.t('erro_gerar_pdf'));
  }
}