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

const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'admin') {
      window.location.href = '../../login.html';
    }

    async function carregarEstatisticas() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/estatisticas');
        const stats = await res.json();
        
        document.getElementById('totalPacientes').textContent = stats.totalPacientes;
        document.getElementById('sessoesCompletas').textContent = stats.sessoesCompletas;
        
        // Carregar totais financeiros
        await carregarTotaisFinanceiros();
        
        // Horario
        const horarioContainer = document.getElementById('horarioInfo');
        const diasSemana = {
          segunda: 'dia_segunda',
          terca: 'dia_terca',
          quarta: 'dia_quarta',
          quinta: 'dia_quinta',
          sexta: 'dia_sexta',
          sabado: 'dia_sabado',
          domingo: 'dia_domingo'
        };

        
        let horarioHtml = '<div class="horario-grid">';

        for (const [dia, horario] of Object.entries(stats.horario)) {
          horarioHtml += `
            <div class="horario-item">
              <strong>${i18next.t(diasSemana[dia])}:</strong>
              ${horario.length > 0
                ? `${horario[0]} - ${horario[1]}`
                : i18next.t('fechado')}
            </div>
          `;
        }

        horarioHtml += '</div>';
        horarioContainer.innerHTML = horarioHtml;
        
        // Proximos agendamentos
        const proximosContainer = document.getElementById('proximosAgendamentos');
        if (stats.proximosAgendamentos.length === 0) {
          proximosContainer.innerHTML = `<p>${i18next.t('sem_agendamentos_proximos')}</p>`;
        } else {
          proximosContainer.innerHTML = `
            <table>
              <thead>
                <tr>
                  <th>${i18next.t('paciente')}</th>
                  <th>${i18next.t('data')}</th>
                  <th>${i18next.t('hora')}</th>
                  <th>${i18next.t('estado')}</th>
                </tr>
              </thead>
              <tbody>
                ${stats.proximosAgendamentos.map(a => `
                  <tr>
                    <td>${a.paciente}</td>
                    <td>${a.data}</td>
                    <td>${a.hora}</td>
                    <td><span class="badge ${a.estado === 'confirmado' ? 'badge-success' : 'badge-warning'}">${i18next.t(`estado_${a.estado}`)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
        
        // Agendamentos a atualizar
        const atualizarContainer = document.getElementById('agendamentosAtualizar');
        if (stats.agendamentosParaAtualizar.length === 0) {
          atualizarContainer.innerHTML = `<p class="text-success">${i18next.t('agendamentos_ok')}</p>`;
        } else {
          atualizarContainer.innerHTML = `
            <table>
              <thead>
                <tr>
                  <th>${i18next.t('paciente')}</th>
                  <th>${i18next.t('data')}</th>
                  <th>${i18next.t('hora')}</th>
                  <th>${i18next.t('estado_atual')}</th>
                  <th>${i18next.t('acao')}</th>
                </tr>
              </thead>
              <tbody>
                ${stats.agendamentosParaAtualizar.map(a => `
                  <tr>
                    <td>${a.paciente}</td>
                    <td>${a.data}</td>
                    <td>${a.hora}</td>
                    <td><span class="badge badge-warning">${i18next.t(`estado_${a.estado}`)}</span></td>
                    <td><a href="../admin/agendamentos.html" class="btn-small btn-solid">${i18next.t('atualizar')}</a></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
        
        // Contadores simples
        document.getElementById('totalMensagens').textContent = '0';
        document.getElementById('totalPagamentos').textContent = '0';
        
      } catch (error) {
        console.error('Erro ao carregar estatisticas:', error);
      }
    }

    async function carregarTotaisFinanceiros() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pagamentos');
        const pagamentos = await res.json();
        
        const totalPago = pagamentos.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor, 0);
        const totalPendente = pagamentos.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor, 0);
        
        document.getElementById('totalPago').textContent = 'EUR ' + totalPago.toFixed(2);
        document.getElementById('totalPendente').textContent = 'EUR ' + totalPendente.toFixed(2);
        document.getElementById('totalGeral').textContent = 'EUR ' + (totalPago + totalPendente).toFixed(2);
      } catch (error) {
        console.error('Erro ao carregar totais financeiros:', error);
      }
    }

    carregarEstatisticas();