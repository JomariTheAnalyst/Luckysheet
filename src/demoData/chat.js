export function initChat() {
    if (!isNeedChat()) {
        return
    }

    // Your CSS as text
    let styles = `
body {
    background-color: #f5f5f5;
}

#chat-assistant-container {
    position: fixed;
    right: 40px;
    bottom: 86px;
    z-index:9990;
}

#chat-assistant-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    background: linear-gradient(135deg, rgb(215 98 150 / 55%),rgb(34 78 139 / 71%), rgb(114 222 172));
    box-shadow: 0px 0px 8px 1px rgb(0 0 0 / 22%);
    color: #fff;
    text-shadow: 1px 1px 3px rgb(0 0 0 / 56%);
}

#chat-container {
    position: fixed;
    padding: 10px;
    top: 45%;
    left: 50%;
    z-index:9990;
    transform: translate(-50%, -50%);
    display: none;
    border-radius: 5px;
    width: 45%;
    max-width: 600px;
    min-width: 400px;
    height: 60vh;
    max-height: 600px;
    background: linear-gradient(135deg, rgb(215 98 150 / 92%),rgb(34 78 139 / 93%), rgb(114 222 172 / 94%));
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
}

#chat-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 5px;
    margin-bottom: 10px;
}

.chat-message {
    margin-bottom: 12px;
    padding: 8px 12px;
    border-radius: 10px;
    max-width: 80%;
    word-wrap: break-word;
}

.chat-message.user {
    background: #007bff;
    color: white;
    margin-left: auto;
    text-align: right;
}

.chat-message.ai {
    background: #f8f9fa;
    color: #333;
    border: 1px solid #e9ecef;
}

.chat-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.chat-message .timestamp {
    font-size: 0.8em;
    opacity: 0.7;
    margin-top: 4px;
}

#chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 10px 0;
    border-radius: 5px 5px 0 0;
    cursor: move;
}

#loading-indicator {
    width: 14px;
    height: 14px;
    margin: 0 10px 0 10px;
    border: 2px solid #ccc;
    border-top-color: #4caf50;
    border-radius: 50%;
    animation: spin 2s linear infinite;
    visibility: hidden;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

#chat-header .show-loading {
    visibility: visible;
}

#chat-header .hide-loading {
    visibility: hidden;
}

#circle-button {
    padding: 0;
    border: none;
    background-color: transparent;
    font-size: 16px;
    user-select: none;
    display: flex;
    align-items: center;
    color: #fff; 
    text-shadow: 1px 1px 3px black;
}

#close-button, #clear-chat-button {
    cursor: pointer;
    padding: 5px;
    margin-left: 5px;
    border: none;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    font-size: 14px;
    color: #fff; 
    text-shadow: 1px 1px 3px black;
}

#send-button {
    cursor: pointer;
    padding: 0;
    border: none;
    background-color: transparent;
    font-size: 16px;
}

#close-button:hover,
#clear-chat-button:hover,
#send-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
}

#chat-input-container,
#chat-input {
    border: none;
}

#chat-input-container {
    display: flex;
    align-items: center;
    border-radius: 5px;
    background-color: #fff;
    padding: 10px;
}

#chat-input {
    flex: 1;
    padding: 0;
    margin-right: 5px;
    border-radius: 5px;
    overflow-y: auto;
    height: 24px;
    font-size: 1rem;
    outline: none;
    resize: none;
    background: transparent;
}

#send-button {
    background-color: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
}

#send-button>span {
    height: 16px;
    width: 16px;
}

#send-button:enabled {
    background-color: rgb(120,198,174);
}

#send-button:enabled svg path {
    fill: #fff;
}
`

    let styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)


    const html = `<div id="chat-assistant-container">
            <button id="chat-assistant-button">🤖AI</button>
        </div>
    
        <div id="chat-container" style="display: none;">
            <div id="chat-header">
                <span id="circle-button">Gemini AI Assistant<div id="loading-indicator"></div></span>
                <div>
                    <button id="clear-chat-button">Clear</button>
                    <button id="close-button">×</button>
                </div>
            </div>
            <div id="chat-messages"></div>
            <div id="chat-input-container">
                <textarea id="chat-input" placeholder="Ask me anything about your spreadsheet..."></textarea>
                <button id="send-button" disabled>
                    <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" class="h-4 w-4 m-1 md:m-0"
                            stroke-width="2">
                            <path
                                d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163Z"
                                fill="currentColor"></path>
                        </svg></span>
                </button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html)

    // Initialize AI services
    let aiServices = null;
    async function initAIServices() {
        if (!aiServices) {
            try {
                const { geminiAI } = await import('../services/geminiAI.js');
                aiServices = { geminiAI };
                console.log('AI services loaded successfully');
            } catch (error) {
                console.error('Failed to load AI services:', error);
            }
        }
        return aiServices;
    }

    const assistantButton = document.getElementById('chat-assistant-button');
    const chatContainer = document.getElementById('chat-container');
    const closeButton = document.getElementById('close-button');
    const clearChatButton = document.getElementById('clear-chat-button');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const chatMessages = document.getElementById('chat-messages');

    // Chat functionality
    function addMessage(content, type = 'ai', timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);
        
        if (timestamp !== false) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'timestamp';
            timestampDiv.textContent = timestamp || new Date().toLocaleTimeString();
            messageDiv.appendChild(timestampDiv);
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showLoading(show = true) {
        if (show) {
            loadingIndicator.classList.add('show-loading');
        } else {
            loadingIndicator.classList.remove('show-loading');
        }
    }

    async function processMessage(message) {
        try {
            showLoading(true);
            
            // Initialize AI services if needed
            const services = await initAIServices();
            if (!services) {
                throw new Error('AI services not available');
            }

            // Get current spreadsheet data for context
            const rangeData = getCurrentSpreadsheetData();
            
            // Process with Gemini AI
            const response = await services.geminiAI.processUserQuery(message, rangeData);
            
            showLoading(false);
            
            // Display AI response
            addMessage(response.content, 'ai');
            
            // Handle actions (charts, formulas, etc.)
            if (response.actions && response.actions.length > 0) {
                for (const action of response.actions) {
                    if (action.type === 'chart') {
                        addMessage('📊 Creating chart...', 'ai', false);
                        try {
                            const { aiChartGenerator } = await import('../services/chartGenerator.js');
                            const chartResult = await aiChartGenerator.generateChart(action.config, rangeData);
                            addMessage(chartResult.success ? 
                                `✅ ${chartResult.message}` : 
                                `❌ ${chartResult.message}`, 'ai', false);
                        } catch (error) {
                            addMessage(`❌ Chart creation failed: ${error.message}`, 'error', false);
                        }
                    }
                    
                    if (action.type === 'formula') {
                        addMessage(`💡 Formula suggestion: ${action.config.formula || action.config.description}`, 'ai', false);
                    }
                }
            }
            
        } catch (error) {
            showLoading(false);
            console.error('Chat processing error:', error);
            addMessage(`Sorry, I encountered an error: ${error.message}`, 'error');
        }
    }

    function getCurrentSpreadsheetData() {
        try {
            const luckysheet = window.luckysheet;
            if (luckysheet && luckysheet.getdatabyselection) {
                return luckysheet.getdatabyselection();
            }
            
            // Fallback to current sheet data
            const Store = window.Store;
            if (Store && Store.flowdata) {
                const data = Store.flowdata;
                return data.slice(0, 10).map(row => 
                    row.slice(0, 10).map(cell => cell?.v || cell?.m || '')
                );
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to get spreadsheet data:', error);
            return null;
        }
    }

    assistantButton.addEventListener('click', function () {
        chatContainer.style.display = 'flex';
        if (chatMessages.children.length === 0) {
            addMessage('Hello! I\'m your Gemini AI assistant. I can help you analyze data, create charts, suggest formulas, and provide insights about your spreadsheet. What would you like to know?', 'ai');
        }
    });

    closeButton.addEventListener('click', function () {
        chatContainer.style.display = 'none';
    });

    clearChatButton.addEventListener('click', async function () {
        chatMessages.innerHTML = '';
        
        // Clear conversation memory
        try {
            const services = await initAIServices();
            if (services && services.geminiAI.clearConversation) {
                services.geminiAI.clearConversation();
            }
        } catch (error) {
            console.warn('Failed to clear conversation:', error);
        }
        
        // Show welcome message
        addMessage('Conversation cleared. How can I help you with your spreadsheet?', 'ai');
    });

    sendButton.addEventListener('click', async function () {
        const message = chatInput.value.trim();
        if (message !== '') {
            // Add user message to chat
            addMessage(message, 'user');
            
            // Clear input
            chatInput.value = '';
            resetButton(chatInput);
            
            // Process message
            await processMessage(message);
        }
    });

    chatInput.addEventListener('input', function () {
        inputHandler(this)
    });

    function inputHandler(input) {
        if (input.scrollHeight > 24) {
            input.style.height = 'auto'
        }
        input.style.height = input.scrollHeight + 'px';
        if (input.scrollHeight > 200) {
            input.style.overflowY = 'scroll'
        } else {
            input.style.overflowY = 'hidden'
        }

        resetButton(input)
    }

    function resetButton(input) {
        if (input.value.trim() !== '') {
            sendButton.disabled = false;
            sendButton.classList.add('enabled');
        } else {
            input.style.height = '24px';
            sendButton.disabled = true;
            sendButton.classList.remove('enabled');
        }
    }

    // Keyboard shortcuts
    let isComposing = false;

    chatInput.addEventListener('compositionstart', function () {
        isComposing = true;
    });

    chatInput.addEventListener('compositionend', function () {
        isComposing = false;
    });

    chatInput.addEventListener('keydown', function (event) {
        const isWindows = navigator.platform.includes('Win');
        const isMac = navigator.platform.includes('Mac');

        if (isWindows && event.key === 'Enter' && !isComposing && !event.altKey) {
            event.preventDefault();
            sendButton.click();
        } else if (isWindows && event.key === 'Enter' && !isComposing && event.altKey) {
            event.preventDefault();
            this.value += '\n';
        } else if (isMac && event.key === 'Enter' && !isComposing && !event.metaKey) {
            event.preventDefault();
            sendButton.click();
        } else if (isMac && event.key === 'Enter' && !isComposing && event.metaKey) {
            event.preventDefault();
            this.value += '\n';
        }

        inputHandler(this)
    });

    // Drag functionality
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    const chatHeader = document.getElementById('chat-header');

    chatHeader.addEventListener('mousedown', function (event) {
        isDragging = true;
        offset.x = event.clientX - chatContainer.offsetLeft;
        offset.y = event.clientY - chatContainer.offsetTop;
    });

    document.addEventListener('mousemove', function (event) {
        if (isDragging) {
            chatContainer.style.left = `${event.clientX - offset.x}px`;
            chatContainer.style.top = `${event.clientY - offset.y}px`;
            chatContainer.style.transform = 'none';
        }
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
    });
}

const needChatHosts = [
    'crm.lashuju.com',
    'localhost:3000',
    'localhost',
    '127.0.0.1'
]

function isNeedChat() {
    const host = location.host;
    return needChatHosts.some(hostPattern => host.includes(hostPattern)) || host.startsWith('localhost');
}

// Legacy functions for backward compatibility (but now powered by AI)
async function setFormuala(sentence = '') {
    try {
        const services = await initAIServices();
        if (!services) return;
        
        // Process with AI instead of hardcoded responses
        const response = await services.geminiAI.processUserQuery(sentence);
        
        // Apply AI response to spreadsheet
        if (response.actions && response.actions.length > 0) {
            for (const action of response.actions) {
                if (action.type === 'formula' && action.config.formula) {
                    const data = [[{ "f": action.config.formula }]];
                    luckysheet.setRangeValue(data);
                    break;
                }
            }
        } else if (response.content) {
            // If no specific formula, set the response as text
            const data = [[{ "v": response.content }]];
            luckysheet.setRangeValue(data);
        }
    } catch (error) {
        console.error('setFormuala failed:', error);
        const data = [[{ "v": "AI processing failed" }]];
        luckysheet.setRangeValue(data);
    }
}

async function initAIServices() {
    if (!window.aiServices) {
        try {
            const { geminiAI } = await import('../services/geminiAI.js');
            window.aiServices = { geminiAI };
        } catch (error) {
            console.error('Failed to load AI services:', error);
            return null;
        }
    }
    return window.aiServices;
}

function setASK_AI(sentence = '') {
    let range = getRange(sentence);
    range = range === '' ? '' : ',' + range;
    const data = [
        [
            {
                "f": "=ASK_AI(\"" + sentence + "\"" + range + ")"
            }
        ]
    ];
    luckysheet.setRangeValue(data);
}

function setGET_AIRTABLE(link) {
    const data = [
        [
            {
                "f": "=GET_AIRTABLE_DATA(\"" + link + "\")"
            }
        ]
    ];
    luckysheet.setRangeValue(data);
}

function getLink(sentence = '') {
    const regex = /(https?:\/\/(?:www\.)?airtable\.com\/\S+)/gi;
    const matches = sentence.match(regex);

    if (matches) {
        return matches[0];
    }

    return '';
}

function getRange(text) {
    const regex = /([A-Z]+[0-9]*):([A-Z]+[0-9]*)/g;
    const matche = text.match(regex);
    if (matche) {
        return matche[0]
    }
    return ''
}