import React, { useRef, useState, useEffect, useMemo } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import * as cocossd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import * as fp from "fingerpose";

import victory from "./emojis/victory.png";
import thumbs_up from "./emojis/thumbs_up.png";

import { products } from "./ProductList.js";

// import { useTable } from "react-table";

function AddCart() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [purchaseEmoji, setPurchaseEmoji] = useState(false);
  const [emoji, setEmoji] = useState(null);
  const [cart, setCart] = useState([]);

  var newCart = [];

  const videoHeight = 720;
  const videoWidth = 1280;

  const images = {
    thumbs_up: thumbs_up,
    victory: victory,
  };

  const runObjectDetectionHandPose = async () => {
    //Loading HandPose
    const netHandPose = await handpose.load();
    console.log("Loaded HandPose");

    // Loading CocoSsd
    const netObjectDetection = await cocossd.load();
    console.log("Loaded Object Detection");

    // Looping to detect all the objects and hands
    setInterval(() => {
      detect(netHandPose, netObjectDetection);
    }, 100);
  };

  // To detect objects and hands in the video
  const detect = async (netHandPose, netObjectDetection) => {
    //  Check if data is available
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Set video height and width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas height and width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Hand Pose Detections
      const hand = await netHandPose.estimateHands(video);
      // console.log(hand);

      // Make Object Detections
      const objects = await netObjectDetection.detect(video);

      // Get hand gesture
      if (hand.length > 0) {
        const GE = new fp.GestureEstimator([
          fp.Gestures.VictoryGesture,
          fp.Gestures.ThumbsUpGesture,
        ]);

        const gesture = await GE.estimate(hand[0].landmarks, 8);
        // console.log("First Gesture - ", gesture);

        if (gesture.gestures !== undefined && gesture.gestures.length > 0) {
          // console.log("Gesture - ", gesture.gestures);
          const emoji_name = gesture.gestures[0].name;
          const score = gesture.gestures[0].score;
          // console.log("Emoji Name - ", emoji_name);
          // console.log("Emoji Score - ", score);

          if (score === 10) {
            setEmoji(emoji_name);
          }
        } else {
          setEmoji(null);
        }
      } else {
        setEmoji(null);
      }

      // Draw mesh
      const ctx = canvasRef.current.getContext("2d");
      drawRect(objects, ctx);
      drawHand(hand, ctx);
      addToCart(objects, hand, ctx);
    }
  };

  // Drawing Rectangle for Object Detection

  const drawRect = (detections, ctx) => {
    // Loop through each prediction
    detections.forEach((prediction) => {
      // Extract boxes and classes
      const [x, y, width, height] = prediction["bbox"]; // Upper left corner is x and y
      const text = prediction["class"];
      const score = prediction["score"];

      //   console.log("X - ", x, "Y - ", y, "Width - ", width, "Height - ", height);

      const topLeft = [x, y];
      const topRight = [x + width, y];
      const bottomLeft = [x, y + height];
      const bottomRight = [x + width, y + height];
      //   console.log("Object Bounding Box  - ");
      //   console.log(
      //     "Top Left: ",
      //     topLeft,
      //     "Bottom Left: ",
      //     bottomLeft,
      //     "Top Right: ",
      //     topRight,
      //     "Bottom Right: ",
      //     bottomRight
      //   );

      // Draw rectangles and text
      ctx.beginPath();
      ctx.strokeStyle = "green";
      ctx.font = "20px Arial";
      ctx.fillStyle = "green";
      ctx.fillText(text, x, y + 20);
      ctx.fillText(parseFloat(score).toFixed(2), x, y + 40);
      ctx.rect(x, y, width, height);
      ctx.stroke();
    });
  };

  // Draw Hand

  // Points for fingers
  const fingerJoints = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
  };

  const drawHand = (predictions, ctx) => {
    // console.log("Predictions - ", predictions);
    if (predictions.length > 0) {
      predictions.forEach((prediction) => {
        // Grab landmarks
        const landmarks = prediction.landmarks;
        // console.log("Landmarks - ", landmarks);
        // console.log("Prediction - ", prediction);
        // Loop through fingers
        for (let j = 0; j < Object.keys(fingerJoints).length; j++) {
          let finger = Object.keys(fingerJoints)[j];

          //  Loop through pairs of joints
          for (let k = 0; k < fingerJoints[finger].length - 1; k++) {
            // Get pairs of joints
            const firstJointIndex = fingerJoints[finger][k];
            const secondJointIndex = fingerJoints[finger][k + 1];

            // Draw path
            ctx.beginPath();
            ctx.moveTo(
              landmarks[firstJointIndex][0],
              landmarks[firstJointIndex][1]
            );
            ctx.lineTo(
              landmarks[secondJointIndex][0],
              landmarks[secondJointIndex][1]
            );
            ctx.strokeStyle = "plum";
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        }

        // Loop through landmarks and draw
        for (let i = 0; i < landmarks.length; i++) {
          const x = landmarks[i][0];
          const y = landmarks[i][1];

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 3 * Math.PI);

          ctx.fillStyle = "gold";
          ctx.fill();
        }

        // Checking for end of thumb
        const x = landmarks[4][0];
        const y = landmarks[4][1];

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 3 * Math.PI);

        ctx.fillStyle = "red";
        ctx.fill();

        // Bounding box for the hand
        // console.log("Prediction Bounding Box -", prediction.boundingBox);
        const bottomRight = prediction.boundingBox.bottomRight; // Upper left corner is x and y
        const topLeft = prediction.boundingBox.topLeft;

        const handWidth = bottomRight[0] - topLeft[0];
        const handHeight = topLeft[1] - bottomRight[1]; // this is negative as the y axis is reversed somehow
        // const handHeight = bottomRight[1] - topLeft[1];

        // for checking
        const bottomLeft = [topLeft[0], topLeft[1] - handHeight];
        const topRight = [bottomRight[0], bottomRight[1] + handHeight];

        // Draw rectangles and text
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.font = "20px Arial";
        ctx.fillStyle = "red";
        // ctx.fillText("Hand", topLeft[1], topLeft[0] + 20);
        ctx.fillText("Hand", topLeft[0], topLeft[1]);
        // ctx.rect(topLeft[0], topLeft[1] - handHeight, handWidth, handHeight);
        ctx.rect(
          topLeft[0] + handWidth / 4,
          topLeft[1] - handHeight - 100,
          handWidth / 2,
          handHeight / 2
        );
        ctx.stroke();
      });
    }
  };

  const addToCart = (objects, hand, ctx) => {
    if (hand.length > 0) {
      hand.forEach((handPrediction) => {
        // Bounding box for the hand
        // console.log("Hand Prediction Bounding Box -", handPrediction.boundingBox);
        const bottomRightHand = handPrediction.boundingBox.bottomRight; // Upper left corner is x and y
        const topLeftHand = handPrediction.boundingBox.topLeft;

        const handWidth = bottomRightHand[0] - topLeftHand[0] - 10;
        const handHeight = topLeftHand[1] - bottomRightHand[1] - 10; // this is negative as the y axis is reversed somehow

        // for checking
        const bottomLeftHand = [topLeftHand[0], topLeftHand[1] - handHeight];
        const topRightHand = [
          bottomRightHand[0],
          bottomRightHand[1] + handHeight,
        ];

        const thumbEndLandmark = handPrediction.landmarks[4];
        // console.log("Thumb Landmark - ", thumbEndLandmark);

        // console.log("Hand Height - ", handHeight, "HandWidth - ", handWidth);
        // console.log(
        //   "Top Left: ",
        //   topLeftHand,
        //   "Bottom Left: ",
        //   bottomLeftHand,
        //   "Top Right: ",
        //   topRightHand,
        //   "Bottom Right: ",
        //   bottomRightHand
        // );

        objects.forEach((objectPrediction) => {
          const [x, y, width, height] = objectPrediction["bbox"];
          const object_class = objectPrediction["class"];

          const topLeftObject = [x, y];
          const topRightObject = [x + width, y];
          const bottomLeftObject = [x, y + height];
          const bottomRightObject = [x + width, y + height];
          // console.log(
          //   "Top Left Object: ",
          //   topLeftObject,
          //   "Bottom Left Object: ",
          //   bottomLeftObject,
          //   "Top Right Object: ",
          //   topRightObject,
          //   "Bottom Right Object: ",
          //   bottomRightObject
          // );
          // console.log("All Object and Hand Positions");
          // console.log(
          //   "Object Class",
          //   object_class,
          //   "Top Left Hand: ",
          //   topLeftHand,
          //   "Bottom Left Hand: ",
          //   bottomLeftHand,
          //   "Top Left Object: ",
          //   topLeftObject,
          //   "Bottom Left Object: ",
          //   bottomLeftObject,
          //   "Top Right Hand: ",
          //   topRightHand,
          //   "Bottom Right Hand: ",
          //   bottomRightHand,
          //   "Top Right Object: ",
          //   topRightObject,
          //   "Bottom Right Object: ",
          //   bottomRightObject
          // );

          const product_names = products.map(({ name }) => name);

          // console.log("Product List Keys - ", product_names);
          // console.log("Object Class - ", object_class);

          if (
            thumbEndLandmark[0] >= topLeftObject[0] &&
            thumbEndLandmark[0] <= topRightObject[0] &&
            thumbEndLandmark[1] >= topLeftObject[1] &&
            thumbEndLandmark[1] <= bottomLeftObject[1]
          ) {
            // To check if item not in cart already
            if (
              product_names.includes(object_class) &&
              !newCart.includes(object_class)
            ) {
              const product_index = products.findIndex(
                (item) => item.name === object_class
              );
              setCart((oldCart) => [...oldCart, products[product_index]]);
              newCart.push(object_class);
              console.log("Cart - ", cart);
            }
          }
        });
      });
    }
    ctx.font = "30px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("Shopping Cart", 1100, 200);
    ctx.font = "15px Arial";

    if (newCart !== []) {
      for (let i = 0; i < newCart.length; i++) {
        ctx.fillText(newCart[i], 1100, 220 + 15 * (i + 1));
      }
    }
  };

  useEffect(() => {
    // console.log(products);
    // setCart(products);
    // setPurchaseEmoji(true);
    runObjectDetectionHandPose();
  }, []);

  useEffect(() => {
    if (emoji === null) return;
    stopCam();
    console.log("Stopping the cam");
  }, [emoji]);

  const startCam = () => {
    // Resetting all the States
    setEmoji(null);
    setPurchaseEmoji(false);
    setCart([]);
    newCart = [];

    runObjectDetectionHandPose();
  };

  const stopCam = () => {
    let stream = webcamRef.current.stream;
    // console.log("Stream", stream);
    const tracks = stream.getTracks();

    tracks.forEach((track) => track.stop());
    setPurchaseEmoji(true);
    console.log("Final Cart - ", cart);
  };

  return (
    <div>
      {purchaseEmoji ? (
        <div>
          <div
            style={{
              fontSize: "100px",
              paddingTop: "150px",
              paddingBottom: "50px",
            }}>
            Thanks for Shopping
          </div>
          <button className="button button1" onClick={startCam}>
            Shop Again
          </button>
          <br />
          <div
            style={{
              fontSize: "50px",
              paddingTop: "50px",
              paddingBottom: "20px",
            }}>
            Cart
          </div>

          <table style={{}}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {cart?.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <Webcam
            ref={webcamRef}
            audio={false}
            // width={1280}
            // height={720}
            //   mirrored={true}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zindex: 9,
            }}
            videoConstraints={{
              width: videoWidth,
              height: videoHeight,
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
            }}
          />
          {emoji !== null ? (
            <div>
              <img
                src={images[emoji]}
                alt="text"
                style={{
                  position: "absolute",
                  marginLeft: "auto",
                  marginRight: "auto",
                  left: 1000,
                  bottom: 700,
                  right: 0,
                  textAlign: "center",
                  height: 100,
                }}
              />
            </div>
          ) : (
            ""
          )}
        </div>
      )}
    </div>
  );
}

export default AddCart;
