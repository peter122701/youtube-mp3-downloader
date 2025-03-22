const ytdl = require('ytdl-core');

exports.handler = async function(event, context) {
  // 添加 CORS 標頭
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Referer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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
    // 檢查 referer
    const referer = event.headers.referer || event.headers.Referer;
    if (!referer || !referer.includes('peaceful-tarsier-993d6d.netlify.app')) {
      throw new Error('未授權的請求來源');
    }

    if (event.httpMethod !== 'POST') {
      throw new Error('只允許 POST 請求');
    }

    const { url } = JSON.parse(event.body);
    
    if (!url) {
      throw new Error('未提供 URL');
    }

    if (!ytdl.validateURL(url)) {
      throw new Error('無效的 YouTube URL');
    }

    // 獲取影片信息
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    });
    
    // 選擇最佳音訊格式
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });

    if (!format) {
      throw new Error('無法找到合適的音訊格式');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        downloadUrl: format.url,
        title: info.videoDetails.title,
        format: 'mp3'
      })
    };

  } catch (error) {
    console.error('下載錯誤:', error);
    return {
      statusCode: error.message.includes('未授權') ? 403 : 500,
      headers,
      body: JSON.stringify({
        error: '處理請求時發生錯誤',
        message: error.message
      })
    };
  }
}; 