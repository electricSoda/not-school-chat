const _username = document.getElementById("username")
const username_field = document.getElementById("username-field")
const username_container = document.getElementById("username-container")

let username
let socket

username_field.addEventListener("submit", (e) => {
	e.preventDefault()
	if (_username.value !== "" && _username.value.length <= 22) {
		username_container.style.display = "none"
		username = _username.value

		socket = io(window.location.href, { query: `username=${username}`})

		listeners()
	} else {
		_username.value = ""
		_username.placeholder = "Invalid input"
		_username.blur()
	}
})

const messages = document.getElementById("messages")
const chat = document.getElementById("chat")

const input = document.getElementById("input")

chat.addEventListener("keyup", () => {
	if (input.value != "" && input.value != " ") {
		socket.emit("typing", true)
	}
})

chat.addEventListener("submit", (e) => {
	e.preventDefault()
	if (input.value != "" && input.value != " ") {
		socket.emit("message", input.value)
		input.value = ""	
	}
})

const img = document.getElementById("img")
img.addEventListener("change", () => {
	var file = img.files[0]
	var reader = new FileReader()
	reader.readAsDataURL(file)
	reader.onloadend = () => {
		console.log("finished")
		img.value = ""
		socket.emit("image", reader.result)
	}
})

const online_header = document.getElementById("header")
const online = document.getElementById("online-list")

const typing = document.getElementById("typing")

const listeners = () => {
	socket.on("meta", (data) => {
		if (data["connected"]) {
			online.innerHTML = ""
			data["connected"].forEach((name) => {
				let li = document.createElement("li")
				li.innerText = name
				online.appendChild(li)
			})	
			online_header.innerText = `Online (${data["connected"].length})`
		}
		
		if (data["messages"]) {
			data["messages"].forEach((message) => {
				if (message.type == "MESSAGE") {
					messages.innerHTML += `<li class="message"><b>${message.username}</b> <a class="date"><${message.date}></a><br>${message.message}</li>`
				} else if (message.type == "ANNOUNCMENT") {
					messages.innerHTML += `<li class="message"><i>${message.message}</i> <a class="date"><${message.date}></a></li>`
				} else if(message.type == "IMAGE") {
					messages.innerHTML += `<li class="message"><b>${message.username}</b> <a class="date"><${message.date}></a><br><a href="${message.image}" target="_blank" rel="noopener noreferrer"><img src="${message.image}" style="width: 300px; height: 300px;"></a></li>`
				}
				messages.lastElementChild.scrollIntoView()	
			})
		}
	})

	socket.on("message", (data) => {
		messages.innerHTML += `<li class="message"><b>${data.username}</b> <a class="date"><${data.date}></a><br>${data.message}</li>`
		messages.lastElementChild.scrollIntoView()	
	})

	socket.on("announcement", (data) => {
		messages.innerHTML += `<li class="message"><i>${data.message}</i> <a class="date"><${data.date}></a></li>`
		messages.lastElementChild.scrollIntoView(true)	
	})

	socket.on('image', (data) => {
		messages.innerHTML += `<li class="message"><b>${data.username}</b> <a class="date"><${data.date}></a><br><a href="${data.image}" target="_blank" rel="noopener noreferrer"><img src="${data.image}" style="width: 300px; height: 300px;"></a></li>`
		messages.lastElementChild.scrollIntoView(true)	
	})
	
	socket.on("typing", (data) => {
		let _typing = data.typing
		if (_typing.includes(username)) {
			let i = _typing.indexOf(username)
			_typing.splice(i, 1)
		}

		var typing_string = ""
		if (_typing.length >= 4) {
			typing_string = "Several people are typing..."
		} else if (_typing.length == 1) {
			typing_string = _typing[0] + " is typing..."
		} else if (4 > _typing.length && _typing.length > 1) {
			typing_string = _typing.join(", ") + " are typing..."
		} else {
			typing_string = ""
		}
		typing.innerText = typing_string
	})
}