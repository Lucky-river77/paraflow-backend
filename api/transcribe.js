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
    let audioBuffer;
    let mimeType = 'audio/webm';

    // Content-Typeを確認して処理を分岐
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // ====================================
      // パターン1: FormData形式（paraflow.html用）
      // ====================================
      console.log('FormData形式で受信');
      
      // multerの代わりに手動でparseする必要があるが、
      // Vercelではmulterが使えないので、busboy等を使用
      // 簡易的にはreq.bodyからバイナリを取得
      
      // Vercelではファイルアップロードは難しいので、
      // paraflow.htmlをBase64送信に変更する方が簡単
      return res.status(400).json({ 
        error: 'FormData upload is not supported. Please use Base64 encoding.',
        success: false 
      });

    } else if (contentType.includes('application/json')) {
      // ====================================
      // パターン2: JSON + Base64形式（q1.html用）
      // ====================================
      console.log('JSON + Base64形式で受信');
      
      const { audio, mimeType: requestMimeType } = req.body;
      
      if (!audio) {
        return res.status(400).json({ error: 'No audio data provided', success: false });
      }

      if (requestMimeType) {
        mimeType = requestMimeType;
      }

      // Base64をBufferに変換
      audioBuffer = Buffer.from(audio, 'base64');
      console.log('Audio buffer size:', audioBuffer.length, 'bytes');

    } else {
      return res.status(400).json({ 
        error: 'Unsupported Content-Type',
        success: false 
      });
    }

    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: 'Audio too short', success: false });
    }

    // バウンダリを生成
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // multipart/form-dataを手動で構築
    const parts = [];
    
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`);
    parts.push(`Content-Type: ${mimeType}\r\n\r\n`);
    parts.push(audioBuffer);
    parts.push(`\r\n`);
    
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="model"\r\n\r\n`);
    parts.push(`whisper-1\r\n`);
    
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="language"\r\n\r\n`);
    parts.push(`en\r\n`);
    
    parts.push(`--${boundary}--\r\n`);
    
    // Bufferに結合
    const buffers = parts.map(part => 
      typeof part === 'string' ? Buffer.from(part, 'utf8') : part
    );
    const body = Buffer.concat(buffers);

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
    console.log('Transcription successful');
    
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
