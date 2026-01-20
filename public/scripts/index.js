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
        segunda: 'Segunda-feira',
        terca: 'Terça-feira',
        quarta: 'Quarta-feira',
        quinta: 'Quinta-feira',
        sexta: 'Sexta-feira',
        sabado: 'Sábado',
        domingo: 'Domingo'
    };
        
    if (!admin || !admin.horario) {
        horarioContainer.innerHTML = '<p>Horário não disponível</p>';
        return;
    }
        
    let horarioHtml = '';
    for (const [dia, horario] of Object.entries(admin.horario)) {
        const isAberto = horario && horario.length > 0;
        horarioHtml += `
            <div class="horario-item ${isAberto ? '' : 'fechado'}">
              <span class="dia">${diasSemana[dia]}</span>
              <span class="horas">${isAberto ? `${horario[0]} - ${horario[1]}` : 'Fechado'}</span>
            </div>
            `;
        }
        horarioContainer.innerHTML = horarioHtml;
        
    } catch (error) {
        console.error('Erro ao carregar horario:', error);
        document.getElementById('horarioInfo').innerHTML = '<p>Horário não disponível</p>';
    }
}

carregarEstatisticas();
carregarHorario();