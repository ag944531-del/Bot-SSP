document.addEventListener('DOMContentLoaded', () => {
  // RELÓGIO AO VIVO
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('pt-BR');
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // NAVEGAÇÃO ENTRE ABAS
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const tabTitles = {
    overview: { title: 'Painel Executivo • Comando Geral', sub: 'Métricas consolidadas e telemetria operacional em tempo real' },
    rh: { title: 'Quadro Geral do Efetivo & Recursos Humanos', sub: 'Gestão de policiais, patentes, histórico e evolução funcional' },
    copom: { title: 'Central COPOM • Operações & Despacho', sub: 'Status da frota, viaturas em patrulha e ocorrências ao vivo' },
    corregedoria: { title: 'Corregedoria Geral • Processos Disciplinares', sub: 'Acompanhamento de IPMs, PDOs e prazos processuais' },
    academia: { title: 'Escola de Formação & Academia Militar', sub: 'Cursos ativos, turmas, alunos e corpo de instrutores' },
    documents: { title: 'Certidões & Validador de Assinatura Digital', sub: 'Consulta e verificação de autenticidade criptográfica' },
    security: { title: 'Central de Segurança, Auditoria & Backups', sub: 'Rastreabilidade imutável, blacklist e integridade' }
  };

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navItems.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');

      if (tabTitles[targetTab]) {
        pageTitle.textContent = tabTitles[targetTab].title;
        pageSubtitle.textContent = tabTitles[targetTab].sub;
      }

      loadTabContent(targetTab);
    });
  });

  // CARREGADOR DINÂMICO DE ABAS
  async function loadTabContent(tab) {
    if (tab === 'overview') loadOverviewData();
    if (tab === 'rh') loadPoliceData();
    if (tab === 'copom') loadCopomData();
    if (tab === 'corregedoria') loadCorregedoriaData();
    if (tab === 'academia') loadAcademyData();
    if (tab === 'documents') loadDocumentsData();
    if (tab === 'security') loadSecurityData();
  }

  // 1. CARREGAR OVERVIEW
  async function loadOverviewData() {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (!json.success) return;

      const m = json.metrics;
      document.getElementById('kpi-efetivo-ativos').textContent = m.efetivo.ativos;
      document.getElementById('kpi-efetivo-servico').textContent = `${m.efetivo.emServico} em serviço ativo`;

      document.getElementById('kpi-vtrs-ativas').textContent = m.operacao.viaturasAtivas;
      document.getElementById('kpi-patrulhas').textContent = `${m.operacao.patrulhasEmAndamento} patrulhas ativas`;

      document.getElementById('kpi-ipms').textContent = m.corregedoria.ipmsAtivos;
      document.getElementById('kpi-convocacoes').textContent = `${m.corregedoria.convocacoesPendentes} convocações`;

      document.getElementById('kpi-cursos').textContent = m.formacao.cursosAtivos;
      document.getElementById('kpi-alunos').textContent = `${m.formacao.alunosMatriculados} matriculados`;

      // Renderizar Alertas
      const alertsList = document.getElementById('overview-alerts-list');
      if (json.alerts.length > 0) {
        alertsList.innerHTML = json.alerts.map((a) => `
          <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <strong style="color: var(--warning);">[${a.category}] ${a.title}</strong>
            <p style="font-size: 12px; color: var(--text-muted);">${a.message}</p>
          </div>
        `).join('');
      } else {
        alertsList.innerHTML = '<p class="empty-state">Nenhum alerta crítico ativo no momento.</p>';
      }

      // Renderizar Prazos
      const deadList = document.getElementById('overview-deadlines-list');
      if (json.deadlines.length > 0) {
        deadList.innerHTML = json.deadlines.map((d) => `
          <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
            <div>
              <strong>${d.title}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${d.entityType} • ${d.protocol}</div>
            </div>
            <span class="status-badge badge-afastado">${d.daysRemaining} dias (${d.status})</span>
          </div>
        `).join('');
      } else {
        deadList.innerHTML = '<p class="empty-state">Nenhum prazo processual urgente.</p>';
      }
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
  }

  // 2. CARREGAR POLICIAIS (RH)
  async function loadPoliceData() {
    try {
      const q = document.getElementById('input-search-police').value;
      const status = document.getElementById('select-status-filter').value;
      const res = await fetch(`/api/police?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`);
      const json = await res.json();

      const tbody = document.getElementById('police-table-body');
      if (json.profiles && json.profiles.length > 0) {
        tbody.innerHTML = json.profiles.map((p) => `
          <tr>
            <td><code>${p.badgeNumber}</code></td>
            <td><strong>${p.rankAbbr} ${p.operationalName}</strong></td>
            <td>${p.name}</td>
            <td>${p.rank} (Nível ${p.rankLevel})</td>
            <td>${p.unitAbbr || 'Geral'}</td>
            <td>${p.dutyHours}h</td>
            <td><span class="status-badge badge-${p.status.toLowerCase()}">${p.status}</span></td>
            <td>
              <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="window.viewTimeline('${p.userId}', '${p.operationalName}')">Timeline</button>
            </td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhum policial encontrado.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('input-search-police')?.addEventListener('input', () => loadPoliceData());
  document.getElementById('select-status-filter')?.addEventListener('change', () => loadPoliceData());

  // 3. CARREGAR COPOM
  async function loadCopomData() {
    try {
      const res = await fetch('/api/copom');
      const json = await res.json();

      const fleetBody = document.getElementById('fleet-table-body');
      if (json.vehicles.length > 0) {
        fleetBody.innerHTML = json.vehicles.map((v) => `
          <tr>
            <td><strong>VTR ${v.prefix}</strong></td>
            <td>${v.model}</td>
            <td><code>${v.plate}</code></td>
            <td>${v.unit?.abbreviation || 'Geral'}</td>
            <td><span class="status-badge badge-${v.status === 'DISPONIVEL' ? 'ativo' : 'afastado'}">${v.status}</span></td>
          </tr>
        `).join('');
      } else {
        fleetBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma viatura cadastrada.</td></tr>';
      }

      const occList = document.getElementById('occurrences-list');
      if (json.occurrences.length > 0) {
        occList.innerHTML = json.occurrences.map((o) => `
          <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; justify-content: space-between;">
              <strong>[${o.protocol}] ${o.type}</strong>
              <span style="font-size: 11px; color: var(--text-muted);">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Local: ${o.location} • Resultado: ${o.result}</p>
          </div>
        `).join('');
      } else {
        occList.innerHTML = '<p class="empty-state">Nenhuma ocorrência recente.</p>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 4. CARREGAR CORREGEDORIA
  async function loadCorregedoriaData() {
    try {
      const res = await fetch('/api/corregedoria');
      const json = await res.json();

      const tbody = document.getElementById('cases-table-body');
      if (json.cases.length > 0) {
        tbody.innerHTML = json.cases.map((c) => `
          <tr>
            <td><code>${c.protocol}</code></td>
            <td><strong>${c.type}</strong></td>
            <td><@${c.investigatedId}></td>
            <td><@${c.officerInChargeId}></td>
            <td>${new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
            <td><span class="status-badge badge-${c.status === 'CONCLUIDO' ? 'ativo' : 'afastado'}">${c.status}</span></td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum processo disciplinar registrado.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 5. CARREGAR ACADEMIA
  async function loadAcademyData() {
    try {
      const res = await fetch('/api/academy');
      const json = await res.json();

      const grid = document.getElementById('courses-grid');
      if (json.courses.length > 0) {
        grid.innerHTML = json.courses.map((c) => `
          <div class="glass" style="padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4>${c.name} (${c.abbreviation})</h4>
              <span class="status-badge badge-ativo">${c.workloadHours} Horas</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 8px 0;">${c.description}</p>
            <div style="font-size: 12px; color: var(--primary);">Turmas abertas: ${c.classes.length}</div>
          </div>
        `).join('');
      } else {
        grid.innerHTML = '<p class="empty-state">Nenhum curso cadastrado.</p>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 6. CARREGAR DOCUMENTOS & VALIDADOR
  async function loadDocumentsData() {
    try {
      const res = await fetch('/api/documents');
      const json = await res.json();

      const tbody = document.getElementById('docs-table-body');
      if (json.documents.length > 0) {
        tbody.innerHTML = json.documents.map((d) => `
          <tr>
            <td><code>${d.protocol}</code></td>
            <td><strong>${d.title}</strong></td>
            <td>${d.type}</td>
            <td>${d.authorName}</td>
            <td>${new Date(d.createdAt).toLocaleDateString('pt-BR')}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum documento emitido.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('btn-verify-sig')?.addEventListener('click', async () => {
    const code = document.getElementById('input-verify-code').value.trim();
    if (!code) return;

    const res = await fetch(`/api/documents/validate?code=${encodeURIComponent(code)}`);
    const json = await res.json();
    const resultBox = document.getElementById('verification-result-box');
    resultBox.style.display = 'block';

    if (json.verification && json.verification.valid) {
      const sig = json.verification.signature;
      resultBox.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); padding: 16px; border-radius: 8px;">
          <h4 style="color: #34d399;">✅ Assinatura Digital Válida e Autêntica</h4>
          <p style="font-size: 13px; margin-top: 6px;">Signatário: <strong>${sig.signerName}</strong> (${sig.signerRole})</p>
          <p style="font-size: 12px; color: var(--text-muted);">Data: ${json.verification.signedAtFormatted} • Hash: <code>${sig.signatureHash.substring(0, 32)}...</code></p>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); padding: 16px; border-radius: 8px;">
          <h4 style="color: #f87171;">❌ Assinatura Não Localizada</h4>
          <p style="font-size: 13px; margin-top: 6px;">O identificador "${code}" não consta nos registros oficiais do sistema.</p>
        </div>
      `;
    }
  });

  // 7. CARREGAR AUDITORIA & BACKUPS
  async function loadSecurityData() {
    try {
      const res = await fetch('/api/security');
      const json = await res.json();

      const tbody = document.getElementById('audit-table-body');
      if (json.auditLogs.length > 0) {
        tbody.innerHTML = json.auditLogs.map((l) => `
          <tr>
            <td><code>${l.protocol || 'N/A'}</code></td>
            <td>${new Date(l.createdAt).toLocaleString('pt-BR')}</td>
            <td><strong>${l.executorName || l.executorId}</strong></td>
            <td>${l.module}</td>
            <td><span class="status-badge badge-ativo">${l.action}</span></td>
            <td style="color: var(--text-muted);">${l.reason || '-'}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum log de auditoria encontrado.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('btn-trigger-backup')?.addEventListener('click', async () => {
    if (!confirm('Deseja iniciar um backup completo agora?')) return;
    const res = await fetch('/api/security/backup', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      alert(`Backup gerado com sucesso!\nArquivo: ${json.backup.fileName}`);
      loadSecurityData();
    } else {
      alert('Falha ao gerar backup: ' + json.error);
    }
  });

  // MODAL DE TIMELINE
  window.viewTimeline = async (userId, name) => {
    const modal = document.getElementById('timeline-modal');
    const modalTitle = document.getElementById('timeline-modal-title');
    const modalBody = document.getElementById('timeline-modal-body');

    modalTitle.textContent = `Linha do Tempo Funcional • ${name}`;
    modalBody.innerHTML = '<p class="empty-state">Carregando eventos...</p>';
    modal.classList.add('open');

    try {
      const res = await fetch(`/api/police/timeline?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();

      if (json.timeline && json.timeline.length > 0) {
        modalBody.innerHTML = json.timeline.map((t) => `
          <div class="timeline-item">
            <div style="font-size: 11px; color: var(--text-muted);">${new Date(t.date).toLocaleDateString('pt-BR')}</div>
            <strong>${t.title}</strong>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${t.description}</p>
          </div>
        `).join('');
      } else {
        modalBody.innerHTML = '<p class="empty-state">Nenhum evento registrado nesta ficha funcional.</p>';
      }
    } catch (err) {
      modalBody.innerHTML = '<p class="empty-state">Erro ao buscar timeline.</p>';
    }
  };

  document.getElementById('btn-close-timeline')?.addEventListener('click', () => {
    document.getElementById('timeline-modal').classList.remove('open');
  });

  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || 'overview';
    loadTabContent(activeTab);
  });

  // Carregar inicial
  loadOverviewData();
});
