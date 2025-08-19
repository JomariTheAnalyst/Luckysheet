// File Processing Utilities for Smart Sheet AI
class FileProcessor {
    constructor() {
        this.supportedFormats = ['.csv', '.xlsx', '.xls'];
    }

    /**
     * Parse uploaded file and convert to Luckysheet format
     */
    async parseFile(file) {
        try {
            if (!this.isValidFile(file)) {
                throw new Error('Unsupported file format');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:8001/api/upload-file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error parsing file:', error);
            throw error;
        }
    }

    /**
     * Convert data to Luckysheet format
     */
    convertToLuckysheetFormat(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        return data.map((row, rowIndex) => {
            if (!Array.isArray(row)) return [];
            
            return row.map((cell, colIndex) => ({
                r: rowIndex,
                c: colIndex,
                v: cell
            }));
        });
    }

    /**
     * Validate file type and size
     */
    isValidFile(file) {
        if (!file) return false;

        // Check file extension
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(extension)) {
            return false;
        }

        // Check file size (limit to 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return false;
        }

        return true;
    }

    /**
     * Generate sample data for demonstration
     */
    generateSampleData(type = 'sales') {
        const samples = {
            sales: [
                ['Product', 'Q1 Sales', 'Q2 Sales', 'Q3 Sales', 'Q4 Sales'],
                ['Product A', 15000, 18000, 22000, 25000],
                ['Product B', 12000, 14000, 16000, 18000],
                ['Product C', 8000, 9500, 11000, 13000],
                ['Product D', 20000, 23000, 25000, 28000]
            ],
            expenses: [
                ['Category', 'January', 'February', 'March', 'April'],
                ['Office Supplies', 1200, 1350, 1100, 1400],
                ['Marketing', 5000, 5500, 4800, 6200],
                ['Travel', 2500, 3000, 2200, 2800],
                ['Utilities', 800, 850, 820, 900]
            ],
            employees: [
                ['Name', 'Department', 'Salary', 'Start Date', 'Performance'],
                ['John Doe', 'Engineering', 75000, '2022-01-15', 'Excellent'],
                ['Jane Smith', 'Marketing', 65000, '2021-06-01', 'Good'],
                ['Bob Johnson', 'Sales', 60000, '2022-03-10', 'Excellent'],
                ['Alice Brown', 'HR', 55000, '2020-11-20', 'Good']
            ]
        };

        return samples[type] || samples.sales;
    }

    /**
     * Export current sheet data as CSV
     */
    exportAsCSV(sheetData, filename = 'sheet_data.csv') {
        try {
            if (!sheetData || !Array.isArray(sheetData)) {
                throw new Error('Invalid sheet data');
            }

            const csvContent = sheetData.map(row => 
                row.map(cell => {
                    // Handle cells with commas or quotes
                    const cellValue = cell?.toString() || '';
                    if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
                        return `"${cellValue.replace(/"/g, '""')}"`;
                    }
                    return cellValue;
                }).join(',')
            ).join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            throw error;
        }
    }

    /**
     * Validate and clean data before processing
     */
    validateData(data) {
        if (!Array.isArray(data)) {
            return { isValid: false, errors: ['Data must be an array'] };
        }

        const errors = [];
        const warnings = [];

        // Check for empty data
        if (data.length === 0) {
            errors.push('Data cannot be empty');
        }

        // Check for consistent row lengths
        const rowLengths = data.map(row => Array.isArray(row) ? row.length : 0);
        const maxLength = Math.max(...rowLengths);
        const minLength = Math.min(...rowLengths);

        if (maxLength !== minLength) {
            warnings.push('Inconsistent row lengths detected');
        }

        // Check for data types
        let hasHeaders = false;
        if (data.length > 0 && Array.isArray(data[0])) {
            hasHeaders = data[0].every(cell => 
                typeof cell === 'string' && isNaN(cell)
            );
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            hasHeaders,
            rowCount: data.length,
            columnCount: maxLength
        };
    }
}

// Export for global use
window.FileProcessor = FileProcessor;