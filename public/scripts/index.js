async function carregarEstatisticas() {
    try {
        const res = await fetch('http://localhost:3000/api/estatisticas/publico');
        const stats = await res.json();
        
        document.getElementById('totalClientes').textContent = stats.totalClientes || '0';
        document.getElementById('sessoesRealizadas').textContent = stats.sessoesCompletas || '0';
    } catch (error) {
        console.error('Erro ao carregar estatisticas:', error);
    }
}

async function carregarHorario() {
    try {
    const res = await fetch('http://localhost:3000/api/admin/perfil?username=admin');
    const admin = await res.json();
        
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
        
    if (!admin || !admin.horario) {
        horarioContainer.innerHTML = '<p data-i18n="fechado">Fechado</p>';
        await i18nReady;
        traduzirPagina(horarioContainer);
        horarioContainer.innerHTML = '<p>Horário não disponível</p>';
        return;
    }
        
    let horarioHtml = '';
    for (const [dia, horario] of Object.entries(admin.horario)) {
        const isAberto = horario && horario.length > 0;
        horarioHtml += `
            <div class="horario-item ${isAberto ? '' : 'fechado'}">
              <span class="dia" data-i18n="${diasSemana[dia]}">${diasSemana[dia]}</span>
              <span class="horas">${isAberto ? `${horario[0]} - ${horario[1]}` : 'Fechado'}</span>
            </div>
            `;
        }
        horarioContainer.innerHTML = horarioHtml;

        await i18nReady;
        traduzirPagina(horarioContainer);
        
    } catch (error) {
        console.error('Erro ao carregar horario:', error);
        document.getElementById('horarioInfo').innerHTML = '<p>Horário não disponível</p>';
    }
}

carregarEstatisticas();
carregarHorario();