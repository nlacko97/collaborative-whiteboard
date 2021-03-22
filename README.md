# Collaborative whiteboard

This collaborative whiteboard application allows multiple users to communicate in real time using an interactive whiteboard.

The project is built with NodeJS and SocketIO for the server and uses jQuery for the client-side code.

A live demo of the project can be found [here](http://shrouded-mesa-58036.herokuapp.com/).

# Features
- Draw  - you can perform a free-hand drawing on the whiteboard with a brush utensil, using your mouse. Currently, only one brush size and color are supported.
- Erase  - you can erase any free-hand drawing on the whiteboard with an eraser utensil, using your mouse. Currently, only one eraser size is supported.
- Undo  - you can undo any of your own free-hand drawings or eraser operations added to the whiteboard by clicking this button. 
- Add sticky note  - by pressing this button you can add a new empty sticky note at the top left corner of the board. 
- Move sticky note - you can move any existing sticky note by dragging it with your mouse on the surface of the whiteboard.
- Edit sticky note - you can edit any existing sticky note by clicking inside the squared area of the sticky note and typing characters from your keyboard.
- Delete sticky note  - you can delete any existing sticky note by clicking this button. Before doing the deletion, a confirmation will be required through the means of a pop-up.
- Upload image  - you can upload any image on the whiteboard. Please note that the image will be resized so that the width and height will not exceed 50% of the whiteboard width and height (but the width to height ratio will be preserved). After deciding which picture you want to upload, you will need to select on the whiteboard the position of the top left corner of the image, and after that, the picture will be displayed, having the top left corner at the selected position.
- See comments attached to an image - you can click the "SHOW COMMENTS" button attached to the top left corner of each image to open up a panel with all comments attached to the corresponding image.
- Add comments to an image - you can click the "ADD COMMENT" button from the comments panel of an image in order to add a new empty comment to the corresponding image. The comment will be displayed at the bottom of the comments panel.
- Edit comments of an image - you can edit any existing comment of an image by clicking inside the squared area of the comment and typing characters from your keyboard.
- Hide comments attached to an image - you can click the "HIDE COMMENTS" button from the comments panel of an image in order to hide that panel and the contained comments.
- Download an image copy of the whiteboard  - by pressing this button, the system will take a screenshot of the current state of the whiteboard and download it for you as a PNG file.
- Leave/End the session  - you can leave the current session at any time using this button. A confirmation will be required from you through the means of a pop-up window. Be careful: if you are the host of the session and you decide to leave, the session will terminate for every connected user!- 

# Roadmap
- [x] create better UI components for the application
- [ ] create socket rooms, so there is not only one on-going session at a time
- [ ] introduce security checks for that deal with server-side vulnerabilities and throttling
- [ ] transfer client-side code to VueJS
# Contributions

If you notice any issue with this application, you can help us by reporting it with a new issue in this repository.

## Installation
- clone repository
- create `.env` file with your database credentials
- run `npm install`
- run `npm run start`
- open browser and go to `localhost:3000`