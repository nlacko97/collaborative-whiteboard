let newSessionButton = document.getElementById('new_session');
let deleteSessionButton = document.getElementById('delete_session');
let socket = io();

newSessionButton.addEventListener('click', () => {
    socket.emit('join-session', {
        connectionId: socket.id
    });
    console.log("sending join-session request");
})

deleteSessionButton.addEventListener('click', () => {
    socket.emit('delete-session', {
        connectionId: socket.id
    });
    console.log("sending delete-session request");
})

socket.on('connect', () => {
    console.log("connection id: " + socket.id);
})