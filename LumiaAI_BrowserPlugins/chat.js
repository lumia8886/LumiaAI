const config = {
    API_URL: "",
    API_KEY: "",
    CONTENT_TYPE: "application/json",
    DEFAULT_SYSTEM_MESSAGE: "",
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.onClicked.addListener((tab) => {
        chrome.tabs.create({
            url: 'chat.html'
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("messages");
    const userInput = document.getElementById("initial-input");
    const sendButton = document.getElementById("search-button");
    const multiChatInterface = document.getElementById("multi-chat-interface");
    const settingsButton = document.getElementById("settings-button");
    const settingsModal = document.getElementById("settings-modal");
    const closeSettings = settingsModal ? settingsModal.querySelector(".close-settings") : null;
    const saveSettings = document.getElementById("save-settings");

    const savedConfig = localStorage.getItem("luminaai_config");
    if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        Object.assign(config, parsedConfig);
    }

    if (settingsButton && settingsModal) {
        settingsButton.addEventListener("click", () => {
            const savedConfig = localStorage.getItem("luminaai_config");
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                const apiUrlInput = document.getElementById("api-url");
                const apiKeyInput = document.getElementById("api-key");
                const systemMessageInput = document.getElementById("system-message");
                if (apiUrlInput) apiUrlInput.value = parsedConfig.API_URL || "";
                if (apiKeyInput) apiKeyInput.value = parsedConfig.API_KEY || "";
                if (systemMessageInput) systemMessageInput.value = parsedConfig.DEFAULT_SYSTEM_MESSAGE || "";
            }
            settingsModal.style.display = "block";
        });

        if (closeSettings) {
            closeSettings.addEventListener("click", () => {
                settingsModal.style.display = "none";
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener("click", () => {
                const apiUrl = document.getElementById("api-url");
                const apiKey = document.getElementById("api-key");
                const systemMessage = document.getElementById("system-message");

                if (apiUrl && apiKey) {
                    config.API_URL = apiUrl.value.trim();
                    config.API_KEY = apiKey.value.trim();
                    config.DEFAULT_SYSTEM_MESSAGE = systemMessage ? systemMessage.value.trim() : "";
                    
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.sync.set({ "luminaai_config": JSON.stringify(config) });
                    } else {
                        localStorage.setItem("luminaai_config", JSON.stringify(config));
                    }
                    settingsModal.style.display = "none";
                }
            });
        }

        window.addEventListener("click", (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = "none";
            }
        });
    }

    let models = {
        chatgpt: { id: "gpt-messages", model: "gpt-4o-all", name: "ChatGPT", avatar: "./img/chatgpt.png" },
        claude: { id: "claude-messages", model: "claude-3-5-sonnet-all", name: "Claude", avatar: "./img/claude.png" },
        deepseek: { id: "deepseek-messages", model: "deepseek-chat", name: "Deepseek", avatar: "./img/deepseek.png" }
    };

    function createChatSection(model) {
        const section = document.createElement("div");
        section.className = "chat-section";
        section.dataset.model = model.id.split('-')[0];
        section.innerHTML = `
            <div class="chat-header">
                <div class="header-left">
                    <img src="${model.avatar}" alt="${model.name} Avatar" class="header-avatar">
                    <span>${model.name}</span>
                </div>
                <button class="back-button">Back</button>
            </div>
            <div class="messages" id="${model.id}"></div>
            <div class="input-container">
                <textarea placeholder="Enter your message..."></textarea>
                <div class="input-controls">
                    <button class="send-button">Send</button>
                </div>
            </div>
        `;
    
        const backButton = section.querySelector('.back-button');
        backButton.addEventListener('click', () => {
            const searchInterface = document.querySelector(".search-interface");
            const multiChatInterface = document.getElementById("multi-chat-interface");
            
            searchInterface.style.display = "block";
            multiChatInterface.style.display = "none";
            document.getElementById("initial-input").value = "";
        });
    
        return section;
    }

    function addMessage(content, isUser, container) {
        if (!container) {
            console.error("Container is null in addMessage");
            return null;
        }
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", isUser ? "user" : "bot");

        if (!isUser) {
            const avatarWrapper = document.createElement("div");
            avatarWrapper.className = "avatar";
            const avatarImg = document.createElement("img");
            const model = Object.values(models).find(m => m.id === container.id);
            avatarImg.src = model ? model.avatar : "./logo.png";
            avatarImg.alt = "Bot Avatar";
            avatarWrapper.appendChild(avatarImg);
            messageElement.appendChild(avatarWrapper);
        }

        const messageContent = document.createElement("div");
        messageContent.className = "message-content";
        messageContent.innerHTML = window.marked.parse(content);
        messageElement.appendChild(messageContent);

        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
        return messageContent;
    }

    function initializeMultiChat(message) {
        const existingGrid = multiChatInterface.querySelector('.chat-grid');
        if (existingGrid) {
            existingGrid.remove();
        }

        const chatGrid = document.createElement("div");
        chatGrid.className = "chat-grid";
        
        const checkboxes = document.querySelectorAll('.model-selection input[type="checkbox"]:checked');
        const selectedModels = Array.from(checkboxes)
            .map(checkbox => models[checkbox.value])
            .filter(Boolean);

        if (selectedModels.length === 0) {
            return false;
        }
        
        chatGrid.setAttribute('data-count', selectedModels.length);
        
        // Create and append all chat sections first
        const sections = [];
        selectedModels.forEach(model => {
            const section = createChatSection(model);
            chatGrid.appendChild(section);
            sections.push({ model, section });
        });
        
        // Append chat grid to DOM
        multiChatInterface.appendChild(chatGrid);
        multiChatInterface.style.display = 'block';

        // Now add initial message and set up event listeners
        sections.forEach(({ model, section }) => {
            const textarea = section.querySelector("textarea");
            const sendBtn = section.querySelector(".send-button");
        
            sendBtn.addEventListener("click", () => {
                if (textarea.value.trim()) {
                    sendMessage(textarea.value.trim(), model.id, model.model);
                    textarea.value = "";
                }
            });
        
            textarea.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
            });

            // Add initial message if provided
            if (message) {
                const container = document.getElementById(model.id);
                if (container) {
                    addMessage(message, true, container);
                    sendMessage(message, model.id, model.model);
                } else {
                    console.error(`Container for ${model.id} not found`);
                }
            }
        });
        
        return true;
    }

    // Remove any existing event listeners to prevent duplicates
    sendButton.removeEventListener("click", handleSendButtonClick);
    sendButton.addEventListener("click", handleSendButtonClick);

    function handleSendButtonClick() {
        if (!checkSettings()) {
            return;
        }
        const message = userInput.value.trim();
        if (message) {
            const searchInterface = document.querySelector(".search-interface");
            if (searchInterface) {
                searchInterface.style.display = "none";
            }
            
            if (initializeMultiChat(message)) {
                userInput.value = "";
            }
        }
    }

    async function sendMessage(message, containerId, modelName) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found in sendMessage`);
            return;
        }
        
        try {
            const response = await sendMessageWithRetry(message, modelName);
            const messageContent = addMessage("", false, container);
            if (messageContent) {
                await streamResponse(response, messageContent);
            }
        } catch (error) {
            console.error("Error:", error);
            addMessage("Error: Unable to get response", false, container);
        }
    }

    function checkSettings() {
        if (!config.API_URL || !config.API_KEY) {
            settingsModal.style.display = "block";
            return false;
        }
        return true;
    }

    async function sendMessageWithRetry(messageText, model, retries = config.MAX_RETRIES) {
        const savedConfig = localStorage.getItem("luminaai_config");
        if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            Object.assign(config, parsedConfig);
        }
    
        for (let i = 0; i < retries; i++) {
            try {
                if (!config.API_URL || !config.API_KEY) {
                    throw new Error("API configuration missing");
                }
    
                const response = await fetch(config.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': config.CONTENT_TYPE,
                        'Authorization': `Bearer ${config.API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{
                            role: "user",
                            content: messageText
                        }],
                        system: config.DEFAULT_SYSTEM_MESSAGE,
                        max_tokens: 2000,
                        temperature: 0.7,
                        stream: false
                    })
                });
    
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
                }
    
                const data = await response.json();
                return data.choices[0].message;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY * (i + 1)));
            }
        }
    }

    async function streamResponse(response, messageContent) {
        if (!messageContent) {
            console.error("messageContent is null in streamResponse");
            return;
        }
        if (!response || !response.content) {
            messageContent.textContent = "Error: Invalid response from server";
            return;
        }
    
        const text = response.content;
        let index = 0;
        
        function appendNextChar() {
            if (index < text.length) {
                messageContent.innerHTML = window.marked.parse(text.substring(0, index + 1));
                index++;
                setTimeout(appendNextChar, 20);
            }
        }
        
        appendNextChar();
    }

    function initializeModelTabs() {
        const tabs = document.querySelectorAll('.model-tab');
        const sections = document.querySelectorAll('.chat-section');
        
        if (!tabs.length || !sections.length) return;
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const model = tab.dataset.model;
                
                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                tab.classList.add('active');
                const activeSection = document.querySelector(`.chat-section[data-model="${model}"]`);
                if (activeSection) {
                    activeSection.classList.add('active');
                }
            });
        });
    
        const firstSection = document.querySelector('.chat-section[data-model="gpt"]');
        if (firstSection) {
            firstSection.classList.add('active');
        }
    }

    if (window.innerWidth <= 1200) {
        initializeModelTabs();
    }

    window.addEventListener('resize', () => {
        const sections = document.querySelectorAll('.chat-section');
        if (window.innerWidth <= 1200) {
            sections.forEach(s => s.classList.remove('active'));
            const firstSection = document.querySelector('.chat-section[data-model="gpt"]');
            if (firstSection) {
                firstSection.classList.add('active');
            }
            initializeModelTabs();
        } else {
            sections.forEach(s => s.classList.remove('active'));
            sections.forEach(s => s.style.display = 'flex');
        }
    });

    const addModelButton = document.querySelector(".add-model-button");
    const modelList = document.querySelector(".model-list");

    if (addModelButton && modelList) {
        addModelButton.addEventListener("click", () => {
            const modelItem = document.createElement("div");
            modelItem.className = "model-item";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true;

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Enter model name";

            const removeButton = document.createElement("span");
            removeButton.className = "remove-model";
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.onclick = () => modelItem.remove();

            modelItem.appendChild(checkbox);
            modelItem.appendChild(input);
            modelItem.appendChild(removeButton);
            modelList.appendChild(modelItem);
        });
    }
});