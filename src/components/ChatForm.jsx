import { useRef } from "react";

const ChatForm = ({ chatHistory, setChatHistory, generateBotRespones }) => {
  const inputRef = useRef();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = inputRef.current.value.trim();
    if (!userMessage) return;

    // Update chat history with the user's message and generate a bot response based on the new history
    setChatHistory((prevHistory) => {
      const newHistory = [...prevHistory, { role: "user", text: userMessage }];
      generateBotRespones(newHistory); // Call with the updated history
      return newHistory;
    });

    // Optionally, after a delay, add a "thinking..." bot message
    setTimeout(() => {
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { role: "model", text: "thinking..." }
      ]);
    }, 600);

    // Clear the input after submission
    inputRef.current.value = "";
  };

  return (
    <form action="#" className="chat-form" onSubmit={handleFormSubmit}>
      <input 
        ref={inputRef}
        type="text" 
        placeholder="Message..." 
        className="message-input" 
        required 
      />
      <button className="material-symbols-rounded" type="submit">
        keyboard_arrow_up
      </button>
    </form>
  );
};

export default ChatForm;
