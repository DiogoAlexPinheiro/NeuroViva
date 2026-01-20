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
  window.location.href = '../../index.html';
}

const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'client') {
      window.location.href = '../../login.html';
    }

    async function carregarPagamentos() {
      try {
        const res = await fetch(`http://localhost:3000/api/client/financeiro/${user.nome}`);
        const pagamentos = await res.json();

        const container = document.getElementById('listaPagamentos');

        if (pagamentos.length === 0) {
          container.innerHTML = '<p>Sem pagamentos registados</p>';
          return;
        }

        container.innerHTML = `
  <table>
    <thead>
      <tr>
        <th>Codigo</th>
        <th>Data</th>
        <th>Valor</th>
        <th>Estado</th>
        <th>Metodo</th>
        <th>Comprovativo</th>
      </tr>
    </thead>
    <tbody>
      ${pagamentos.map(p => `
        <tr>
          <td><code style="font-size: 0.85rem;">${p.codigo}</code></td>
          <td>${p.data}</td>
          <td>EUR ${p.valor.toFixed(2)}</td>
          <td><span class="badge ${
            p.estado === 'pago' ? 'badge-success' : 
            p.estado === 'pendente' ? 'badge-warning' : 
            'badge-danger'
          }">${p.estado}</span></td>
          <td>${p.metodo}</td>
          <td>
            ${p.comprovativo ? 
              `<a href="${p.comprovativo.caminho}" target="_blank" class="btn-small btn-solid">
                Ver Documento
              </a>` 
              : '-'
            }
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

        // Calcular resumo
        const totalPago = pagamentos.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor, 0);
        const totalPendente = pagamentos.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor, 0);
        const totalGeral = totalPago + totalPendente;

        document.getElementById('totalPago').textContent = `EUR ${totalPago.toFixed(2)}`;
        document.getElementById('totalPendente').textContent = `EUR ${totalPendente.toFixed(2)}`;
        document.getElementById('totalGeral').textContent = `EUR ${totalGeral.toFixed(2)}`;
      } catch (error) {
        console.error(error);
        document.getElementById('listaPagamentos').innerHTML = '<p>Erro ao carregar pagamentos</p>';
      }
    }

    carregarPagamentos();