document.addEventListener('DOMContentLoaded', function() {
    var selectedExpertId = null;
    var sessionId = null;

    document.querySelectorAll('.expert').forEach(expert => {
    expert.addEventListener('click', function() {
        document.querySelectorAll('.expert.selected').forEach(selected => {
            selected.classList.remove('selected');
        });
        this.classList.add('selected');
        selectedExpertId = this.dataset.expertId;
		// Clear the chat box when a different expert is selected
            document.getElementById('chatBox').innerHTML = '';
        displayPrompts(this.dataset.expertId);
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

    function displayPrompts(expertId) {
    fetch('/api/prompts/' + expertId)
        .then(response => response.json())
        .then(data => {
            var promptsDiv = document.getElementById('prompts');
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
        var avatarSrc = selectedExpertId ? experts[selectedExpertId].avatar : '/static/default.jpg';
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
function randomRange(min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomBoolean() {
  const rand_num = randomRange(0, 1);
  if (rand_num === 0) {
    return false;
  } else {
    return true;
  }
}

const app = new PIXI.Application(800, 600, { antialias: true });
document.body.appendChild(app.view);

let hasBg = false;
let bubleList = [];
const renderBuble = (newWidth, newHeight) => {
  if (buble) {
    buble.clear();
  }
  bubleList = [];
  for (let i = 0; i < 40; i++) {
    const start_x_pct = randomRange(2, 98);
    const start_y_pct = randomRange(2, 98);
    const size = randomRange(20, 40);
    const start_x = start_x_pct * newWidth / 100;
    const start_y = start_y_pct * newHeight / 100;
    bubleList = [...bubleList, buble.render(start_x, start_y, size)];
  }
};
let canvasGradient;
let gradient_ctx;
let bg_gradient;
const renderGradient = (newWidth, newHeight) => {
  if (!canvasGradient) {
    canvasGradient = document.createElement('canvas');
    gradient_ctx = canvasGradient.getContext('2d');
  }

  canvasGradient.width = newWidth;
  canvasGradient.height = newHeight;

  const gradient = gradient_ctx.createLinearGradient(newWidth / 2, 0, newWidth / 2, newHeight);
  gradient.addColorStop(0, '#46E5FB');
  gradient.addColorStop(1, '#2CC7DB');
  gradient_ctx.fillStyle = gradient;
  gradient_ctx.fillRect(0, 0, newWidth, newHeight);


  if (hasBg) {
    bg_gradient.texture.update();

  } else {
    const gradientTexture = PIXI.Texture.fromCanvas(canvasGradient);
    bg_gradient = new PIXI.Sprite(gradientTexture);
    bg_gradient.x = 0;
    bg_gradient.y = 0;
    app.stage.addChildAt(bg_gradient, 0);
    hasBg = true;
  }

};
const renderCanvas = (newWidth, newHeight) => {

  app.renderer.resize(newWidth, newHeight);
};

const renderAll = () => {
  const newWidth = document.body.clientWidth;
  const newHeight = document.body.clientHeight;
  renderCanvas(newWidth, newHeight);
  renderGradient(newWidth, newHeight);
  renderBuble(newWidth, newHeight);
};


const bubleCreate = buble => {
  app.stage.addChild(buble);
  const render = (start_x, start_y, size = 32) => {
    let dest_x = 0,dest_y = 0,isUp,isRight,acc_x = 0,acc_y = 0;
    const resetUp = () => {
      dest_x = Math.random() * 50;
      isUp = randomBoolean();
      acc_y = 0;
    };
    const resetRight = () => {
      dest_y = Math.random() * 50;
      isRight = randomBoolean();
      acc_x = 0;
    };
    resetUp();
    resetRight();
    return () => {
      let next_x_pos, next_y_pos;
      let next_x = Math.random() * .5;
      let next_y = Math.random() * .5;
      acc_x = acc_x + next_x;
      acc_y = acc_y + next_y;
      next_x_pos = next_x;
      next_y_pos = next_y;
      if (!isUp) {
        next_x_pos = next_x * -1;
      }
      if (!isRight) {
        next_y_pos = next_y * -1;
      }
      start_x = start_x + next_x_pos;
      start_y = start_y + next_y_pos;
      buble.beginFill(0x42E0F6, .8);
      buble.drawCircle(start_x, start_y, size);
      buble.endFill();
      if (acc_y >= dest_y) {
        resetUp();
      }
      if (acc_x >= dest_x) {
        resetRight();
      }
    };
  };
  return {
    render,
    clear: buble.clear.bind(buble) };


};
const buble = bubleCreate(new PIXI.Graphics());

app.ticker.add(function () {
  buble.clear();
  bubleList.map(bubleCreate => {bubleCreate();});
});

renderAll();
window.onresize = function () {
  renderAll();
};