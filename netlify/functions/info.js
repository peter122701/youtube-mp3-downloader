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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只允許 POST 請求' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    // 驗證 YouTube URL
    if (!ytdl.validateURL(url)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '無效的 YouTube URL' })
      };
    }

    // 獲取影片信息
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;

    // 轉換時長為 HH:MM:SS 格式
    const duration = new Date(videoDetails.lengthSeconds * 1000)
      .toISOString()
      .substr(11, 8);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title: videoDetails.title,
        duration: duration,
        thumbnail: videoDetails.thumbnails[0].url
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '處理請求時發生錯誤' })
    };
  }
}; 