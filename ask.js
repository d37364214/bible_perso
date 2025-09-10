const { GoogleGenerativeAI } = require('@google/generative-ai');

// Accédez à votre clé API à partir des variables d'environnement
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Le modèle que vous souhaitez utiliser
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

async function run(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
  } catch (error) {
    console.error('Erreur lors de la requête à Gemini:', error);
  }
}

// Appelez la fonction avec votre question
const userPrompt = "Quelle est la capitale de la France ?";
run(userPrompt);