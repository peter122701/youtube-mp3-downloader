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
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    // 獲取音訊直接下載連結
    const audioUrl = format.url;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        downloadUrl: audioUrl,
        title: info.videoDetails.title,
        format: format.container
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