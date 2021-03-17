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
    let $whiteboardDivv = $("#whiteboard")[0];
    let $toolsListDiv = $(".tools-list");
    $loadingStateDiv.hide();
    $whiteboardDiv.hide();
    $toolsListDiv.hide();
    let $brushLink = $("#brush");
    let $eraserLink = $("#eraser");
    let $undoLink = $("#undo");
    let $downloadLink = $("#download")

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
        html2canvas($whiteboardDivv).then(function (canvasForScreen) {
            var link = document.createElement('a');
            link.download = 'whiteboard.png';
            link.href = canvasForScreen.toDataURL()
            link.click();
            // document.body.appendChild(canvasForScreen);
        });
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
        });
    });

    socket.on("new-client-request-decision", (data) => {
        if (data.accepted == true) {
            $loadingStateDiv.hide();
            $whiteboardDiv.show();
            $toolsListDiv.show();
            setCanvasCoordinates();
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
                setCanvasCoordinates();
                notyf.success("Successfully joined session!");
            }
        });

        socket.on('broadcast', (message) => {
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
                        moveId: message.moveId,
                        userId: message.userId
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
                    var lastMoveIndex = moves.findIndex(({ moveId }) => moveId === message.moveId);
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
                    console.log("ajungeeee");
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
                })
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
        moveToSave = currentMove;
        isMousePressed = false;
        console.log("move finished");

        socket.emit("new-move", {
            userId: socket.id,
            moves: moveToSave
        }, (data) => {
            moves.push({
                moves: moveToSave,
                moveId: data.moveId,
                userId: socket.id
            });
        })
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
            socket.emit("undo", {
                moveId: moves[lastMoveIndex].moveId
            });
            moves.splice(lastMoveIndex, 1);
            reDrawCanvas();
        }
    });

    const reDrawCanvas = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.globalCompositeOperation = "source-over";
        moves.forEach((move) => {
            move.moves.forEach((m) => {
                context.beginPath();
                context.moveTo(m.lastX, m.lastY);
                context.lineTo(m.currX, m.currY);
                context.stroke();
            })
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
                    socket.emit('image-upload', {
                        image: true,
                        imageSrc: dataUrl,
                        startX: startX,
                        startY: startY,
                        commentContainerId: comment_container_id
                    });
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
        socket.emit('new-sticky-note', {
            author: socket.id,
            stickyNoteId: sticky_note_id
        });
    });
}

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
        socket.emit('move-sticky-note', {
            stickyNoteId: stickyNoteBeingMoved.attr('id'),
            top: top,
            left: left
        });
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
        socket.emit('edit-sticky-note', {
            stickyNoteId: $stickyNote.attr('id'),
            newText: event.target.innerText
        });
    });
}

function setEditImageCommentListeners($imageComment, socket) {
    $imageComment.on('input', function (event) {
        // Broadcast the addition of the imageComment
        socket.emit('edit-image-comment', {
            commentId: $imageComment.attr('id'),
            newText: event.target.innerText
        });
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
    var $createdByHeader = $('<div class="created-by-header">Created by:<br/>' + author + '</div>');
    var $stickyNoteDeleteDiv = $('<div class="sticky-note-delete-icon"><a href="#"><i class="ri-delete-bin-line"></i></a></div>');
    $stickyNoteHeader.append($createdByHeader).append($stickyNoteDeleteDiv);
    $stickyNote.append($stickyNoteHeader).append($textareaDiv);
    $("#whiteboard").append($stickyNote);

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
        '<button class="show-comments-button">Show comments</button>'
    );
    $("#whiteboard").append($showCommentsButton);
    $showCommentsButton.css({ top: canvasTop + startY, left: canvasLeft + startX });

    var $addCommentButton = $('<button class="comment-button add-comment">Add new comment</button>');
    var $hideCommentsButton = $('<button class="comment-button hide-comments">Hide comments</button>');
    var $commentsButtonsContainer = $('<div class="comments-buttons-container"></div>');
    var $commentsInnerContainer = $('<div class="comments-inner-container"></div>');
    $commentsInnerContainer.attr('id', commentContainerId);
    var $commentsOuterContainer = $('<div class="comments-outer-container"></div>');
    $commentsButtonsContainer.append($addCommentButton).append($hideCommentsButton);
    $commentsOuterContainer.append($commentsButtonsContainer).append($('<hr>')).append($commentsInnerContainer);
    $("#image-comments-pannel").append($commentsOuterContainer);

    $showCommentsButton.click(function () {
        $("#image-comments-pannel").find('.comments-outer-container').each(function () {
            $(this).hide();
        });
        $commentsOuterContainer.show();
    });

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
            '<div>Created by:<br/>' + socket.id + '</div>' +
            '<div class="textarea" contenteditable></div>' +
            '</div>'
        );
        $commentsInnerContainer.append($comment);

        // Add event listeners for editing image comment
        setEditImageCommentListeners($comment, socket);

        // Broadcast the addition of the sticky note
        socket.emit('new-image-comment', {
            author: socket.id,
            commentId: comment_id,
            commentContainerId: comment_container_id
        });
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
            socket.emit('delete-sticky-note', {
                stickyNoteId: stickyNoteId
            });
            notyf.success(`Sticky note successfully deleted!`);
        })
        $(no).on('click', () => {
            notyf.error(`Sticky note has not been deleted!`);
        });
    });
}