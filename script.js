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
  scrollIfNeeded(chatContainer); // Scroll only if needed
  updateBodyOverflow(chatContainer); // Set initial body overflow
  document.getElementById("userInput").focus(); // Focus input on load

  // Handle mobile keyboard visibility
  const inputContainer = document.querySelector(".input-container");
  const userInput = document.getElementById("userInput");
  userInput.addEventListener("focus", () => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        inputContainer.style.bottom = `${window.innerHeight - window.visualViewport.height + 10}px`;
      });
    }
  });
  userInput.addEventListener("blur", () => {
    inputContainer.style.bottom = "0.75rem"; // Reset to default (matches CSS for max-width: 480px)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", () => {});
    }
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
  localStorage.removeItem("chatHistory"); // Clear localStorage
  chatContainer.innerHTML = ""; // Clear all messages
  responseCount = 0; // Reset response count
  updateBodyOverflow(chatContainer); // Update body overflow
  userInput.focus(); // Refocus input
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
    scrollIfNeeded(chatContainer); // Scroll only if needed
    updateBodyOverflow(chatContainer); // Update body overflow
    saveMessage("Please enter a question.", false);
    return;
  }

  // Append user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.innerText = query;
  chatContainer.appendChild(userMessage);
  saveMessage(query, true);
  scrollIfNeeded(chatContainer); // Scroll only if needed
  updateBodyOverflow(chatContainer); // Update body overflow

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
  scrollIfNeeded(chatContainer); // Scroll only if needed
  updateBodyOverflow(chatContainer); // Update body overflow

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
    scrollIfNeeded(chatContainer); // Scroll only if needed
    updateBodyOverflow(chatContainer); // Update body overflow
  } catch (err) {
    // Remove "Thinking..." message
    chatContainer.removeChild(thinkingMessage);

    // Append error message
    const errorMessage = document.createElement("div");
    errorMessage.className = "message bot-message bot-message-bg-1";
    errorMessage.innerText = "Error: " + err.message;
    chatContainer.appendChild(errorMessage);
    saveMessage("Error: " + err.message, false);
    scrollIfNeeded(chatContainer); // Scroll only if needed
    updateBodyOverflow(chatContainer); // Update body overflow
  } finally {
    // Re-enable button
    askButton.disabled = false;
    askButton.innerText = "Ask";
  }
});
