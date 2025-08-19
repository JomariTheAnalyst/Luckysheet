/**
 * AI-Powered Chart Generator for Luckysheet
 * Integrates with Gemini AI to create intelligent charts and visualizations
 */

import { geminiAI } from './geminiAI.js';

class AIChartGenerator {
    constructor() {
        this.chartTypes = {
            'line': 'lineChart',
            'bar': 'columnChart',
            'column': 'columnChart',
            'pie': 'pieChart',
            'area': 'areaChart',
            'scatter': 'scatterChart',
            'radar': 'radarChart'
        };
    }

    async generateChart(config, rangeData) {
        try {
            // Validate chart configuration
            const validatedConfig = this.validateChartConfig(config, rangeData);
            if (!validatedConfig) {
                throw new Error('Invalid chart configuration');
            }

            // Create chart using Luckysheet's chart system
            const chartOptions = this.buildChartOptions(validatedConfig, rangeData);
            
            // Get current position for chart placement
            const position = this.getChartPosition();
            
            // Create the chart
            this.createLuckysheetChart(chartOptions, position);

            return {
                success: true,
                message: `Created ${validatedConfig.type} chart successfully`
            };
        } catch (error) {
            console.error('Chart generation failed:', error);
            return {
                success: false,
                message: `Failed to create chart: ${error.message}`
            };
        }
    }

    validateChartConfig(config, rangeData) {
        if (!config || !config.type) {
            return null;
        }

        const chartType = config.type.toLowerCase();
        if (!this.chartTypes[chartType]) {
            return null;
        }

        return {
            type: chartType,
            title: config.title || 'AI Generated Chart',
            xaxis: config.xaxis || 'X Axis',
            yaxis: config.yaxis || 'Y Axis',
            range: config.range || this.getDefaultRange(rangeData)
        };
    }

    getDefaultRange(rangeData) {
        if (!rangeData || rangeData.length === 0) {
            return 'A1:B10';
        }

        const rows = rangeData.length;
        const cols = rangeData[0].length;
        const endCol = String.fromCharCode(65 + cols - 1); // Convert to Excel column letter
        
        return `A1:${endCol}${rows}`;
    }

    buildChartOptions(config, rangeData) {
        const chartType = this.chartTypes[config.type];
        
        return {
            chartType: chartType,
            title: config.title,
            titleAlign: 'center',
            legend: {
                position: 'bottom'
            },
            xAxis: {
                title: config.xaxis
            },
            yAxis: {
                title: config.yaxis
            },
            series: this.generateSeries(rangeData, config),
            colors: this.getDefaultColors(),
            width: 400,
            height: 300
        };
    }

    generateSeries(rangeData, config) {
        if (!rangeData || rangeData.length === 0) {
            return [];
        }

        // Simple series generation - can be enhanced based on data analysis
        const series = [];
        const hasHeaders = this.detectHeaders(rangeData);
        const dataRows = hasHeaders ? rangeData.slice(1) : rangeData;
        
        if (config.type === 'pie') {
            // For pie charts, use first two columns
            series.push({
                name: config.title || 'Data',
                data: dataRows.map(row => ({
                    name: row[0],
                    y: parseFloat(row[1]) || 0
                }))
            });
        } else {
            // For other chart types, create series for each numeric column
            const numericColumns = this.getNumericColumns(rangeData);
            
            numericColumns.forEach((colIndex, index) => {
                const columnName = hasHeaders ? rangeData[0][colIndex] : `Series ${index + 1}`;
                series.push({
                    name: columnName,
                    data: dataRows.map(row => parseFloat(row[colIndex]) || 0)
                });
            });
        }

        return series;
    }

    detectHeaders(rangeData) {
        if (rangeData.length < 2) return false;
        
        const firstRow = rangeData[0];
        return firstRow.some(cell => typeof cell === 'string' && isNaN(parseFloat(cell)));
    }

    getNumericColumns(rangeData) {
        const numericCols = [];
        const sampleRow = rangeData[rangeData.length > 1 ? 1 : 0]; // Skip header if exists
        
        sampleRow.forEach((cell, index) => {
            if (!isNaN(parseFloat(cell)) && isFinite(cell)) {
                numericCols.push(index);
            }
        });
        
        return numericCols;
    }

    getDefaultColors() {
        return [
            '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
            '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ffb64d'
        ];
    }

    getChartPosition() {
        // Get current selection or use default position
        try {
            const luckysheet = window.luckysheet;
            const selection = luckysheet.getluckysheet_select_save();
            
            if (selection && selection.length > 0) {
                const range = selection[0];
                return {
                    left: (range.column[1] + 2) * 73, // Default column width
                    top: range.row[0] * 19, // Default row height
                    width: 400,
                    height: 300
                };
            }
        } catch (error) {
            console.warn('Could not get selection for chart position:', error);
        }
        
        return {
            left: 100,
            top: 100,
            width: 400,
            height: 300
        };
    }

    createLuckysheetChart(chartOptions, position) {
        try {
            // Use Luckysheet's chart creation system
            if (window.luckysheet && typeof window.createLuckyChart === 'function') {
                window.createLuckyChart(position.width, position.height, position.left, position.top);
                
                // Update chart with our custom options
                setTimeout(() => {
                    this.updateChartOptions(chartOptions);
                }, 500);
            } else {
                console.warn('Luckysheet chart system not available');
            }
        } catch (error) {
            console.error('Failed to create Luckysheet chart:', error);
            throw error;
        }
    }

    updateChartOptions(options) {
        // This would integrate with Luckysheet's chart system
        // Implementation depends on the specific chart library used
        try {
            const chartInfo = window.chartInfo;
            if (chartInfo && chartInfo.currentChart) {
                // Update the current chart with AI-generated options
                Object.assign(chartInfo.currentChart, options);
                
                // Trigger chart update
                if (typeof chartInfo.chartparam?.renderChart === 'function') {
                    chartInfo.chartparam.renderChart({
                        chart_id: chartInfo.currentChart.chart_id,
                        chartOptions: options
                    });
                }
            }
        } catch (error) {
            console.error('Failed to update chart options:', error);
        }
    }

    async suggestBestChart(rangeData) {
        if (!rangeData || rangeData.length === 0) {
            return null;
        }

        const query = `Based on this data, what would be the best chart type and configuration for visualization? Consider the data types, relationships, and what insights would be most valuable.

Data sample: ${JSON.stringify(rangeData.slice(0, 5))}
Data size: ${rangeData.length} rows × ${rangeData[0].length} columns`;

        try {
            const aiResponse = await geminiAI.processUserQuery(query, rangeData);
            
            // Look for chart suggestions in the AI response
            const chartActions = aiResponse.actions.filter(action => action.type === 'chart');
            if (chartActions.length > 0) {
                return chartActions[0].config;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get chart suggestions:', error);
            return null;
        }
    }
}

// Export the chart generator instance
const aiChartGenerator = new AIChartGenerator();
export { aiChartGenerator };