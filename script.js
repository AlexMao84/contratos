class ContractApp {
    constructor() {
        this.state = {
            activeTab: 'informacion',
            contractsHistory: JSON.parse(localStorage.getItem('historicoContratos') || '[]'),
            financialResults: null,
            calendarYear: new Date().getFullYear(),
            notifications: [],
            showBars: true,
            currency: 'COP',
            convertCurrency: true
        };
        this.exchangeRates = {
            COP: 1,
            USD: 4100,
            EUR: 4500
        };
        this.currencySymbols = {
            COP: '$',
            USD: '$',
            EUR: '€'
        };
        this.init();
    }

    init() {
        this.loadInitialData();
        this.loadFormState();
        this.setupEventListeners();
        this.updateTRMVisibility();
        this.updateCOPSections();
        this.calculateFinancials();
        this.updateTabContent();
        this.checkNotifications();
    }

    loadInitialData() {
        if (!this.state.contractsHistory.length) {
            this.state.contractsHistory.push({
                nombreProyecto: "Construcción Bogotá",
                numeroContrato: "C-001-2025",
                contratante: "Ejemplo Contratante",
                cantidad: 90,
                unidadMedida: "M2",
                valorTotal: 10000000,
                plazoEjecucion: 90,
                fechaInicio: "2025-01-01",
                fechaFinal: "2025-03-31"
            });
            localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
        }
    }

    loadFormState() {
        const savedState = JSON.parse(localStorage.getItem('formState') || '{}');
        Object.entries(savedState).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') el.checked = value;
                else el.value = value;
            }
        });
    }

    setupEventListeners() {
        document.getElementById('currency')?.addEventListener('change', (e) => {
            this.state.currency = e.target.value;
            this.updateTRMVisibility();
            this.updateCOPSections();
            this.calculateFinancials();
        });
        document.getElementById('convertCurrency')?.addEventListener('change', (e) => {
            this.state.convertCurrency = e.target.checked;
            this.calculateFinancials();
        });
        document.getElementById('rateUSD')?.addEventListener('input', (e) => {
            this.exchangeRates.USD = parseFloat(e.target.value) || 4100;
            this.calculateFinancials();
        });
        document.getElementById('rateEUR')?.addEventListener('input', (e) => {
            this.exchangeRates.EUR = parseFloat(e.target.value) || 4500;
            this.calculateFinancials();
        });
        document.querySelector('.tabs').addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-button');
            if (btn) this.openTab(btn.dataset.tab);
        });
        document.querySelectorAll('input, select, textarea').forEach(el =>
            el.addEventListener('input', () => this.handleInputChange(el)));
        document.querySelectorAll('.toolbar button, footer button').forEach(btn =>
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action)));
        document.getElementById('conAIU')?.addEventListener('change', () => this.toggleAIU());
        document.getElementById('prevYear')?.addEventListener('click', () => this.changeCalendarYear(-1));
        document.getElementById('nextYear')?.addEventListener('click', () => this.changeCalendarYear(1));
        document.getElementById('toggleBars')?.addEventListener('click', () => this.toggleBars());
        document.getElementById('jsonFile')?.addEventListener('change', (e) => this.loadJSON(e));
    }

    handleInputChange(el) {
        this.validateInput(el);
        this.saveFormState();
        if (this.state.activeTab === 'financieros') this.calculateFinancials();
        if (this.state.activeTab === 'ejecucion') this.calculateExecutionDates();
        this.checkNotifications();
    }

    validateInput(el) {
        const errorEl = el.nextElementSibling?.classList.contains('error-message') ? el.nextElementSibling : null;
        if (!errorEl) return;
        if (el.required && !el.value) {
            errorEl.textContent = 'Este campo es obligatorio';
            errorEl.style.display = 'inline';
        } else if (el.type === 'number' && (el.value < el.min || isNaN(el.value))) {
            errorEl.textContent = `Ingrese un número válido (mínimo ${el.min})`;
            errorEl.style.display = 'inline';
        } else if (el.type === 'email' && el.value && !el.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errorEl.textContent = 'Ingrese un correo válido';
            errorEl.style.display = 'inline';
        } else {
            errorEl.style.display = 'none';
        }
    }

    handleAction(action) {
        const actions = {
            saveJSON: () => this.saveJSON(),
            loadJSON: () => document.getElementById('jsonFile')?.click(),
            addContract: () => this.addContractToHistory(),
            downloadHistoryPDF: () => this.generateHistoryPDF(),
            downloadHistoryExcel: () => this.generateHistoryExcel(),
            clearHistory: () => this.clearHistory(),
            downloadPDF: () => this.generatePDF(),
            downloadCalendarExcel: () => this.generateCalendarExcel(),
            downloadCalendarPDF: () => this.generateCalendarPDF()
        };
        try {
            actions[action]?.();
        } catch (error) {
            console.error(`Error en acción ${action}:`, error);
            this.showNotification(`Error al ejecutar ${action}: ${error.message}`, 'error');
        }
    }

    openTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        const tab = document.getElementById(tabName);
        const btn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        tab.classList.add('active');
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.state.activeTab = tabName;
        this.updateTabContent();
        if (tabName === 'ejecucion') this.calculateExecutionDates();
    }

    toggleAIU() {
        document.body.classList.toggle('aiu-active', document.getElementById('conAIU')?.checked);
        this.calculateFinancials();
    }

    toggleBars() {
        this.state.showBars = !this.state.showBars;
        document.getElementById('toggleBars').querySelector('i').classList.toggle('fa-chart-bar', this.state.showBars);
        document.getElementById('toggleBars').querySelector('i').classList.toggle('fa-list', !this.state.showBars);
        this.loadCalendarTable();
    }

    updateTRMVisibility() {
        const trmUSD = document.getElementById('trmUSD');
        const trmEUR = document.getElementById('trmEUR');
        trmUSD.style.display = this.state.currency === 'USD' ? 'inline-block' : 'none';
        trmEUR.style.display = this.state.currency === 'EUR' ? 'inline-block' : 'none';
    }

    updateCOPSections() {
        document.body.classList.toggle('cop-active', this.state.currency === 'COP' || this.state.convertCurrency);
    }

    calculateFinancials() {
        try {
            const inputs = this.getFinancialInputs();
            if (!inputs.costoDirecto || inputs.costoDirecto <= 0) {
                throw new Error('Costo directo debe ser mayor a 0');
            }
            const results = this.computeFinancials(inputs);
            this.state.financialResults = results;
            this.updateFinancialDisplay(results);
        } catch (error) {
            console.error('Error en cálculo financiero:', error);
            this.showNotification('Error en cálculos financieros: ' + error.message, 'error');
            this.state.financialResults = null;
        }
    }

    getFinancialInputs() {
        const baseCostoDirecto = parseFloat(document.getElementById('valorSubtotal')?.value) || 0;
        const costoDirecto = baseCostoDirecto;
        const applyCOPRules = this.state.currency === 'COP' || this.state.convertCurrency;
        return {
            costoDirecto: costoDirecto,
            conAIU: applyCOPRules && (document.getElementById('conAIU')?.checked || false),
            administracion: applyCOPRules ? Math.min(1, Math.max(0, (parseFloat(document.getElementById('administracion')?.value) || 0) / 100)) : 0,
            imprevistos: applyCOPRules ? Math.min(1, Math.max(0, (parseFloat(document.getElementById('imprevistos')?.value) || 0) / 100)) : 0,
            utilidad: applyCOPRules ? Math.min(1, Math.max(0, (parseFloat(document.getElementById('utilidad')?.value) || 0) / 100)) : 0,
            iva: applyCOPRules ? Math.min(1, Math.max(0, (parseFloat(document.getElementById('iva')?.value) || 0) / 100)) : 0,
            anticipo: Math.min(1, Math.max(0, (parseFloat(document.getElementById('porcentajeAnticipo')?.value) || 0) / 100)),
            retenido: Math.min(1, Math.max(0, (parseFloat(document.getElementById('porcentajeRetenido')?.value) || 0) / 100))
        };
    }

    computeFinancials({ costoDirecto, conAIU, administracion, imprevistos, utilidad, iva, anticipo, retenido }) {
        let aiu = { admin: 0, impre: 0, util: 0, total: 0 };
        if (conAIU) {
            aiu = {
                admin: costoDirecto * administracion,
                impre: costoDirecto * imprevistos,
                util: costoDirecto * utilidad,
                total: costoDirecto * (administracion + imprevistos + utilidad)
            };
        }
        const subtotalSinAIU = costoDirecto;
        const subtotalConAIU = subtotalSinAIU + aiu.total;
        const ivaBase = conAIU ? aiu.util : subtotalSinAIU;
        const ivaValue = ivaBase * iva;
        const total = subtotalConAIU + ivaValue;
        const avanceObra = 1 - anticipo - retenido;
        return {
            costoDirecto,
            aiu,
            subtotalSinAIU,
            subtotalConAIU,
            iva: ivaValue,
            total,
            anticipo: total * anticipo,
            retenido: total * retenido,
            avanceObra: total * avanceObra
        };
    }

    updateFinancialDisplay({ costoDirecto, aiu, subtotalSinAIU, subtotalConAIU, iva, total, anticipo, retenido, avanceObra }) {
        const format = (val) => this.formatCurrency(val);
        const elements = {
            valorSubtotalDisplay: costoDirecto,
            valorSubtotalSinAIU: subtotalSinAIU,
            valorAdministracion: aiu.admin,
            valorImprevistos: aiu.impre,
            valorUtilidad: aiu.util,
            totalAIU: aiu.total,
            valorSubtotalConAIU: subtotalConAIU,
            valorIVA: iva,
            valorTotal: total,
            valorAnticipo: anticipo,
            valorRetenido: retenido,
            valorAvance: avanceObra,
            porcentajeAvance: (avanceObra / total * 100).toFixed(1) + '%'
        };
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = id.includes('porcentaje') ? value : format(value);
            else console.warn(`Elemento con ID ${id} no encontrado`);
        });
    }

    calculateExecutionDates() {
        try {
            const inputs = this.getExecutionInputs();
            if (!inputs.startDate || isNaN(inputs.startDate.getTime())) {
                throw new Error('Fecha de inicio inválida');
            }
            if (!inputs.duration || inputs.duration <= 0) {
                throw new Error('Plazo de ejecución debe ser mayor a 0');
            }
            const endDate = new Date(inputs.startDate);
            endDate.setDate(inputs.startDate.getDate() + inputs.duration);
            const fechaFinalEl = document.getElementById('fechaFinal');
            if (fechaFinalEl) {
                fechaFinalEl.textContent = endDate.toISOString().split('T')[0];
            } else {
                console.warn('Elemento #fechaFinal no encontrado');
            }

            if (!this.state.financialResults) {
                this.calculateFinancials();
                if (!this.state.financialResults) {
                    throw new Error('No se pudieron calcular los datos financieros necesarios para el cronograma');
                }
            }

            this.updateExecutionDisplay(inputs.startDate, endDate, inputs);
        } catch (error) {
            console.error('Error en cálculo de ejecución:', error);
            this.showNotification('Error en cálculo de ejecución: ' + error.message, 'error');
        }
    }

    getExecutionInputs() {
        const periodicityValue = document.getElementById('periodicidadCortes')?.value === 'semanal' ? 7 : 15;
        return {
            startDate: new Date(document.getElementById('fechaInicio')?.value || 'Invalid Date'),
            duration: parseInt(document.getElementById('plazoEjecucion')?.value) || 0,
            cutFrequency: periodicityValue,
            cantidad: parseInt(document.getElementById('cantidad')?.value) || 0,
            unidadMedida: document.getElementById('unidadMedida')?.value || 'M2'
        };
    }

    updateExecutionDisplay(start, end, { duration, cutFrequency, cantidad, unidadMedida }) {
        const { total } = this.state.financialResults;
        const numCortes = Math.max(1, Math.floor(duration / cutFrequency));
        const cantidadPorCorte = cantidad / numCortes;
        const valorPorCorte = total / numCortes;

        const tbody = document.querySelector('#cronogramaTable tbody');
        if (!tbody) {
            console.warn('Tabla #cronogramaTable no encontrada');
            return;
        }
        tbody.innerHTML = '';
        document.getElementById('cronogramaTable').style.display = 'table';
        document.getElementById('cronograma').style.display = 'none';

        let totalCantidad = 0, totalValor = 0;
        tbody.appendChild(this.createRow('Inicio', this.formatDate(start), '-', '-'));
        for (let i = 1; i <= numCortes; i++) {
            const cutDate = new Date(start);
            cutDate.setDate(start.getDate() + i * cutFrequency);
            if (cutDate <= end) {
                tbody.appendChild(this.createRow(`Corte ${i}`, this.formatDate(cutDate), `${this.formatNumber(cantidadPorCorte)} ${unidadMedida}`, this.formatCurrency(valorPorCorte)));
                totalCantidad += cantidadPorCorte;
                totalValor += valorPorCorte;
            }
        }
        tbody.appendChild(this.createRow('Final', this.formatDate(end), '-', '-'));
        const totalRow = this.createRow('Total', '-', `${this.formatNumber(totalCantidad)} ${unidadMedida}`, this.formatCurrency(totalValor));
        totalRow.classList.add('total-row');
        tbody.appendChild(totalRow);
    }

    createRow(stage, date, qty, value) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${stage}</td><td>${date}</td><td>${qty}</td><td>${value}</td>`;
        return row;
    }

    addContractToHistory() {
        try {
            this.calculateFinancials();
            this.calculateExecutionDates();
            const contract = this.getContractData();
            if (!contract.nombreProyecto || !contract.contratante) {
                throw new Error('El nombre del proyecto y del contratante son obligatorios');
            }
            if (!contract.fechaInicio || contract.plazoEjecucion <= 0) {
                throw new Error('La fecha de inicio y el plazo de ejecución son obligatorios');
            }
            if (!this.state.financialResults || this.state.financialResults.total <= 0) {
                throw new Error('Calcule primero los aspectos financieros');
            }
            this.state.contractsHistory.unshift(contract);
            localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
            this.loadHistoryTable();
            this.loadCalendarTable();
            this.showNotification('Contrato agregado al historial', 'success');
        } catch (error) {
            console.error('Error al agregar contrato:', error);
            this.showNotification(error.message || 'Error al agregar contrato', 'error');
        }
    }

    clearHistory() {
        if (confirm('¿Seguro que desea borrar el historial?')) {
            this.state.contractsHistory = [];
            localStorage.removeItem('historicoContratos');
            this.loadHistoryTable();
            this.loadCalendarTable();
            this.showNotification('Historial borrado', 'success');
        }
    }

    loadHistoryTable() {
        const tbody = document.querySelector('#tablaHistorico tbody');
        tbody.innerHTML = this.state.contractsHistory.map(c => `
            <tr>
                <td>${c.nombreProyecto}</td>
                <td>${c.contratante}</td>
                <td>${this.formatNumber(c.cantidad)} ${c.unidadMedida}</td>
                <td>${this.formatCurrency(c.valorTotal)}</td>
                <td>${c.plazoEjecucion} días</td>
                <td>${this.formatDate(new Date(c.fechaInicio))}</td>
                <td>${this.formatDate(new Date(c.fechaFinal))}</td>
            </tr>
        `).join('') || '<tr><td colspan="7">No hay contratos en el historial</td></tr>';
    }

    calculateCutsForContract(contract) {
        const start = new Date(contract.fechaInicio);
        const end = new Date(contract.fechaFinal);
        const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const cutFrequency = document.getElementById('periodicidadCortes')?.value === 'semanal' ? 7 : 15;
        const numCortes = Math.max(1, Math.floor(durationDays / cutFrequency));
        const cantidadPorCorte = contract.cantidad / numCortes;
        const valorPorCorte = contract.valorTotal / numCortes;

        const cuts = [];
        for (let i = 1; i <= numCortes; i++) {
            const cutDate = new Date(start);
            cutDate.setDate(start.getDate() + i * cutFrequency);
            if (cutDate <= end) {
                cuts.push({ cutNumber: i, date: cutDate, cantidad: cantidadPorCorte, valor: valorPorCorte, unidadMedida: contract.unidadMedida });
            }
        }
        return cuts;
    }

    loadCalendarTable() {
        const tbody = document.querySelector('#calendarioTable tbody');
        const tfoot = document.querySelector('#calendarioTable tfoot');
        const monthlyTotals = Array(12).fill(0);
        let yearlyTotal = 0;

        const cutsByProject = this.state.contractsHistory.map(contract => this.calculateCutsForContract(contract));
        const allValues = cutsByProject.flatMap(cuts => cuts.map(cut => cut.valor)).filter(v => v > 0);
        const maxValue = Math.max(...allValues, 0) || 1000000;

        tbody.innerHTML = this.state.contractsHistory.map(contract => {
            const cuts = this.calculateCutsForContract(contract);
            const months = Array(12).fill(0);
            let projectTotal = 0;
            cuts.forEach(cut => {
                if (cut.date.getFullYear() === this.state.calendarYear) {
                    const month = cut.date.getMonth();
                    months[month] += cut.valor;
                    projectTotal += cut.valor;
                    monthlyTotals[month] += cut.valor;
                    yearlyTotal += cut.valor;
                }
            });
            return `
                <tr>
                    <td>${contract.nombreProyecto}</td>
                    ${months.map(m => {
                        const barWidth = m > 0 ? Math.min((m / maxValue) * 40, 40) : 0;
                        const barClass = m > maxValue * 0.75 ? 'high' : m < maxValue * 0.25 ? 'low' : 'mid';
                        return `<td${m > 0 ? ' class="has-cuts"' : ''} title="${m > 0 ? this.formatCurrency(m) : ''}">
                            ${m > 0 && this.state.showBars ? `<span class="bar ${barClass}" style="width: ${barWidth}px;"></span>` : m > 0 ? this.formatCurrency(m) : '-'}
                        </td>`;
                    }).join('')}
                    <td class="project-total">${this.formatCurrency(projectTotal)}</td>
                </tr>`;
        }).join('') || '<tr><td colspan="14">No hay contratos en el historial</td></tr>';

        tfoot.innerHTML = `
            <tr class="total-row">
                <td>Total</td>
                ${monthlyTotals.map(total => {
                    const barWidth = total > 0 ? Math.min((total / maxValue) * 40, 40) : 0;
                    const barClass = total > maxValue * 0.75 ? 'high' : total < maxValue * 0.25 ? 'low' : 'mid';
                    return `<td title="${total > 0 ? this.formatCurrency(total) : ''}">
                        ${total > 0 && this.state.showBars ? `<span class="bar ${barClass}" style="width: ${barWidth}px;"></span>` : total > 0 ? this.formatCurrency(total) : '-'}
                    </td>`;
                }).join('')}
                <td class="yearly-total">${this.formatCurrency(yearlyTotal)}</td>
            </tr>
        `;

        document.getElementById('calendarYear').textContent = this.state.calendarYear;
    }

    changeCalendarYear(delta) {
        this.state.calendarYear += delta;
        this.loadCalendarTable();
    }

    generateHistoryPDF() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF no está disponible');
            }
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Histórico de Contratos', 105, 20, { align: 'center' });

            const headers = [['Proyecto', 'Contratante', 'Cantidad', 'Valor Total', 'Plazo', 'Inicio', 'Fin']];
            const data = this.state.contractsHistory.map(c => [
                c.nombreProyecto,
                c.contratante,
                `${this.formatNumber(c.cantidad)} ${c.unidadMedida}`,
                this.formatCurrency(c.valorTotal),
                `${c.plazoEjecucion} días`,
                this.formatDate(new Date(c.fechaInicio)),
                this.formatDate(new Date(c.fechaFinal))
            ]);

            doc.autoTable({
                head: headers,
                body: data,
                startY: 30,
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 249, 252] }
            });

            doc.save('historico_contratos.pdf');
        } catch (error) {
            console.error('Error generando PDF de historial:', error);
            this.showNotification('Error al generar el PDF del historial: ' + error.message, 'error');
        }
    }

    generateHistoryExcel() {
        const data = this.state.contractsHistory.map(c => ({
            Proyecto: c.nombreProyecto,
            Contratante: c.contratante,
            Cantidad: `${this.formatNumber(c.cantidad)} ${c.unidadMedida}`,
            'Valor Total': this.formatCurrency(c.valorTotal),
            Plazo: `${c.plazoEjecucion} días`,
            Inicio: this.formatDate(new Date(c.fechaInicio)),
            Fin: this.formatDate(new Date(c.fechaFinal))
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
        XLSX.writeFile(wb, 'historico_contratos.xlsx');
    }

    generateCalendarExcel() {
        const data = this.state.contractsHistory.map(c => {
            const cuts = this.calculateCutsForContract(c);
            const months = Array(12).fill(0);
            let projectTotal = 0;
            cuts.forEach(cut => {
                if (cut.date.getFullYear() === this.state.calendarYear) {
                    const month = cut.date.getMonth();
                    months[month] += cut.valor;
                    projectTotal += cut.valor;
                }
            });
            return { Proyecto: c.nombreProyecto, ...Object.fromEntries(months.map((m, i) => [new Date(0, i).toLocaleString('es', { month: 'short' }), this.formatCurrency(m)])), Total: this.formatCurrency(projectTotal) };
        });
        const monthlyTotals = Array(12).fill(0);
        let yearlyTotal = 0;
        this.state.contractsHistory.forEach(c => {
            const cuts = this.calculateCutsForContract(c);
            cuts.forEach(cut => {
                if (cut.date.getFullYear() === this.state.calendarYear) {
                    monthlyTotals[cut.date.getMonth()] += cut.valor;
                    yearlyTotal += cut.valor;
                }
            });
        });
        data.push({
            Proyecto: 'Total por Mes',
            ...Object.fromEntries(monthlyTotals.map((total, i) => [new Date(0, i).toLocaleString('es', { month: 'short' }), this.formatCurrency(total)])),
            Total: this.formatCurrency(yearlyTotal)
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Calendario');
        XLSX.writeFile(wb, `calendario_${this.state.calendarYear}.xlsx`);
    }

    generateCalendarPDF() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF no está disponible');
            }
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(16);
            doc.text(`Calendario Anual ${this.state.calendarYear}`, 148, 20, { align: 'center' });

            const headers = [['Proyecto', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Total']];
            const monthlyTotals = Array(12).fill(0);
            let yearlyTotal = 0;
            const body = this.state.contractsHistory.map(c => {
                const cuts = this.calculateCutsForContract(c);
                const months = Array(12).fill(0);
                let projectTotal = 0;
                cuts.forEach(cut => {
                    if (cut.date.getFullYear() === this.state.calendarYear) {
                        const month = cut.date.getMonth();
                        months[month] += cut.valor;
                        projectTotal += cut.valor;
                        monthlyTotals[month] += cut.valor;
                        yearlyTotal += cut.valor;
                    }
                });
                return [c.nombreProyecto, ...months.map(m => this.formatCurrency(m)), this.formatCurrency(projectTotal)];
            });
            body.push(['Total', ...monthlyTotals.map(total => this.formatCurrency(total)), this.formatCurrency(yearlyTotal)]);

            doc.autoTable({
                head: headers,
                body: body,
                startY: 30,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 249, 252] }
            });

            doc.save(`calendario_${this.state.calendarYear}.pdf`);
        } catch (error) {
            console.error('Error generando PDF de calendario:', error);
            this.showNotification('Error al generar el PDF del calendario: ' + error.message, 'error');
        }
    }

    generatePDF() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF no está disponible');
            }
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Revisión de Contrato', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.text('Información General', 15, 30);
            doc.autoTable({
                startY: 35,
                head: [['Campo', 'Valor']],
                body: this.getSectionData('informacion'),
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] }
            });

            let y = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.text('Aspectos Financieros', 15, y);
            doc.autoTable({
                startY: y + 5,
                head: [['Concepto', 'Porcentaje', 'Valor']],
                body: this.getFinancialData(),
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] }
            });

           $y = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.text('Condiciones de Ejecución', 15, y);
            doc.autoTable({
                startY: y + 5,
                head: [['Campo', 'Valor']],
                body: this.getSectionData('ejecucion'),
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] }
            });

            const cronogramaData = this.getCronogramaData();
            if (cronogramaData.length > 0) {
                y = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(12);
                doc.text('Cronograma de Trabajo', 15, y);
                doc.autoTable({
                    startY: y + 5,
                    head: [['Etapa', 'Fecha', 'Cantidad', 'Valor']],
                    body: cronogramaData,
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [2, 119, 189], textColor: [255, 255, 255] }
                });
            }

            doc.save('revision_contrato.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            this.showNotification('Error al generar el PDF: ' + error.message, 'error');
        }
    }

    getSectionData(sectionId) {
        return Array.from(document.getElementById(sectionId).querySelectorAll('input, textarea, p'))
            .filter(el => el.id !== 'cronograma')
            .map(el => [el.parentElement.previousElementSibling?.textContent || el.id, el.value || el.textContent]);
    }

    getFinancialData() {
        const data = [
            ['Costo Directo', '', document.getElementById('valorSubtotalDisplay')?.textContent || ''],
            ['Subtotal sin AIU', '', document.getElementById('valorSubtotalSinAIU')?.textContent || ''],
        ];
        if (this.state.currency === 'COP' || this.state.convertCurrency) {
            if (document.getElementById('conAIU')?.checked) {
                data.push(
                    ['Administración', `${document.getElementById('administracion')?.value || 0}%`, document.getElementById('valorAdministracion')?.textContent || ''],
                    ['Imprevistos', `${document.getElementById('imprevistos')?.value || 0}%`, document.getElementById('valorImprevistos')?.textContent || ''],
                    ['Utilidad', `${document.getElementById('utilidad')?.value || 0}%`, document.getElementById('valorUtilidad')?.textContent || ''],
                    ['Total AIU', '', document.getElementById('totalAIU')?.textContent || ''],
                    ['Subtotal con AIU', '', document.getElementById('valorSubtotalConAIU')?.textContent || '']
                );
            }
            data.push(['IVA', `${document.getElementById('iva')?.value || 0}%`, document.getElementById('valorIVA')?.textContent || '']);
        }
        data.push(
            ['Valor Total', '', document.getElementById('valorTotal')?.textContent || ''],
            ['Anticipo', `${document.getElementById('porcentajeAnticipo')?.value || 0}%`, document.getElementById('valorAnticipo')?.textContent || ''],
            ['Avance de Obra', document.getElementById('porcentajeAvance')?.textContent || '', document.getElementById('valorAvance')?.textContent || ''],
            ['Retenido', `${document.getElementById('porcentajeRetenido')?.value || 0}%`, document.getElementById('valorRetenido')?.textContent || '']
        );
        return data;
    }

    getCronogramaData() {
        const tbody = document.querySelector('#cronogramaTable tbody');
        if (!tbody || tbody.children.length === 0) return [];
        return Array.from(tbody.children).map(row => {
            const cells = row.getElementsByTagName('td');
            return [cells[0].textContent, cells[1].textContent, cells[2].textContent, cells[3].textContent];
        });
    }

    getContractData() {
        const totalInBaseCurrency = this.state.financialResults?.total || 0;
        const valorTotal = (this.state.convertCurrency && this.state.currency !== 'COP')
            ? totalInBaseCurrency * this.exchangeRates[this.state.currency]
            : totalInBaseCurrency;
        return {
            nombreProyecto: document.getElementById('nombreProyecto')?.value || '',
            numeroContrato: document.getElementById('numeroContrato')?.value || '',
            contratante: document.getElementById('nombreContratante')?.value || '',
            cantidad: parseInt(document.getElementById('cantidad')?.value) || 0,
            unidadMedida: document.getElementById('unidadMedida')?.value || 'M2',
            valorTotal: valorTotal,
            plazoEjecucion: parseInt(document.getElementById('plazoEjecucion')?.value) || 0,
            fechaInicio: document.getElementById('fechaInicio')?.value || '',
            fechaFinal: document.getElementById('fechaFinal')?.textContent || ''
        };
    }

    saveJSON() {
        const data = this.getContractData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contrato.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('JSON guardado', 'success');
    }

    loadJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Object.entries(data).forEach(([key, value]) => {
                    const el = document.getElementById(key);
                    if (el) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
                        else if (el.tagName === 'P') el.textContent = value;
                    }
                });
                this.calculateFinancials();
                this.calculateExecutionDates();
                this.showNotification('JSON cargado', 'success');
            } catch (error) {
                console.error('Error al cargar JSON:', error);
                this.showNotification('Error al cargar JSON', 'error');
            }
        };
        reader.readAsText(file);
    }

    formatCurrency(value) {
        let displayValue = value;
        let symbol = this.currencySymbols[this.state.currency];
        let currencyCode = this.state.currency;

        if (this.state.convertCurrency && this.state.currency !== 'COP') {
            displayValue = value * this.exchangeRates[this.state.currency];
            symbol = this.currencySymbols['COP'];
            currencyCode = 'COP';
        }

        return `${symbol} ${new Intl.NumberFormat('es-CO', { style: 'decimal', minimumFractionDigits: 2 }).format(displayValue)} ${currencyCode}`;
    }

    formatNumber(value) {
        return new Intl.NumberFormat('es-CO').format(value);
    }

    formatDate(date) {
        return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateTabContent() {
        if (this.state.activeTab === 'historico') this.loadHistoryTable();
        if (this.state.activeTab === 'calendario') this.loadCalendarTable();
    }

    saveFormState() {
        const formState = {};
        document.querySelectorAll('input, select, textarea').forEach(el => {
            formState[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        localStorage.setItem('formState', JSON.stringify(formState));
    }

    checkNotifications() {
        document.querySelectorAll('input, select, textarea').forEach(el => this.validateInput(el));
    }
}

document.addEventListener('DOMContentLoaded', () => new ContractApp());
