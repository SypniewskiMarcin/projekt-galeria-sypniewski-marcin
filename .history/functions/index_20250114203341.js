/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs-node");
const cors = require("cors")({
  origin: [
    "http://localhost:3000",
    "https://sypniewskimarcin.github.io",
    "https://projekt-galeria-sypniewski-m.web.app",
    "https://projekt-galeria-sypniewski-m.firebaseapp.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// Import node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Cache dla modelu ESRGAN
let esrganModel = null;

// Funkcja do wczytania modelu ESRGAN
const loadEsrganModel = async () => {
  if (!esrganModel) {
    try {
      const modelPath = "https://tfhub.dev/captain-pool/esrgan-tf2/1";
      logger.info("Ładowanie modelu ESRGAN");
      esrganModel = await tf.loadGraphModel(modelPath, { fromTFHub: true });
      logger.info("Model ESRGAN załadowany pomyślnie");
    } catch (error) {
      logger.error("Błąd ładowania modelu ESRGAN:", error);
      throw error;
    }
  }
  return esrganModel;
};

// Funkcja do przetwarzania obrazu
exports.enhanceImage = onRequest(async (request, response) => {
  return cors(request, response, async () => {
    try {
      logger.info("Rozpoczęcie obsługi żądania enhanceImage", {
        method: request.method,
        headers: request.headers,
      });

      if (request.method === "OPTIONS") {
        return response.status(204).send("");
      }

      if (request.method !== "POST") {
        return response.status(405).json({
          error: "Method Not Allowed",
          message: "Only POST method is allowed"
        });
      }

      const { imageUrl } = request.body;
      if (!imageUrl) {
        return response.status(400).json({
          error: "Bad Request",
          message: "No image URL provided"
        });
      }

      logger.info("Przetwarzanie obrazu:", imageUrl);

      // Pobierz obraz
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      logger.info("Obraz pobrany pomyślnie, rozmiar:", imageBuffer.length);

      // Wczytaj model ESRGAN
      const model = await loadEsrganModel();

      // Konwertuj obraz do tensora
      let tensor = tf.node.decodeImage(imageBuffer);
      tensor = tensor.toFloat().div(tf.scalar(255));

      // Przetwórz przez model ESRGAN
      logger.info("Przetwarzanie przez model ESRGAN");
      const outputTensor = model.predict(tensor.expandDims(0));

      // Konwertuj wynik z powrotem do obrazu
      const enhancedImage = await tf.node.encodeJpeg(
        outputTensor.squeeze()
          .mul(tf.scalar(255))
          .clipByValue(0, 255)
          .cast("int32")
      );

      // Zwolnij pamięć
      tf.dispose([tensor, outputTensor]);

      // Dodatkowe przetwarzanie przez sharp dla lepszej jakości
      const finalImage = await sharp(enhancedImage)
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

      logger.info("Przetwarzanie zakończone pomyślnie");

      // Ustaw nagłówki CORS i odpowiedź
      response.set("Content-Type", "image/png");
      response.set("Access-Control-Allow-Origin", request.headers.origin || "*");
      response.set("Access-Control-Allow-Credentials", "true");
      response.send(finalImage);

    } catch (error) {
      logger.error("Błąd podczas przetwarzania:", error);
      response.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});
