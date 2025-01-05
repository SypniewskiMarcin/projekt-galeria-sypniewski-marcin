module.exports = {
  // ... existing config ...
  
  module: {
    rules: [
      // ... existing rules ...
    ]
  },
  
  // Dodanie konfiguracji ignorowania warningów
  ignoreWarnings: [
    {
      module: /@tensorflow-models\/coco-ssd/,
    },
  ],
  
  // ... rest of the config ...
}; 