const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'ai',
  description: 'Interact with AMIR-GPT using text queries and image analysis',
  usage: 'Ask a question or reply to an image with a query.',
  author: 'Amir',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim() || 'Hello';
    const chatSessionId = "fc053908-a0f3-4a9c-ad4a-008105dcc360";

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
      "Sec-CH-UA-Platform": "\"Android\"",
      "Sec-CH-UA": "\"Chromium\";v=\"136\", \"Brave\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
      "Sec-CH-UA-Mobile": "?1",
      "Accept": "*/*",
      "Sec-GPC": "1",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://newapplication-70381.chipp.ai",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Desc": "empty",
      "Referer": "https://newapplication-70381.chipp.ai/w/chat/",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Cookie": [
        "__Host-next-auth.csrf-token=4723c7d0081a66dd0b572f5e85f5b40c2543881365782b6dcca3ef7eabdc33d6%7C06adf96c05173095abb983f9138b5e7ee281721e3935222c8b369c71c8e6536b",
        "__Secure-next-auth.callback-url=https%3A%2F%2Fapp.chipp.ai",
        "userId_70381=729a0bf6-bf9f-4ded-a861-9fbb75b839f5",
        "correlationId=f8752bd2-a7b2-47ff-bd33-d30e5480eea8"
      ].join("; "),
      "Priority": "u=1, i"
    };

    const creatorQuestions = [
      "qui t’a créé", "qui est ton créateur", "tu as été fait par qui", "d'où viens-tu",
      "tu as été développé par qui", "qui est derrière toi", "qui est ton père",
      "fondateur d’AMIR-GPT", "qui a conçu amir-gpt", "quel est le nom de ton concepteur",
      "tu es l’œuvre de qui", "qui t’a mis en ligne", "propriétaire d’amir-gpt",
      "tu appartiens à qui", "d’où vient ton intelligence", "programmé par qui",
      "tu es burkinabè", "ton créateur est africain", "ia de quel pays", "qui a eu l’idée d’amir-gpt"
    ];

    const lowerPrompt = prompt.toLowerCase();
    const matchedCreatorQuestion = creatorQuestions.some(q => lowerPrompt.includes(q));

    if (matchedCreatorQuestion) {
      const creatorMessage = `💬 | 𝗔𝗠𝗜𝗥-𝗚𝗣𝗧\n・───────────・\nJe suis 𝗔𝗠𝗜𝗥-𝗚𝗣𝗧, une intelligence artificielle créée par **Cheik Amir Guiatin**, un développeur burkinabè 🇧🇫. Il est le fondateur de ce projet.\n・──── >ᴗ< ────・`;
      await sendMessage(senderId, { text: creatorMessage }, pageAccessToken);
      return;
    }

    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }

      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const chunkMessage = (message, maxLength) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += maxLength) {
          chunks.push(message.slice(i, i + maxLength));
        }
        return chunks;
      };

      const imageUrl = await getImageUrl(event, pageAccessToken);

      let payload;

      if (imageUrl) {
        const combinedPrompt = `${prompt}\nImage URL: ${imageUrl}`;
        payload = {
          messages: [...conversationHistory[senderId], { role: 'user', content: combinedPrompt }],
          chatSessionId,
          toolInvocations: [
            {
              toolName: 'analyzeImage',
              args: {
                userQuery: prompt,
                imageUrls: [imageUrl],
              }
            }
          ]
        };
      } else {
        payload = {
          messages: [...conversationHistory[senderId]],
          chatSessionId,
        };
      }

      const { data } = await axios.post("https://newapplication-70381.chipp.ai/api/chat", payload, { headers });

      const responseTextChunks = data.match(/"result":"(.*?)"/g)?.map(chunk => chunk.slice(10, -1).replace(/\\n/g, '\n'))
        || data.match(/0:"(.*?)"/g)?.map(chunk => chunk.slice(3, -1).replace(/\\n/g, '\n')) || [];

      const fullResponseText = responseTextChunks.join('');
      const toolCalls = data.choices?.[0]?.message?.toolInvocations || [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result) {
          const descMatch = toolCall.result.match(/(?:Image|Generated Image):\s*(.+?)(?:https?:\/\/)/i);
          const description = descMatch ? descMatch[1].trim() : 'Generated image';
          const urlMatch = toolCall.result.match(/https?:\/\/\S+/);
          const url = urlMatch ? urlMatch[0] : '';

          const formattedImageReply = `🧠 | AMIR-GPT • Image générée : ${description}\n${url}\n──────────────`;
          await sendMessage(senderId, { text: formattedImageReply }, pageAccessToken);
          return;
        }

        if (toolCall.toolName === 'analyzeImage' && toolCall.state === 'result' && toolCall.result) {
          await sendMessage(senderId, { text: `🧠 | AMIR-GPT • Analyse de l'image :\n${toolCall.result}` }, pageAccessToken);
          return;
        }

        if (toolCall.toolName === 'browseWeb' && toolCall.state === 'result' && toolCall.result) {
          let answerText = '';
          if (toolCall.result.answerBox?.answer) {
            answerText = toolCall.result.answerBox.answer;
          } else if (Array.isArray(toolCall.result.organic)) {
            answerText = toolCall.result.organic.map(o => o.snippet).filter(Boolean).join('\n\n');
          }

          const finalReply = `🧠 | AMIR-GPT\n──────────────\n${fullResponseText}\n\n🌐 Résultat de recherche :\n${answerText}\n──────────────`;
          await sendMessage(senderId, { text: finalReply }, pageAccessToken);
          return;
        }
      }

      if (!fullResponseText) {
        throw new Error('Empty response from the AI.');
      }

      conversationHistory[senderId].push({ role: 'assistant', content: fullResponseText });

      const formattedResponse = `🧠 | AMIR-GPT\n──────────────\n${fullResponseText}\n──────────────`;
      const messageChunks = chunkMessage(formattedResponse, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.error("Bad Request: Ignored.");
      } else {
        console.error("Error:", err);
      }
    }
  },
};
                                   
