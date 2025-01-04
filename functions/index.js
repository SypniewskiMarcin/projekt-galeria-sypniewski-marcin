/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const sharp = require("sharp");
const cors = require("cors")({origin: true});
// Import node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({default: fetch}) => fetch(...args));

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Funkcja do przetwarzania obrazu
exports.enhanceImage = onRequest(async (request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {imageUrl, scaleFactor = 4} = request.body;
      if (!imageUrl) {
        return response.status(400).send("No image URL provided");
      }

      logger.info("Processing image:", imageUrl);

      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(
              `Failed to fetch image: ${imageResponse.statusText}`,
          );
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        logger.info("Image fetched successfully, size:", imageBuffer.length);

        const enhancedImage = await sharp(imageBuffer)
            .resize({
              width: null,
              height: null,
              factor: scaleFactor,
              kernel: sharp.kernel.lanczos3,
            })
            .sharpen({
              sigma: 1.5,
              m1: 1.5,
              m2: 0.7,
              x1: 2.0,
              y2: 10.0,
              y3: 20.0,
            })
            .png({
              quality: 100,
              compression: 9,
            })
            .toBuffer();

        logger.info(
            "Image processing completed, enhanced size:",
            enhancedImage.length,
        );

        response.set("Content-Type", "image/png");
        response.set("Access-Control-Allow-Origin", "*");
        response.send(enhancedImage);
      } catch (fetchError) {
        logger.error("Error processing image:", fetchError);
        response.status(500).send(
            `Error processing image: ${fetchError.message}`,
        );
      }
    } catch (error) {
      logger.error("Error in request handling:", error);
      response.status(500).send(
          `Error in request handling: ${error.message}`,
      );
    }
  });
});
