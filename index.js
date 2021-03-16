require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// initialize Mongo client and create connection uri
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER_NAME}.exvpx.mongodb.net/${process.env.DB_DATABASE}?retryWrites=true&w=majority`;
let hostUserId;

MongoClient.connect(uri, {
    useUnifiedTopology: true
}, (err, db) => {
    if (err) throw err;
    let dbo = db.db(process.env.DB_DATABASE);
    console.log("Connected to database");
    dbo.collection('operations').countDocuments((err, count) => {
        if (err) throw err;
        if (count) {
            dbo.collection('operations').drop((err) => {if (err) throw err;});
        }
    })
    app.use(express.static(__dirname + '/public'));

    function onConnection(socket) {
        console.log("new client :" + socket.id);
        socket.on('disconnect', () => {
            console.log("client disconnected");
        })
        socket.on('join-session', joinSession);
        socket.on('end-session', endSession);
        socket.on('new-client-request-decision', (data) => {
            io.to(data.clientId).emit("new-client-request-decision", {
                accepted: data.accepted
            })
        })

        socket.on('freehand-drawing', (message) => {

            socket.broadcast.emit("broadcast", {
                type: 'freehand-drawing',
                moveToX: message.moveToX,
                moveToY: message.moveToY,
                lineToX: message.lineToX,
                lineToY: message.lineToY
            });
        });

        socket.on('new-move', (data, callback) => {
            let newMove = {
                userId: data.userId,
                moves: data.moves
            }
            dbo.collection('operations').insertOne(newMove, (err, records) => {
                if (err) throw err;
                socket.broadcast.emit("broadcast", {
                    type: "new-move",
                    moveId: records.ops[0]._id,
                    moves: newMove.moves,
                    userId: newMove.userId
                })
                callback({
                    moveId: records.ops[0]._id
                })
            })
        });

        socket.on('erase', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'erase',
                arcX: message.arcX,
                arcY: message.arcY
            });
        });

        socket.on('undo', (data) => {
            // DELETE FROM DATABASE
            dbo.collection('operations').deleteOne({moveId: data.moveId}, (err, res) => {
                if (err) throw err;
                console.log("session ended");
            })
            socket.broadcast.emit("broadcast", {
                type: 'undo',
                moveId: data.moveId
            })
        })

        socket.on('image-upload', (message) => {
            socket.broadcast.emit("broadcast", {
                image: true,
                type: 'image-upload',
                imageSrc: message.imageSrc,
                startX: message.startX,
                startY: message.startY
            });
        });

        socket.on('new-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'new-sticky-note',
                author: message.author,
                stickyNoteId: message.stickyNoteId
            });
        });

        socket.on('edit-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'edit-sticky-note',
                stickyNoteId: message.stickyNoteId,
                newText: message.newText
            });
        });

        socket.on('move-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'move-sticky-note',
                stickyNoteId: message.stickyNoteId,
                top: message.top,
                left: message.left
            });
        });
    }

    /**
     * Handle a new incoming request for joining a session
     * If no session exists, a new session is created and and the requesting user becomes the host
     * If a session exists, a message will be sent to the host user to accept/reject the incoming request
     */
    function joinSession(data, callback) {
        console.log("new join-session request received");
        dbo.collection('sessions').countDocuments((err, count) => {

            console.log("existing sessions: " + count);

            if (count) {
                // TODO: implement joining an existing session functionality
                io.to(hostUserId).emit("new-client-request", {
                    message: `New client with connection id #${data.connectionId} would like to connect`,
                    connectionId: data.connectionId
                })
                callback({
                    status: "waiting"
                })
            } else {
                let newSession = {
                    startDate: Date(),
                    hostUser: data.connectionId
                }
                dbo.collection('sessions').insertOne(newSession, (err, succ) => {
                    if (err) throw err;
                    console.log("new session inserted");
                    hostUserId = data.connectionId;
                });
                callback({
                    status: "accepted"
                })
            }

        });
    }

    function endSession() {
        dbo.collection('sessions').deleteOne((err, res) => {
            if (err) throw err;
            console.log("session ended");
        })
    }

    io.on('connection', onConnection);

    http.listen(port, () => console.log('server listening on port ' + port));
})