export default async function handler(req, res) {
  // CORSヘッダー
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
    const { audio, mimeType } = req.body;
    
    if (!audio) {
      console.error('No audio data in request body');
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    console.log('=== Transcription Request ===');
    console.log('Audio data length:', audio.length);
    console.log('MIME type:', mimeType);
    
    // Base64からバイナリに変換
    let audioBuffer;
    try {
      audioBuffer = Buffer.from(audio, 'base64');
    } catch (e) {
      console.error('Base64 decode error:', e);
      return res.status(400).json({ error: 'Invalid base64 audio data' });
    }
    
    console.log('Audio buffer size:', audioBuffer.length, 'bytes');
    
    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: 'Audio data too small' });
    }
    
    // ファイル形式を決定
    let extension = 'webm';
    let contentType = 'audio/webm';
    
    if (mimeType) {
      if (mimeType.includes('mp4')) {
        extension = 'mp4';
        contentType = 'audio/mp4';
      } else if (mimeType.includes('mpeg')) {
        extension = 'mp3';
        contentType = 'audio/mpeg';
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
        contentType = 'audio/ogg';
      }
    }
    
    console.log('Using format:', extension, contentType);

    // FormDataライブラリを使用
    const FormData = require('form-data');
    const formData = new FormData();
    
    // ファイルを追加
    formData.append('file', audioBuffer, {
      filename: `audio.${extension}`,
      contentType: contentType
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    console.log('Calling OpenAI Whisper API...');

    // OpenAI API呼び出し
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
      console.error('OpenAI API error:', errorText);
      return res.status(response.status).json({ 
        error: 'OpenAI API error',
        status: response.status,
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('Transcription successful, text length:', data.text.length);
    
    return res.status(200).json({ 
      text: data.text,
      success: true 
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
