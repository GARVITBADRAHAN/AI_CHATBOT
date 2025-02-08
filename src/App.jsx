import { useEffect, useRef, useState } from "react";
import ChatbotIcon from "./components/ChatbotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage";

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Prevent duplicate API calls
  const chatBodyRef = useRef();

  // Helper function to update chat history by removing any "thinking..." messages
  // and replacing the last bot response if one already exists.
  const updateHistory = (text) => {
    setChatHistory((prev) => {
      // Remove any "thinking..." messages.
      const filtered = prev.filter(
        (msg) => String(msg.text).toLowerCase() !== "thinking..."
      );
      // If the last message is from the bot, replace it; otherwise, append the new message.
      if (filtered.length > 0 && filtered[filtered.length - 1].role === "model") {
        return [...filtered.slice(0, -1), { role: "model", text }];
      }
      return [...filtered, { role: "model", text }];
    });
  };

  // Helper function to delay execution.
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const generateBotRespones = async (history, retryCount = 0) => {
    const maxRetries = 3;

    // If a request is already in progress, do not start another.
    if (isLoading) {
      console.log("Already loading, aborting duplicate call.");
      return;
    }
    setIsLoading(true);

    // Trim conversation: send only the last 5 messages to reduce payload.
    const trimmedHistory =
      history.length > 5 ? history.slice(history.length - 5) : history;

    // Map trimmed history items to the expected structure.
    const mappedHistory = trimmedHistory.map(({ role, text }) => ({
      role,
      parts: [{ text }]
    }));

    // Create the request options.
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: mappedHistory })
    };

    console.log("Payload:", requestOptions.body);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        console.error("API URL is not defined. Check your .env file.");
        return;
      }

      const response = await fetch(apiUrl, requestOptions);

      // Handle 429 (Too Many Requests) and 503 (Overloaded) errors.
      if (response.status === 429 || response.status === 503) {
        if (retryCount < maxRetries) {
          console.warn(
            `Received ${response.status}. Retrying ${retryCount + 1}/${maxRetries}...`
          );
          await delay(500 * Math.pow(2, retryCount)); // Exponential backoff: 500ms, 1000ms, 2000ms...
          return generateBotRespones(history, retryCount + 1);
        } else {
          updateHistory(
            "System is overloaded or quota exhausted. Please try again later."
          );
          return;
        }
      }

      // Log raw response text for debugging.
      const responseText = await response.text();
      console.log("Response text:", responseText);

      if (responseText) {
        const data = JSON.parse(responseText);
        if (!response.ok) {
          throw new Error(data.error?.message || "Something went wrong");
        }

        // Ensure the API response has the expected structure.
        if (
          !data.candidates ||
          !data.candidates[0] ||
          !data.candidates[0].content ||
          !data.candidates[0].content.parts ||
          !data.candidates[0].content.parts[0]
        ) {
          throw new Error("Invalid API response structure");
        }

        const apiResponseText = data.candidates[0].content.parts[0].text
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .trim();
        updateHistory(apiResponseText);
      } else {
        console.error("Empty response text received from API.");
      }
    } catch (error) {
      console.error("Error in generateBotRespones:", error);
      if (
        error.message.toLowerCase().includes("exhausted") ||
        error.message.toLowerCase().includes("overload") ||
        error.message.toLowerCase().includes("429")
      ) {
        updateHistory(
          "System is overloaded or quota exhausted. Please try again later."
        );
      } else {
        updateHistory("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll the chat body whenever chatHistory changes.
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory]);

  return (
    <div className="container">
      <div className="chatbot-popup">
        <div className="chat-header">
          <div className="header-info">
            <ChatbotIcon />
            <h2 className="logo text">Chatbot</h2>
          </div>
          <button className="material-symbols-rounded">
            keyboard_arrow_down
          </button>
        </div>
        <div ref={chatBodyRef} className="chat-body">
          <div className="message bot-message">
            <ChatbotIcon />
            <p className="message-text">
              Hey there <br />How can I help you today?
            </p>
          </div>
          {chatHistory.map((chat, index) => (
            <ChatMessage key={index} chat={chat} />
          ))}
        </div>
        <div className="chat-foot">
          <ChatForm
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            generateBotRespones={generateBotRespones}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
