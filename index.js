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
let hostDisconnectedTriggered;
let hostEndSessionTriggered;

MongoClient.connect(uri, {
    useUnifiedTopology: true
}, (err, db) => {
    if (err) throw err;
    let dbo = db.db(process.env.DB_DATABASE);
    console.log("Connected to database");

    // for dev env
//    dbo.collection('sessions').countDocuments((err, res) => {
//        if (err) throw err;
//        if (res) {
//            dbo.collection('sessions').drop();
//        }
//    })

    app.use(express.static(__dirname + '/public'));

    function onConnection(socket) {
        console.log("new client :" + socket.id);
        socket.on('disconnect', () => {
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
                if (!hostDisconnectedTriggered) {
                    hostUserId = -1;
                    endSessionForAll(socket);
                }
            } else { // "end session" event is received from a regular user
                //TODO we don't have to do anything in this case yet;
            }
        });
        socket.on('new-client-request-decision', (data)  => {
            dbo.collection('operations').find({}).toArray((err, res) => {
                if (err) throw err;
                let moves = res;
                if (data.accepted) {
                    dataToSend = {
                        accepted: data.accepted,
                        moves: moves,
                        stickyNotesHTML: data.stickyNotesHTML,
                        imageCommentsHTML: data.imageCommentsHTML,
                        imageCommentButtonsHTML: data.imageCommentButtonsHTML,
                        imageCanvasState: data.imageCanvasState
                    }
                } else {
                    dataToSend = {
                        accepted: data.accepted
                    }
                }
                io.to(data.clientId).emit("new-client-request-decision", dataToSend)
            });

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
                    _id: records.ops[0]._id,
                    moves: newMove.moves,
                    userId: newMove.userId
                })
                callback({
                    _id: records.ops[0]._id
                })
            })
            console.log("new move recorded");
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
            dbo.collection('operations').deleteOne({ _id: data._id }, (err, res) => {
                if (err) throw err;
                console.log("move deleted");
            })
            socket.broadcast.emit("broadcast", {
                type: 'undo',
                _id: data._id
            })
            console.log("undo operation");
        })

        socket.on('image-upload', (message) => {
            socket.broadcast.emit("broadcast", {
                image: true,
                type: 'image-upload',
                imageSrc: message.imageSrc,
                startX: message.startX,
                startY: message.startY,
                commentContainerId: message.commentContainerId
            });
        });

        socket.on('new-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'new-sticky-note',
                author: message.author,
                stickyNoteId: message.stickyNoteId
            });
        });

        socket.on('new-image-comment', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'new-image-comment',
                author: message.author,
                commentId: message.commentId,
                commentContainerId: message.commentContainerId
            });
        });

        socket.on('edit-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'edit-sticky-note',
                stickyNoteId: message.stickyNoteId,
                newText: message.newText
            });
        });

        socket.on('edit-image-comment', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'edit-image-comment',
                commentId: message.commentId,
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

        socket.on('delete-sticky-note', (message) => {
            socket.broadcast.emit("broadcast", {
                type: 'delete-sticky-note',
                stickyNoteId: message.stickyNoteId
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
                dbo.collection('sessions').insertOne(newSession, (err, succ) => {
                    if (err) throw err;
                    console.log("new session inserted");
                    hostUserId = data.connectionId;
                    hostDisconnectedTriggered = false;
                    hostEndSessionTriggered = false;
                });
                callback({
                    status: "accepted"
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

                                // emit disconnect for everyone
                                socket.broadcast.emit("broadcast", {
                                    type: 'host-left'
                                });
                            });
                        }
                    })
                });
            }
        })
    }
})

