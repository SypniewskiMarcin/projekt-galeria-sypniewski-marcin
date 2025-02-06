/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs-node");
const cors = require("cors");
const logger = functions.logger;

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://sypniewskimarcin.github.io",
    "https://projekt-galeria-sypniewski-m.web.app",
    "https://projekt-galeria-sypniewski-m.firebaseapp.com",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

admin.initializeApp();

setGlobalOptions({
  region: "europe-central2",
  memory: "2048MB",
  timeoutSeconds: 540,
});

let esrganModel = null;
let isModelLoaded = false;

const loadEsrganModel = async () => {
  if (!isModelLoaded) {
    try {
      const modelPath = "https://tfhub.dev/captain-pool/esrgan-tf2/1";
      logger.info("Ładowanie modelu ESRGAN z TensorFlow Hub:", { modelPath });
      esrganModel = await tf.loadGraphModel(modelPath, { fromTFHub: true });
      isModelLoaded = true;
      logger.info("Model ESRGAN załadowany pomyślnie");
    } catch (error) {
      logger.error("Błąd ładowania modelu ESRGAN:", error);
      throw error;
    }
  }
  return esrganModel;
};

const enhanceImageWithEsrgan = async (imageBuffer) => {
  try {
    logger.info("Rozpoczęcie przetwarzania obrazu przez ESRGAN");
    const model = await loadEsrganModel();
    let tensor = tf.node.decodeImage(imageBuffer);
    tensor = tensor.toFloat().div(tf.scalar(255));
    const outputTensor = model.predict(tensor.expandDims(0));
    const enhancedImage = await tf.node.encodeJpeg(
      outputTensor.squeeze().mul(tf.scalar(255)).clipByValue(0, 255).cast("int32")
    );
    tf.dispose([tensor, outputTensor]);
    logger.info("Przetwarzanie ESRGAN zakończone pomyślnie");
    return enhancedImage;
  } catch (error) {
    logger.error("Błąd podczas przetwarzania ESRGAN:", error);
    throw error;
  }
};

exports.enhanceImage = onRequest((request, response) => {
  return corsMiddleware(request, response, async () => {
    try {
      logger.info("Rozpoczęcie obsługi żądania enhanceImage", {
        method: request.method,
      });

      if (request.method === "OPTIONS") {
        return response.status(204).send("");
      }

      if (request.method !== "POST") {
        return response.status(405).json({
          error: "Method Not Allowed",
          details: "Only POST method is allowed",
        });
      }

      const { imageUrl } = request.body;
      if (!imageUrl) {
        return response.status(400).json({
          error: "Bad Request",
          details: "Missing imageUrl parameter",
        });
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.buffer();
      const enhancedImageBuffer = await enhanceImageWithEsrgan(imageBuffer);

      const bucket = admin.storage().bucket();
      const fileName = imageUrl.split("/").pop().split("?")[0];
      const enhancedPath = `enhanced/${fileName}`;
      await bucket.file(enhancedPath).save(enhancedImageBuffer, {
        metadata: {
          contentType: "image/jpeg",
          metadata: {
            enhanced: "true",
            processedAt: Date.now(),
          },
        },
      });

      const enhancedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(enhancedPath)}?alt=media`;
      response.json({
        success: true,
        message: "Image enhanced successfully",
        enhancedUrl,
      });
    } catch (error) {
      logger.error("Błąd podczas obsługi żądania enhanceImage:", error);
      response.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});
