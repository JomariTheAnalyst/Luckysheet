/**
 * Gemini AI Service for Luckysheet
 * Handles AI interactions, conversation memory, and intelligent spreadsheet operations
 */

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyBferzTNYSYU1shan59i_jGwc2DrWEeopI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Conversation Memory Storage
class ConversationMemory {
    constructor() {
        this.conversations = new Map();
        this.userPreferences = {};
        this.sessionId = this.generateSessionId();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addMessage(role, content, context = {}) {
        if (!this.conversations.has(this.sessionId)) {
            this.conversations.set(this.sessionId, []);
        }
        
        const message = {
            role,
            content,
            timestamp: Date.now(),
            context: context
        };
        
        this.conversations.get(this.sessionId).push(message);
        
        // Keep only last 20 messages to prevent memory overflow
        const messages = this.conversations.get(this.sessionId);
        if (messages.length > 20) {
            this.conversations.set(this.sessionId, messages.slice(-20));
        }
    }

    getConversationHistory() {
        return this.conversations.get(this.sessionId) || [];
    }

    updateUserPreferences(preferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
    }

    getUserPreferences() {
        return this.userPreferences;
    }

    clearSession() {
        this.sessionId = this.generateSessionId();
    }
}

// Global conversation memory instance
const conversationMemory = new ConversationMemory();

// Spreadsheet Context Helper
class SpreadsheetContextHelper {
    static getSheetContext() {
        try {
            const store = window.Store || {};
            const currentSheet = store.luckysheetfile?.[store.currentSheetIndex] || {};
            const data = store.flowdata || [];
            
            return {
                sheetName: currentSheet.name || 'Sheet1',
                rows: data.length,
                columns: data.length > 0 ? data[0].length : 0,
                hasData: data.length > 0
            };
        } catch (error) {
            return {
                sheetName: 'Sheet1',
                rows: 0,
                columns: 0,
                hasData: false
            };
        }
    }

    static getSelectedData() {
        try {
            const luckysheet = window.luckysheet;
            if (luckysheet && luckysheet.getdatabyselection) {
                return luckysheet.getdatabyselection();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    static getRangeData(startRow, endRow, startCol, endCol) {
        try {
            const store = window.Store || {};
            const data = store.flowdata || [];
            
            const result = [];
            for (let r = startRow; r <= Math.min(endRow, data.length - 1); r++) {
                const row = [];
                for (let c = startCol; c <= Math.min(endCol, data[r]?.length - 1 || 0); c++) {
                    const cell = data[r]?.[c];
                    row.push(cell?.v || cell?.m || '');
                }
                result.push(row);
            }
            return result;
        } catch (error) {
            return [];
        }
    }

    static analyzeDataTypes(rangeData) {
        if (!rangeData || rangeData.length === 0) return {};
        
        const analysis = {
            hasHeaders: false,
            hasNumbers: false,
            hasText: false,
            hasDates: false,
            columns: []
        };

        // Analyze first row for headers
        const firstRow = rangeData[0];
        analysis.hasHeaders = firstRow.some(cell => 
            typeof cell === 'string' && isNaN(parseFloat(cell))
        );

        // Analyze each column
        for (let col = 0; col < firstRow.length; col++) {
            const columnData = rangeData.map(row => row[col]).filter(cell => cell !== null && cell !== '');
            const columnType = this.detectColumnType(columnData);
            
            analysis.columns.push({
                index: col,
                type: columnType,
                header: analysis.hasHeaders ? firstRow[col] : `Column ${col + 1}`,
                sampleData: columnData.slice(0, 3)
            });

            if (columnType === 'number') analysis.hasNumbers = true;
            if (columnType === 'text') analysis.hasText = true;
            if (columnType === 'date') analysis.hasDates = true;
        }

        return analysis;
    }

    static detectColumnType(columnData) {
        if (columnData.length === 0) return 'empty';
        
        let numberCount = 0;
        let dateCount = 0;
        
        for (const cell of columnData) {
            if (!isNaN(parseFloat(cell)) && isFinite(cell)) {
                numberCount++;
            } else if (this.isDateLike(cell)) {
                dateCount++;
            }
        }
        
        const total = columnData.length;
        if (numberCount / total > 0.7) return 'number';
        if (dateCount / total > 0.7) return 'date';
        return 'text';
    }

    static isDateLike(value) {
        if (!value) return false;
        const datePatterns = [
            /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
            /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
            /^\d{4}年\d{1,2}月\d{1,2}日$/
        ];
        return datePatterns.some(pattern => pattern.test(String(value)));
    }
}

// Gemini AI Service
class GeminiAIService {
    constructor() {
        this.apiKey = GEMINI_API_KEY;
        this.apiUrl = GEMINI_API_URL;
    }

    async callGeminiAPI(messages, systemPrompt = '') {
        try {
            const prompt = this.buildPrompt(messages, systemPrompt);
            
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No response from Gemini API');
            }
        } catch (error) {
            console.error('Gemini API call failed:', error);
            throw error;
        }
    }

    buildPrompt(messages, systemPrompt) {
        const context = SpreadsheetContextHelper.getSheetContext();
        const history = conversationMemory.getConversationHistory();
        const preferences = conversationMemory.getUserPreferences();
        
        let prompt = `${systemPrompt}\n\n`;
        
        // Add spreadsheet context
        prompt += `Current Spreadsheet Context:
- Sheet: ${context.sheetName}
- Size: ${context.rows} rows × ${context.columns} columns
- Has Data: ${context.hasData}
${preferences.chartPreference ? `- Preferred Chart Type: ${preferences.chartPreference}` : ''}

`;

        // Add conversation history (last 5 messages)
        if (history.length > 0) {
            prompt += "Recent Conversation:\n";
            const recentHistory = history.slice(-5);
            for (const msg of recentHistory) {
                prompt += `${msg.role}: ${msg.content}\n`;
            }
            prompt += "\n";
        }

        // Add current messages
        for (const message of messages) {
            prompt += `${message.role}: ${message.content}\n`;
        }

        return prompt;
    }

    async processUserQuery(userQuery, rangeData = null) {
        try {
            conversationMemory.addMessage('user', userQuery, { rangeData });

            let systemPrompt = `You are an advanced AI assistant integrated into Luckysheet, an Excel-like spreadsheet application. 

Your capabilities include:
1. Analyzing spreadsheet data and providing insights
2. Generating appropriate formulas and functions
3. Creating charts and visualizations
4. Answering questions about data analysis
5. Suggesting data improvements and patterns

Guidelines:
- Be concise but informative
- Provide actionable suggestions
- When suggesting charts, specify chart type, data range, and configuration
- For formulas, provide both the formula and explanation
- If you need clarification, ask specific questions
- Remember user preferences from previous interactions

Response Format:
- For simple answers: Provide direct response
- For charts: Include [CHART] directive with specifications
- For formulas: Include [FORMULA] directive with function
- For data operations: Include [ACTION] directive with instructions

Example Chart Response:
[CHART]
Type: line
Range: A1:B10
Title: Sales Trend Over Time
XAxis: Month
YAxis: Sales Amount
[/CHART]

Example Formula Response:
[FORMULA]
Formula: =SUM(A1:A10)
Description: Calculates the total sum of values in range A1 to A10
[/FORMULA]
`;

            // Analyze data if provided
            let dataContext = '';
            if (rangeData && rangeData.length > 0) {
                const analysis = SpreadsheetContextHelper.analyzeDataTypes(rangeData);
                dataContext = `\nData Analysis:
- Data Range: ${rangeData.length} rows × ${rangeData[0].length} columns
- Has Headers: ${analysis.hasHeaders}
- Column Types: ${analysis.columns.map(col => `${col.header} (${col.type})`).join(', ')}
- Sample Data: ${JSON.stringify(rangeData.slice(0, 3))}
`;
            }

            systemPrompt += dataContext;

            const messages = [{ role: 'user', content: userQuery }];
            const response = await this.callGeminiAPI(messages, systemPrompt);

            conversationMemory.addMessage('assistant', response);

            return this.parseAIResponse(response, rangeData);
        } catch (error) {
            console.error('Error processing user query:', error);
            return {
                type: 'error',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                error: error.message
            };
        }
    }

    parseAIResponse(response, rangeData = null) {
        const result = {
            type: 'text',
            content: response,
            actions: []
        };

        // Extract chart directives
        const chartMatches = response.match(/\[CHART\]([\s\S]*?)\[\/CHART\]/g);
        if (chartMatches) {
            for (const match of chartMatches) {
                const chartContent = match.replace(/\[CHART\]|\[\/CHART\]/g, '').trim();
                const chartConfig = this.parseChartConfig(chartContent);
                if (chartConfig) {
                    result.actions.push({
                        type: 'chart',
                        config: chartConfig
                    });
                }
            }
            // Remove chart directives from content
            result.content = result.content.replace(/\[CHART\][\s\S]*?\[\/CHART\]/g, '').trim();
        }

        // Extract formula directives
        const formulaMatches = response.match(/\[FORMULA\]([\s\S]*?)\[\/FORMULA\]/g);
        if (formulaMatches) {
            for (const match of formulaMatches) {
                const formulaContent = match.replace(/\[FORMULA\]|\[\/FORMULA\]/g, '').trim();
                const formulaConfig = this.parseFormulaConfig(formulaContent);
                if (formulaConfig) {
                    result.actions.push({
                        type: 'formula',
                        config: formulaConfig
                    });
                }
            }
            // Remove formula directives from content
            result.content = result.content.replace(/\[FORMULA\][\s\S]*?\[\/FORMULA\]/g, '').trim();
        }

        // Extract action directives
        const actionMatches = response.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/g);
        if (actionMatches) {
            for (const match of actionMatches) {
                const actionContent = match.replace(/\[ACTION\]|\[\/ACTION\]/g, '').trim();
                result.actions.push({
                    type: 'action',
                    description: actionContent
                });
            }
            // Remove action directives from content
            result.content = result.content.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
        }

        return result;
    }

    parseChartConfig(chartContent) {
        const lines = chartContent.split('\n').filter(line => line.trim());
        const config = {};

        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                config[key.toLowerCase()] = value;
            }
        }

        return Object.keys(config).length > 0 ? config : null;
    }

    parseFormulaConfig(formulaContent) {
        const lines = formulaContent.split('\n').filter(line => line.trim());
        const config = {};

        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                config[key.toLowerCase()] = value;
            }
        }

        return Object.keys(config).length > 0 ? config : null;
    }

    async generateInsights(rangeData) {
        if (!rangeData || rangeData.length === 0) {
            return { type: 'text', content: 'No data available for analysis.' };
        }

        const analysis = SpreadsheetContextHelper.analyzeDataTypes(rangeData);
        const query = `Please analyze this data and provide insights including trends, patterns, anomalies, and actionable recommendations. Also suggest appropriate visualizations.

Data overview:
- ${rangeData.length} rows × ${rangeData[0].length} columns
- Columns: ${analysis.columns.map(col => `${col.header} (${col.type})`).join(', ')}
- Sample data: ${JSON.stringify(rangeData.slice(0, 5))}`;

        return await this.processUserQuery(query, rangeData);
    }

    updateUserPreferences(preferences) {
        conversationMemory.updateUserPreferences(preferences);
    }

    clearConversation() {
        conversationMemory.clearSession();
    }
}

// Export the service instance
const geminiAI = new GeminiAIService();
export { geminiAI, conversationMemory, SpreadsheetContextHelper };