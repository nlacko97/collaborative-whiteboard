require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var CryptoJS = require("crypto-js");
const port = process.env.PORT || 3000;

// initialize Mongo client and create connection uri
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('bson');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER_NAME}.exvpx.mongodb.net/${process.env.DB_DATABASE}?retryWrites=true&w=majority`;
let hostUserId;
let hostDisconnectedTriggered;
let hostEndSessionTriggered;
let encryptionKey;
let sessionParticipants = [];

MongoClient.connect(uri, {
    useUnifiedTopology: true
}, (err, db) => {
    if (err) throw err;
    let dbo = db.db(process.env.DB_DATABASE);
    console.log("Connected to database");

    // for dev env
    dbo.collection('sessions').countDocuments((err, res) => {
        if (err) throw err;
        if (res) {
            dbo.collection('sessions').drop();
        }
    })

    app.use(express.static(__dirname + '/public'));

    function onConnection(socket) {
        console.log("new client :" + socket.id);
        socket.on('disconnect', () => {
            console.log("disconnect user");
            pIndex = sessionParticipants.findIndex((p) => { return p.id == socket.id });
            if (pIndex != -1) {
                sessionParticipants.splice(pIndex, 1);
                broadcastData(socket, {
                    type: 'update-participants',
                    sessionParticipants: sessionParticipants
                });
            }
            if (socket.id == hostUserId) {
                hostDisconnectedTriggered = true;
                if (!hostEndSessionTriggered) {
                    hostUserId = -1;
                    endSessionForAll(socket);
                }
            }
        });

        socket.on('join-session', joinSession);
        socket.on('end-session', (message) => {
            console.log('end-session requested');
            if (message.connectionId == hostUserId) {
                hostEndSessionTriggered = true;
                sessionParticipants = [];
                if (!hostDisconnectedTriggered) {
                    hostUserId = -1;
                    endSessionForAll(socket);
                }
            } else { // "end session" event is received from a regular user
                pIndex = sessionParticipants.findIndex((p) => { return p.id == socket.id });
                if (pIndex != -1) {
                    sessionParticipants.splice(pIndex, 1);
                    broadcastData(socket, {
                        type: 'update-participants',
                        sessionParticipants: sessionParticipants
                    });
                }
            }
        });
        socket.on('new-client-request-decision', (data) => {
            dbo.collection('operations').find({}).toArray((err, res) => {
                if (err) throw err;
                let moves = res;
                if (data.accepted) {
                    dataToSend = {
                        accepted: data.accepted,
                        key: encryptionKey,
                        moves: moves,
                        sessionParticipants: sessionParticipants,
                        stickyNotesHTML: data.stickyNotesHTML,
                        imageCommentsHTML: data.imageCommentsHTML,
                        imageCommentButtonsHTML: data.imageCommentButtonsHTML,
                        imageCanvasState: data.imageCanvasState
                    }
                    sessionParticipants.push({
                        username: data.username,
                        id: data.clientId,
                        backgroundColor: getRandomRGB()
                    });
                } else {
                    dataToSend = {
                        accepted: data.accepted,
                    }
                }
                io.to(data.clientId).emit("new-client-request-decision", dataToSend);
                broadcastData(socket, {
                    type: 'update-participants',
                    sessionParticipants: sessionParticipants
                }, null, true);
            });

        })

        socket.on('freehand-drawing', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'freehand-drawing',
                moveToX: message.moveToX,
                moveToY: message.moveToY,
                lineToX: message.lineToX,
                lineToY: message.lineToY
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('new-move', (data, callback) => {
            data = decryptMessage(data);
            let newMove = {
                userId: data.userId,
                moves: data.moves,
                moveType: data.moveType
            }
            dbo.collection('operations').insertOne(newMove, (err, records) => {
                if (err) throw err;
                var dataToSend = {
                    type: "new-move",
                    _id: records.ops[0]._id,
                    moves: newMove.moves,
                    userId: newMove.userId,
                    moveType: newMove.moveType
                }
                broadcastData(socket, dataToSend);
                callback({
                    _id: records.ops[0]._id
                })
                console.log("new move recorded with id: ", records.ops[0]._id);
            })
        });

        socket.on('erase', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'erase',
                arcX: message.arcX,
                arcY: message.arcY
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('undo', (data) => {
            data = decryptMessage(data);
            // DELETE FROM DATABASE
            dbo.collection('operations').deleteOne({ _id: ObjectId(data._id) }, (err, res) => {
                if (err) throw err;
                console.log("move deleted");
            })
            var dataToSend = {
                type: 'undo',
                _id: data._id
            }
            broadcastData(socket, dataToSend);
            console.log("undo operation");
        })

        socket.on('image-upload', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                image: true,
                type: 'image-upload',
                imageSrc: message.imageSrc,
                startX: message.startX,
                startY: message.startY,
                commentContainerId: message.commentContainerId
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('new-sticky-note', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'new-sticky-note',
                author: message.author,
                stickyNoteId: message.stickyNoteId
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('new-image-comment', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'new-image-comment',
                author: message.author,
                commentId: message.commentId,
                commentContainerId: message.commentContainerId
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('edit-sticky-note', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'edit-sticky-note',
                stickyNoteId: message.stickyNoteId,
                newText: message.newText
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('edit-image-comment', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'edit-image-comment',
                commentId: message.commentId,
                newText: message.newText
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('move-sticky-note', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'move-sticky-note',
                stickyNoteId: message.stickyNoteId,
                top: message.top,
                left: message.left
            }
            broadcastData(socket, dataToSend);
        });

        socket.on('delete-sticky-note', (message) => {
            message = decryptMessage(message);
            var dataToSend = {
                type: 'delete-sticky-note',
                stickyNoteId: message.stickyNoteId
            }
            broadcastData(socket, dataToSend);
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
                io.to(hostUserId).emit("new-client-request", {
                    message: `<p class="dialog-header">New connection request received!</p>
                    <p>Username: <b>${data.username}</b> <br>
                        Connection ID: <b>${data.connectionId}</b></p>`,
                    connectionId: data.connectionId,
                    username: data.username
                })
                callback({
                    status: "waiting"
                })
            } else {
                let newSession = {
                    startDate: Date(),
                    hostUser: data.connectionId
                }
                encryptionKey = randomAlphaNumericString(20);
                sessionParticipants.push({
                    id: data.connectionId,
                    username: data.username,
                    backgroundColor: getRandomRGB()
                })
                dbo.collection('sessions').insertOne(newSession, (err, succ) => {
                    if (err) throw err;
                    console.log("new session inserted");
                    hostUserId = data.connectionId;
                    hostDisconnectedTriggered = false;
                    hostEndSessionTriggered = false;
                });
                callback({
                    status: "accepted",
                    key: encryptionKey,
                    sessionParticipants: sessionParticipants
                })
            }

        });
    }


    io.on('connection', onConnection);

    http.listen(port, () => console.log('server listening on port ' + port));



    function endSessionForAll(socket) {
        // delete session
        dbo.collection('sessions').countDocuments((err, count) => {
            if (err) throw err;
            if (count) {
                dbo.collection('sessions').deleteOne((err, res) => {
                    if (err) throw err;
                    console.log("session ended");

                    // delete data (operations) from session
                    dbo.collection('operations').countDocuments((err, res) => {
                        if (err) throw err;
                        if (res) {
                            dbo.collection('operations').drop((err) => {
                                if (err) throw err;
                                console.log("all operations from previous session were deleted");
                            });
                        }
                        // emit disconnect for everyone
                        var dataToSend = {
                            type: 'host-left'
                        }
                        broadcastData(socket, dataToSend);
                    })
                });
            }
        })
    }

    function broadcastData(socket, dataToSend, callback, toEveryone = false) {
        dataToSend = CryptoJS.AES.encrypt(JSON.stringify(dataToSend), encryptionKey).toString();
        if (!toEveryone) {
            if (callback) {
                socket.broadcast.emit("broadcast", dataToSend, callback);
            } else {
                socket.broadcast.emit("broadcast", dataToSend);
            }
        } else {
            if (callback) {
                io.emit("broadcast", dataToSend, callback);
            } else {
                io.emit("broadcast", dataToSend);
            }
        }
    }

    function decryptMessage(message) {
        return JSON.parse(CryptoJS.AES.decrypt(message, encryptionKey).toString(CryptoJS.enc.Utf8));
    }
})

function randomAlphaNumericString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getRandomRGB() {
    var r = Math.floor(Math.random() * (250 - 200 + 1)) + 200;
    var g = Math.floor(Math.random() * (250 - 200 + 1)) + 200;
    var b = Math.floor(Math.random() * (250 - 200 + 1)) + 200;
    return `rgb(${r}, ${g}, ${b})`
}