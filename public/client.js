let newSessionButton = document.getElementById('new_session');
let socket = io();

newSessionButton.addEventListener('click', () => {
    socket.emit('join-session', {
        connectionId: socket.id
    });
    console.log("sending join-session request");
})

socket.on('connect', () => {
    console.log("connection id: " + socket.id);
})