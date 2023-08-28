document.addEventListener('DOMContentLoaded', function() {
    const experts = document.querySelectorAll('.expert');
    let clickCount = 0;
    let isStacked = false;
    var selectedExpertId = null;
    var sessionId = null;
    var promptsDiv = document.getElementById('prompts');

experts.forEach((expert, index) => {
    expert.addEventListener('click', function() {
        clickCount++;
        const actives = document.querySelectorAll('.expert.active');
        actives.forEach(active => {
            active.classList.remove('active');
        });
        this.classList.add('active');
        for (let a = 0; a < experts.length; a++) {
            const translationValue = a * -32;
            experts[a].style.left = `${translationValue}%`;
        }
        for (let i = 0; i < experts.length; i++) {
            if (i !== index) {
                experts[i].classList.add("stacked");
            }
        }
        isStacked = true;
        selectedExpertId = this.dataset.expertId;
        displayPrompts(this.dataset.expertId);
        promptsDiv.style.display = 'flex';
        if (clickCount === 2) {
            for (let a = 0; a < experts.length; a++) {
                const translationValue = 0;
                experts[a].style.left = `${translationValue}px`;
            }
            this.classList.remove('active');
            for (let i = 0; i < experts.length; i++) {
                if (i !== index) {
                    experts[i].classList.remove("stacked");
                }
            }
            clickCount = 0;
            isStacked = false;
            selectedExpertId = null;
            promptsDiv.style.display = 'none';
        }
        document.getElementById('chatBox').innerHTML = '';
    });
});
    document.getElementById('textbox').addEventListener('keyup', function(event) {
        if (event.key === "Enter") {
            document.getElementById('sendButton').click();
        }
    });
    
    document.getElementById('sendButton').addEventListener('click', function() {
        if (selectedExpertId === null) {
        Swal.fire({
            icon: 'error',
            title: 'Ố ồ...',
            text: 'Vui lòng chọn một chuyên gia trước khi gửi thông tin.',
			confirmButtonColor: '#00B893' // Đây là màu xanh dương. Thay đổi màu theo ý muốn của bạn.
        })
        return;
    }
		var textbox = document.getElementById('textbox');
        var message = textbox.value;
        textbox.value = "";
        createMessageBubble('user', message, '/static/user.jpg');
        sendRequest(message);
    });
	function displayPrompts(expertId) {
    fetch('/api/prompts/' + expertId)
        .then(response => response.json())
        .then(data => {
            promptsDiv.innerHTML = '';
            data.prompts.forEach(prompt => {
                var promptElement = document.createElement('div');
                promptElement.innerText = prompt.display;
                promptElement.classList.add('prompt'); // Thêm class này
                promptElement.addEventListener('click', function() {
                document.querySelectorAll('.prompt.selected').forEach(selected => {
                            selected.classList.remove('selected');
                        });
                        this.classList.add('selected');
                        selectPrompt(prompt.full);
                    });
                    promptsDiv.appendChild(promptElement);
                });
            });
    }
    function createMessageBubble(role, message, avatarSrc, shouldType) {
        var chatBox = document.getElementById('chatBox');
        var messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-avatar-and-message');

        if (role !== 'system') {
            var avatar = document.createElement('img');
            avatar.classList.add('chat-avatar');
            avatar.src = avatarSrc;
            messageContainer.appendChild(avatar);
        }

        var messageBubble = document.createElement('div');
        messageBubble.classList.add(role + '-message', 'message');
        
		    // Check if the message contains a table 
    var parts = message.split('\n\n');
    for (var i = 0; i < parts.length; i++) {
        var p = document.createElement('p');
        if(parts[i].startsWith("|")) {
            var table = generateTableFromMarkdown(parts[i]);
            messageBubble.appendChild(table);
        } else {
            p.textContent = parts[i];
            messageBubble.appendChild(p);
        }
    }
    
    if(shouldType) {
        typeMessage(message, messageBubble);
    } else {
        messageBubble.innerHTML = message;
    }
    
    messageContainer.appendChild(messageBubble);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
}

	function generateTableFromMarkdown(markdown) {
		var rows = markdown.split("\n");
		var table = document.createElement('table');

		for(var i = 0; i < rows.length; i++) {
			var row = document.createElement('tr');
			var cols = rows[i].split("|").slice(1, -1); // slice to avoid empty first and last elements due to "|"

        for(var j = 0; j < cols.length; j++) {
            var cell = document.createElement(i === 0 ? 'th' : 'td');
            cell.textContent = cols[j].trim();
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    return table;
}
        

    function typeMessage(message, messageBubble) {
        // Split the message into words
        const words = message.split(' ');
        let index = 0;

        // Set an interval to display each word
        const interval = setInterval(function() {
            if (index < words.length) {
                // Add the next word to the message bubble
                messageBubble.innerHTML += words[index] + ' ';
                index++;
            } else {
                // If all words have been displayed, clear the interval
                clearInterval(interval);
            }
        }, 500);
    }

    

function selectPrompt(selectedPrompt) {
    var match;
    var regex = /{([^}]*)}/g;
    var fields = {};

    var inputContainer = document.createElement('div');
    inputContainer.classList.add('input-container', 'chat-avatar-and-message'); // Thêm class cho inputContainer
    document.getElementById('chatBox').appendChild(inputContainer);

    // Tìm kiếm và hiển thị prompt.display trên khung chat
    var promptDisplay = selectedPrompt.match(/[^{]*/)[0].trim(); // Lấy phần hiển thị của prompt
    var promptDisplayElement = document.createElement('div');
    promptDisplayElement.innerHTML = '<b>' + promptDisplay + '</b>';
    promptDisplayElement.classList.add('prompt-display'); // Thêm class cho promptDisplayElement
    inputContainer.appendChild(promptDisplayElement);

    while (match = regex.exec(selectedPrompt)) {
        var field = match[1];

        var inputLabel = document.createElement('label');
        inputLabel.innerText = field;
        inputLabel.classList.add('input-label'); // Thêm class cho inputLabel
        inputContainer.appendChild(inputLabel);

        var inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = field;
        inputField.classList.add('input-field'); // Thêm class cho inputField
        inputContainer.appendChild(inputField);

        fields[field] = inputField;
    }

    var submitButton = document.createElement('button');
    submitButton.innerText = 'Gửi';
    submitButton.classList.add('submit-button'); // Thêm class cho submitButton
    submitButton.addEventListener('click', function() {
        var answers = {};
        for (var field in fields) {
            answers[field] = fields[field].value;
        }

        inputContainer.remove();
		// Hiển thị typing indicator trước khi gửi yêu cầu
		showTypingIndicator(true);
        fetch('/api/select_prompt/' + selectedExpertId, {
            method: 'POST',
            body: JSON.stringify({prompt: selectedPrompt, answers: answers}),
            headers: {"Content-type": "application/json;charset=UTF-8"}
        })
        .then(response => response.json())
        .then(data => {
            sendRequest(data.filled_in_prompt); // Gửi câu trả lời đã được điền vào cho chatbot
        });
    });
    inputContainer.appendChild(submitButton);
}


    function formatText(text) {
        const lines = text.split('\n');
        let formatted = "";
        lines.forEach(line => {
            formatted += `<p>${line}</p>`;
        });
        return formatted;
    }

    function sendRequest(message) {
    // Hiển thị typing indicator trước khi gửi tin nhắn:
    showTypingIndicator(true);

    fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({message: message, expert_id: selectedExpertId, session_id: sessionId}),
        headers: {"Content-type": "application/json;charset=UTF-8"}
    })
    .then(response => response.json())
    .then(data => {
        sessionId = data.session_id;
        var avatarSrc = (selectedExpertId && experts[selectedExpertId]) ? experts[selectedExpertId].avatar : '/static/default.jpg';
        createMessageBubble('assistant', formatText(data.message), avatarSrc);
        
        // Ẩn typing indicator sau khi nhận được hồi đáp:
        showTypingIndicator(false);
    });
}

    function showTypingIndicator(show) {
        var chatBox = document.getElementById('chatBox');

        if (show && !document.getElementById('typingIndicator')) {
            var messageContainer = document.createElement('div');
            messageContainer.classList.add('chat-avatar-and-message');
            messageContainer.id = 'typingIndicator';

            var messageBubble = document.createElement('div');
            messageBubble.classList.add('assistant-message', 'message');
            
            var animationHtml = `<div class="typing-indicator">
			<span></span>
			<span></span>
			<span></span>
			</div>`;
            messageBubble.innerHTML = animationHtml;
            
            messageContainer.appendChild(messageBubble);

            chatBox.appendChild(messageContainer);
        } else if (!show && document.getElementById('typingIndicator')) {
            document.getElementById('typingIndicator').remove();
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
//background
