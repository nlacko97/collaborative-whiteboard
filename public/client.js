const notyf = new Notyf();

window.onload = function () {
    var encrypted = CryptoJS.AES.encrypt("Message", "Secret Passphrase");
    console.log(encrypted.toString());
    var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
    console.log(decrypted.toString(CryptoJS.enc.Utf8))

    // Definitions
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var canvasBackground = document.getElementById("background-canvas");
    var contextBackground = canvasBackground.getContext("2d");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    let $initialStateDiv = $("#initial-state");
    let $loadingStateDiv = $("#loading-state");
    let $whiteboardDiv = $("#whiteboard");
    let $toolsListDiv = $(".tools-list");
    $loadingStateDiv.hide();
    $whiteboardDiv.hide();
    $toolsListDiv.hide();
    let $brushLink = $("#brush");
    let $eraserLink = $("#eraser");


    // Specifications
    context.strokeStyle = 'black'; // initial brush color
    context.lineWidth = 1; // initial brush width
    var isMousePressed = false;
    var mode = "brush";
    var lastEvent = null;

    let newSessionButton = document.getElementById('new-session');
    let endSessionButton = document.getElementById('end-session');
    let moveStickyNoteButton = document.getElementById('move_sticky_note');
    let socket = io();

    $($brushLink).on('click', () => {
        mode = "brush";
        $($brushLink).addClass("selected");
        $($eraserLink).removeClass("selected");
        $(canvas).css("cursor", "url('images/cursor-brush.cur'), auto");
    })

    $($eraserLink).on('click', () => {
        mode = "eraser";
        $($eraserLink).addClass("selected");
        $($brushLink).removeClass("selected");
        $(canvas).css("cursor", "url('images/cursor-eraser.cur'), auto");
    })

    socket.on('connect', () => {
        console.log("connection id: " + socket.id);
    })

    socket.on('new-client-request', (data) => {
        console.log("host user got a new connection request from a new client");
        console.log(data);
        $("body").append("<div class=\"confirm-dialog confirm-dialog-" + data.connectionId + "\"></div>")
        var confirmBox = $(`.confirm-dialog-${data.connectionId}`);
        $(confirmBox).append("<div class=\"message message-" + data.connectionId + "\"></div>");
        var msg = $(`.message-${data.connectionId}`);
        $(msg).text(`Would you like to accept a new user ${data.connectionId} to the session?`);
        $(confirmBox).append(`<button id="yes-${data.connectionId}">Yes</button>`);
        var yes = $(`#yes-${data.connectionId}`);
        $(confirmBox).append(`<button id="no-${data.connectionId}">No</button>`);
        var no = $(`#no-${data.connectionId}`);
        $(confirmBox).find(`#yes-${data.connectionId}, #no-${data.connectionId}`).unbind().click(() => {
            confirmBox.remove();
        })
        $(yes).on('click', () => {
            socket.emit('new-client-request-decision', {
                hostId: socket.id,
                accepted: true,
                clientId: data.connectionId
            })
            notyf.success(`Accepted user ${data.connectionId} to the session!`);
        })
        $(no).on('click', () => {
            socket.emit('new-client-request-decision', {
                hostId: socket.id,
                accepted: false,
                clientId: data.connectionId
            })
            notyf.error(`Denied access for user ${data.connectionId} to the session!`);
        })

    })

    socket.on("new-client-request-decision", (data) => {
        if (data.accepted == true) {
            $loadingStateDiv.hide();
            $whiteboardDiv.show();
            $toolsListDiv.show();
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
                $toolsListDiv.show();
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
                    context.beginPath();
                    // Set brush size and color
                    context.strokeStyle = 'black';
                    context.lineWidth = 1;
                    // Set composite operation to drawing over
                    context.globalCompositeOperation = "source-over";
                    // Draw line segment
                    context.moveTo(message.moveToX, message.moveToY);
                    context.lineTo(message.lineToX, message.lineToY);
                    context.stroke();
                    break;
                case 'erase':
                    context.beginPath();
                    context.globalCompositeOperation = 'destination-out';
                    context.arc(message.arcX, message.arcY, 20, 0, Math.PI * 2, false);
                    context.fill();
                    break;
                case 'image-upload':
                    var img = new Image();
                    img.onload = function () {
                        contextBackground.drawImage(img, message.startX, message.startY);
                    }
                    img.src = message.imageSrc;
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
        isMousePressed = true;
    });

    // Mouse Move Event
    canvas.addEventListener('mousemove', function (event) {
        if (isMousePressed) {
            context.beginPath();
            if (mode === "brush") {
                // Set brush size and color
                context.strokeStyle = 'black';
                context.lineWidth = 1;
                // Set composite operation to drawing over
                context.globalCompositeOperation = "source-over";
                // Draw line segment
                context.moveTo(lastEvent.offsetX, lastEvent.offsetY);
                context.lineTo(event.offsetX, event.offsetY);
                context.stroke();
                // Emit drawing event
                socket.emit('freehand-drawing', {
                    moveToX: lastEvent.offsetX,
                    moveToY: lastEvent.offsetY,
                    lineToX: event.offsetX,
                    lineToY: event.offsetY
                });
            } else if (mode === "eraser") {
                context.globalCompositeOperation = 'destination-out';
                context.arc(lastEvent.offsetX, lastEvent.offsetY, 20, 0, Math.PI * 2, false);
                context.fill();
                // Emit erase event
                socket.emit('erase', {
                    arcX: lastEvent.offsetX,
                    arcY: lastEvent.offsetY
                });
            }
            lastEvent = event;
        }
    });

    // Mouse Up Event
    canvas.addEventListener('mouseup', function (event) {
        isMousePressed = false;
    });



    // Upload image to board
    var imageLoader = document.getElementById('imageLoader');
    imageLoader.addEventListener('change', function (e) {
        var uploadImagePositionSelector = document.createElement("div");
        uploadImagePositionSelector.id = "upload-image-position-selector";
        uploadImagePositionSelector.addEventListener('click', function (clickEvent) {
            var reader = new FileReader();
            reader.onload = function (event) {
                const imageBytes = new Uint8Array(this.result);
                var img = new Image();
                img.onload = function () {
                    // Get coordinates of upper left corner (from where the image will start)
                    var rect = clickEvent.target.getBoundingClientRect();
                    var startX = clickEvent.clientX - rect.left;
                    var startY = clickEvent.clientY - rect.top;

                    // Save image initial size
                    var imgWidth = img.width;
                    var imgHeight = img.height;
                    var widthToHeightRation = imgWidth / imgHeight;

                    // Resize image so that neither width nor height takes more than 50% of the whiteboard, but still keep the width to height proportions
                    if (imgWidth > canvasWidth / 2) {
                        imgWidth = canvasWidth / 2;
                        imgHeight = imgWidth / widthToHeightRation;
                    }
                    if (imgHeight > canvasHeight / 2) {
                        imgHeight = canvasHeight / 2;
                        imgWidth = imgHeight * widthToHeightRation;
                    }

                    var tempCanvas = document.createElement('CANVAS');
                    var tempCtx = tempCanvas.getContext('2d');
                    var dataUrl;
                    tempCanvas.height = imgHeight;
                    tempCanvas.width = imgWidth;
                    tempCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
                    dataUrl = tempCanvas.toDataURL();


                    contextBackground.drawImage(img, startX, startY, imgWidth, imgHeight);
                    uploadImagePositionSelector.remove();
                    // Broadcast image
                    socket.emit('image-upload', {
                        image: true,
                        imageSrc: dataUrl,
                        startX: startX,
                        startY: startY
                    });
                }
                img.src = event.target.result;
            }
            reader.readAsDataURL(e.target.files[0]);
        });

        var whiteboardDivContainer = document.getElementById("whiteboard");
        whiteboardDivContainer.appendChild(uploadImagePositionSelector);
    });
}