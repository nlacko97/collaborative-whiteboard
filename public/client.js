const notyf = new Notyf();

window.onload = function () {
    var encrypted = CryptoJS.AES.encrypt("Message", "Secret Passphrase");
    console.log(encrypted.toString());
    var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
    console.log(decrypted.toString(CryptoJS.enc.Utf8))

    // Definitions
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    
    let sessionStarted = false;
    let $initialStateDiv = $("#initial-state");
    let $loadingStateDiv = $("#loading-state");
    let $whiteboardDiv = $(".whiteboard");
    $loadingStateDiv.hide();
    $whiteboardDiv.hide();

    // Specifications
    context.strokeStyle = 'black'; // initial brush color
    context.lineWidth = 3; // initial brush width
    let isDrawing = false;
    let lastEvent;

    let newSessionButton = document.getElementById('new-session');
    let endSessionButton = document.getElementById('end-session');
    let moveStickyNoteButton = document.getElementById('move_sticky_note');
    let socket = io();

    socket.on('connect', () => {
        console.log("connection id: " + socket.id);
    })

    socket.on('new-client-request', (data, callback) => {
        console.log("host user got a new connection request from a new client");
        console.log(data);
        // let accepted = confirm(`Would you like to accept a new user ${data.connectionId} to the session?`);
        var confirmBox = $("#confirm-dialog");
            confirmBox.find(".message").text(`Would you like to accept a new user ${data.connectionId} to the session?`);
            confirmBox.find(".yes,.no").unbind().click(function() {
               confirmBox.hide();
            });
            confirmBox.find(".yes").click(() => {
                socket.emit('new-client-request-decision', {
                    hostId: socket.id,
                    accepted: true,
                    clientId: data.connectionId
                })
            });
            confirmBox.find(".no").click(() => {
                socket.emit('new-client-request-decision', {
                    hostId: socket.id,
                    accepted: false,
                    clientId: data.connectionId
                })
            });
            confirmBox.show();
        
    })

    socket.on("new-client-request-decision", (data) => {
        if (data.accepted == true) {
            $loadingStateDiv.hide();
            $whiteboardDiv.show();
            notyf.success("Successfully joined session!");
        } else {
            $loadingStateDiv.hide();
            $initialStateDiv.show();
            notyf.error("Denied access");
        }
    });

    $(newSessionButton).on('click', () => {
        $initialStateDiv.hide();
        $loadingStateDiv.show();
        notyf.success("Connection request sent!")
        console.log("sending join-session request");
        socket.emit('join-session', {
            connectionId: socket.id
        }, (response) => {
            if (response.status == "accepted") {
                $loadingStateDiv.hide();
                $whiteboardDiv.show();
                notyf.success("Successfully joined session!");
            }
        });

        //now listen for other stuff

        // moveStickyNoteButton.addEventListener('click', () => {
        //     socket.emit('move-sticky-note', {
        //         connectionId: socket.id,
        //         id: "test_id",
        //         position: 22.35

        //     });
        //     console.log("sending move sticky note request");
        // })

        socket.on('broadcast', (message) => {
            switch (message.type) {
                case 'move-sticky-note':
                    console.log("Sticky note moved");
                    break;
                case 'freehand-drawing':
                    // console.log("hauhau")
                    // console.log(message)
                    context.beginPath();
                    context.moveTo(message.moveToX, message.moveToY);
                    context.lineTo(message.lineToX, message.lineToY);
                    context.stroke();
                    break;
                default:
                    console.log("Unknown broadcast message type");
                    break;
            }
        })
    })

    endSessionButton.addEventListener('click', () => {
        socket.emit('end-session', {
            connectionId: socket.id
        });
        console.log("sending end-session request");
    })

    // Mouse Down Event
    canvas.addEventListener('mousedown', function (event) {
        lastEvent = event;
        isDrawing = true;
    });

    // Mouse Move Event
    canvas.addEventListener('mousemove', function (event) {
        if (isDrawing) {
            context.beginPath();
            context.moveTo(lastEvent.offsetX, lastEvent.offsetY);
            context.lineTo(event.offsetX, event.offsetY);
            context.stroke();
            socket.emit('freehand-drawing', {
                moveToX: lastEvent.offsetX,
                moveToY: lastEvent.offsetY,
                lineToX: event.offsetX,
                lineToY: event.offsetY
            });
            lastEvent = event;
        }
    });

    // Mouse Up Event
    canvas.addEventListener('mouseup', function (event) {
        isDrawing = false;
    });
}