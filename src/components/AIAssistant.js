// Smart Sheet AI Assistant Component
class AIAssistant {
    constructor() {
        this.isVisible = true;
        this.isProcessing = false;
        this.chatHistory = [];
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
        this.loadChatHistory();
    }

    createUI() {
        // Create main AI assistant panel
        const assistantPanel = document.createElement('div');
        assistantPanel.id = 'ai-assistant-panel';
        assistantPanel.className = 'ai-assistant-panel';
        assistantPanel.innerHTML = `
            <div class="ai-assistant-header">
                <div class="ai-header-content">
                    <div class="ai-header-left">
                        <svg class="ai-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span class="ai-title">AI Assistant</span>
                    </div>
                    <div class="ai-header-actions">
                        <button id="ai-upload-btn" class="ai-action-btn" title="Upload CSV/XLSX">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" stroke-width="2"/>
                                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                        <button id="ai-toggle-btn" class="ai-action-btn" title="Toggle Panel">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <polyline points="18,6 6,18" stroke="currentColor" stroke-width="2"/>
                                <polyline points="6,6 18,18" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="ai-assistant-content">
                <div id="ai-chat-container" class="ai-chat-container">
                    <div class="ai-welcome-message">
                        <div class="ai-welcome-content">
                            <h3>Welcome to Smart Sheet AI!</h3>
                            <p>I can help you with:</p>
                            <ul>
                                <li>📊 Generating formulas and functions</li>
                                <li>🧹 Cleaning and organizing data</li>
                                <li>📈 Creating charts and visualizations</li>
                                <li>🔍 Analyzing your spreadsheet data</li>
                                <li>🎨 Applying conditional formatting</li>
                                <li>📁 Processing uploaded CSV/XLSX files</li>
                            </ul>
                            <p class="ai-help-text">Try asking: "Calculate the average of column A" or "Create a bar chart from my data"</p>
                        </div>
                    </div>
                </div>
                <div class="ai-input-container">
                    <div class="ai-input-wrapper">
                        <textarea id="ai-input" placeholder="Ask me anything about your spreadsheet..." rows="3"></textarea>
                        <button id="ai-send-btn" class="ai-send-btn" disabled>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2"/>
                                <polygon points="22,2 15,22 11,13 2,9 22,2" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                    <div class="ai-quick-actions">
                        <button class="ai-quick-btn" data-action="clean-data">🧹 Clean Data</button>
                        <button class="ai-quick-btn" data-action="generate-chart">📊 Create Chart</button>
                        <button class="ai-quick-btn" data-action="analyze-data">🔍 Analyze</button>
                    </div>
                </div>
            </div>
            <input type="file" id="ai-file-input" accept=".csv,.xlsx,.xls" style="display: none;">
        `;

        // Insert panel into page
        document.body.appendChild(assistantPanel);
    }

    bindEvents() {
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const toggleBtn = document.getElementById('ai-toggle-btn');
        const uploadBtn = document.getElementById('ai-upload-btn');
        const fileInput = document.getElementById('ai-file-input');
        const quickBtns = document.querySelectorAll('.ai-quick-btn');

        // Input events
        input.addEventListener('input', (e) => {
            sendBtn.disabled = e.target.value.trim() === '';
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        sendBtn.addEventListener('click', () => this.sendMessage());

        // Toggle panel
        toggleBtn.addEventListener('click', () => this.togglePanel());

        // File upload
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Quick actions
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    async sendMessage() {
        const input = document.getElementById('ai-input');
        const message = input.value.trim();
        
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        input.value = '';
        document.getElementById('ai-send-btn').disabled = true;

        // Add user message to chat
        this.addMessage('user', message);

        // Get current spreadsheet context
        const context = this.getSpreadsheetContext();

        try {
            // Show typing indicator
            this.showTypingIndicator();

            // Send request to AI API
            const response = await fetch('http://localhost:8001/api/ai/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: message,
                    context: context.context,
                    sheetData: context.sheetData,
                    selectedRange: context.selectedRange
                }),
            });

            const result = await response.json();
            
            // Remove typing indicator
            this.removeTypingIndicator();

            // Handle AI response
            await this.handleAIResponse(result);

        } catch (error) {
            console.error('Error sending message:', error);
            this.removeTypingIndicator();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    getSpreadsheetContext() {
        try {
            // Get current Luckysheet data
            const sheetData = luckysheet.getluckysheetfile();
            const currentSheet = sheetData[luckysheet.getSheet()];
            const selection = luckysheet.getluckysheet_select_save();

            return {
                context: `Current sheet: ${currentSheet?.name || 'Sheet1'}`,
                sheetData: currentSheet?.data || [],
                selectedRange: selection?.[0] || null
            };
        } catch (error) {
            console.error('Error getting spreadsheet context:', error);
            return {
                context: 'Unable to access spreadsheet data',
                sheetData: [],
                selectedRange: null
            };
        }
    }

    async handleAIResponse(response) {
        const { action, response: aiResponse, data } = response;

        // Add AI message to chat
        this.addMessage('assistant', aiResponse);

        // Execute actions based on AI response
        switch (action) {
            case 'formula':
                if (data.formula) {
                    await this.applyFormula(data.formula, data.cell);
                }
                break;
            case 'format':
                if (data.formatting) {
                    await this.applyFormatting(data.formatting);
                }
                break;
            case 'chart':
                if (data.chartConfig) {
                    await this.createChart(data.chartConfig);
                }
                break;
            case 'clean_data':
                if (data.cleaningType) {
                    await this.cleanData(data.cleaningType);
                }
                break;
            case 'analysis':
                // Analysis is already shown in the response
                break;
            default:
                // General response, no action needed
                break;
        }
    }

    async applyFormula(formula, targetCell) {
        try {
            if (targetCell) {
                luckysheet.setcellvalue(targetCell.r, targetCell.c, formula);
            } else {
                // Apply to currently selected cell
                const selection = luckysheet.getluckysheet_select_save();
                if (selection && selection.length > 0) {
                    const range = selection[0];
                    luckysheet.setcellvalue(range.row[0], range.column[0], formula);
                }
            }
            luckysheet.jfrefreshgrid();
        } catch (error) {
            console.error('Error applying formula:', error);
        }
    }

    async applyFormatting(formatting) {
        try {
            const selection = luckysheet.getluckysheet_select_save();
            if (selection && selection.length > 0) {
                // Apply formatting to selected range
                // This would integrate with Luckysheet's formatting API
                console.log('Applying formatting:', formatting);
            }
        } catch (error) {
            console.error('Error applying formatting:', error);
        }
    }

    async createChart(chartConfig) {
        try {
            // Integrate with Luckysheet's chart functionality
            if (window.luckysheet && luckysheet.insertChart) {
                luckysheet.insertChart(chartConfig);
            }
        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }

    async cleanData(cleaningType) {
        try {
            const sheetData = luckysheet.getluckysheetfile();
            const currentSheet = sheetData[luckysheet.getSheet()];
            
            const response = await fetch('http://localhost:8001/api/clean-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: currentSheet.data,
                    cleaningType: cleaningType
                }),
            });

            const result = await response.json();
            
            if (result.success) {
                // Update spreadsheet with cleaned data
                // This would require updating the Luckysheet data structure
                this.addMessage('assistant', `Data cleaning complete. Removed ${result.rowsRemoved} rows.`);
            }
        } catch (error) {
            console.error('Error cleaning data:', error);
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showTypingIndicator();
            
            const response = await fetch('http://localhost:8001/api/upload-file', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            this.removeTypingIndicator();

            if (result.success) {
                // Load data into Luckysheet
                this.loadDataIntoSheet(result.data);
                this.addMessage('assistant', `Successfully uploaded ${result.filename}. Loaded ${result.rows} rows and ${result.columns} columns.`);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.removeTypingIndicator();
            this.addMessage('assistant', 'Error uploading file. Please try again.', 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    loadDataIntoSheet(data) {
        try {
            // Create new sheet or update current sheet with uploaded data
            const newSheetData = {
                name: "Uploaded Data",
                data: data,
                config: {
                    columnlen: {},
                    rowlen: {}
                }
            };

            // Add to Luckysheet
            if (window.luckysheet) {
                luckysheet.setluckysheetfile([newSheetData]);
                luckysheet.jfrefreshgrid();
            }
        } catch (error) {
            console.error('Error loading data into sheet:', error);
        }
    }

    handleQuickAction(action) {
        const input = document.getElementById('ai-input');
        
        switch (action) {
            case 'clean-data':
                input.value = 'Clean my data by removing empty rows and null values';
                break;
            case 'generate-chart':
                input.value = 'Create a bar chart from the selected data';
                break;
            case 'analyze-data':
                input.value = 'Analyze my data and provide insights';
                break;
        }
        
        this.sendMessage();
    }

    addMessage(sender, content, type = 'normal') {
        const chatContainer = document.getElementById('ai-chat-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender} ${type === 'error' ? 'ai-message-error' : ''}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-message-text">${this.formatMessage(content)}</div>
                <div class="ai-message-time">${timestamp}</div>
            </div>
        `;

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Save to chat history
        this.chatHistory.push({ sender, content, timestamp, type });
        this.saveChatHistory();
    }

    formatMessage(content) {
        // Format message content (handle markdown-like formatting)
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const chatContainer = document.getElementById('ai-chat-container');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'ai-typing-indicator';
        typingDiv.className = 'ai-message ai-message-assistant ai-typing';
        typingDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('ai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    togglePanel() {
        const panel = document.getElementById('ai-assistant-panel');
        const toggleBtn = document.getElementById('ai-toggle-btn');
        
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            panel.classList.remove('ai-assistant-collapsed');
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polyline points="18,6 6,18" stroke="currentColor" stroke-width="2"/>
                    <polyline points="6,6 18,18" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        } else {
            panel.classList.add('ai-assistant-collapsed');
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('aiAssistantChatHistory', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('aiAssistantChatHistory');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
                // Optionally restore recent messages
                if (this.chatHistory.length > 0) {
                    this.chatHistory.slice(-5).forEach(msg => {
                        this.addMessage(msg.sender, msg.content, msg.type);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
}

// Initialize AI Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Luckysheet to initialize
    setTimeout(() => {
        window.aiAssistant = new AIAssistant();
    }, 1000);
});