require("dotenv").config()

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

const http = require('http')
const express = require('express')
const app = express()
const server = http.createServer(app)
const session = require("express-session")


const PORT = process.env.PORT || 3000

const io = require("socket.io")(server)

const filename = "./messages.json"
var content = require(filename)
var messages = content["messages"]
messages.queuelength = 100

const fs = require("fs")
const path = require("path")
const { nanoid } = require("nanoid")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")

const verify = (req, res, next) => {
	if (!req.session) {
		res.send("You are not admitted to the homework discussion group.")
	} else if (req.session.packets == process.env.PACKETS)  {
		next()
	} else {
		res.send("You are not admitted to the homework discussion group.")
	}
}

const oneDay = 1000 * 60 * 60 * 24

app.use(bodyParser.urlencoded({ extended: false }))
app.use(session({
	secret: process.env.PACKETS,
	resave: false,
	saveUninitialized: false,
	cookie: { maxAge: oneDay },
}))
app.use(cookieParser())
app.use("/main", verify)
app.use("/main", express.static(__dirname + "/public"))
app.use("/attachments", express.static(__dirname + "/attachments"))

app.post("/", (req, res) => {
	if (req.body.password == process.env.PASSWORD) {
		req.session.packets = process.env.PACKETS
		res.redirect("/main")
	} else {
		res.send("You are not admitted to the homework discussion group.")
	}
})

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname + "/verify/index.html"))
})

/// Listeners

var typing = []

io.on("connection", (socket) => {
	socket.username = socket.handshake.query.username

	let sockets = []
	for (let [key, socket] of io.sockets.sockets) {
		sockets.push(socket["username"])
	}

	let prevSockets = [...sockets]
	if (prevSockets.length !== new Set(prevSockets).size) {
		socket.emit("retry")
		socket.disconnect()
		return
	}

	console.log("Client connected with id: " + socket.id + " and username of: " + socket.username)

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

		let i = typing.indexOf(socket.username)
		typing.splice(i, 1)

		io.sockets.emit("typing", {typing: typing})
	})

	socket.on("typing", (data) => {
		if (data) {
			if (!typing.includes(socket.username)) {
				typing.push(socket.username)
				
				io.sockets.emit('typing', {typing: typing})
			}
		}
	})

	socket.on("image", (data) => {
		let _data = data.replace(/^data:image\/\w+;base64,/, "");
		var buf = Buffer.from(_data, 'base64');
		var path = "/attachments/image-" + nanoid() + ".png"
		fs.writeFile("." + path, buf, (err) => {
			if (err) {
				throw err
			}
		})

		io.sockets.emit("image", { username: socket.username, image: path, date: new Date().toLocaleString() })
		messages.add({username: socket.username, image: path, date: getCurrentTime, type: "IMAGE"})
	})

	socket.on("disconnect", (data) => {
		sockets = []
		for (let [key, socket] of io.sockets.sockets) {
			sockets.push(socket["username"])
		}
		io.sockets.emit("meta", { "connected": sockets })

		io.sockets.emit("announcement", { message: `${socket.username} has disconnected`, date: new Date().toLocaleString() })
		messages.add({ message: `${socket.username} has disconnected`, date: getCurrentTime(), type: "ANNOUNCMENT" })

		fs.writeFileSync(filename, JSON.stringify(content, null, 2))
		delete require.cache[require.resolve(filename)]
		content = require(filename)
		messages = content["messages"]

		let i = typing.indexOf(socket.username)
		typing.splice(i, 1)

		io.sockets.emit("typing", {typing: typing})
		
		console.log(socket.username + " has disconnected.")
	})
})

server.listen(PORT, () => {
	console.log("Server online on port " + PORT)
})