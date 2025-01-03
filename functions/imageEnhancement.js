const sharp = require("sharp");
const functions = require("firebase-functions");
const cors = require("cors")({origin: true});

// Funkcja do przetwarzania obrazu na serwerze
exports.enhanceImage = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const {imageUrl} = req.body;
      if (!imageUrl) {
        return res.status(400).send("No image URL provided");
      }

      // Pobierz obraz
      const response = await fetch(imageUrl);
      const imageBuffer = await response.buffer();

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

      // Zwróć przetworzony obraz
      res.set("Content-Type", "image/png");
      res.send(enhancedImage);
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send(`Error processing image: ${error.message}`);
    }
  });
});
