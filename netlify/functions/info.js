const ytdl = require('ytdl-core');

exports.handler = async function(event, context) {
  // 添加 CORS 標頭
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('收到請求:', { 
      httpMethod: event.httpMethod,
      body: event.body,
      headers: event.headers 
    });

    if (event.httpMethod !== 'POST') {
      throw new Error('只允許 POST 請求');
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
      console.log('解析的請求體:', parsedBody);
    } catch (e) {
      throw new Error('無效的 JSON 格式: ' + e.message);
    }

    const { url } = parsedBody;
    
    if (!url) {
      throw new Error('未提供 URL');
    }

    console.log('處理 URL:', url);

    // 驗證 YouTube URL
    if (!ytdl.validateURL(url)) {
      throw new Error('無效的 YouTube URL');
    }

    console.log('開始獲取影片信息...');

    // 使用基本選項獲取影片信息
    const info = await ytdl.getBasicInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    });

    console.log('成功獲取影片信息');

    const videoDetails = info.videoDetails;
    
    // 構建基本響應
    const response = {
      title: videoDetails.title || '未知標題',
      duration: new Date(parseInt(videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
      thumbnail: videoDetails.thumbnails?.[0]?.url || '',
      author: videoDetails.author?.name || '未知作者'
    };

    console.log('準備返回的響應:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('詳細錯誤信息:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    // 根據錯誤類型返回不同的狀態碼
    const statusCode = error.message.includes('無效') ? 400 : 500;

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: '處理請求時發生錯誤',
        message: error.message,
        type: error.name,
        code: error.code
      })
    };
  }
}; 