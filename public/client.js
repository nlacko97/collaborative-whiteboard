let newSessionButton = document.getElementById('new_session');
let endSessionButton = document.getElementById('end_session');
let moveStickyNoteButton = document.getElementById('move_sticky_note');
let socket = io();

newSessionButton.addEventListener('click', () => {
    socket.emit('join-session', {
        connectionId: socket.id
    });
    console.log("sending join-session request");
})

endSessionButton.addEventListener('click', () => {
    socket.emit('end-session', {
        connectionId: socket.id
    });
    console.log("sending end-session request");
})

moveStickyNoteButton.addEventListener('click', () => {
    socket.emit('move-sticky-note', {
        connectionId: socket.id
    });
    console.log("sending move sticky note request");
})

socket.on('connect', () => {
    console.log("connection id: " + socket.id);
})

socket.on('broadcast', (message) => {
    switch(message.type) {
        case 'move-sticky-note':
            console.log("Sticky note moved");
            break;
        default:
            console.log("Unknown broadcast message type");
            break;
    }
    console.log(message);
})