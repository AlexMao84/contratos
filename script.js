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
            convertCurrency: true,
            searchQuery: '',
            cronogramaData: [],
            showCronogramaChart: false,
            calendarView: 'bars',
            historySort: { column: null, ascending: true }
        };
        this.exchangeRates = { COP: 1, USD: 4100, EUR: 4500 };
        this.currencySymbols = { COP: '$', USD: '$', EUR: '€' };
        this.lastFinancialHash = '';
        this.chart = null;
        this.init();
    }

    init() {
        this.loadInitialData();
        this.loadFormState();
        this.setupEventListeners();
        this.updateTRMVisibility();
        this.updateCOPSections();
        this.calculateFinancials();
        this.calculateFechaLlegadaMaterial();
        this.updateTabContent();
        this.checkNotifications();
        this.updateContratanteList();
        this.updateProyectoFilter();
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        document.getElementById('themeSelector').value = savedTheme;
    }

    loadInitialData() {
        if (!this.state.contractsHistory.length) {
            this.state.contractsHistory.push({
                nombreProyecto: "Proyecto Inicial",
                numeroContrato: "C-001",
                contratante: "Cliente Ejemplo",
                descripcion: "Descripción de prueba",
                ubicacion: "Ciudad",
                tipoContrato: "Obra",
                estadoContrato: "En Ejecución",
                cantidad: 100,
                unidadMedida: "M2",
                material: "Concreto",
                marca: "MarcaX",
                importacion: "No",
                disponibleInventario: "Sí",
                tiemposImportacion: 0,
                fechaLlegadaMaterial: "",
                nivelComplejidad: "Básico",
                complejidadComentarios: "",
                valorTotal: 5000000,
                plazoEjecucion: 0,
                fechaInicio: "2025-01-01",
                fechaFinal: "",
                tiempoPlaneacion: 4,
                tiempoCronogramaFinal: 1,
                tiempoFabricacionDespacho: 2,
                tiempoInstalacion: 3,
                direccionRadicacion: "",
                nombreRadica: "",
                fechaCierreContable: "",
                documentosAdjuntos: ""
            });
            localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
        }
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
        document.querySelectorAll('.actions button, footer button').forEach(btn =>
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action)));
        document.getElementById('conAIU')?.addEventListener('change', () => this.calculateFinancials());
        document.getElementById('prevYear')?.addEventListener('click', () => this.changeCalendarYear(-1));
        document.getElementById('nextYear')?.addEventListener('click', () => this.changeCalendarYear(1));
        document.getElementById('toggleBars')?.addEventListener('click', () => this.toggleBars());
        document.getElementById('jsonFile')?.addEventListener('change', (e) => this.loadJSON(e));
        document.getElementById('themeSelector')?.addEventListener('change', (e) => this.setTheme(e.target.value));
        document.getElementById('searchHistory')?.addEventListener('input', (e) => {
            this.state.searchQuery = e.target.value.toLowerCase();
            this.loadHistoryTable();
        });
        document.getElementById('recalculate')?.addEventListener('click', () => this.calculateFinancials());
        document.getElementById('duplicateProject')?.addEventListener('click', () => this.duplicateProject());
        document.getElementById('previewCronograma')?.addEventListener('click', () => this.calculateExecutionDates(true));
        document.getElementById('recalculateCronograma')?.addEventListener('click', () => this.calculateExecutionDates());
        document.getElementById('exportCronogramaImage')?.addEventListener('click', () => this.exportCronogramaImage());
        document.getElementById('toggleCronogramaChart')?.addEventListener('click', () => this.toggleCronogramaChart());
        document.getElementById('filterEstado')?.addEventListener('change', () => this.loadHistoryTable());
        document.getElementById('filterFechaInicio')?.addEventListener('change', () => this.loadHistoryTable());
        document.getElementById('filterFechaFin')?.addEventListener('change', () => this.loadHistoryTable());
        document.getElementById('compareContracts')?.addEventListener('click', () => this.compareContracts());
        document.getElementById('changeView')?.addEventListener('click', () => this.toggleCalendarView());
        document.getElementById('exportCalendarImage')?.addEventListener('click', () => this.exportCalendarImage());
        document.getElementById('filterProyecto')?.addEventListener('change', () => this.loadCalendarTable());
        document.querySelector('#tablaHistorico thead')?.addEventListener('click', (e) => this.sortHistoryTable(e));
    }

    handleInputChange(el) {
        this.validateInput(el);
        this.saveFormState();
        if (this.state.activeTab === 'financieros') this.calculateFinancials();
        if (this.state.activeTab === 'ejecucion') this.calculateExecutionDates();
        if (el.id === 'fechaInicio' || el.id === 'tiemposImportacion' || el.id === 'importacion') this.calculateFechaLlegadaMaterial();
        this.checkNotifications();
    }

    openTab(tabId) {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
        this.state.activeTab = tabId;
        this.updateTabContent();
    }

    updateTabContent() {
        if (this.state.activeTab === 'historico') this.loadHistoryTable();
        if (this.state.activeTab === 'calendario') this.loadCalendarTable();
        if (this.state.activeTab === 'ejecucion') this.calculateExecutionDates();
    }

    validateInput(input) {
        const errorMessage = input.nextElementSibling;
        if (!errorMessage || !errorMessage.classList.contains('error-message')) return;
        if (input.hasAttribute('required') && !input.value.trim()) {
            input.classList.add('error');
            errorMessage.textContent = 'Este campo es obligatorio';
        } else if (input.type === 'number' && input.value < (input.min || 0)) {
            input.classList.add('error');
            errorMessage.textContent = `El valor debe ser mayor o igual a ${input.min || 0}`;
        } else {
            input.classList.remove('error');
            errorMessage.textContent = '';
        }
    }

    saveFormState() {
        const formData = {};
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox') formData[el.id] = el.checked;
            else formData[el.id] = el.value;
        });
        localStorage.setItem('formData', JSON.stringify(formData));
    }

    loadFormState() {
        const formData = JSON.parse(localStorage.getItem('formData') || '{}');
        Object.entries(formData).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') el.checked = value;
                else el.value = value;
            }
        });
    }

    updateTRMVisibility() {
        document.getElementById('trmUSD').style.display = this.state.currency === 'USD' ? 'block' : 'none';
        document.getElementById('trmEUR').style.display = this.state.currency === 'EUR' ? 'block' : 'none';
    }

    updateCOPSections() {
        const isCOP = this.state.currency === 'COP';
        document.getElementById('convertCurrency').parentElement.style.display = isCOP ? 'none' : 'block';
    }

    calculateFechaLlegadaMaterial() {
        const fechaInicio = new Date(document.getElementById('fechaInicio')?.value);
        const tiemposImportacion = parseInt(document.getElementById('tiemposImportacion')?.value) || 0;
        const importacion = document.getElementById('importacion')?.value;

        if (importacion === 'No' || isNaN(fechaInicio.getTime()) || tiemposImportacion <= 0) {
            document.getElementById('fechaLlegadaMaterial').value = '';
            return;
        }

        const fechaLlegada = new Date(fechaInicio);
        fechaLlegada.setDate(fechaInicio.getDate() + tiemposImportacion);
        document.getElementById('fechaLlegadaMaterial').value = this.formatDate(fechaLlegada);
    }

    getFinancialInputs() {
        return {
            valorSubtotal: parseFloat(document.getElementById('valorSubtotal')?.value) || 0,
            conAIU: document.getElementById('conAIU')?.checked || false,
            administracion: parseFloat(document.getElementById('administracion')?.value) || 0,
            imprevistos: parseFloat(document.getElementById('imprevistos')?.value) || 0,
            utilidad: parseFloat(document.getElementById('utilidad')?.value) || 0,
            iva: parseFloat(document.getElementById('iva')?.value) || 0,
            porcentajeAnticipo: parseFloat(document.getElementById('porcentajeAnticipo')?.value) || 0,
            porcentajeRetenido: parseFloat(document.getElementById('porcentajeRetenido')?.value) || 0
        };
    }

    computeFinancials({ valorSubtotal, conAIU, administracion, imprevistos, utilidad, iva, porcentajeAnticipo, porcentajeRetenido }) {
        let subtotalSinAIU = valorSubtotal;
        let valorAdministracion = 0, valorImprevistos = 0, valorUtilidad = 0, totalAIU = 0, subtotalConAIU = 0, valorIVA = 0, total = 0;

        if (conAIU) {
            valorAdministracion = subtotalSinAIU * (administracion / 100);
            valorImprevistos = subtotalSinAIU * (imprevistos / 100);
            valorUtilidad = subtotalSinAIU * (utilidad / 100);
            totalAIU = valorAdministracion + valorImprevistos + valorUtilidad;
            subtotalConAIU = subtotalSinAIU + totalAIU;
        } else {
            subtotalConAIU = subtotalSinAIU;
        }

        valorIVA = subtotalConAIU * (iva / 100);
        total = subtotalConAIU + valorIVA;

        const valorAnticipo = total * (porcentajeAnticipo / 100);
        const valorRetenido = total * (porcentajeRetenido / 100);
        const porcentajeAvance = 100 - porcentajeAnticipo - porcentajeRetenido;
        const valorAvance = total * (porcentajeAvance / 100);

        return {
            subtotalSinAIU,
            valorAdministracion,
            valorImprevistos,
            valorUtilidad,
            totalAIU,
            subtotalConAIU,
            valorIVA,
            total,
            valorAnticipo,
            porcentajeAvance,
            valorAvance,
            valorRetenido
        };
    }

    calculateFinancials() {
        const inputs = this.getFinancialInputs();
        const hash = JSON.stringify(inputs);
        if (this.lastFinancialHash === hash) return;
        this.lastFinancialHash = hash;

        const results = this.computeFinancials(inputs);
        this.state.financialResults = results;

        const displayValue = (value) => this.formatCurrency(value);

        document.getElementById('valorSubtotalDisplay').textContent = displayValue(results.subtotalSinAIU);
        document.getElementById('valorSubtotalSinAIU').textContent = displayValue(results.subtotalSinAIU);
        document.getElementById('valorAdministracion').textContent = displayValue(results.valorAdministracion);
        document.getElementById('valorImprevistos').textContent = displayValue(results.valorImprevistos);
        document.getElementById('valorUtilidad').textContent = displayValue(results.valorUtilidad);
        document.getElementById('totalAIU').textContent = displayValue(results.totalAIU);
        document.getElementById('valorSubtotalConAIU').textContent = displayValue(results.subtotalConAIU);
        document.getElementById('valorIVA').textContent = displayValue(results.valorIVA);
        document.getElementById('valorTotal').textContent = displayValue(results.total);
        document.getElementById('valorAnticipo').textContent = displayValue(results.valorAnticipo);
        document.getElementById('porcentajeAvance').textContent = `${results.porcentajeAvance}%`;
        document.getElementById('valorAvance').textContent = displayValue(results.valorAvance);
        document.getElementById('valorRetenido').textContent = displayValue(results.valorRetenido);
    }

    getExecutionInputs() {
        const startDate = new Date(document.getElementById('fechaInicio')?.value);
        const tiempoPlaneacion = parseInt(document.getElementById('tiempoPlaneacion')?.value) || 0;
        const tiempoCronogramaFinal = parseInt(document.getElementById('tiempoCronogramaFinal')?.value) || 0;
        const tiempoFabricacionDespacho = parseInt(document.getElementById('tiempoFabricacionDespacho')?.value) || 0;
        const tiempoInstalacion = parseInt(document.getElementById('tiempoInstalacion')?.value) || 0;
        const periodicidadCortes = document.getElementById('periodicidadCortes')?.value || 'mensual';
        const cantidad = parseInt(document.getElementById('cantidad')?.value) || 0;
        const unidadMedida = document.getElementById('unidadMedida')?.value || 'M2';
        const fechaLlegadaMaterial = document.getElementById('fechaLlegadaMaterial')?.value;

        return {
            startDate,
            tiempoPlaneacion,
            tiempoCronogramaFinal,
            tiempoFabricacionDespacho,
            tiempoInstalacion,
            periodicidadCortes,
            cantidad,
            unidadMedida,
            fechaLlegadaMaterial
        };
    }

    calculateExecutionDates(preview = false) {
        const inputs = this.getExecutionInputs();
        if (isNaN(inputs.startDate.getTime())) {
            document.getElementById('fechaFinal').textContent = 'Fecha inválida';
            document.getElementById('cronogramaTable').style.display = 'none';
            document.getElementById('cronograma').style.display = 'block';
            this.state.cronogramaData = [];
            return;
        }

        document.getElementById('fechaInicioRef').textContent = this.formatDate(inputs.startDate);

        const fechasEtapas = this.calculateStageDates(inputs);
        const endDate = fechasEtapas.fechaFinInstalacion;

        document.getElementById('fechaFinal').textContent = this.formatDate(endDate);

        this.updateExecutionDisplay(fechasEtapas, inputs);

        if (!preview) this.updateCronogramaChart();
    }

    calculateStageDates({ startDate, tiempoPlaneacion, tiempoCronogramaFinal, tiempoFabricacionDespacho, tiempoInstalacion, periodicidadCortes }) {
        const fechas = {};
        let currentDate = new Date(startDate);

        fechas.fechaFinPlaneacion = new Date(currentDate);
        fechas.fechaFinPlaneacion.setDate(currentDate.getDate() + tiempoPlaneacion * 7);

        currentDate = new Date(fechas.fechaFinPlaneacion);
        fechas.fechaFinCronogramaFinal = new Date(currentDate);
        fechas.fechaFinCronogramaFinal.setDate(currentDate.getDate() + tiempoCronogramaFinal * 7);

        currentDate = new Date(fechas.fechaFinCronogramaFinal);
        fechas.fechaFinFabricacionDespacho = new Date(currentDate);
        fechas.fechaFinFabricacionDespacho.setDate(currentDate.getDate() + tiempoFabricacionDespacho * 7);

        currentDate = new Date(fechas.fechaFinFabricacionDespacho);
        fechas.fechaInicioInstalacion = new Date(currentDate);
        fechas.fechaFinInstalacion = new Date(currentDate);
        fechas.fechaFinInstalacion.setMonth(currentDate.getMonth() + tiempoInstalacion);

        const totalDuration = Math.round((fechas.fechaFinInstalacion - startDate) / (1000 * 60 * 60 * 24));

        const cutFrequencyDays = {
            semanal: 7,
            quincenal: 15,
            mensual: 30
        }[periodicidadCortes] || 30;

        const instalacionDurationDays = Math.round((fechas.fechaFinInstalacion - fechas.fechaInicioInstalacion) / (1000 * 60 * 60 * 24));
        const numCortes = Math.max(1, Math.floor(instalacionDurationDays / cutFrequencyDays));

        return {
            fechaFinPlaneacion: fechas.fechaFinPlaneacion,
            fechaFinCronogramaFinal: fechas.fechaFinCronogramaFinal,
            fechaFinFabricacionDespacho: fechas.fechaFinFabricacionDespacho,
            fechaInicioInstalacion: fechas.fechaInicioInstalacion,
            fechaFinInstalacion: fechas.fechaFinInstalacion,
            totalDuration,
            numCortes,
            cutFrequencyDays
        };
    }

    updateExecutionDisplay(fechasEtapas, { startDate, cantidad, unidadMedida, periodicidadCortes, fechaLlegadaMaterial }) {
        const { total } = this.state.financialResults || this.computeFinancials(this.getFinancialInputs());
        const { fechaFinPlaneacion, fechaFinCronogramaFinal, fechaFinFabricacionDespacho, fechaInicioInstalacion, fechaFinInstalacion, numCortes, cutFrequencyDays } = fechasEtapas;

        const cantidadPorCorte = cantidad / numCortes;
        const valorPorCorte = total / numCortes;

        // Lista de etapas con sus fechas para ordenar cronológicamente
        const etapas = [
            { nombre: 'Inicio (Anticipo)', fecha: startDate, cantidad: '-', valor: 0 },
            { nombre: 'Fin Planeación', fecha: fechaFinPlaneacion, cantidad: '-', valor: 0 },
            { nombre: 'Entrega Cronograma Final', fecha: fechaFinCronogramaFinal, cantidad: '-', valor: 0 },
            { nombre: 'Fin Fabricación/Despacho', fecha: fechaFinFabricacionDespacho, cantidad: '-', valor: 0 },
        ];

        // Agregar la llegada del material si existe
        if (fechaLlegadaMaterial) {
            const fechaLlegada = new Date(fechaLlegadaMaterial);
            if (!isNaN(fechaLlegada.getTime())) {
                etapas.push({ nombre: 'Llegada Material', fecha: fechaLlegada, cantidad: '-', valor: 0 });
            }
        }

        etapas.push({ nombre: 'Inicio Instalación', fecha: fechaInicioInstalacion, cantidad: '-', valor: 0 });

        // Agregar los cortes
        for (let i = 1; i <= numCortes; i++) {
            const cutDate = new Date(fechaInicioInstalacion);
            cutDate.setDate(fechaInicioInstalacion.getDate() + i * cutFrequencyDays);
            if (cutDate <= fechaFinInstalacion) {
                etapas.push({
                    nombre: `Corte ${i}`,
                    fecha: cutDate,
                    cantidad: `${this.formatNumber(cantidadPorCorte)} ${unidadMedida}`,
                    valor: valorPorCorte
                });
            }
        }

        etapas.push({ nombre: 'Fin Instalación', fecha: fechaFinInstalacion, cantidad: '-', valor: 0 });

        // Ordenar las etapas por fecha
        etapas.sort((a, b) => a.fecha - b.fecha);

        // Calcular totales
        let totalCantidad = 0, totalValor = 0;
        etapas.forEach(etapa => {
            if (etapa.nombre.startsWith('Corte')) {
                totalCantidad += cantidadPorCorte;
                totalValor += valorPorCorte;
            }
        });

        // Actualizar la tabla
        const tbody = document.querySelector('#cronogramaTable tbody');
        tbody.innerHTML = '';
        document.getElementById('cronogramaTable').style.display = 'table';
        document.getElementById('cronograma').style.display = 'none';

        this.state.cronogramaData = [];

        etapas.forEach(etapa => {
            const rowData = [etapa.nombre, this.formatDate(etapa.fecha), etapa.cantidad, etapa.valor];
            this.state.cronogramaData.push(rowData);
            tbody.appendChild(this.createRow(
                etapa.nombre,
                this.formatDate(etapa.fecha),
                etapa.cantidad,
                etapa.valor === '-' ? '-' : this.formatCurrency(etapa.valor)
            ));
        });

        const totalRowData = ['Total', '-', `${this.formatNumber(totalCantidad)} ${unidadMedida}`, totalValor];
        this.state.cronogramaData.push(totalRowData);
        const totalRow = this.createRow('Total', '-', `${this.formatNumber(totalCantidad)} ${unidadMedida}`, this.formatCurrency(totalValor));
        totalRow.classList.add('total-row');
        tbody.appendChild(totalRow);
    }

    createRow(...cells) {
        const row = document.createElement('tr');
        cells.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            row.appendChild(td);
        });
        return row;
    }

    updateCronogramaChart() {
        if (!this.state.showCronogramaChart) return;
        const ctx = document.getElementById('cronogramaChart').getContext('2d');
        const labels = this.state.cronogramaData.map(row => row[0]);
        const values = this.state.cronogramaData.map(row => row[3]);

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Valor por Etapa',
                    data: values,
                    backgroundColor: '#4B5EAA'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Valor (${this.state.currency})`
                        },
                        ticks: {
                            callback: (value) => this.formatNumber(value)
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                return `Valor: ${this.formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    toggleCronogramaChart() {
        this.state.showCronogramaChart = !this.state.showCronogramaChart;
        const canvas = document.getElementById('cronogramaChart');
        canvas.style.display = this.state.showCronogramaChart ? 'block' : 'none';
        if (this.state.showCronogramaChart) this.updateCronogramaChart();
    }

    exportCronogramaImage() {
        const canvas = document.createElement('canvas');
        const table = document.getElementById('cronogramaTable');
        html2canvas(table).then(canvas => {
            const link = document.createElement('a');
            link.download = 'cronograma.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            this.showNotification('Error al exportar la imagen del cronograma', 'error');
            console.error(err);
        });
    }

    getContractData() {
        const totalInBaseCurrency = this.state.financialResults?.total || 0;
        const valorTotal = (this.state.convertCurrency && this.state.currency !== 'COP')
            ? totalInBaseCurrency * this.exchangeRates[this.state.currency]
            : totalInBaseCurrency;

        const inputs = this.getExecutionInputs();
        const fechasEtapas = this.calculateStageDates(inputs);

        return {
            nombreProyecto: document.getElementById('nombreProyecto')?.value?.trim() || '',
            numeroContrato: document.getElementById('numeroContrato')?.value?.trim() || '',
            contratante: document.getElementById('nombreContratante')?.value?.trim() || '',
            descripcion: document.getElementById('descripcion')?.value?.trim() || '',
            ubicacion: document.getElementById('ubicacion')?.value?.trim() || '',
            tipoContrato: document.getElementById('tipoContrato')?.value || 'Obra',
            estadoContrato: document.getElementById('estadoContrato')?.value || 'Pendiente',
            cantidad: parseInt(document.getElementById('cantidad')?.value) || 0,
            unidadMedida: document.getElementById('unidadMedida')?.value || 'M2',
            material: document.getElementById('material')?.value?.trim() || '',
            marca: document.getElementById('marca')?.value?.trim() || '',
            importacion: document.getElementById('importacion')?.value || 'No',
            disponibleInventario: document.getElementById('disponibleInventario')?.value || 'No',
            tiemposImportacion: parseInt(document.getElementById('tiemposImportacion')?.value) || 0,
            fechaLlegadaMaterial: document.getElementById('fechaLlegadaMaterial')?.value || '',
            nivelComplejidad: document.getElementById('nivelComplejidad')?.value || 'Básico',
            complejidadComentarios: document.getElementById('complejidadComentarios')?.value?.trim() || '',
            valorTotal,
            plazoEjecucion: fechasEtapas.totalDuration,
            fechaInicio: document.getElementById('fechaInicio')?.value || '',
            fechaFinal: this.formatDate(fechasEtapas.fechaFinInstalacion),
            tiempoPlaneacion: parseInt(document.getElementById('tiempoPlaneacion')?.value) || 0,
            tiempoCronogramaFinal: parseInt(document.getElementById('tiempoCronogramaFinal')?.value) || 0,
            tiempoFabricacionDespacho: parseInt(document.getElementById('tiempoFabricacionDespacho')?.value) || 0,
            tiempoInstalacion: parseInt(document.getElementById('tiempoInstalacion')?.value) || 0,
            direccionRadicacion: document.getElementById('direccionRadicacion')?.value?.trim() || '',
            nombreRadica: document.getElementById('nombreRadica')?.value?.trim() || '',
            fechaCierreContable: document.getElementById('fechaCierreContable')?.value || '',
            documentosAdjuntos: document.getElementById('documentosAdjuntos')?.value?.trim() || ''
        };
    }

    handleAction(action) {
        if (action === 'addContract') this.addContract();
        if (action === 'downloadPDF') this.downloadPDF();
        if (action === 'saveJSON') this.saveJSON();
        if (action === 'loadJSON') document.getElementById('jsonFile').click();
        if (action === 'downloadHistoryPDF') this.downloadHistoryPDF();
        if (action === 'downloadHistoryExcel') this.downloadHistoryExcel();
        if (action === 'clearHistory') this.clearHistory();
        if (action === 'downloadCalendarPDF') this.downloadCalendarPDF();
        if (action === 'downloadCalendarExcel') this.downloadCalendarExcel();
    }

    addContract() {
        const contractData = this.getContractData();
        const requiredFields = ['nombreProyecto', 'contratante', 'cantidad', 'fechaInicio', 'tiempoPlaneacion', 'tiempoCronogramaFinal', 'tiempoFabricacionDespacho', 'tiempoInstalacion'];
        const missingFields = requiredFields.filter(field => !contractData[field] || (typeof contractData[field] === 'string' && contractData[field].trim() === ''));

        if (missingFields.length) {
            this.showNotification(`Faltan campos obligatorios: ${missingFields.join(', ')}`, 'error');
            return;
        }

        this.state.contractsHistory.push(contractData);
        localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
        this.loadHistoryTable();
        this.loadCalendarTable();
        this.updateContratanteList();
        this.updateProyectoFilter();
        this.showNotification('Contrato agregado al historial', 'success');
    }

    loadHistoryTable() {
        const tbody = document.querySelector('#tablaHistorico tbody');
        const filterEstado = document.getElementById('filterEstado')?.value;
        const filterFechaInicio = document.getElementById('filterFechaInicio')?.value;
        const filterFechaFin = document.getElementById('filterFechaFin')?.value;

        let filteredHistory = this.state.contractsHistory.filter(c =>
            (!filterEstado || c.estadoContrato === filterEstado) &&
            (!filterFechaInicio || new Date(c.fechaInicio) >= new Date(filterFechaInicio)) &&
            (!filterFechaFin || new Date(c.fechaFinal) <= new Date(filterFechaFin)) &&
            (c.nombreProyecto.toLowerCase().includes(this.state.searchQuery) ||
             c.contratante.toLowerCase().includes(this.state.searchQuery) ||
             c.material.toLowerCase().includes(this.state.searchQuery) ||
             c.marca.toLowerCase().includes(this.state.searchQuery))
        );

        if (this.state.historySort.column) {
            filteredHistory.sort((a, b) => {
                const valA = a[this.state.historySort.column];
                const valB = b[this.state.historySort.column];
                return this.state.historySort.ascending ? valA > valB ? 1 : -1 : valA < valB ? 1 : -1;
            });
        }

        tbody.innerHTML = filteredHistory.map((c, index) => `
            <tr class="${c.estadoContrato === 'En Ejecución' ? 'active-contract' : ''}">
                <td>${c.nombreProyecto}</td>
                <td>${c.contratante}</td>
                <td>${this.formatNumber(c.cantidad)} ${c.unidadMedida}</td>
                <td>${c.material}</td>
                <td>${c.marca}</td>
                <td>${c.nivelComplejidad}</td>
                <td>${this.formatCurrency(c.valorTotal)}</td>
                <td>${c.plazoEjecucion} días</td>
                <td>${this.formatDate(new Date(c.fechaInicio))}</td>
                <td>${this.formatDate(new Date(c.fechaFinal))}</td>
                <td><button class="edit-btn" data-index="${index}"><i class="fas fa-edit"></i> Editar</button></td>
            </tr>
        `).join('') || '<tr><td colspan="11">Sin contratos</td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.editContract(parseInt(btn.dataset.index)));
        });

        document.getElementById('totalContratos').textContent = filteredHistory.length;
        document.getElementById('valorTotalAcumulado').textContent = this.formatCurrency(filteredHistory.reduce((sum, c) => sum + c.valorTotal, 0));
    }

    sortHistoryTable(e) {
        const th = e.target.closest('th');
        if (!th) return;
        const column = th.cellIndex;
        const columnMap = ['nombreProyecto', 'contratante', 'cantidad', 'material', 'marca', 'nivelComplejidad', 'valorTotal', 'plazoEjecucion', 'fechaInicio', 'fechaFinal'];
        const newColumn = columnMap[column];
        if (this.state.historySort.column === newColumn) {
            this.state.historySort.ascending = !this.state.historySort.ascending;
        } else {
            this.state.historySort.column = newColumn;
            this.state.historySort.ascending = true;
        }
        this.loadHistoryTable();
    }

    editContract(index) {
        const contract = this.state.contractsHistory[index];
        Object.entries(contract).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (el) {
                if (key === 'fechaFinal') el.textContent = value;
                else if (el.type === 'checkbox') el.checked = value;
                else el.value = value;
            }
        });
        this.state.contractsHistory.splice(index, 1);
        localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
        this.loadHistoryTable();
        this.loadCalendarTable();
        this.updateContratanteList();
        this.updateProyectoFilter();
        this.showNotification('Contrato cargado para edición', 'success');
        this.openTab('informacion');
    }

    compareContracts() {
        this.showNotification('Funcionalidad de comparación en desarrollo', 'info');
    }

    updateContratanteList() {
        const datalist = document.getElementById('contratanteList');
        datalist.innerHTML = '';
        const uniqueContratantes = [...new Set(this.state.contractsHistory.map(c => c.contratante))];
        uniqueContratantes.forEach(contratante => {
            const option = document.createElement('option');
            option.value = contratante;
            datalist.appendChild(option);
        });
    }

    updateProyectoFilter() {
        const select = document.getElementById('filterProyecto');
        select.innerHTML = '<option value="">Todos</option>';
        const uniqueProyectos = [...new Set(this.state.contractsHistory.map(c => c.nombreProyecto))];
        uniqueProyectos.forEach(proyecto => {
            const option = document.createElement('option');
            option.value = proyecto;
            option.textContent = proyecto;
            select.appendChild(option);
        });
    }

    calculateCutsForContract(contract) {
        const startDate = new Date(contract.fechaInicio);
        const endDate = new Date(contract.fechaFinal);
        const durationDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
        const cutFrequencyDays = 30;
        const numCortes = Math.max(1, Math.floor(durationDays / cutFrequencyDays));
        const valorPorCorte = contract.valorTotal / numCortes;

        const cuts = [];
        for (let i = 0; i < numCortes; i++) {
            const cutDate = new Date(startDate);
            cutDate.setDate(startDate.getDate() + i * cutFrequencyDays);
            if (cutDate <= endDate) {
                cuts.push({ date: cutDate, valor: valorPorCorte });
            }
        }
        return cuts;
    }

    loadCalendarTable() {
        const tbody = document.querySelector('#calendarioTable tbody');
        const tfoot = document.querySelector('#calendarioTable tfoot');
        const filterProyecto = document.getElementById('filterProyecto')?.value;
        const monthlyTotals = Array(12).fill(0);
        let yearlyTotal = 0;

        let filteredHistory = filterProyecto ? this.state.contractsHistory.filter(c => c.nombreProyecto === filterProyecto) : this.state.contractsHistory;
        const cutsByProject = filteredHistory.map(contract => this.calculateCutsForContract(contract));
        const allValues = cutsByProject.flatMap(cuts => cuts.map(cut => cut.valor)).filter(v => v > 0);
        const maxValue = Math.max(...allValues, 0) || 1000000;

        tbody.innerHTML = filteredHistory.map(contract => {
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
                        const intensity = m > 0 ? Math.min((m / maxValue) * 100, 100) : 0;
                        const className = m > 0 ? `intensity-${Math.floor(intensity / 20)}` : '';
                        return `<td class="${className}" title="${this.formatCurrency(m)}">
                            ${m > 0 && this.state.calendarView === 'bars' ? `<div class="bar" style="width: ${intensity}%;"></div>` : m > 0 ? this.formatCurrency(m) : '-'}
                        </td>`;
                    }).join('')}
                    <td>${this.formatCurrency(projectTotal)}</td>
                </tr>`;
        }).join('') || '<tr><td colspan="14">Sin contratos</td></tr>';

        tfoot.innerHTML = `
            <tr class="total-row">
                <td>Total</td>
                ${monthlyTotals.map(total => {
                    const intensity = total > 0 ? Math.min((total / maxValue) * 100, 100) : 0;
                    const className = total > 0 ? `intensity-${Math.floor(intensity / 20)}` : '';
                    return `<td class="${className}" title="${this.formatCurrency(total)}">
                        ${total > 0 && this.state.calendarView === 'bars' ? `<div class="bar" style="width: ${intensity}%;"></div>` : total > 0 ? this.formatCurrency(total) : '-'}
                    </td>`;
                }).join('')}
                <td>${this.formatCurrency(yearlyTotal)}</td>
            </tr>
        `;
        document.getElementById('calendarYear').textContent = this.state.calendarYear;
    }

    toggleCalendarView() {
        this.state.calendarView = this.state.calendarView === 'bars' ? 'numbers' : 'bars';
        document.getElementById('changeView').querySelector('i').classList.toggle('fa-eye', this.state.calendarView === 'bars');
        document.getElementById('changeView').querySelector('i').classList.toggle('fa-list', this.state.calendarView === 'numbers');
        this.loadCalendarTable();
    }

    exportCalendarImage() {
        const canvas = document.createElement('canvas');
        const table = document.getElementById('calendarioTable');
        html2canvas(table).then(canvas => {
            const link = document.createElement('a');
            link.download = `calendario_${this.state.calendarYear}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            this.showNotification('Error al exportar la imagen del calendario', 'error');
            console.error(err);
        });
    }

    changeCalendarYear(delta) {
        this.state.calendarYear += delta;
        this.loadCalendarTable();
    }

    toggleBars() {
        this.state.showBars = !this.state.showBars;
        document.getElementById('toggleBars').querySelector('i').classList.toggle('fa-chart-bar', this.state.showBars);
        document.getElementById('toggleBars').querySelector('i').classList.toggle('fa-list', !this.state.showBars);
        this.loadCalendarTable();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    checkNotifications() {
        const today = new Date();
        this.state.contractsHistory.forEach(contract => {
            const endDate = new Date(contract.fechaFinal);
            const daysDiff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7 && daysDiff > 0 && !this.state.notifications.includes(contract.nombreProyecto)) {
                this.showNotification(`El proyecto ${contract.nombreProyecto} está próximo a finalizar (${daysDiff} días restantes)`, 'warning');
                this.state.notifications.push(contract.nombreProyecto);
            }
        });
    }

    downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    try {
        if (typeof doc.autoTable !== 'function') {
            throw new Error('El plugin autoTable no está cargado');
        }
        const cronogramaTable = document.querySelector('#cronogramaTable tbody');
        if (!cronogramaTable?.children.length) {
            this.showNotification('No hay datos en el cronograma para exportar', 'error');
            return;
        }
        doc.setFontSize(16);
        doc.text('Revisión de Contratos', 20, 20);
        doc.setFontSize(12);
        doc.text(`Proyecto: ${document.getElementById('nombreProyecto')?.value || 'N/A'}`, 20, 30);
        doc.text(`Contratante: ${document.getElementById('nombreContratante')?.value || 'N/A'}`, 20, 40);
        doc.text(`Valor Total: ${document.getElementById('valorTotal')?.textContent || 'N/A'}`, 20, 50);
        doc.autoTable({
            html: '#cronogramaTable',
            startY: 60,
            styles: { fontSize: 10, cellPadding: 2 },
            pageBreak: 'auto',
            rowPageBreak: 'avoid'
        });
        doc.save('contrato.pdf');
        this.showNotification('PDF descargado correctamente', 'success');
    } catch (error) {
        this.showNotification('Error al generar el PDF', 'error');
        console.error('Error en downloadPDF:', error.message, error.stack);
    }
}

downloadHistoryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    try {
        if (typeof doc.autoTable !== 'function') {
            throw new Error('El plugin autoTable no está cargado');
        }
        const historicoTable = document.querySelector('#tablaHistorico tbody');
        if (!historicoTable?.children.length || !this.state.contractsHistory.length) {
            this.showNotification('No hay contratos en el historial para exportar', 'error');
            return;
        }
        doc.setFontSize(16);
        doc.text('Histórico de Contratos', 20, 20);
        doc.autoTable({
            html: '#tablaHistorico',
            startY: 30,
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 10: { cellWidth: 0 } }, // Oculta la columna de acción
            pageBreak: 'auto',
            rowPageBreak: 'avoid'
        });
        doc.save('historico.pdf');
        this.showNotification('PDF descargado correctamente', 'success');
    } catch (error) {
        this.showNotification('Error al generar el PDF', 'error');
        console.error('Error en downloadHistoryPDF:', error.message, error.stack);
    }
}

    downloadHistoryExcel() {
        try {
            const ws = XLSX.utils.table_to_sheet(document.getElementById('tablaHistorico'));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
            XLSX.writeFile(wb, 'historico.xlsx');
            this.showNotification('Excel descargado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al generar el Excel', 'error');
            console.error(error);
        }
    }

    clearHistory() {
        if (confirm('¿Está seguro de que desea borrar el historial?')) {
            this.state.contractsHistory = [];
            localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
            this.loadHistoryTable();
            this.loadCalendarTable();
            this.updateContratanteList();
            this.updateProyectoFilter();
            this.showNotification('Historial borrado', 'success');
        }
    }

    downloadCalendarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    try {
        if (typeof doc.autoTable !== 'function') {
            throw new Error('El plugin autoTable no está cargado');
        }
        const calendarioTable = document.querySelector('#calendarioTable tbody');
        if (!calendarioTable?.children.length) {
            this.showNotification('No hay datos en el calendario para exportar', 'error');
            return;
        }
        doc.setFontSize(16);
        doc.text(`Calendario Anual ${this.state.calendarYear}`, 20, 20);
        doc.autoTable({
            html: '#calendarioTable',
            startY: 30,
            didParseCell: (data) => {
                const bar = data.cell.raw.querySelector('.bar');
                if (bar) {
                    data.cell.text = data.cell.raw.getAttribute('title') || '-';
                }
            },
            styles: { fontSize: 8, cellPadding: 2 },
            pageBreak: 'auto',
            rowPageBreak: 'avoid'
        });
        doc.save(`calendario_${this.state.calendarYear}.pdf`);
        this.showNotification('PDF descargado correctamente', 'success');
    } catch (error) {
        this.showNotification('Error al generar el PDF', 'error');
        console.error('Error en downloadCalendarPDF:', error.message, error.stack);
    }
}

    downloadCalendarExcel() {
        try {
            const ws = XLSX.utils.table_to_sheet(document.getElementById('calendarioTable'));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Calendario');
            XLSX.writeFile(wb, `calendario_${this.state.calendarYear}.xlsx`);
            this.showNotification('Excel descargado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al generar el Excel', 'error');
            console.error(error);
        }
    }

    saveJSON() {
        const data = this.getContractData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contrato.json';
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('JSON guardado correctamente', 'success');
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
                        if (el.type === 'checkbox') el.checked = value;
                        else el.value = value;
                    }
                });
                this.calculateFinancials();
                this.calculateExecutionDates();
                this.showNotification('Datos cargados desde JSON', 'success');
            } catch (error) {
                this.showNotification('Error al cargar el JSON', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    duplicateProject() {
        const contractData = this.getContractData();
        contractData.nombreProyecto = `${contractData.nombreProyecto} (Copia)`;
        contractData.numeroContrato = '';
        this.state.contractsHistory.push(contractData);
        localStorage.setItem('historicoContratos', JSON.stringify(this.state.contractsHistory));
        this.loadHistoryTable();
        this.loadCalendarTable();
        this.updateContratanteList();
        this.updateProyectoFilter();
        this.showNotification('Proyecto duplicado', 'success');
    }

    setTheme(theme) {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);
        localStorage.setItem('theme', theme);
    }

    formatDate(date) {
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toISOString().split('T')[0];
    }

    formatNumber(num) {
        return num.toLocaleString('es-CO');
    }

    formatCurrency(value) {
        const currency = this.state.currency;
        const symbol = this.currencySymbols[currency];
        return `${symbol}${this.formatNumber(value)} ${currency}`;
    }
}

document.addEventListener('DOMContentLoaded', () => new ContractApp());