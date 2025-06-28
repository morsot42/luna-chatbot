/*
 * SCRIPT COMPLETO PARA CHATBOT DE INSTAGRAM "LUNA" (v2.1 - con DeepSeek IA)
 *
 * Autor: Gemini y Freddy, Arquitectos de Chatbots
 * Proyecto: Crea Conexión (EmocionKids)
 *
 * -----------------------------------------------------------------------------
 *
 * ¡Hola, Freddy! Esta es la versión corregida utilizando la API de DeepSeek,
 * como solicitaste. Hemos reemplazado el motor de IA para que Luna piense y
 * converse de forma natural y humana con la tecnología de DeepSeek.
 *
 * ¿QUÉ HACE ESTE SCRIPT?
 * 1.  Mantiene el servidor web y la conexión segura con Instagram.
 * 2.  Recibe los mensajes de los usuarios.
 * 3.  Mantiene un historial de la conversación para cada usuario.
 * 4.  Envía el historial y el nuevo mensaje a la API de DeepSeek, junto con la
 * directriz ("System Prompt") que define la personalidad de Luna.
 * 5.  Recibe la respuesta inteligente generada por DeepSeek.
 * 6.  Envía esa respuesta humana de vuelta al usuario en Instagram.
 *
 * ¿QUÉ NECESITAS AHORA?
 * 1.  Todo lo de antes (Node.js, App de Facebook, Tokens).
 * 2.  **NUEVO:** Una API Key de DeepSeek. Puedes obtenerla gratis en
 * [platform.deepseek.com](https://platform.deepseek.com/).
 *
 * ¿CÓMO USARLO?
 * 1.  Sigue los mismos pasos de antes para guardar `server.js`, `npm init` e `install`.
 * 2.  **ACTUALIZA TU ARCHIVO `.env`**. Debe tener esta nueva línea:
 *
 * PAGE_ACCESS_TOKEN=TU_TOKEN_DE_ACCESO_A_LA_PAGINA
 * VERIFY_TOKEN=TU_TOKEN_SECRETO_DE_VERIFICACION
 * DEEPSEEK_API_KEY=TU_NUEVA_API_KEY_DE_DEEPSEEK
 *
 * 3.  El resto del despliegue en Render funciona exactamente igual. Solo recuerda
 * añadir la nueva variable de entorno `DEEPSEEK_API_KEY` en la configuración
 * de Render.
 *
 * -----------------------------------------------------------------------------
 */

// --- DEPENDENCIAS ---
require('dotenv').config();
const express = require('express');
const axios = require('axios');

// --- CONFIGURACIÓN INICIAL ---
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // Cambiado de Gemini a DeepSeek

// --- MEMORIA DEL CHATBOT ---
// Guarda los historiales de conversación de cada usuario.
// En producción, esto debería ser una base de datos como Redis o Firestore.
const chatHistories = {};


// --- EL CEREBRO DE LUNA (SYSTEM PROMPT PARA LA IA) ---
// Este prompt es el mismo, define la personalidad y objetivos de Luna.
const SYSTEM_PROMPT = `
Eres "Luna", una asistente conversacional experta y empática para "Crea Conexión". Tu misión es ayudar a padres que enfrentan desafíos con las emociones de sus hijos (berrinches, frustración, etc.). NO eres un robot, eres una guía cálida, comprensiva y humana.

**Tus Roles y Flujo de Conversación:**

1.  **Rol 1: Recepcionista y Conexión (El Primer Contacto):**
    * Saluda siempre con calidez usando el nombre del usuario si lo tienes. Usa emojis como ❤️, ✨, 🌱.
    * Valida INMEDIATAMENTE sus sentimientos. Frases como "Te entiendo perfectamente", "Eso suena muy agotador", "Es totalmente normal sentirse así".
    * Tu objetivo inicial es hacer una pregunta abierta para que el usuario se explaye sobre su "dolor". Ej: "¿Cuál es ese desafío que más se repite en tu día a día?".

2.  **Rol 2: Consejera y Guía (El Corazón de la Conversación):**
    * NUNCA saltes a vender. Tu principal objetivo es APORTAR VALOR REAL Y GRATUITO.
    * Basado en su problema, ofrece 1-2 consejos prácticos o un cambio de perspectiva.
    * Usa analogías. Ej: "Un berrinche es como una tormenta, tu rol no es detener la lluvia, sino ser el puerto seguro".
    * Haz preguntas de seguimiento para profundizar: "¿Y cómo reaccionas tú cuando eso pasa?", "¿Qué has intentado hasta ahora?".
    * El usuario debe sentir que está hablando con alguien que de verdad le entiende y le está ayudando.

3.  **Rol 3: Vendedora Sutil (El Puente Natural):**
    * SOLO Y ÚNICAMENTE cuando hayas aportado valor y el usuario se sienta comprendido, puedes crear un puente hacia la solución.
    * NO digas "Cómpralo ya". Di: "Justo para manejar esa frustración de la que hablamos, muchas familias usan una herramienta que se llama 'Botella de la Calma', que es parte central de uno de nuestros manuales."
    * Presenta el producto como la continuación lógica de la ayuda que ya le estás dando.
    * Tu objetivo es que el usuario PREGUNTE por la solución ("¿Y qué es esa botella?", "¿Dónde consigo ese manual?").

**Tu Conocimiento del Producto (EmocionKids - creaconexion.com/ek/):**
* Es un sistema integral de educación emocional.
* Contiene 3 libros por edades: "Mis Emociones Brillan" (4-6), "Descubro lo que siento" (6-8), "Fortalece tu voz interior" (9-12).
* Incluye una Guía para Padres, Tarjetas de Afirmaciones, un Audio Motivacional y un crucial Manual Anti-Bullying.
* El precio es accesible y hay garantía de 7 días.

**Reglas Críticas:**
* NO suenes como un vendedor. Eres un mentor.
* NO uses un lenguaje demasiado técnico.
* Mantén los mensajes relativamente cortos y fáciles de leer en un móvil.
* Si no sabes algo, usa la API de DeepSeek o di que necesitas consultar, pero intégralo en tu tono humano.
* El objetivo final es que el usuario pida el enlace. Solo entonces se lo das: https://www.creaconexion.com/ek/
`;

// --- NUEVA LÓGICA DE IA CON DEEPSEEK ---

/**
 * Genera una respuesta inteligente usando la API de DeepSeek.
 * @param {string} userId - El ID del usuario para mantener el historial.
 * @param {string} userMessage - El mensaje actual del usuario.
 * @returns {Promise<string>} - La respuesta generada por la IA.
 */
async function getLunaAIResponse(userId, userMessage) {
    if (!DEEPSEEK_API_KEY) {
        console.error("DEEPSEEK_API_KEY no está configurada.");
        return "Disculpa, estoy teniendo un problema técnico para pensar ahora mismo. Por favor, inténtalo de nuevo más tarde.";
    }

    // Inicializa el historial si es un nuevo usuario. El formato es role/content.
    if (!chatHistories[userId]) {
        chatHistories[userId] = [];
    }

    // Añade el nuevo mensaje del usuario al historial
    chatHistories[userId].push({ role: "user", content: userMessage });

    const apiUrl = 'https://api.deepseek.com/chat/completions';

    // Formatea el payload para la API de DeepSeek
    const payload = {
        model: "deepseek-chat", // Modelo recomendado para chat
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...chatHistories[userId] // Expande el historial de conversación aquí
        ],
        temperature: 0.7,
        stream: false // No usamos streaming para respuestas completas
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    };

    try {
        const response = await axios.post(apiUrl, payload, { headers });
        const modelResponse = response.data.choices[0].message.content;

        // Añade la respuesta del modelo al historial
        chatHistories[userId].push({ role: "assistant", content: modelResponse });

        return modelResponse;

    } catch (error) {
        console.error('Error al llamar a la API de DeepSeek:', error.response ? error.response.data : error.message);
        // En caso de error, limpia el historial para evitar bucles.
        delete chatHistories[userId];
        return "Uhm, mi cerebro de IA acaba de tener un pequeño cortocircuito. 🧠⚡️ ¿Podríamos empezar de nuevo? Cuéntame qué te trajo por aquí.";
    }
}


// --- RUTAS DEL SERVIDOR WEB (Sin cambios) ---

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message && webhookEvent.message.text) {
                const messageText = webhookEvent.message.text;

                // Llama a la nueva función de IA en lugar de la lógica antigua
                getLunaAIResponse(senderId, messageText).then(response => {
                    callSendAPI(senderId, { text: response });
                });
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});


// --- FUNCIÓN PARA ENVIAR MENSAJES (Sin cambios) ---
async function callSendAPI(senderId, response) {
    const requestBody = {
        "recipient": {
            "id": senderId
        },
        "message": response,
        "messaging_type": "RESPONSE"
    };

    try {
        await axios.post('https://graph.facebook.com/v19.0/me/messages', requestBody, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Unable to send message:', error.response ? error.response.data : error.message);
    }
}


// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 El chatbot "Luna" (versión IA con DeepSeek) está escuchando en el puerto ${PORT}`);
    if(!PAGE_ACCESS_TOKEN || !VERIFY_TOKEN || !DEEPSEEK_API_KEY) {
        console.warn("ADVERTENCIA: Alguna de las variables de entorno (PAGE_ACCESS_TOKEN, VERIFY_TOKEN, DEEPSEEK_API_KEY) no están configuradas. El chatbot no funcionará correctamente.");
    }
});
