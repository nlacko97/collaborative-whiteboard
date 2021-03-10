window.onload = function () {
var encrypted = CryptoJS.AES.encrypt("Message", "Secret Passphrase");
console.log(encrypted.toString());
var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
console.log(decrypted.toString(CryptoJS.enc.Utf8))
// Definitions
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");

  // Specifications
  context.strokeStyle = 'black'; // initial brush color
  context.lineWidth = 1; // initial brush width
  var isDrawing = false;
  var lastEvent;

let newSessionButton = document.getElementById('new_session');
let endSessionButton = document.getElementById('end_session');
let moveStickyNoteButton = document.getElementById('move_sticky_note');
let socket = io();

socket.on('connect', () => {
    console.log("connection id: " + socket.id);
})

newSessionButton.addEventListener('click', () => {
    socket.emit('join-session', {
        connectionId: socket.id
    });
    console.log("sending join-session request");

    //now listen for other stuff

    moveStickyNoteButton.addEventListener('click', () => {
        socket.emit('move-sticky-note', {
            connectionId: socket.id,
            id: "test_id",
            position: 22.35

        });
        console.log("sending move sticky note request");
    })

    socket.on('broadcast', (message) => {
        switch(message.type) {
            case 'move-sticky-note':
                console.log("Sticky note moved");
                break;
            case 'freehand-drawing':
            console.log("hauhau")
            console.log(message)
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
  canvas.addEventListener('mousedown', function(event) {
    lastEvent = event;
    isDrawing = true;
  });

  // Mouse Move Event
  canvas.addEventListener('mousemove', function(event) {
    if(isDrawing){
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
  canvas.addEventListener('mouseup', function(event) {
    isDrawing = false;
  });
}