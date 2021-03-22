const notyf = new Notyf();

// Sticky note use cases variables
var stickyNoteBeingMoved = null;
var initialTop = 0;
var initialLeft = 0;
var initialBottom = 0;
var initialRight = 0;
var globalTopDifference = 0;
var globalLeftDifference = 0;
var globalBottomDifference = 0;
var globalRightDifference = 0;
var canvasTop = 0;
var canvasLeft = 0;
var canvasBottom = 0;
var canvasRight = 0;

// Global definitions
var id_counter = 0;
var isHost = false;
var sessionStarted = false;
var username = '';
var encryptionKey = '';

window.onload = function () {

    // Definitions
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var canvasBackground = document.getElementById("background-canvas");
    var contextBackground = canvasBackground.getContext("2d");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    let $titleDiv = $("#title");
    let $initialStateDiv = $("#initial-state");
    let $loadingStateDiv = $("#loading-state");
    let $whiteboardDiv = $("#whiteboard");
    let $whiteboardDivv = $("#whiteboard")[0];
    let $toolsListDiv = $(".tools-list");
    $loadingStateDiv.hide();
    $whiteboardDiv.hide();
    $toolsListDiv.hide();
    let $brushLink = $("#brush");
    let $eraserLink = $("#eraser");
    let $undoLink = $("#undo");
    let $downloadLink = $("#download");
    let $helpLink = $("#help");
    let $imageCommentPanelDiv = $("#image-comments-pannel");
    let $stickyNotesDiv = $("#sticky-notes-container");
    let $imageCommentButtonDiv = $("#image-comment-buttons-container");
    let $usernameInput = $("#username");
    let $usernameErrorMessage = $("#username-error-message");
    $usernameErrorMessage.hide();
    let $participantsListDiv = $(".participants-list");

    // Specifications
    context.strokeStyle = 'black'; // initial brush color
    context.lineWidth = 1; // initial brush width
    var isMousePressed = false;
    var mode = "brush";
    var lastEvent = null;

    let currentMove = [];
    let moves = [];

    let newSessionButton = document.getElementById('new-session');
    let endSessionButton = document.getElementById('end-session');

    let socket = io();

    $brushLink.on('click', () => {
        mode = "brush";
        $brushLink.addClass("selected");
        $eraserLink.removeClass("selected");
        $(canvas).css("cursor", "url('images/cursor-brush.cur'), auto");
    })

    $eraserLink.on('click', () => {
        mode = "eraser";
        $eraserLink.addClass("selected");
        $brushLink.removeClass("selected");
        $(canvas).css("cursor", "url('images/cursor-eraser.cur'), auto");
    })

    $downloadLink.on('click', () => {
        // window.scrollTo(0, 0);
        html2canvas($whiteboardDivv).then(function (canvasForScreen) {
            var link = document.createElement('a');
            link.download = 'whiteboard.png';
            link.href = canvasForScreen.toDataURL()
            link.click();
            // document.body.appendChild(canvasForScreen);
        });
    });

    var helpOpened = false;
    $helpLink.on('click', () => {
        if (!helpOpened) {
            var notification = notyf.success({
                duration: 50000000,
                position: {
                    x: 'center',
                    y: 'top'
                },
                ripple: false,
                background: '#f7ebc1',
                className: 'toast-custom-notyf',
                icon: false,
                dismissible: false,
                message: `
                <div class="help-header">
                <h1> Collaborative Whiteboard application</h1>
                <a href="#" class="close-help"><i class="ri-close-line"></i></a>
                </div>
                <div style='font-weight: bold'>This collaborative whiteboard application allows you and your friends to communicate in real time using an interactive whiteboard that supports the following functionalities:</div>
                <ul>
                <li><span style="font-weight: bold">Draw</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-brush-line"></i></a></div> - you can perform a free-hand drawing on the whiteboard with a brush utensil, using your mouse. Currently, only one brush size and color are supported.</li>
                <li><span style="font-weight: bold">Erase</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-eraser-line"></i></a></div> - you can erase any free-hand drawing on the whiteboard with an eraser utensil, using your mouse. Currently, only one eraser size is supported.</li>
                <li><span style="font-weight: bold">Undo</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-arrow-go-back-line"></i></a></div> - you can undo any of your own free-hand drawing added to the whiteboard by clicking this button. You can press it as many times as you want, but you can only undo your own drawings, and you can only undo an entire line, and not line segments. (A line is considered to be all drawing segments performed between the moment when the left mouse button is pressed and the moment the left mouse button is released)</li>
                <li><span style="font-weight: bold">Add sticky note</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-sticky-note-line"></i></a></div> - by pressing this button you can add a new empty sticky note at the top left corner of the board. There is only one sticky note color and size supported at the moment. The added sticky notes can be moved along the board, edited and deleted by any of the other users.</li>
                <li><span style="font-weight: bold">Move sticky note</span> - you can move any existing sticky note by dragging it with your mouse on the surface of the whiteboard.</li>
                <li><span style="font-weight: bold">Edit sticky note</span> - you can edit any existing sticky note by clicking inside the squared area of the sticky note and typing characters from your keyboard.</li>
                <li><span style="font-weight: bold">Delete sticky note</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-close-circle-line"></i></a></div> - you can delete any existing sticky note by clicking this button. Before doing the deletion, a confirmation will be required through the means of a pop-up.</li>
                <li><span style="font-weight: bold">Upload image</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-image-line"></i></a></div> - you can upload any image on the whiteboard. Please note that the image will be resized so that the width and height will not exceed 50% of the whiteboard width and height (but the width to height ratio will be preserved). After deciding which picture you want to upload, you will need to select on the whiteboard the position of the top left corner of the image, and after that, the picture will be displayed, having the top left corner at the selected position.</li>
                <li><span style="font-weight: bold">See comments attached to an image</span> - you can click the <span style="font-weight: bold">"SHOW COMMENTS"</span> button attached to the top left corner of each image to open up a panel with all comments attached to the corresponding image.</li>
                <li><span style="font-weight: bold">Add comments to an image</span> - you can click the <span style="font-weight: bold">"ADD COMMENT"</span> button from the comments panel of an image in order to add a new empty comment to the corresponding image. The comment will be displayed at the bottom of the comments panel.</li>
                <li><span style="font-weight: bold">Edit comments of an image</span> - you can edit any existing comment of an image by clicking inside the squared area of the comment and typing characters from your keyboard.</li>
                <li><span style="font-weight: bold">Hide comments attached to an image</span> - you can click the <span style="font-weight: bold">"HIDE COMMENTS"</span> button from the comments panel of an image in order to hide that panel and the contained comments.</li>
                <li><span style="font-weight: bold">Download an image copy of the whiteboard</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-arrow-down-circle-line"></i></a></div> - by pressing this button, the system will take a screenshot of the current state of the whiteboard and download it for you as a PNG file.</li>
                <li><span style="font-weight: bold">Leave/End the session</span> <div class="tool" style="display: inline; margin-top: 5px"><a href="#"><i class="ri-logout-box-r-line"></i></a></div> - you can leave the current session at any time using this button. A confirmation will be required from you through the means of a pop-up window. Be careful: if you are the host of the session and you decide to leave, the session will terminate for every connected user!</li>
                </ul>
                <br>
                <div style="font-weight: bold; display: inline">If you want to check out the code of this collaborative whiteboard application, click the following icon to access our github repository: </div><div class="tool" style="display: inline; margin-top: 5px"><a href="https://github.com/nlacko97/collaborative-whiteboard" target="_blank"><i class="ri-github-fill"></i></a></div>
                <br>
                <div style="font-weight: bold; display: inline">If you notice any issue with this application, you can help us by reporting it: </div><div class="tool" style="display: inline; margin-top: 5px"><a href="https://github.com/nlacko97/collaborative-whiteboard/issues" target="_blank"><i class="ri-github-fill"></i></a></div>
                <br>
                <div class="help-footer">
                <a href="#" class="close-help">Close help</a>
                </div>
                `
            });
            helpOpened = true;
            $(".close-help").click(() => {
                notyf.dismiss(notification);
                helpOpened = false;
            })
        }
    });

    socket.on('connect', () => {
        console.log("connection id: " + socket.id);
    })

    socket.on('new-client-request', (data) => {
        console.log("host user got a new connection request from a new client");
        $("body").append("<div class=\"confirm-dialog confirm-dialog-" + data.connectionId + "\"></div>")
        var confirmBox = $(`.confirm-dialog-${data.connectionId}`);
        $(confirmBox).append("<div class=\"message message-" + data.connectionId + "\"></div>");
        var msg = $(`.message-${data.connectionId}`);
        $(msg).html(data.message);
        $(confirmBox).append(`<button id="yes-${data.connectionId}">Accept</button>`);
        var yes = $(`#yes-${data.connectionId}`);
        $(confirmBox).append(`<button id="no-${data.connectionId}">Decline</button>`);
        var no = $(`#no-${data.connectionId}`);
        $(confirmBox).find(`#yes-${data.connectionId}, #no-${data.connectionId}`).unbind().click(() => {
            confirmBox.remove();
        })
        $(yes).on('click', () => {
            // send html content for sticky notes
            // send html content of image comments div
            // send image canvas as image
            // send image comment buttons
            socket.emit('new-client-request-decision', {
                hostId: socket.id,
                accepted: true,
                clientId: data.connectionId,
                username: data.username,
                stickyNotesHTML: $stickyNotesDiv.html(),
                imageCommentsHTML: $imageCommentPanelDiv.html(),
                imageCanvasState: canvasBackground.toDataURL(),
                imageCommentButtonsHTML: $imageCommentButtonDiv.html()
            })
            notyf.success(`Accepted ${data.username} to the session!`);
        })
        $(no).on('click', () => {
            socket.emit('new-client-request-decision', {
                hostId: socket.id,
                accepted: false,
                clientId: data.connectionId
            })
            notyf.error(`Denied access for ${data.username} to the session!`);
        });
    });

    socket.on("new-client-request-decision", (data) => {
        if (data.accepted == true) {
            $loadingStateDiv.hide();
            $titleDiv.hide();
            $whiteboardDiv.show();
            $toolsListDiv.show();
            setCanvasCoordinates();
            notyf.success("Successfully joined session!");
            sessionStarted = true;
            encryptionKey = data.key;
            refreshParticipantsList(data.sessionParticipants);
            bringBoardToCurrentState(data, socket);
        } else {
            $loadingStateDiv.hide();
            $initialStateDiv.show();
            notyf.error("Denied access");
        }
    });

    $(newSessionButton).on('click', () => {
        username = $usernameInput.val();
        if (!username) {
            $usernameErrorMessage.show();
            notyf.error("Please provide a username before joining!");
            return;
        }
        $initialStateDiv.hide();
        $loadingStateDiv.show();
        notyf.success("Connection request sent!")
        console.log("sending join-session request");
        socket.emit('join-session', {
            connectionId: socket.id,
            username: username
        }, (response) => {
            if (response.status == "accepted") {
                $loadingStateDiv.hide();
                $titleDiv.hide();
                $whiteboardDiv.show();
                $toolsListDiv.show();
                setCanvasCoordinates();
                notyf.success("Successfully joined session!");
                notyf.success("There was no session started. You started a new session, so you are the host of this session!");
                // $("body").append($('<div class="title host-user-info">You are the host!</div>'));
                isHost = true;
                sessionStarted = true;
                encryptionKey = response.key;
                refreshParticipantsList(response.sessionParticipants);
                $(endSessionButton).show();
            }
        });

        socket.on('broadcast', (message) => {
            message = JSON.parse(CryptoJS.AES.decrypt(message, encryptionKey).toString(CryptoJS.enc.Utf8));
            switch (message.type) {
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
                case 'new-move':
                    moves.push({
                        moves: message.moves,
                        _id: message._id,
                        userId: message.userId,
                        moveType: message.moveType
                    });
                    break;
                case 'erase':
                    context.beginPath();
                    context.globalCompositeOperation = 'destination-out';
                    context.arc(message.arcX, message.arcY, 20, 0, Math.PI * 2, false);
                    context.fill();
                    break;
                case 'undo':
                    console.log("got undo from another user");
                    var lastMoveIndex = moves.findIndex(({ _id }) => _id === message._id);
                    console.log("moveindex: ", lastMoveIndex);
                    if (lastMoveIndex != -1) {
                        moves.splice(lastMoveIndex, 1);
                        reDrawCanvas();
                    }
                    break;
                case 'image-upload':
                    var img = new Image();
                    img.onload = function () {
                        // Draw image on canvas
                        contextBackground.drawImage(img, message.startX, message.startY);

                        createImageCommentsContainers(message.commentContainerId, message.startY, message.startX, socket);
                    }
                    img.src = message.imageSrc;
                    break;
                case 'new-sticky-note':
                    addNewStickyNote(message.stickyNoteId, message.author, socket);
                    break;
                case 'new-image-comment':
                    var $comment = $(
                        '<div id="' + message.commentId + '" class="image-comment">' +
                        '<div>Created by:<br/>' + message.author + '</div>' +
                        '<div class="textarea" contenteditable></div>' +
                        '</div>'
                    );
                    $('#' + message.commentContainerId).append($comment);

                    // Add event listeners for editing image comment
                    setEditImageCommentListeners($comment, socket);
                    break;
                case 'edit-sticky-note':
                    var $stickyNote = $("#" + message.stickyNoteId);
                    $stickyNote.find(".textarea").get(0).innerText = message.newText;
                    setMoveStickyNoteListeners($stickyNote, socket);
                    setEditStickyNoteListeners($stickyNote, socket);
                    break;
                case 'edit-image-comment':
                    var $comment = $("#" + message.commentId);
                    $comment.find(".textarea").get(0).innerText = message.newText;
                    break;
                case 'move-sticky-note':
                    var $stickyNote = $("#" + message.stickyNoteId);
                    $stickyNote.css({ top: message.top, left: message.left });
                    break;
                case 'delete-sticky-note':
                    $("#" + message.stickyNoteId).remove();
                    break;
                case 'host-left':
                    window.location.reload(true);
                    break;
                case 'update-participants':
                    refreshParticipantsList(message.sessionParticipants);
                    break;
                default:
                    console.log("Unknown broadcast message type");
                    break;
            }
        })
    })

    endSessionButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (sessionStarted) {
            $("body").append("<div class=\"confirm-dialog confirm-dialog-end-session-" + socket.id + "\"></div>")
            var confirmBox = $(`.confirm-dialog-end-session-${socket.id}`);
            $(confirmBox).append("<div class=\"message message-end-session-" + socket.id + "\"></div>");
            var msg = $(`.message-end-session-${socket.id}`);
            if (isHost) {
                $(msg).text(`You are the Host of this whiteboard session! If decide to leave, the session will be ended for all connected users. Are you sure you want to leave the whiteboard session?`);
            } else {
                $(msg).text(`Are you sure you want to leave the whiteboard session?`);
            }
            $(confirmBox).append(`<button id="yes-end-session-${socket.id}">Yes</button>`);
            var yes = $(`#yes-end-session-${socket.id}`);
            $(confirmBox).append(`<button id="no-end-session-${socket.id}">No</button>`);
            var no = $(`#no-end-session-${socket.id}`);
            $(confirmBox).find(`#yes-end-session-${socket.id}, #no-end-session-${socket.id}`).unbind().click(() => {
                confirmBox.remove();
            })
            $(yes).on('click', () => {
                if (isHost) {
                    console.log("sending end-session request");
                    var dataToSend = {
                        connectionId: socket.id
                    }
                    sendData(socket, 'end-session', dataToSend);
                }
                window.location.reload(true);
            })
            $(no).on('click', () => {
                notyf.error(`You chose not to leave the session!`);
            });
        }
    });

    // Mouse Down Event
    canvas.addEventListener('mousedown', function (event) {
        lastEvent = event;
        isMousePressed = true;
        console.log("move started");
        currentMove = [];
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

                currentMove.push({
                    lastX: lastEvent.offsetX,
                    lastY: lastEvent.offsetY,
                    currX: event.offsetX,
                    currY: event.offsetY,
                });

                // Emit drawing event
                var dataToSend = {
                    moveToX: lastEvent.offsetX,
                    moveToY: lastEvent.offsetY,
                    lineToX: event.offsetX,
                    lineToY: event.offsetY
                }
                sendData(socket, 'freehand-drawing', dataToSend);
            } else if (mode === "eraser") {
                context.globalCompositeOperation = 'destination-out';
                context.arc(lastEvent.offsetX, lastEvent.offsetY, 20, 0, Math.PI * 2, false);
                context.fill();
                // Emit erase event
                currentMove.push({
                    lastX: lastEvent.offsetX,
                    lastY: lastEvent.offsetY,
                });
                var dataToSend = {
                    arcX: lastEvent.offsetX,
                    arcY: lastEvent.offsetY
                }
                sendData(socket, 'erase', dataToSend);
            }
            lastEvent = event;
        }
    });

    // Mouse Up Event
    canvas.addEventListener('mouseup', function (event) {
        moveToSave = currentMove;
        isMousePressed = false;
        console.log("move finished");

        var dataToSend = {
            userId: socket.id,
            moves: moveToSave,
            moveType: mode
        }
        var callback = (data) => {
            console.log("saving move");
            moves.push({
                moves: moveToSave,
                _id: data._id,
                userId: socket.id,
                moveType: mode
            });
        }
        sendData(socket, 'new-move', dataToSend, callback);
    });

    const lastIndexOf = (array, key) => {
        for (let i = array.length - 1; i >= 0; i--) {
            if (array[i].userId === key)
                return i;
        }
        return -1;
    };

    $undoLink.click(() => {
        console.log("undo operation");
        lastMoveIndex = lastIndexOf(moves, socket.id)
        if (lastMoveIndex != -1) {
            var dataToSend = {
                _id: moves[lastMoveIndex]._id
            }
            sendData(socket, 'undo', dataToSend)
            moves.splice(lastMoveIndex, 1);
            reDrawCanvas();
        }
    });

    const reDrawCanvas = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        moves.forEach((move) => {
            if (move.moveType == "brush") {
                context.strokeStyle = 'black';
                context.lineWidth = 1;
                context.globalCompositeOperation = "source-over";
                move.moves.forEach((m) => {
                    context.beginPath();
                    context.moveTo(m.lastX, m.lastY);
                    context.lineTo(m.currX, m.currY);
                    context.stroke();
                })
            } else if (move.moveType == "eraser") {
                context.globalCompositeOperation = 'destination-out';
                move.moves.forEach((m) => {
                    context.beginPath();
                    context.arc(m.lastX, m.lastY, 20, 0, Math.PI * 2, false);
                    context.fill();
                })
            }
        })
    };

    // Upload image to board
    var imageLoader = document.getElementById('imageLoader');
    imageLoader.addEventListener('change', function (e) {
        var uploadImagePositionSelector = document.createElement("div");
        uploadImagePositionSelector.innerText = "Please click on the board on the position where you would like to display your image (you are selecting the upper left corner of the image):";
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

                    // Use temp canvas to resize image to be sent by broadcast
                    var tempCanvas = document.createElement('CANVAS');
                    var tempCtx = tempCanvas.getContext('2d');
                    var dataUrl;
                    tempCanvas.height = imgHeight;
                    tempCanvas.width = imgWidth;
                    tempCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
                    dataUrl = tempCanvas.toDataURL();

                    // Remove position selector grey div
                    uploadImagePositionSelector.remove();

                    // Draw image on canvas
                    contextBackground.drawImage(img, startX, startY, imgWidth, imgHeight);

                    id_counter += 1;
                    var comment_container_id = String(socket.id) + '-' + String(id_counter);
                    createImageCommentsContainers(comment_container_id, startY, startX, socket);

                    // Broadcast image
                    var dataToSend = {
                        image: true,
                        imageSrc: dataUrl,
                        startX: startX,
                        startY: startY,
                        commentContainerId: comment_container_id
                    }
                    sendData(socket, 'image-upload', dataToSend);
                }
                img.src = event.target.result;
            }
            reader.readAsDataURL(e.target.files[0]);
        });

        var whiteboardDivContainer = document.getElementById("whiteboard");
        whiteboardDivContainer.appendChild(uploadImagePositionSelector);
    });

    $("#sticky-note").click(function () {
        id_counter += 1;
        var sticky_note_id = String(socket.id) + '-' + String(id_counter);

        addNewStickyNote(sticky_note_id, socket.id, socket);

        // Broadcast the addition of the sticky note
        var dataToSend = {
            author: socket.id,
            stickyNoteId: sticky_note_id
        }
        sendData(socket, 'new-sticky-note', dataToSend);
    });


    function setMoveStickyNoteListeners($stickyNote, socket) {
        $stickyNote.mousedown(moveStickyNoteMouseDown);

        function setGlobalVariables(object) {
            stickyNoteBeingMoved = object;
            initialTop = object.position().top;
            initialLeft = object.position().left;
            initialBottom = object.position().top + object.height();
            initialRight = object.position().left + object.width();
            var mouseX = event.clientX;
            var mouseY = event.clientY;
            globalTopDifference = mouseY - initialTop;
            globalLeftDifference = mouseX - initialLeft;
            globalBottomDifference = initialBottom - mouseY;
            globalRightDifference = initialRight - mouseX;
            setCanvasCoordinates();
        }


        function moveStickyNoteMouseDown(event) {
            setGlobalVariables($(this));
            $(this).css("zIndex", 200);
            $(this).mousemove(moveStickyNoteMouseMove);
            $("#myBody").mousemove(myBodyMouseMove);
            stickyNoteBeingMoved.off("mouseup");
            stickyNoteBeingMoved.mouseup(moveStickyNoteMouseUp);
            $("#myBody").off("mouseup");
            $("#myBody").mouseup(myBodyMouseUp);
        }

        function moveStickyNoteMouseMove(event) {
            doWhenMouseMoved();
            $(this).off("mouseup");
            $(this).mouseup(moveStickyNoteMouseUp);
        }

        function myBodyMouseMove(event) {
            doWhenMouseMoved(stickyNoteBeingMoved);
            stickyNoteBeingMoved.off("mouseup");
            stickyNoteBeingMoved.mouseup(moveStickyNoteMouseUp);
            $(this).off("mouseup");
            $(this).mouseup(myBodyMouseUp);
        }

        function doWhenMouseMoved() {
            var mouseX = event.clientX;
            var mouseY = event.clientY;
            var stickyNoteBottom = stickyNoteBeingMoved.position().top + stickyNoteBeingMoved.height();
            var stickyNoteRight = stickyNoteBeingMoved.position().left + stickyNoteBeingMoved.width();

            var top = mouseY - globalTopDifference;
            var left = mouseX - globalLeftDifference;
            var bottom = mouseY + globalBottomDifference;
            var right = mouseX + globalRightDifference;

            if (top <= canvasTop) {
                top = canvasTop + 20;
            }
            if (left <= canvasLeft) {
                left = canvasLeft + 20;
            }
            if (bottom >= canvasBottom) {
                top = canvasBottom - stickyNoteBeingMoved.height() - 20;
            }
            if (right >= canvasRight) {
                left = canvasRight - stickyNoteBeingMoved.width() - 20;
            }
            stickyNoteBeingMoved.css({ top: top, left: left });

            // Broadcast sticky note movement
            var dataToSend = {
                stickyNoteId: stickyNoteBeingMoved.attr('id'),
                top: top,
                left: left
            }
            sendData(socket, 'move-sticky-note', dataToSend);
        }

        function moveStickyNoteMouseUp(event) {
            $(this).off("mousemove");
            $(this).off("mouseup");
            $(this).css("zIndex", 1);
        }

        function myBodyMouseUp(event) {
            stickyNoteBeingMoved.off("mousemove");
            stickyNoteBeingMoved.off("mouseup");
            stickyNoteBeingMoved.css("zIndex", 1);
            $(this).off("mousemove");
            $(this).off("mouseup");
        }
    }

    function setEditStickyNoteListeners($stickyNote, socket) {
        $stickyNote.on('input', function (event) {
            // Broadcast the addition of the sticky note
            var dataToSend = {
                stickyNoteId: $stickyNote.attr('id'),
                newText: event.target.innerText
            }
            sendData(socket, 'edit-sticky-note', dataToSend);
        });
    }

    function setEditImageCommentListeners($imageComment, socket) {
        $imageComment.on('input', function (event) {
            // Broadcast the addition of the imageComment
            var dataToSend = {
                commentId: $imageComment.attr('id'),
                newText: event.target.innerText
            }
            sendData(socket, 'edit-image-comment', dataToSend);
        });
    }

    function setCanvasCoordinates() {
        // Set canvas coordinates
        canvasTop = $("#canvas").position().top;
        canvasLeft = $("#canvas").position().left;
        canvasBottom = $("#canvas").position().top + $("#canvas").height();
        canvasRight = $("#canvas").position().left + $("#canvas").width();
    }

    function addNewStickyNote(stickyNoteId, author, socket) {
        var $stickyNote = $('<div class="sticky-note"></div>');
        $stickyNote.attr('id', stickyNoteId);
        var $stickyNoteHeader = $('<div class="sticky-note-header"></div>');
        var $textareaDiv = $('<div class="textarea" contenteditable></div>');
        // var $createdByHeader = $('<div class="created-by-header">Created by:<br/>' + author + '</div>');
        var $stickyNoteDeleteDiv = $('<div class="sticky-note-delete-icon"><a href="#"><i class="ri-close-circle-line"></i></a></div>');
        $stickyNoteHeader.append($stickyNoteDeleteDiv);
        $stickyNote.append($stickyNoteHeader).append($textareaDiv);
        // $("#whiteboard").append($stickyNote);
        $("#sticky-notes-container").append($stickyNote);

        // Add event listeners for delete sticky note icon
        setDeleteStickyNoteListeners($stickyNoteDeleteDiv, $stickyNote, stickyNoteId, socket);

        // Add event listeners for moving sticky note
        setMoveStickyNoteListeners($stickyNote, socket);

        // Add event listeners for editing sticky note
        setEditStickyNoteListeners($stickyNote, socket);
    }

    function createImageCommentsContainers(commentContainerId, startY, startX, socket) {
        // Add "show comments" button and comment container
        var $showCommentsButton = $(
            '<button class="show-comments-button"><i class="ri-discuss-line"></i></button>'
        );
        $imageCommentButtonDiv.append($showCommentsButton);
        $showCommentsButton.css({ top: startY, left: startX });
        $showCommentsButton.attr('data-comment-container-id', commentContainerId);

        var $addCommentButton = $('<button class="comment-button add-comment" title="Add new comment"><i class="ri-add-line"></i></button>');
        var $hideCommentsButton = $('<button class="comment-button hide-comments" title="hide comments"><i class="ri-fullscreen-exit-line"></i></button>');
        var $commentsButtonsContainer = $('<div class="comments-buttons-container"></div>');
        var $commentsInnerContainer = $('<div class="comments-inner-container"></div>');
        $commentsInnerContainer.attr('id', commentContainerId);
        var $commentsOuterContainer = $('<div class="comments-outer-container"></div>');
        $commentsOuterContainer.attr('data-comment-container-id', commentContainerId);
        $commentsButtonsContainer.append($addCommentButton).append($hideCommentsButton);
        $commentsOuterContainer.append($commentsButtonsContainer).append($('<hr>')).append($commentsInnerContainer);
        $("#image-comments-pannel").append($commentsOuterContainer);

        addFunctionalityToShowCommentsButton($showCommentsButton, $commentsOuterContainer);

        $hideCommentsButton.click(function () {
            $commentsOuterContainer.hide();
        });

        addFunctionalityToAddCommentButton($addCommentButton, $commentsInnerContainer, commentContainerId, socket);
    }

    function addFunctionalityToAddCommentButton($addCommentButton, $commentsInnerContainer, comment_container_id, socket) {
        $addCommentButton.click(function () {
            id_counter += 1;
            var comment_id = String(socket.id) + '-' + String(id_counter);
            var $comment = $(
                '<div id="' + comment_id + '" class="image-comment">' +
                '<div><b>' + username + '</b> says:</div>' +
                '<div class="textarea" contenteditable></div>' +
                '</div>'
            );
            $commentsInnerContainer.append($comment);

            // Add event listeners for editing image comment
            setEditImageCommentListeners($comment, socket);

            // Broadcast the addition of the sticky note
            var dataToSend = {
                author: username,
                commentId: comment_id,
                commentContainerId: comment_container_id
            }
            sendData(socket, 'new-image-comment', dataToSend);
        });
    }

    function setDeleteStickyNoteListeners($stickyNoteDeleteDiv, $stickyNote, stickyNoteId, socket) {
        $stickyNoteDeleteDiv.click(function () {
            $("body").append("<div class=\"confirm-dialog confirm-dialog-delete-sticky-note-" + stickyNoteId + "\"></div>")
            var confirmBox = $(`.confirm-dialog-delete-sticky-note-${stickyNoteId}`);
            $(confirmBox).append("<div class=\"message message-delete-sticky-note-" + stickyNoteId + "\"></div>");
            var msg = $(`.message-delete-sticky-note-${stickyNoteId}`);
            $(msg).text(`Do you really want to delete this sticky note?`);
            $(confirmBox).append(`<button id="yes-delete-sticky-note-${stickyNoteId}">Yes</button>`);
            var yes = $(`#yes-delete-sticky-note-${stickyNoteId}`);
            $(confirmBox).append(`<button id="no-delete-sticky-note-${stickyNoteId}">No</button>`);
            var no = $(`#no-delete-sticky-note-${stickyNoteId}`);
            $(confirmBox).find(`#yes-delete-sticky-note-${stickyNoteId}, #no-delete-sticky-note-${stickyNoteId}`).unbind().click(() => {
                confirmBox.remove();
            })
            $(yes).on('click', () => {
                $stickyNote.remove();
                // broadcast delete event
                var dataToSend = {
                    stickyNoteId: stickyNoteId
                }
                sendData(socket, 'delete-sticky-note', dataToSend);
                notyf.success(`Sticky note successfully deleted!`);
            })
            $(no).on('click', () => {
                notyf.error(`Sticky note has not been deleted!`);
            });
        });
    }

    function bringBoardToCurrentState(data, socket) {
        // draw first canvas
        moves = data.moves;
        reDrawCanvas();

        // draw image canvas
        var img = new Image();
        img.onload = function () {
            contextBackground.drawImage(img, 0, 0, canvasBackground.width, canvasBackground.height);
        }
        img.src = data.imageCanvasState;

        // add sticky notes, comments, and image buttons
        $stickyNotesDiv.html(data.stickyNotesHTML);
        $imageCommentPanelDiv.html(data.imageCommentsHTML);
        $imageCommentButtonDiv.html(data.imageCommentButtonsHTML);

        // Add functionality to sticky notes, comments, and image buttons
        $stickyNotesDiv.find(".sticky-note").each(function () {
            var $stickyNote = $(this);
            var stickyNoteId = $stickyNote.attr('id');
            var $stickyNoteDeleteDiv = $stickyNote.find(".sticky-note-delete-icon");
            // Add event listeners for delete sticky note icon
            setDeleteStickyNoteListeners($stickyNoteDeleteDiv, $stickyNote, stickyNoteId, socket);
            // Add event listeners for moving sticky note
            setMoveStickyNoteListeners($stickyNote, socket);
            // Add event listeners for editing sticky note
            setEditStickyNoteListeners($stickyNote, socket);
        });

        // Add functionality to image buttons ("show comments" buttons)
        $imageCommentButtonDiv.find(".show-comments-button").each(function () {
            $showCommentsButton = $(this);
            commentContainerId = $showCommentsButton.attr('data-comment-container-id');
            $commentsOuterContainer = $imageCommentPanelDiv.find('.comments-outer-container[data-comment-container-id="' + commentContainerId + '"]');
            addFunctionalityToShowCommentsButton($showCommentsButton, $commentsOuterContainer);
        });

        // Add functionality to the hide comments button
        $imageCommentPanelDiv.find(".hide-comments").each(function () {
            var $hideCommentsButton = $(this);
            var $commentsOuterContainer = $hideCommentsButton.closest('.comments-outer-container');
            $hideCommentsButton.click(function () {
                $commentsOuterContainer.hide();
            });
        });

        // Add functionality to the add comment button (also adds change listener for comments through the addFunctionalityToAddCommentButton function)
        $imageCommentPanelDiv.find(".add-comment").each(function () {
            var $addCommentButton = $(this);
            var $commentsInnerContainer = $addCommentButton.closest('.comments-outer-container').find('.comments-inner-container');
            var commentContainerId = $commentsInnerContainer.attr('id');
            addFunctionalityToAddCommentButton($addCommentButton, $commentsInnerContainer, commentContainerId, socket);
        });

        // Add functionality to existing sticky notes
        $imageCommentPanelDiv.find(".image-comment").each(function () {
            var $comment = $(this);
            setEditImageCommentListeners($comment, socket);
        });
    }

    function addFunctionalityToShowCommentsButton($showCommentsButton, $commentsOuterContainer) {
        $showCommentsButton.click(function () {
            $("#image-comments-pannel").find('.comments-outer-container').each(function () {
                $(this).hide();
            });
            $commentsOuterContainer.show();
        });
    }

    function sendData(socket, eventName, dataToSend, callback) {
        dataToSend = CryptoJS.AES.encrypt(JSON.stringify(dataToSend), encryptionKey).toString();
        if (callback) {
            socket.emit(eventName, dataToSend, callback);
        } else {
            socket.emit(eventName, dataToSend);
        }
    }

    const refreshParticipantsList = (participants) => {
        $participantsListDiv.html("");
        participants.forEach(p => {
            $participantsListDiv.append(`
                <div class="participant" id="participant-${p.id}" style="background: linear-gradient(to top right, ${p.backgroundColor}, rgb(var(--light-teal)));" title="${p.username}">
                    ${p.username.charAt(0)}
                </div>
            `)
        });
    };
}