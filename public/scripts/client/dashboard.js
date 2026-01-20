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
      if (userNameEl) userNameEl.textContent = `Olá, ${user.nome}`;
    }
    
    carregarNotificacoes();
    setInterval(carregarNotificacoes, 30000);
  }, 100);
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../../index.html';
}

const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'client') {
      window.location.href = '../../login.html';
    }

async function carregarEstatisticas() {
    try {
        // Carregar agendamentos
        const resAgendamentos = await fetch(`http://localhost:3000/api/agendamentos/cliente/${encodeURIComponent(user.nome)}`);
        const agendamentos = await resAgendamentos.json();
            
        // Carregar pagamentos
        const resPagamentos = await fetch(`http://localhost:3000/api/client/financeiro/${encodeURIComponent(user.nome)}`);
        const pagamentos = await resPagamentos.json();
            
        // Atualizar contadores
        document.getElementById('totalAgendamentos').textContent = agendamentos.length;
        document.getElementById('sessoesCompletas').textContent = agendamentos.filter(a => a.estado === 'completo').length;
            
        // Próxima sessão
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const proximas = agendamentos
        .filter(a => {
            const dataAgendamento = new Date(a.data + 'T00:00:00');
            return dataAgendamento >= hoje && (a.estado === 'confirmado' || a.estado === 'pendente');
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data));
            
        if (proximas.length > 0) {
            document.getElementById('proximaSessao').textContent = proximas[0].data;
        }
            
        // Totais financeiros
        const totalPago = pagamentos.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor, 0);
        const totalPendente = pagamentos.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor, 0);
            
        document.getElementById('totalPago').textContent = `EUR ${totalPago.toFixed(2)}`;
        document.getElementById('totalPendente').textContent = `EUR ${totalPendente.toFixed(2)}`;
    } catch (error) {
         console.error('Erro ao carregar estatísticas:', error);
    }
}

async function carregarProximosAgendamentos() {
    try {
        const res = await fetch(`http://localhost:3000/api/agendamentos/cliente/${encodeURIComponent(user.nome)}`);
        const agendamentos = await res.json();
        const container = document.getElementById('proximosAgendamentos');
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const umaSemana = new Date();
        umaSemana.setDate(umaSemana.getDate() + 7);
        
        const proximos = agendamentos
        .filter(a => {
            const dataAgendamento = new Date(a.data + 'T00:00:00');
            return dataAgendamento >= hoje && dataAgendamento <= umaSemana && (a.estado === 'confirmado' || a.estado === 'pendente');
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data));
        
        if (proximos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">Sem agendamentos próximos</p>';
            return;
        }

        container.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${proximos.map(a => {
                const diasRestantes = Math.ceil((new Date(a.data) - hoje) / (1000 * 60 * 60 * 24));
                const urgente = diasRestantes <= 1;
                return `
                  <tr ${urgente ? 'style="background: rgba(255, 152, 0, 0.1);"' : ''}>
                    <td>${a.data}${urgente ? ' <strong style="color: #FF9800;">(Amanhã)</strong>' : ''}</td>
                    <td>${a.hora}</td>
                    <td><span class="badge ${a.estado === 'confirmado' ? 'badge-success' : 'badge-warning'}">${a.estado}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        document.getElementById('proximosAgendamentos').innerHTML = `
          <p style="text-align: center; color: #f44336;">Erro ao carregar agendamentos</p>
        `;
    }
}

// Carregar dados ao iniciar
carregarEstatisticas();
carregarProximosAgendamentos();