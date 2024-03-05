// Function to convert an object into a query string
const query = (obj) => Object.keys(obj) .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k])) .join("&");
// Create a Markdown parser instance
const markdown = window.markdownit();
// Get the messages and message input elements
const message_box = document.getElementById(`messages`);
const message_input = document.getElementById(`message-input`);
// Check if the 'messages' element is found
if (!message_box) {
    console.error("Element with id 'messages' not found.");
    // Handle the error or return from the function
}
// Get other necessary elements
const box_conversations = document.querySelector(`.top`);
const stop_generating = document.querySelector(`.stop_generating`);
const send_button = document.querySelector(`#send-button`);
// Lock to prevent multiple prompts
let prompt_lock = false;
// Array to store message history
const messageHistory = [];
// Set the GPT model version
var model = "gpt-3.5-turbo-16k";
// Function to resize the textarea dynamically
function resizeTextarea(textarea) {
	textarea.style.height = '80px';
	textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}
// Format function to replace line breaks with HTML line breaks
const format = (text) => {
	return text.replace(/(?:\r\n|\r|\n)/g, "<br>");
};
// Event listener for handling blur event on the message input
message_input.addEventListener("blur", () => {
	window.scrollTo(0, 0);
});
// Function to delete all conversations
const delete_conversations = async () => {
    const confirmed = confirm("Are you sure you want to delete all conversations?");
    if (confirmed) {
        localStorage.clear();
        await new_conversation();
    }
};
// Function to handle asking GPT
const handle_ask = async () => {
	message_input.style.height = `80px`;
	message_input.focus();

	window.scrollTo(0, 0);
	let message = message_input.value;

	if (message.length > 0) {
		message_input.value = ``;
		await ask_gpt(message);
	}
};
// Function to remove the cancel button
const remove_cancel_button = async () => {
	stop_generating.classList.add(`stop_generating-hiding`);

	setTimeout(() => {
		stop_generating.classList.remove(`stop_generating-hiding`);
		stop_generating.classList.add(`stop_generating-hidden`);
	}, 300);
};
// Function to ask GPT for a response
const ask_gpt = async (message) => {
	try {
		// Clear message input content
		message_input.value = ``;
		message_input.innerHTML = ``;
		message_input.innerText = ``;
// Add the user's message to the conversation history
		add_conversation(window.conversation_id, message.substr(0, 20));
		window.scrollTo(0, 0);
		window.controller = new AbortController();
 // Lock the prompt to prevent multiple requests
		prompt_lock = true;
		window.text = ``;
		window.token = message_id();
// Show the cancel button
		stop_generating.classList.remove(`stop_generating-hidden`);
// Add the user's message to the message box
		message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${user_image}
                    <i class="fa-regular fa-phone-arrow-up-right"></i>
                </div>
                <div class="content" id="user_${token}"> 
                    ${format(message)}
                </div>
            </div>
        `;
        // Highlight code blocks and add copy button
        document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
		hljs.highlightElement(el);
		el.classList.add('processed');
        });
 // Scroll to the bottom of the message box
		message_box.scrollTo({
				top: message_box.scrollHeight,
				behavior: "smooth"
			});
		window.scrollTo(0, 0);
		// Wait for a short duration for rendering
		await new Promise((r) => setTimeout(r, 500));
		window.scrollTo(0, 0);
// Add a placeholder for GPT's response
		message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${gpt_image} <i class="fa-regular fa-phone-arrow-down-left"></i>
                </div>
                <div class="content" id="gpt_${window.token}">
                    <div id="cursor"></div>
                </div>
            </div>
        `;
 // Scroll to the bottom of the message box
		message_box.scrollTo({
				top: message_box.scrollHeight,
				behavior: "smooth"
			});

		// Create and append the clipboard icon
        const clipboardIcon = document.createElement('div');
        clipboardIcon.innerHTML = '<i class="far fa-clipboard" onclick="copyToClipboard()"></i>';

			// Create and append the speak icon with a volume-up icon
			const speakIcon = document.createElement('div');

			// İkonu Ekleyerek Boyutu Küçültme
			const icon = document.createElement('i');
			icon.classList.add('fas', 'fa-volume-up', 'fa-lg');
			icon.onclick = speakText; // Trigger text-to-speech when the icon is clicked

			message_box.appendChild(speakIcon);
// Scroll to the top and wait for a short duration
		window.scrollTo(0, 0);
		await new Promise((r) => setTimeout(r, 1000));
		window.scrollTo(0, 0);
        // Push the current message to the message history array
        messageHistory.push(message);
// Prepare data for POST request
       const postData = {
       model: model,
       stream: true,
       messages: []
       }; 
// Flag to check if it is the first message
       let isFirstMessage = true;
// Iterate through the message history
       for (const message of messageHistory) {
       postData.messages.push({ role: "user", content: message });
// Add a system message after the first user message
       if (isFirstMessage) {
       postData.messages.push({ role: "system", content: `${system_message}` });
       isFirstMessage = false;
         }
       } 
       
// Make a POST request to the API
       const response = await fetch(API_URL, {
       signal: window.controller.signal,
       conversation_id: window.conversation_id,    
       method: "POST",   
       headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${strIndex}`
       },
       body: JSON.stringify(postData)
       })
		console.log('Connected API');
		// Read the response as a stream of data
		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		// Process the streamed data
      while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // Massage and parse the chunk of data
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      const parsedLines = lines
        .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
        .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
        .map((line) => JSON.parse(line)); // Parse the JSON string
// Update the UI with the new content
      for (const parsedLine of parsedLines) {
        const { choices } = parsedLine;
        const { delta } = choices[0];
        const { content } = delta;
        // Update the UI with the new content
        if (content) {
		text += content;
           }
        }
		// Get the GPT element by ID
		const gptElement = document.getElementById(`gpt_${window.token}`);
		if (gptElement) {
			// Render the GPT response using Markdown
			gptElement.innerHTML = markdown.render(text);
		} else {
			console.error(`Element with id 'gpt_${window.token}' not found.`);
			// Handle the error or return from the function
		}
			document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
				hljs.highlightElement(el);
				el.classList.add('processed');
			});
// Scroll to the top and then to the bottom of the message box
			window.scrollTo(0, 0);
			message_box.scrollTo({
				top: message_box.scrollHeight,
				behavior: "auto"
			});
            
        }
		
        // Check for a specific error message in the GPT response
        if (
      text.includes(
        `instead. Maintaining this website and API costs a lot of money`
      )
      ) {
      document.getElementById(`gpt_${window.token}`).innerHTML =
        "An error occured, please reload / refresh cache and try again.";
      }
// Add user and assistant messages to the conversation
		add_message(window.conversation_id, "user", message);
		add_message(window.conversation_id, "assistant", text);
// Scroll to the bottom of the message box
		message_box.scrollTop = message_box.scrollHeight;
		// Remove the cancel button and unlock the prompt
		await remove_cancel_button();
		prompt_lock = false;
// Load conversations and scroll to the top
		await load_conversations(20, 0);
		window.scrollTo(0, 0);
	} catch (e) {
		// Handle errors and display appropriate messages
		add_message(window.conversation_id, "user", message);

		message_box.scrollTop = message_box.scrollHeight;
		await remove_cancel_button();
		prompt_lock = false;

		await load_conversations(20, 0);
        
        console.log(e);

		let cursorDiv = document.getElementById(`cursor`);
		if (cursorDiv) cursorDiv.parentNode.removeChild(cursorDiv);
         // Check if the error is an AbortError
      if (e.name != `AbortError`) {
      let error_message = `Oops ! Something went wrong, please try again later. Check error in console.`;

      document.getElementById(`gpt_${window.token}`).innerHTML = error_message;
      add_message(window.conversation_id, "assistant", error_message);
    } else {
      document.getElementById(`gpt_${window.token}`).innerHTML += ` [aborted]`;
      add_message(window.conversation_id, "assistant", text + ` [aborted]`);
    }
// Scroll to the top
    window.scrollTo(0, 0);
  }
};
// User-selected language information
let selectedLang = 'tr'; // Default is Turkish

// Function to speak the response text
const speakText = () => {
    const gptElement = document.getElementById(`gpt_${window.token}`);
    if (gptElement) {
        const textToSpeak = gptElement.innerText || gptElement.textContent;

        // Determine the language for speech synthesis based on user selection
        const lang = selectedLang === 'tr' ? 'tr-TR' : 'en-US';

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang;
        speechSynthesis.speak(utterance);
    } else {
        console.error(`Element with id 'gpt_${window.token}' not found.`);
        // Handle the error or return from the function
    }
};
// Function to clear all conversations
const clear_conversations = async () => {
	const elements = box_conversations.childNodes;
	let index = elements.length;

	if (index > 0) {
		while (index--) {
			const element = elements[index];
			if (
				element.nodeType === Node.ELEMENT_NODE &&
				element.tagName.toLowerCase() !== `button`
			) {
				box_conversations.removeChild(element);
			}
		}
	}
};
// Function to clear the current conversation
const clear_conversation = async () => {
	let messages = message_box.getElementsByTagName(`div`);

	while (messages.length > 0) {
		message_box.removeChild(messages[0]);
	}
};
// Function to show the delete conversation options
const show_option = async (conversation_id) => {
	const conv = document.getElementById(`conv-${conversation_id}`);
	const yes = document.getElementById(`yes-${conversation_id}`);
	const not = document.getElementById(`not-${conversation_id}`);

	conv.style.display = "none";
	yes.style.display = "block";
	not.style.display = "block";
}
// Function to hide the delete conversation options
const hide_option = async (conversation_id) => {
	const conv = document.getElementById(`conv-${conversation_id}`);
	const yes = document.getElementById(`yes-${conversation_id}`);
	const not = document.getElementById(`not-${conversation_id}`);

	conv.style.display = "block";
	yes.style.display = "none";
	not.style.display = "none";
}
// Function to delete a conversation
const delete_conversation = async (conversation_id) => {
	localStorage.removeItem(`conversation:${conversation_id}`);

	const conversation = document.getElementById(`convo-${conversation_id}`);
	conversation.remove();

	if (window.conversation_id == conversation_id) {
		await new_conversation();
	}

	await load_conversations(20, 0, true);
};
// Function to set the current conversation
const set_conversation = async (conversation_id) => {
	history.pushState({}, null, `${path}/${conversation_id}`);
	window.conversation_id = conversation_id;

	await clear_conversation();
	await load_conversation(conversation_id);
	await load_conversations(20, 0, true);
};
// Function to create a new conversation
const new_conversation = async () => {
	history.pushState({}, null, `${path}/`);
	window.conversation_id = uuid();

	await clear_conversation();
	await load_conversations(20, 0, true);
};
// Function to load a specific conversation
const load_conversation = async (conversation_id) => {
	let conversation = await JSON.parse(
		localStorage.getItem(`conversation:${conversation_id}`)
	);
	console.log(conversation, conversation_id);

	for (item of conversation.items) {
		message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${item.role == "assistant" ? gpt_image : user_image}
                    ${
                      item.role == "assistant"
                        ? `<i class="fa-regular fa-phone-arrow-down-left"></i>`
                        : `<i class="fa-regular fa-phone-arrow-up-right"></i>`
                    }
                </div>
                <div class="content">
                    ${
                      item.role == "assistant"
                        ? markdown.render(item.content)
                        : item.content
                    }
                </div>
            </div>
        `;
	}

	document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
		hljs.highlightElement(el);
		el.classList.add('processed');
	});

	message_box.scrollTo({
		top: message_box.scrollHeight,
		behavior: "smooth"
	});

	setTimeout(() => {
		message_box.scrollTop = message_box.scrollHeight;
	}, 500);
};
// Function to get a conversation by ID
const get_conversation = async (conversation_id) => {
	let conversation = await JSON.parse(
		localStorage.getItem(`conversation:${conversation_id}`)
	);
	return conversation.items;
};
// Function to add a conversation
const add_conversation = async (conversation_id, title) => {
	if (localStorage.getItem(`conversation:${conversation_id}`) == null) {
		localStorage.setItem(
			`conversation:${conversation_id}`,
			JSON.stringify({
				id: conversation_id,
				title: title,
				items: [],
			})
		);
	}
};
// Function to add a message to a conversation
const add_message = async (conversation_id, role, content) => {
	before_adding = JSON.parse(
		localStorage.getItem(`conversation:${conversation_id}`)
	);

	before_adding.items.push({
		role: role,
		content: content,
	});

	localStorage.setItem(
		`conversation:${conversation_id}`,
		JSON.stringify(before_adding)
	); // update conversation
};
// Function to load conversations
const load_conversations = async (limit, offset, loader) => {
	
	let conversations = [];
	for (let i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith("conversation:")) {
			let conversation = localStorage.getItem(localStorage.key(i));
			conversations.push(JSON.parse(conversation));
		}
	}

	await clear_conversations();

	for (conversation of conversations) {
		box_conversations.innerHTML += `
    <div class="convo" id="convo-${conversation.id}">
      <div class="left" onclick="set_conversation('${conversation.id}')">
          <i class="fa-regular fa-comments"></i>
          <span class="convo-title">${conversation.title}</span>
		  </div>
		  <i onclick="show_option('${conversation.id}')" class="fa-regular fa-trash-alt" id="conv-${conversation.id}"></i>
		  <i onclick="delete_conversation('${conversation.id}')" class="fa-regular fa-check-circle" id="yes-${conversation.id}" style="display:none;"></i>
		  <i onclick="hide_option('${conversation.id}')" class="fa-regular fa-x" id="not-${conversation.id}" style="display:none;"></i>
	  </div>
    `;
	}

	document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
		hljs.highlightElement(el);
		el.classList.add('processed');
	});
};
// Event listener for cancel button click
document.getElementById(`cancelButton`).addEventListener(`click`, async () => {
	window.controller.abort();
	console.log(`aborted ${window.conversation_id}`);
});

// Function to convert hex string to ASCII
function h2a(str1) {
	var hex = str1.toString();
	var str = "";

	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}

	return str;
}
// Function to generate a UUID
const uuid = () => {
	return `xxxxxxxx-xxxx-4xxx-yxxx-${Date.now().toString(16)}`.replace(
		/[xy]/g,
		function(c) {
			var r = (Math.random() * 16) | 0,
				v = c == "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		}
	);
};
// Function to generate a unique message ID
const message_id = () => {
	random_bytes = (Math.floor(Math.random() * 1338377565) + 2956589730).toString(
		2
	);
	unix = Math.floor(Date.now() / 1000).toString(2);

	return BigInt(`0b${unix}${random_bytes}`).toString();
};
// Window onload event handler
window.onload = async () => {
	load_settings_localstorage();

	conversations = 0;
	for (let i = 0; i < localStorage.length; i++) {
		if (localStorage.key(i).startsWith("conversation:")) {
			conversations += 1;
		}
	}

	if (conversations == 0) localStorage.clear();

	await setTimeout(() => {
		load_conversations(20, 0);
	}, 1);

	message_input.addEventListener(`keydown`, async (evt) => {
		if (prompt_lock) return;
		if (evt.keyCode === 13 && !evt.shiftKey) {
			evt.preventDefault();
			console.log('pressed enter');
			await handle_ask();
		} else {
			message_input.style.removeProperty("height");
			message_input.style.height = message_input.scrollHeight + 4 + "px";
		}
	});

	send_button.addEventListener(`click`, async () => {
		console.log("clicked send");
		if (prompt_lock) return;
		await handle_ask();
	});

	register_settings_localstorage();
};
// Event listener for mobile sidebar click
document.querySelector(".mobile-sidebar").addEventListener("click", (event) => {
	const sidebar = document.querySelector(".conversations");

	if (sidebar.classList.contains("shown")) {
		sidebar.classList.remove("shown");
		event.target.classList.remove("rotated");
	} else {
		sidebar.classList.add("shown");
		event.target.classList.add("rotated");
	}

	window.scrollTo(0, 0);
});
// Function to register settings in local storage
const register_settings_localstorage = async () => {
    try {
        const settings_ids = ["model"];
        const settings_elements = settings_ids.map((id) => document.getElementById(id));

        settings_elements.forEach((element) => {
            if (element) {
                element.addEventListener(`change`, async (event) => {
                    switch (event.target.type) {
                        case "checkbox":
                            localStorage.setItem(event.target.id, event.target.checked);
                            break;
                        case "select-one":
                            localStorage.setItem(event.target.id, event.target.selectedIndex);
                            break;
                        default:
                            console.warn("Unresolved element type");
                    }
                });
            } else {
            }
        });
    } catch (error) {
        console.error("Error in register_settings_localstorage:", error);
    }
};

// Function to load settings from local storage
const load_settings_localstorage = async () => {
    try {
        const settings_ids = ["model"];
		const settings_elements = settings_ids.map((id) => document.getElementById(id));

        settings_elements.forEach((element, index) => {
            if (element) {
                switch (element.type) {
                    case "checkbox":
                        element.checked = localStorage.getItem(settings_ids[index]) === "true";
                        break;
                    case "select-one":
                        element.selectedIndex = parseInt(localStorage.getItem(settings_ids[index]));
                        break;
                    default:
                        console.warn("Unresolved element type");
                }
            } else {
            }
        });
    } catch (error) {
        console.error("Error in load_settings_localstorage:", error);
    }
};

// Function to toggle between light and dark themes
function toggleTheme() {
	var element = document.documentElement;
	element.classList.toggle("dark");
	var sunIcon = document.getElementById("sun-icon");
	var moonIcon = document.getElementById("moon-icon");
  
	if (element.classList.contains("dark")) {
	  sunIcon.style.display = "none";
	  moonIcon.style.display = "inline-block";
	  localStorage.setItem("theme", "dark");
	} else {
	  sunIcon.style.display = "inline-block";
	  moonIcon.style.display = "none";
	  localStorage.setItem("theme", "light");
	}
  
	updateStylesheet();
  }
  
  function updateStylesheet() {
	var oldlink = document.getElementById("theme-stylesheet");
	var newlink = document.createElement("link");
	newlink.setAttribute("rel", "stylesheet");
	newlink.setAttribute("type", "text/css");
	newlink.setAttribute("href", "assets/css/style.css");
	newlink.setAttribute("id", "theme-stylesheet");
  
  }
  
  // Set the initial theme based on local storage
  var theme = localStorage.getItem("theme");
  if (theme === "dark") {
	toggleTheme();
  }
  
// Voice Input functionality
let isListening = false;
let recognition;

function toggleVoiceInput() {
  const voiceIcon = document.getElementById('voiceIcon');
  const voiceButtonText = document.getElementById('voiceButtonText');
  const messageInput = document.getElementById('message-input');

  if (!isListening) {
    recognition = new webkitSpeechRecognition() || new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = true;

    recognition.onstart = () => {
      console.log('Voice recognition started...');
	  const voiceButtonText = document.getElementById('voiceButtonText');
	  if (voiceButtonText) {
		  voiceButtonText.textContent = 'Listening...';
	  } else {
	  }    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      messageInput.value = transcript; // Set the transcript to the message input
    };

    recognition.onend = () => {
      console.log('Voice recognition ended.');
      isListening = false;
      voiceIcon.classList.remove('fa-stop');
      voiceIcon.classList.add('fa-microphone');
	  const voiceButtonText = document.getElementById('voiceButtonText');
	  if (voiceButtonText) {
		  voiceButtonText.textContent = 'Voice Input';
	  } else {
	  }    };

    recognition.start();
    isListening = true;
    voiceIcon.classList.remove('fa-microphone');
    voiceIcon.classList.add('fa-stop');
  } else {
    recognition.stop();
  }
}

// Attach the event handler to the "Voice Input" button
const voiceInputButton = document.getElementById('voiceInputButton');
if (voiceInputButton) {
    voiceInputButton.addEventListener('click', toggleVoiceInput);
} else {
    console.error("Element with id 'voiceInputButton' not found.");
    // Handle the error or return from the function
}
function toggleSidebar() {
    var toggleMenuBtn = document.getElementById('toggleMenuBtn');
    toggleMenuBtn.classList.toggle('active');
}

// Event listener for the sidebar toggle button click
document.getElementById('toggleMenuBtn').addEventListener('click', function () {
	var sidebar = document.querySelector('.conversations');
	sidebar.style.display = (sidebar.style.display === 'none' || sidebar.style.display === '') ? 'flex' : 'none';
});
// Function to copy content to clipboard
function copyToClipboard(icon) {
const gptElement = document.getElementById(`gpt_${window.token}`);

if (gptElement) {
const textToCopy = gptElement.innerText || gptElement.textContent;
navigator.clipboard.writeText(textToCopy)
	.then(() => {
		// Display a check mark to inform the user
		icon.innerHTML = '<i class="fas fa-check-circle"></i>';
		
		// Remove the check mark after a certain duration
		setTimeout(function() {
			icon.innerHTML = '<i class="far fa-clipboard"></i>';
		}, 1000); // For example, revert after 1000 milliseconds (1 second)
	})
	.catch(err => {
		console.error('Panoya kopyalama hatası:', err);
	});
} else {
}
}

        // Function to clear messages
        function clearMessages() {
            var messageBox = document.getElementById('messages');
            messageBox.innerHTML = ''; // Clear the message box
        }

        document.addEventListener("DOMContentLoaded", function () {
            const fileInput = document.getElementById("file-upload");
            const messageInput = document.getElementById("message-input");

            fileInput.addEventListener("change", function () {
                const file = fileInput.files[0];

                if (file) {
                    const fileReader = new FileReader();

                    fileReader.onload = function (event) {
                        const typedArray = new Uint8Array(event.target.result);

                        // Load PDF and extract text
                        pdfjsLib.getDocument(typedArray).promise.then(function (pdfDoc) {
                            const numPages = pdfDoc.numPages;
                            const promises = [];

                            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                                promises.push(pdfDoc.getPage(pageNum).then(function (page) {
                                    return page.getTextContent().then(function (textContent) {
                                        return textContent.items.map(item => item.str).join(' ');
                                    });
                                }));
                            }

                            Promise.all(promises).then(function (texts) {
                                // Concatenate text from all pages
                                const pdfText = texts.join('\n');
                                // Display the extracted text in the textarea
                                messageInput.value = pdfText;
                            });
                        });
                    };

                    fileReader.readAsArrayBuffer(file);
                }
            });
        });

        // Function to generate PDF from the content of the message box
        function generatePDF() {
            // Get the text content from the message box
            const messageContent = document.getElementById('messages').innerText;

            // Create a new jsPDF instance
            const pdf = new jsPDF();

            // Add text to the PDF
            pdf.text(messageContent, 10, 10);

            // Save the PDF to a file (you can customize the filename)
            pdf.save('message_box_content.pdf');
        }

        // Attach the function to the print button
        document.getElementById('print-button').addEventListener('click', generatePDF);

        const messagesContainer = document.getElementById('messages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        let isFirstMessageSent = false;

        function isScrollAtBottom() {
            return messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;
        }

        messagesContainer.addEventListener('scroll', function () {
            if (isScrollAtBottom()) {
                if (isFirstMessageSent) {
                    scrollToBottomBtn.style.display = 'none';
                }
            } else {
                scrollToBottomBtn.style.display = 'block';
            }
        });

        scrollToBottomBtn.addEventListener('click', function () {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            scrollToBottomBtn.style.display = 'none';
        });

        // Example function to send a message
        function sendMessage(message) {
            // Send the message

            // After sending the first message, set isFirstMessageSent to true
            isFirstMessageSent = true;

            // Check the scroll position when a message is sent
            if (isScrollAtBottom()) {
                scrollToBottomBtn.style.display = 'none';
            } else {
                scrollToBottomBtn.style.display = 'block';
            }
        }

        // Example usage
        sendMessage('Hello, this is the first message!');



        function convertSpeechToText() {
    const input = document.getElementById('audioInput');
    const file = input.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('providers', 'openai,gladia');
        formData.append('file', file);
        formData.append('language', 'en'); // Change the language to your desired language

        const apiKey = 'YOUR-API-KEY'; // Add your API key here

        const requestOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'multipart/form-data',
            },
            data: formData,
        };

        // Show a notification when the file is successfully selected
        alert('Successful!');

        axios('https://api.edenai.run/v2/audio/speech_to_text_async', requestOptions)
            .then(response => {
                console.log(response.data);

                // Take only the "text" part and add it to the textarea
                const textResult = response.data.results.openai.text;
                document.getElementById('message-input').value = textResult;
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during translation.');
            });
    } else {
        alert('Please select an audio file.');
    }
}

        function redirectToConverter() {
            // Redirect to the Text to Image Converter page
            window.location.href = 'image.html';
        }

        async function performOCR() {
    const fileInput = document.getElementById('fileInput');
    const textOutput = document.getElementById('message-input');

    if (fileInput.files.length > 0) {
        const selectedFile = fileInput.files[0];
        const formData = new FormData();
        formData.append('providers', 'microsoft,google');
        formData.append('file', selectedFile);
        formData.append('language', 'en');
        formData.append('fallback_providers', '');

        try {
            // Show a notification when the file is successfully selected
            alert('Successful!');

            const response = await axios.post('https://api.edenai.run/v2/ocr/ocr', formData, {
                headers: {
                    Authorization: 'Bearer YOUR-API-KEY',
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log(response.data); // Log the response to the console

            // Check for a response containing text from both providers
            if (response.data.google && response.data.google.text) {
                textOutput.value = response.data.google.text;
            } else if (response.data.microsoft && response.data.microsoft.text) {
                textOutput.value = response.data.microsoft.text;
            } else {
                console.error('OCR response does not contain text:', response.data);
                alert('An error occurred during the OCR process. Please check the browser console.');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during the OCR process. Please check the browser console.');
        }
    } else {
        alert('Please select an image file.');
    }
}
// This part checks the status of the button as the textarea content changes
document.getElementById('message-input').addEventListener('input', function() {
    // Enable the button if the placeholder is not shown
    document.getElementById('send-button').classList.toggle('active', this.value.trim() !== '');
});

// This part checks the status of the button when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Enable the button if the placeholder is not shown and the textarea content is not empty
    document.getElementById('send-button').classList.toggle('active', document.getElementById('message-input').value.trim() !== '');
});

// This part handles the action when the button is clicked
document.getElementById('send-button').addEventListener('click', function() {
    if (this.classList.contains('active')) {
        // Replace this with your send action
        console.log('Message sent:', document.getElementById('message-input').value);
    }
});

function redirectTocontent() {
    // Redirect to the Text to Image Converter page
    window.location.href = 'content.html';
}