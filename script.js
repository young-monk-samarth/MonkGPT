const API_KEY = "AIzaSyDrvGwoNOo7m93jx3Rzqh6zN749QOGN2Mc"; // Move to backend in production
let responseCount = 0; // Track the number of bot responses

// Function to scroll only if content overflows
function scrollIfNeeded(chatContainer) {
  if (chatContainer.scrollHeight > chatContainer.clientHeight) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Function to toggle body overflow based on chatContainer overflow
function updateBodyOverflow(chatContainer) {
  document.body.style.overflow = chatContainer.scrollHeight > chatContainer.clientHeight ? 'auto' : 'hidden';
}

// Load chat history from localStorage on page load
document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chatContainer");
  const savedMessages = JSON.parse(localStorage.getItem("chatHistory")) || [];
  savedMessages.forEach(({ text, isUser }) => {
    const message = document.createElement("div");
    message.className = isUser
      ? "message user-message"
      : `message bot-message bot-message-bg-${responseCount % 2 === 0 ? 1 : 2}`;
    message.innerText = text;
    chatContainer.appendChild(message);
    responseCount += isUser ? 0 : 1;
  });
  scrollIfNeeded(chatContainer);
  updateBodyOverflow(chatContainer);
  document.getElementById("userInput").focus();

  // Enhanced mobile keyboard handling
  const inputContainer = document.querySelector(".input-container");
  const userInput = document.getElementById("userInput");
  
  userInput.addEventListener("focus", () => {
    if (window.visualViewport) {
      const updateLayout = () => {
        const viewportHeight = window.visualViewport.height;
        const offset = window.innerHeight - viewportHeight;
        
        // Adjust input container position
        inputContainer.style.bottom = `${Math.max(offset + 10, 10)}px`;
        
        // Adjust chat container height
        chatContainer.style.maxHeight = `${viewportHeight - 180}px`;
        scrollIfNeeded(chatContainer);
      };
      
      window.visualViewport.addEventListener("resize", updateLayout);
      window.visualViewport.addEventListener("scroll", updateLayout);
      
      // Store cleanup function
      userInput._cleanupViewport = () => {
        window.visualViewport.removeEventListener("resize", updateLayout);
        window.visualViewport.removeEventListener("scroll", updateLayout);
      };
      
      updateLayout();
    }
  });

  userInput.addEventListener("blur", () => {
    if (userInput._cleanupViewport) {
      userInput._cleanupViewport();
    }
    // Reset to default values from CSS
    inputContainer.style.bottom = "";
    chatContainer.style.maxHeight = "";
  });
});

// Add Enter key support for submitting queries
document.getElementById("userInput").addEventListener("keypress", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    document.getElementById("askButton").click();
  }
});

// Add Clear Chat button functionality
document.getElementById("clearButton").addEventListener("click", () => {
  const chatContainer = document.getElementById("chatContainer");
  const userInput = document.getElementById("userInput");
  localStorage.removeItem("chatHistory");
  chatContainer.innerHTML = "";
  responseCount = 0;
  updateBodyOverflow(chatContainer);
  userInput.focus();
});

// Save message to localStorage
function saveMessage(text, isUser) {
  const savedMessages = JSON.parse(localStorage.getItem("chatHistory")) || [];
  savedMessages.push({ text, isUser });
  localStorage.setItem("chatHistory", JSON.stringify(savedMessages));
}

// Handle ask button click
document.getElementById("askButton").addEventListener("click", async () => {
  const query = document.getElementById("userInput").value.trim();
  const chatContainer = document.getElementById("chatContainer");
  const userInput = document.getElementById("userInput");
  const askButton = document.getElementById("askButton");

  if (!query) {
    const errorMessage = document.createElement("div");
    errorMessage.className = "message bot-message bot-message-bg-1";
    errorMessage.innerText = "Please enter a question.";
    chatContainer.appendChild(errorMessage);
    scrollIfNeeded(chatContainer);
    updateBodyOverflow(chatContainer);
    saveMessage("Please enter a question.", false);
    return;
  }

  // Append user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.innerText = query;
  chatContainer.appendChild(userMessage);
  saveMessage(query, true);
  scrollIfNeeded(chatContainer);
  updateBodyOverflow(chatContainer);

  // Clear input and refocus
  userInput.value = "";
  userInput.focus();

  // Disable button and show "Sending..."
  askButton.disabled = true;
  askButton.innerText = "Sending...";

  // Append temporary "Thinking..." message with spinner
  const thinkingMessage = document.createElement("div");
  thinkingMessage.className = "message bot-message bot-message-bg-1 thinking";
  thinkingMessage.innerText = "Thinking...";
  chatContainer.appendChild(thinkingMessage);
  scrollIfNeeded(chatContainer);
  updateBodyOverflow(chatContainer);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: query }
            ]
          }
        ]
      })
    });

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";

    // Remove "Thinking..." message
    chatContainer.removeChild(thinkingMessage);

    // Append bot response
    responseCount++;
    const botMessage = document.createElement("div");
    botMessage.className = `message bot-message bot-message-bg-${responseCount % 2 === 0 ? 1 : 2}`;
    botMessage.innerText = reply;
    chatContainer.appendChild(botMessage);
    saveMessage(reply, false);
    scrollIfNeeded(chatContainer);
    updateBodyOverflow(chatContainer);
  } catch (err) {
    // Remove "Thinking..." message
    chatContainer.removeChild(thinkingMessage);

    // Append error message
    const errorMessage = document.createElement("div");
    errorMessage.className = "message bot-message bot-message-bg-1";
    errorMessage.innerText = "Error: " + err.message;
    chatContainer.appendChild(errorMessage);
    saveMessage("Error: " + err.message, false);
    scrollIfNeeded(chatContainer);
    updateBodyOverflow(chatContainer);
  } finally {
    // Re-enable button
    askButton.disabled = false;
    askButton.innerText = "Ask";
  }
});
