const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const demosSection = document.getElementById("demos");
const enableWebcamButton = document.getElementById("webcamButton");
const toggleCameraButton = document.getElementById("toggleCameraButton");

let currentCamera = "user"; // "user" represents the front camera, "environment" represents the back camera

// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Add event listener to enable webcam button.
if (getUserMediaSupported()) {
  enableWebcamButton.addEventListener("click", enableCam);
  toggleCameraButton.addEventListener("click", toggleCamera);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start classification.
function enableCam(event) {
  // Only continue if the COCO-SSD has finished loading.
  if (!model) {
    return;
  }

  // Hide the button once clicked.
  event.target.classList.add("removed");

  // getUsermedia parameters to force video but not audio.
  const constraints = {
    video: { facingMode: currentCamera }, // Use the currentCamera variable
  };

  // Activate the webcam stream.
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    })
    .catch(function (error) {
      console.error("Error enabling webcam:", error);
    });
}

// Function to toggle between front and back cameras
function toggleCamera() {
  // Check if the toggleCameraButton is enabled
  if (toggleCameraButton.disabled) {
    return;
  }

  // Disable the button temporarily to prevent multiple clicks
  toggleCameraButton.disabled = true;

  // Stop the current video stream
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
  }

  // Toggle between "user" (front camera) and "environment" (back camera)
  currentCamera = currentCamera === "user" ? "environment" : "user";

  // Request the new camera stream
  const constraints = {
    video: { facingMode: currentCamera },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
      toggleCameraButton.disabled = false; // Re-enable the button
    })
    .catch(function (error) {
      console.error("Error switching camera:", error);
      toggleCameraButton.disabled = false; // Re-enable the button in case of an error
    });
}

// Rest of your code...

// Store the resulting model in the global scope of our app.
var model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section now model is ready to use.
  demosSection.classList.remove("invisible");
});

var children = [];

function predictWebcam() {
  // Now let's start classifying a frame in the stream.
  model.detect(video).then(function (predictions) {
    // Remove any highlighting we did previous frame.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
    for (let n = 0; n < predictions.length; n++) {
      // If we are over 66% sure we are sure we classified it right, draw it!
      if (predictions[n].score > 0.66) {
        const p = document.createElement("p");
        p.innerText =
          predictions[n].class +
          " - with " +
          Math.round(parseFloat(predictions[n].score) * 100) +
          "% confidence.";
        p.style =
          "margin-left: " +
          predictions[n].bbox[0] +
          "px; margin-top: " +
          (predictions[n].bbox[1] - 10) +
          "px; width: " +
          (predictions[n].bbox[2] - 10) +
          "px; top: 0; left: 0;";

        const highlighter = document.createElement("div");
        highlighter.setAttribute("class", "highlighter");
        highlighter.style =
          "left: " +
          predictions[n].bbox[0] +
          "px; top: " +
          predictions[n].bbox[1] +
          "px; width: " +
          predictions[n].bbox[2] +
          "px; height: " +
          predictions[n].bbox[3] +
          "px;";

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }

    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  });
}
