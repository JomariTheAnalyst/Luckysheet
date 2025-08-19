// Chart Generation Utilities for Smart Sheet AI
class ChartGenerator {
    constructor() {
        this.chartTypes = {
            bar: 'column',
            line: 'line',
            pie: 'pie',
            area: 'area',
            scatter: 'scatter'
        };
    }

    /**
     * Generate chart configuration for Luckysheet
     */
    generateChart(data, config) {
        try {
            const { chartType, xColumn, yColumn, title, colors } = config;
            
            if (!this.validateChartData(data, xColumn, yColumn)) {
                throw new Error('Invalid chart data or column indices');
            }

            const chartData = this.prepareChartData(data, xColumn, yColumn, chartType);
            
            return {
                chartType: this.chartTypes[chartType] || 'column',
                chart: {
                    type: this.chartTypes[chartType] || 'column',
                    backgroundColor: 'transparent',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                },
                title: {
                    text: title || `${chartType.toUpperCase()} Chart`,
                    style: {
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333'
                    }
                },
                xAxis: this.generateXAxis(chartData, chartType),
                yAxis: this.generateYAxis(chartType),
                legend: this.generateLegend(chartType),
                plotOptions: this.generatePlotOptions(chartType, colors),
                series: this.generateSeries(chartData, chartType),
                credits: { enabled: false },
                exporting: { enabled: true }
            };
        } catch (error) {
            console.error('Error generating chart:', error);
            throw error;
        }
    }

    /**
     * Prepare data for charting
     */
    prepareChartData(data, xColumn, yColumn, chartType) {
        const hasHeaders = this.detectHeaders(data);
        const startRow = hasHeaders ? 1 : 0;
        
        const chartData = {
            categories: [],
            series: []
        };

        // Extract categories (X-axis data)
        for (let i = startRow; i < data.length; i++) {
            if (data[i] && data[i][xColumn] !== undefined) {
                chartData.categories.push(data[i][xColumn]?.toString() || `Item ${i}`);
            }
        }

        // Extract series data (Y-axis data)
        const seriesData = [];
        for (let i = startRow; i < data.length; i++) {
            if (data[i] && data[i][yColumn] !== undefined) {
                const value = parseFloat(data[i][yColumn]);
                seriesData.push(isNaN(value) ? 0 : value);
            }
        }

        chartData.series = [{
            name: hasHeaders && data[0] ? data[0][yColumn] || 'Values' : 'Values',
            data: seriesData
        }];

        // For pie charts, combine categories and values
        if (chartType === 'pie') {
            chartData.series[0].data = chartData.categories.map((cat, index) => ({
                name: cat,
                y: seriesData[index] || 0
            }));
        }

        return chartData;
    }

    /**
     * Generate X-axis configuration
     */
    generateXAxis(chartData, chartType) {
        if (chartType === 'pie') return null;

        return {
            categories: chartData.categories,
            title: {
                text: 'Categories',
                style: { fontSize: '12px' }
            },
            labels: {
                style: { fontSize: '11px' },
                rotation: chartData.categories.length > 8 ? -45 : 0
            }
        };
    }

    /**
     * Generate Y-axis configuration
     */
    generateYAxis(chartType) {
        if (chartType === 'pie') return null;

        return {
            title: {
                text: 'Values',
                style: { fontSize: '12px' }
            },
            labels: {
                style: { fontSize: '11px' }
            },
            gridLineWidth: 1,
            gridLineColor: '#e6e6e6'
        };
    }

    /**
     * Generate legend configuration
     */
    generateLegend(chartType) {
        return {
            enabled: chartType === 'pie' || chartType === 'area',
            align: 'right',
            verticalAlign: 'top',
            layout: 'vertical',
            x: 0,
            y: 100,
            itemStyle: {
                fontSize: '11px'
            }
        };
    }

    /**
     * Generate plot options
     */
    generatePlotOptions(chartType, colors = []) {
        const baseOptions = {
            series: {
                animation: {
                    duration: 1000
                },
                dataLabels: {
                    enabled: chartType === 'pie',
                    format: chartType === 'pie' ? '{point.name}: {point.percentage:.1f}%' : '{y}',
                    style: {
                        fontSize: '10px'
                    }
                }
            }
        };

        // Type-specific options
        switch (chartType) {
            case 'pie':
                baseOptions.pie = {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    showInLegend: true,
                    colors: colors.length > 0 ? colors : [
                        '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
                        '#00ff7f', '#8dd1e1', '#d084d0', '#ffb366'
                    ]
                };
                break;
            case 'bar':
            case 'column':
                baseOptions.column = {
                    borderWidth: 0,
                    borderRadius: 2,
                    colors: colors.length > 0 ? colors : ['#8884d8']
                };
                break;
            case 'line':
                baseOptions.line = {
                    lineWidth: 3,
                    marker: {
                        radius: 4,
                        symbol: 'circle'
                    },
                    colors: colors.length > 0 ? colors : ['#8884d8']
                };
                break;
            case 'area':
                baseOptions.area = {
                    fillOpacity: 0.6,
                    lineWidth: 2,
                    colors: colors.length > 0 ? colors : ['#8884d8']
                };
                break;
        }

        return baseOptions;
    }

    /**
     * Generate series data
     */
    generateSeries(chartData, chartType) {
        return chartData.series.map(series => ({
            ...series,
            type: this.chartTypes[chartType] || 'column'
        }));
    }

    /**
     * Detect if first row contains headers
     */
    detectHeaders(data) {
        if (!data || data.length === 0) return false;
        
        const firstRow = data[0];
        if (!Array.isArray(firstRow)) return false;

        // Check if first row contains mostly strings and second row contains numbers
        const firstRowStrings = firstRow.filter(cell => 
            typeof cell === 'string' && isNaN(parseFloat(cell))
        ).length;
        
        if (data.length > 1 && Array.isArray(data[1])) {
            const secondRowNumbers = data[1].filter(cell => 
                !isNaN(parseFloat(cell))
            ).length;
            
            return firstRowStrings > firstRow.length / 2 && 
                   secondRowNumbers > data[1].length / 2;
        }

        return firstRowStrings > firstRow.length / 2;
    }

    /**
     * Validate chart data and column indices
     */
    validateChartData(data, xColumn, yColumn) {
        if (!Array.isArray(data) || data.length === 0) return false;
        if (typeof xColumn !== 'number' || typeof yColumn !== 'number') return false;
        if (xColumn < 0 || yColumn < 0) return false;

        // Check if columns exist in the data
        const maxColumn = Math.max(...data.map(row => 
            Array.isArray(row) ? row.length - 1 : 0
        ));

        return xColumn <= maxColumn && yColumn <= maxColumn;
    }

    /**
     * Get suggested chart type based on data characteristics
     */
    suggestChartType(data, xColumn, yColumn) {
        if (!this.validateChartData(data, xColumn, yColumn)) {
            return 'bar';
        }

        const hasHeaders = this.detectHeaders(data);
        const startRow = hasHeaders ? 1 : 0;
        const dataRows = data.slice(startRow);
        
        // Check Y-axis data characteristics
        const yValues = dataRows.map(row => parseFloat(row[yColumn])).filter(v => !isNaN(v));
        const xValues = dataRows.map(row => row[xColumn]);

        // Check if X-axis represents time/dates
        const isTimeData = xValues.some(val => 
            val && (val instanceof Date || /\d{4}-\d{2}-\d{2}/.test(val.toString()))
        );

        // Check data distribution
        const total = yValues.reduce((sum, val) => sum + val, 0);
        const isPercentageData = yValues.every(val => val >= 0 && val <= 100) && 
                                Math.abs(total - 100) < 5;

        // Suggest chart type
        if (isPercentageData && dataRows.length <= 8) {
            return 'pie';
        } else if (isTimeData) {
            return 'line';
        } else if (dataRows.length <= 10) {
            return 'bar';
        } else {
            return 'line';
        }
    }

    /**
     * Generate chart from AI response
     */
    async generateChartFromAI(data, prompt) {
        try {
            const response = await fetch('http://localhost:8001/api/generate-chart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: data,
                    chartType: 'bar', // Default, AI can override
                    xColumn: 0,
                    yColumn: 1
                }),
            });

            if (!response.ok) {
                throw new Error(`Chart generation failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating chart from AI:', error);
            throw error;
        }
    }
}

// Export for global use
window.ChartGenerator = ChartGenerator;