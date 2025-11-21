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
    const { audio, mimeType } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided', success: false });
    }

    console.log('Audio data received, length:', audio.length);
    
    // Base64をBufferに変換
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log('Buffer size:', audioBuffer.length, 'bytes');

    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: 'Audio too short', success: false });
    }

    // バウンダリを生成
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // multipart/form-dataを手動で構築
    const parts = [];
    
    // fileフィールド
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`);
    parts.push(`Content-Type: ${mimeType || 'audio/webm'}\r\n\r\n`);
    parts.push(audioBuffer);
    parts.push(`\r\n`);
    
    // modelフィールド
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="model"\r\n\r\n`);
    parts.push(`whisper-1\r\n`);
    
    // languageフィールド
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="language"\r\n\r\n`);
    parts.push(`en\r\n`);
    
    // 終端
    parts.push(`--${boundary}--\r\n`);
    
    // Bufferに結合
    const buffers = parts.map(part => 
      typeof part === 'string' ? Buffer.from(part, 'utf8') : part
    );
    const body = Buffer.concat(buffers);

    console.log('Body size:', body.length, 'bytes');
    console.log('Calling OpenAI API...');

    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
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
    console.log('Transcription successful, text:', result.text);
    
    return res.status(200).json({ 
      text: result.text,
      success: true 
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message,
      success: false
    });
  }
}
