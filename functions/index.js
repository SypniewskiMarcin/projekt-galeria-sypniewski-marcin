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

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Funkcja do przetwarzania obrazu
exports.enhanceImage = onRequest(async (request, response) => {
  // Obsługa CORS
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {imageUrl} = request.body;
      if (!imageUrl) {
        return response.status(400).send("No image URL provided");
      }

      logger.info("Processing image:", imageUrl);

      // Pobierz obraz
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.buffer();

      // Przetwórz obraz używając sharp
      const enhancedImage = await sharp(imageBuffer)
      // Zwiększ rozdzielczość 4x
          .resize({
            width: null,
            height: null,
            factor: 4,
            kernel: sharp.kernel.lanczos3,
          })
      // Wyostrz obraz
          .sharpen({
            sigma: 1.5,
            m1: 1.5,
            m2: 0.7,
            x1: 2.0,
            y2: 10.0,
            y3: 20.0,
          })
      // Optymalizuj jakość
          .png({
            quality: 100,
            compression: 9,
          })
          .toBuffer();

      logger.info("Image processing completed");

      // Zwróć przetworzony obraz
      response.set("Content-Type", "image/png");
      response.set("Access-Control-Allow-Origin", "*");
      response.send(enhancedImage);
    } catch (error) {
      logger.error("Error processing image:", error);
      response.status(500).send(`Error processing image: ${error.message}`);
    }
  });
});
