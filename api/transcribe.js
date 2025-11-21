export default async function handler(req, res) {
  // CORSヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    // フロントエンドからBase64で送られてくる
    const { audio, mimeType } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data', success: false });
    }

    console.log('Audio data length:', audio.length);
    
    // Base64をBufferに変換
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log('Buffer size:', audioBuffer.length, 'bytes');

    // FormDataを作成
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: mimeType || 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    console.log('Calling OpenAI API...');

    // OpenAI APIを呼び出し
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return res.status(response.status).json({ 
        error: 'OpenAI API error',
        details: errorText,
        success: false 
      });
    }

    const result = await response.json();
    console.log('Transcription success');
    
    return res.status(200).json({ 
      text: result.text,
      success: true 
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message,
      success: false
    });
  }
}
