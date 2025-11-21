export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    // Base64からバイナリに変換
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // FormDataを作成
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // OpenAI Whisper APIを呼び出し
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return res.status(response.status).json({ 
        error: 'OpenAI API error',
        details: errorText 
      });
    }

    const data = await response.json();
    
    return res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message 
    });
  }
}
