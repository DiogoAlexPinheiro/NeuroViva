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

const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.role !== 'admin') {
      window.location.href = '/login.html';
    }

    let clientes = [];
    let clienteAtual = null;
    let modoGeral = false;
    let mensagensCache = {};
    let mensagensPreview = {};
    let imagemSelecionada = null;
    let editingMessageId = null;
    let lastRenderedFor = null;

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function setStatus(texto) {
      const el = document.getElementById('chatStatus');
      if (el) el.textContent = texto || '';
    }

    function getUserLabel() {
      return user?.nomeCompleto || user?.nome || user?.email || 'Admin';
    }

    function canEditMessage(msg) {
      if (!msg || !msg._id) return false;

      // Apenas mensagens enviadas pelo admin (não as do cliente)
      if (msg.tipo === 'cliente_para_admin') return false;

      const remetente = String(msg.remetente || '').toLowerCase();
      const me = String(getUserLabel() || '').toLowerCase();

      return remetente && me && remetente === me;
    }


    async function carregarClientes() {
      try {
        const res = await fetch('http://localhost:3000/api/admin/pacientes');
        const pacientes = await res.json();

        clientes = Array.isArray(pacientes) ? pacientes.filter(p => (p.estado || '').toLowerCase() === 'ativo') : [];

        // Carregar prévia de mensagens para cada cliente
        for (const cliente of clientes) {
          await carregarPreviaCliente(cliente.nomeCompleto);
        }

        renderizarListaClientes();
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        const container = document.getElementById('clientesLista');
        if (container) container.innerHTML = '<p class="empty-list-state">Nao foi possivel carregar os clientes</p>';
      }
    }

    async function carregarPreviaCliente(nomeCliente) {
      try {
        const res = await fetch(`http://localhost:3000/api/admin/mensagens/cliente/${encodeURIComponent(nomeCliente)}`);
        const mensagens = await res.json();

        mensagensPreview[nomeCliente] = Array.isArray(mensagens) ? mensagens : [];
      } catch (error) {
        console.error('Erro ao carregar previa:', error);
        mensagensPreview[nomeCliente] = [];
      }
    }

    function renderizarListaClientes(lista = clientes) {
      const container = document.getElementById('clientesLista');

      if (!container) return;

      if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = '<p class="empty-list-state">Sem clientes ativos</p>';
        return;
      }

      container.innerHTML = lista.map(cliente => {
        const msgs = mensagensPreview[cliente.nomeCompleto] || [];
        const ultima = msgs.length > 0 ? msgs[0] : null;

        const previewTexto = ultima
          ? (ultima.texto ? ultima.texto : 'Mensagem')
          : 'Sem mensagens';

        return `
          <div class="cliente-item ${(!modoGeral && clienteAtual?.nomeCompleto === cliente.nomeCompleto) ? 'active' : ''}"
               role="button"
               tabindex="0"
               onclick="selecionarCliente('${escapeHtml(cliente.nomeCompleto)}')"
               onkeydown="if(event.key==='Enter'){selecionarCliente('${escapeHtml(cliente.nomeCompleto)}')}">
            <img src="${escapeHtml(cliente.profileImage || '/assets/images/profiles/default.jpg')}" alt="${escapeHtml(cliente.nomeCompleto)}" loading="lazy" decoding="async" width="46" height="46" onerror="this.src='/assets/profiles/default.jpg'">
            <div class="cliente-info">
              <div class="cliente-nome">${escapeHtml(cliente.nomeCompleto)}</div>
              <div class="cliente-preview">${escapeHtml(previewTexto).slice(0, 80)}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function ativarMensagemGeral() {
      modoGeral = true;
      clienteAtual = null;
      editingMessageId = null;
      renderizarListaClientes();
      renderizarChat();
    }

    async function selecionarCliente(nomeCliente) {
      modoGeral = false;
      editingMessageId = null;
      clienteAtual = clientes.find(c => c.nomeCompleto === nomeCliente);

      if (!clienteAtual) return;

      renderizarListaClientes();

      await carregarMensagensCliente(nomeCliente);

      renderizarChat();
    }

    async function carregarMensagensCliente(nomeCliente) {
      try {
        const res = await fetch(`http://localhost:3000/api/admin/mensagens/cliente/${encodeURIComponent(nomeCliente)}`);
        const mensagens = await res.json();

        const lista = Array.isArray(mensagens) ? mensagens : [];
        mensagensCache[nomeCliente] = lista.reverse(); // mais antigas primeiro

        // Marcar como lidas (apenas no backend, sem badges)
        for (const msg of lista) {
          if (msg.tipo === 'cliente_para_admin' && !msg.lida) {
            await fetch(`http://localhost:3000/api/mensagens/${msg._id}/marcar-lida`, { method: 'PUT' });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
      }
    }

    function scrollChatToBottom() {
      const chatMessages = document.getElementById('chatMessages');
      if (!chatMessages) return;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function renderizarChat() {
      const chatArea = document.getElementById('chatArea');
      if (!chatArea) return;

      if (modoGeral) {
        lastRenderedFor = 'GERAL';

        chatArea.innerHTML = `
          <div class="chat-header">
            <div class="chat-header-left">
              <div class="chat-header-info">
                <h3>Mensagem geral</h3>
                <p>Envia a mesma mensagem para todos os clientes ativos</p>
              </div>
            </div>
            <div class="chat-status" id="chatStatus"></div>
          </div>

          <div class="chat-messages" id="chatMessages">
            <div class="empty-state">
              <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3>Pronto para enviar</h3>
              <p>Destino: ${escapeHtml(clientes.length)} clientes ativos</p>
            </div>
          </div>

          <div class="chat-input-area">
            <div class="chat-input-wrapper">
              <textarea id="messageInput" rows="1" placeholder="Escreva uma mensagem geral" onkeydown="handleEnter(event)"></textarea>

              <div class="chat-actions">
                <input type="file" id="imageInput" class="file-input-hidden" accept="image/*" onchange="previewImage(event)">
                <button class="btn-small btn-outline" type="button" onclick="document.getElementById('imageInput').click()">
                  <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M16.5 6.5l-7.8 7.8a3 3 0 104.2 4.2l8.5-8.5a5 5 0 10-7.1-7.1l-9.2 9.2a7 7 0 009.9 9.9l7.8-7.8"/>
                  </svg>
                  Anexar
                </button>
                <button class="btn-small btn-solid" type="button" onclick="enviarMensagemGeral()">
                  <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                  </svg>
                  Enviar
                </button>
              </div>
            </div>

            <div class="chat-secondary-row">
              <div id="imagePreview" class="image-preview">
                <img id="previewImg" alt="Pre-visualizacao da imagem">
                <button class="btn-small btn-danger" type="button" onclick="removerImagem()">Remover imagem</button>
              </div>
            </div>
          </div>
        `;

        return;
      }

      if (!clienteAtual) {
        lastRenderedFor = null;

        chatArea.innerHTML = `
          <div class="empty-state">
            <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3>Selecione um cliente</h3>
            <p>Escolha uma conversa para enviar mensagens</p>
          </div>
        `;

        return;
      }

      const mensagens = mensagensCache[clienteAtual.nomeCompleto] || [];
      const headerAvatar = escapeHtml(clienteAtual.profileImage || '/assets/profiles/default.jpg');
      const headerNome = escapeHtml(clienteAtual.nomeCompleto);
      const headerEmail = escapeHtml(clienteAtual.email || '');

      lastRenderedFor = clienteAtual.nomeCompleto;

      chatArea.innerHTML = `
        <div class="chat-header">
          <div class="chat-header-left">
            <img src="${headerAvatar}" alt="${headerNome}" width="46" height="46" loading="lazy" decoding="async" onerror="this.src='/assets/profiles/default.jpg'">
            <div class="chat-header-info">
              <h3 title="${headerNome}">${headerNome}</h3>
              <p title="${headerEmail}">${headerEmail}</p>
            </div>
          </div>
          <div class="chat-status" id="chatStatus"></div>
        </div>

        <div class="chat-messages" id="chatMessages">
          ${mensagens.length === 0
            ? '<div class="empty-state"><h3>Sem mensagens</h3><p>Esta conversa ainda nao tem mensagens</p></div>'
            : mensagens.map(m => renderMensagem(m)).join('')
          }
        </div>

        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea id="messageInput" rows="1" placeholder="Escreva uma mensagem" onkeydown="handleEnter(event)"></textarea>

            <div class="chat-actions">
              <input type="file" id="imageInput" class="file-input-hidden" accept="image/*" onchange="previewImage(event)">
              <button class="btn-small btn-outline" type="button" onclick="document.getElementById('imageInput').click()">
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M16.5 6.5l-7.8 7.8a3 3 0 104.2 4.2l8.5-8.5a5 5 0 10-7.1-7.1l-9.2 9.2a7 7 0 009.9 9.9l7.8-7.8"/>
                </svg>
                Anexar
              </button>
              <button class="btn-small btn-solid" type="button" onclick="enviarMensagem()">
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
                Enviar
              </button>
            </div>
          </div>

          <div class="chat-secondary-row">
            <div id="imagePreview" class="image-preview">
              <img id="previewImg" alt="Pre-visualizacao da imagem">
              <button class="btn-small btn-danger" type="button" onclick="removerImagem()">Remover imagem</button>
            </div>
          </div>
        </div>
      `;

      // Só faz scroll para o fundo quando abrimos a conversa ou depois de enviar
      setTimeout(() => scrollChatToBottom(), 50);
    }

    function renderMensagem(m) {
    const fromClient = m.tipo === 'cliente_para_admin';
    const bubbleClass = fromClient ? 'from-client' : 'from-admin';

    const texto = escapeHtml(m.texto || '');
    const remetente = escapeHtml(m.remetente || '');
    const imagem = m.imagem ? escapeHtml(m.imagem) : '';

    const podeAcoes = (!fromClient && canEditMessage(m));
    const footerClass = podeAcoes ? 'message-footer' : 'message-footer no-actions';

    // Modo edição (apenas admin)
    if (editingMessageId && editingMessageId === m._id && !fromClient) {
      const valor = escapeHtml(m.texto || '');
      return `
        <div class="message-bubble ${bubbleClass}" data-id="${escapeHtml(m._id)}">
          <div class="message-header">${escapeHtml(m.remetente || '')}</div>

          <div class="message-edit">
            <textarea id="editTextarea">${valor}</textarea>

            <div class="message-footer">
              <div class="message-time">${formatarData(m.criadoEm)}</div>
              <div class="message-actions-inline">
                <button class="msg-action-btn" type="button" onclick="cancelarEdicao()">Cancelar</button>
                <button class="msg-action-btn" type="button" onclick="guardarEdicao('${escapeHtml(m._id)}')">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const actionsInline = podeAcoes ? `
      <div class="message-actions-inline">
        <button class="msg-action-btn" type="button" onclick="iniciarEdicao('${escapeHtml(m._id)}')">Editar</button>
        <button class="msg-action-btn danger" type="button" onclick="apagarMensagem('${escapeHtml(m._id)}')">Apagar</button>
      </div>
    ` : '';

    return `
      <div class="message-bubble ${bubbleClass}" data-id="${escapeHtml(m._id)}">
        <div class="message-header">${remetente}</div>
        <div class="message-text">${texto}</div>
        ${imagem ? `<img src="${imagem}" class="message-image" alt="Imagem enviada" loading="lazy" decoding="async">` : ''}

        <div class="${footerClass}">
          <div class="message-time">${formatarData(m.criadoEm)}</div>
          ${actionsInline}
        </div>
      </div>
    `;
  }


    function formatarData(value) {
      try {
        return new Date(value).toLocaleString('pt-PT');
      } catch {
        return '';
      }
    }

    function previewImage(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      imagemSelecionada = file;

      const preview = document.getElementById('imagePreview');
      const img = document.getElementById('previewImg');

      if (!preview || !img) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
        preview.classList.add('show');
      };
      reader.readAsDataURL(file);
    }

    function removerImagem() {
      imagemSelecionada = null;

      const fileInput = document.getElementById('imageInput');
      if (fileInput) fileInput.value = '';

      const preview = document.getElementById('imagePreview');
      if (preview) preview.classList.remove('show');
    }

    function handleEnter(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (modoGeral) {
          enviarMensagemGeral();
        } else {
          enviarMensagem();
        }
      }
    }

    async function enviarMensagem() {
      const input = document.getElementById('messageInput');
      const texto = input ? input.value.trim() : '';

      if (!clienteAtual) return;
      if (!texto && !imagemSelecionada) return;

      setStatus('A enviar');

      try {
        const formData = new FormData();
        formData.append('destinatario', clienteAtual.nomeCompleto);
        formData.append('assunto', 'Mensagem');
        formData.append('texto', texto || '(imagem)');

        if (imagemSelecionada) formData.append('imagem', imagemSelecionada);

        const res = await fetch('http://localhost:3000/api/admin/mensagens/responder', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Falha ao enviar mensagem');
        }

        if (input) input.value = '';
        removerImagem();

        await carregarMensagensCliente(clienteAtual.nomeCompleto);
        renderizarChat();

        // Atualiza previews
        await carregarPreviaCliente(clienteAtual.nomeCompleto);
        renderizarListaClientes();

        setStatus('');
      } catch (error) {
        console.error('Erro ao enviar:', error);
        setStatus('Erro ao enviar');
        setTimeout(() => setStatus(''), 3000);
      }
    }

    async function enviarMensagemGeral() {
      const input = document.getElementById('messageInput');
      const texto = input ? input.value.trim() : '';

      if (!texto && !imagemSelecionada) return;
      if (!Array.isArray(clientes) || clientes.length === 0) return;

      setStatus('A enviar para todos');

      try {
        const formData = new FormData();
        formData.append('assunto', 'Mensagem');
        formData.append('texto', texto || '(imagem)');

        if (imagemSelecionada) formData.append('imagem', imagemSelecionada);

        const res = await fetch('http://localhost:3000/api/admin/mensagens/broadcast', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error('Falha ao enviar mensagem geral');
        }

        if (input) input.value = '';
        removerImagem();

        // Atualizar lista/previews
        await carregarClientes();

        setStatus('Enviado');
        setTimeout(() => setStatus(''), 2500);
      } catch (error) {
        console.error('Erro ao enviar mensagem geral:', error);
        setStatus('Erro ao enviar');
        setTimeout(() => setStatus(''), 3000);
      }
    }


    function filtrarClientes() {
      const search = (document.getElementById('searchClientes')?.value || '').toLowerCase().trim();
      if (!search) {
        renderizarListaClientes();
        return;
      }

      const filtrados = clientes.filter(c => (c.nomeCompleto || '').toLowerCase().includes(search));
      renderizarListaClientes(filtrados);
    }

    function iniciarEdicao(id) {
      editingMessageId = id;
      renderizarChat();
      setStatus('Modo edicao');
    }

    function cancelarEdicao() {
      editingMessageId = null;
      renderizarChat();
      setStatus('');
    }

    async function guardarEdicao(id) {
      const textarea = document.getElementById('editTextarea');
      const novoTexto = textarea ? textarea.value.trim() : '';
      if (!novoTexto) return;

      setStatus('A guardar');

      try {
        // Obter assunto atual para não o apagar (o backend atualiza assunto e texto)
        let assuntoAtual = 'Mensagem';
        if (clienteAtual) {
          const lista = mensagensCache[clienteAtual.nomeCompleto] || [];
          const msg = lista.find(m => m._id === id);
          if (msg && msg.assunto) assuntoAtual = msg.assunto;
        }

        const res = await fetch(`http://localhost:3000/api/mensagens/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assunto: assuntoAtual, texto: novoTexto })
        });

        if (!res.ok) throw new Error('Falha ao guardar edicao');

        // Atualiza cache local
        if (clienteAtual) {
          const lista = mensagensCache[clienteAtual.nomeCompleto] || [];
          const idx = lista.findIndex(m => m._id === id);
          if (idx >= 0) {
            lista[idx].texto = novoTexto;
            lista[idx].editadoEm = new Date().toISOString();
          }
          mensagensCache[clienteAtual.nomeCompleto] = lista;
        }

        editingMessageId = null;
        renderizarChat();
        setStatus('');
      } catch (error) {
        console.error('Erro ao guardar edicao:', error);
        setStatus('Erro ao guardar');
        setTimeout(() => setStatus(''), 3000);
      }
    }


    async function apagarMensagem(id) {
      const ok = confirm('Apagar esta mensagem?');
      if (!ok) return;

      setStatus('A apagar');

      try {
        // NOTA: este endpoint pode precisar de ajuste conforme o teu backend.
        // Sugestao: DELETE /api/mensagens/:id
        const res = await fetch(`http://localhost:3000/api/mensagens/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });

        if (!res.ok) throw new Error('Falha ao apagar mensagem');

        if (clienteAtual) {
          const lista = mensagensCache[clienteAtual.nomeCompleto] || [];
          mensagensCache[clienteAtual.nomeCompleto] = lista.filter(m => m._id !== id);
        }

        editingMessageId = null;
        renderizarChat();
        setStatus('');
      } catch (error) {
        console.error('Erro ao apagar mensagem:', error);
        setStatus('Erro ao apagar');
        setTimeout(() => setStatus(''), 3000);
      }
    }

    // Inicializar
    carregarClientes();

    // Auto-refresh leve: atualiza previews e, se uma conversa estiver aberta, recarrega sem mexer no layout externo.
    setInterval(async () => {
      try {
        // Se estivermos em modo edicao, nao interromper
        if (editingMessageId) return;

        if (!modoGeral && clienteAtual) {
          await carregarMensagensCliente(clienteAtual.nomeCompleto);

          // Re-render apenas se continuamos na mesma conversa
          if (lastRenderedFor === clienteAtual.nomeCompleto) {
            const wasAtBottom = (function () {
              const el = document.getElementById('chatMessages');
              if (!el) return true;
              return (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
            })();

            renderizarChat();

            // manter posicao de scroll: se estava no fundo, volta ao fundo
            if (wasAtBottom) setTimeout(scrollChatToBottom, 30);
          }
        }

        await carregarClientes();
      } catch (e) {
        console.error('Auto-refresh falhou:', e);
      }
    }, 30000);