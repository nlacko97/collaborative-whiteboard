const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

function onConnection(socket) {
    console.log("new client connected");
    socket.emit('newc', 'new client connected');
    socket.on('disconnect', () => { console.log("client disconnected"); })
}

io.on('connection', onConnection);

http.listen(port, () => console.log('server listening on port ' + port));