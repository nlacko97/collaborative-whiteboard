let newSessionButton = document.getElementById('new_session');
let socket = io();

newSessionButton.addEventListener('click', () => {

    console.log("sending socket connection request");

})

socket.on('newc', (data) => {
    console.log("received from server: " + data);
})