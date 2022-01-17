// Array functions
Array.prototype.queuelength = 100
Array.prototype.add = function(...args) {
	args.forEach((arg, index) => {
		if (this.length == this.queuelength) {
			this.shift()
		}
		this.push(arg)
	})
}

const getCurrentTime = () => {
	let timeZone = "America/Denver"
	const dateObject = new Date().toLocaleString("en-US", {
		timeZone,
	})
	return dateObject
}

var http = require('http')
var express = require('express')
var app = express()

var server = http.createServer(app)

const PORT = process.env.PORT || 3000

const io = require("socket.io")(server)

const filename = "./messages.json"
var content = require(filename)
var messages = content["messages"]
const fs = require("fs")
messages.queuelength = 100

app.use(express.static(__dirname + "/public"))

io.on("connection", (socket) => {
	console.log("Client connected with id: " + socket.id + " and username of: " + socket.handshake.query.username)
	socket.username = socket.handshake.query.username

	let sockets = []
	for (let [key, value] of io.sockets.sockets) {
		for (let property in value) {
			if (property == "username") {
				sockets.push(value[property])
			}
		}
	}

	fs.writeFileSync(filename, JSON.stringify(content, null, 2))
	delete require.cache[require.resolve(filename)]
	content = require(filename)
	messages = content["messages"]

	io.sockets.emit("meta", { "connected": sockets })
	socket.emit("meta", { "messages": messages })

	io.sockets.emit("announcement", { message: `${socket.username} has joined`, date: new Date().toLocaleString() })
	messages.add({ message: `${socket.username} has joined`, date: getCurrentTime(), type: "ANNOUNCMENT" })

	socket.on("message", (data) => {
		io.sockets.emit("message", { username: socket.username, message: data, date: new Date().toLocaleString() })
		messages.add({username: socket.username, message: data, date: getCurrentTime(), type: "MESSAGE"})
	})

	socket.on("image", (data) => {
		io.sockets.emit("image", { username: socket.username, image: data, date: new Date().toLocaleString() })
		messages.add({username: socket.username, image: data, date: getCurrentTime, type: "IMAGE"})
	})

	socket.on("disconnect", (data) => {
		sockets = []
		for (let [key, value] of io.sockets.sockets) {
			for (let property in value) {
				if (property == "username") {
					sockets.push(value[property])
				}
			}
		}
		io.sockets.emit("meta", { "connected": sockets })
		io.sockets.emit("announcement", { message: `${socket.username} has disconnected`, date: new Date().toLocaleString() })
		messages.add({ message: `${socket.username} has disconnected`, date: getCurrentTime(), type: "ANNOUNCMENT" })
		fs.writeFileSync(filename, JSON.stringify(content, null, 2))
		delete require.cache[require.resolve(filename)]
		content = require(filename)
		messages = content["messages"]
		console.log(socket.username + " has disconnected.")
	})
})

server.listen(PORT, () => {
	console.log("Server online on port " + PORT)
})